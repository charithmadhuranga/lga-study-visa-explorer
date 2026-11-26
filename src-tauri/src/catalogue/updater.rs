//! One update attempt (SPEC §8.1), independent of Tauri so it is fully testable:
//! fingerprint → download → validate → transform → sanity check → commit → prune.
//!
//! Every failure path leaves the active bundle untouched and clears staging.

use std::collections::HashSet;
use std::path::Path;

use serde::Serialize;

use super::fetch::{FetchError, Progress, Source};
use super::model::{Bundle, BundleMeta};
use super::store::{Pointer, Store, StoreError};
use super::transform::{transform, TransformError, UpstreamCourses, UpstreamUniversities};

/// A new catalogue may not shrink below this share of the active one — a guard against a
/// broken scrape replacing good data in front of a customer.
pub const MIN_COURSE_RATIO: f64 = 0.5;

#[derive(Debug, thiserror::Error)]
pub enum UpdateError {
    #[error(transparent)]
    Fetch(#[from] FetchError),
    #[error("upstream data rejected: {0}")]
    Invalid(#[from] TransformError),
    #[error("upstream data rejected: {0}")]
    Suspicious(String),
    #[error(transparent)]
    Store(#[from] StoreError),
    #[error("{file} could not be parsed: {message}")]
    Parse { file: String, message: String },
    #[error("transform task failed: {0}")]
    Task(String),
}

impl UpdateError {
    pub fn is_offline(&self) -> bool {
        matches!(self, Self::Fetch(e) if e.is_offline())
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum Outcome {
    /// Upstream `generatedAt` matches the active bundle.
    UpToDate,
    Updated(Pointer),
}

/// Progress phases reported to the UI (`catalogue://status`).
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Phase {
    Checking,
    Downloading,
    Installing,
}

/// What the running app already shows, for the fingerprint comparison and sanity checks.
#[derive(Debug, Clone, Default)]
pub struct Baseline {
    pub source_generated_at: Option<String>,
    pub courses: Option<usize>,
}

impl Baseline {
    pub fn from_meta(meta: &BundleMeta) -> Self {
        Self {
            source_generated_at: Some(meta.source_generated_at.clone()),
            courses: Some(meta.counts.courses),
        }
    }
}

pub struct Attempt<'a> {
    pub store: &'a Store,
    pub source: &'a Source,
    pub today: String,
    pub photos: Option<HashSet<String>>,
    pub baseline: Baseline,
}

impl Attempt<'_> {
    pub async fn run(
        self,
        on_phase: &(dyn Fn(Phase, Option<f64>) + Send + Sync),
    ) -> Result<Outcome, UpdateError> {
        on_phase(Phase::Checking, None);
        let summary = self.source.summary().await?;
        if self.baseline.source_generated_at.as_deref() == Some(summary.generated_at.as_str()) {
            return Ok(Outcome::UpToDate);
        }

        let staging = self.store.new_staging()?;
        let result = self.download_and_build(&staging, on_phase).await;
        self.store.clear_staging();
        let bundle = match result? {
            Some(bundle) => bundle,
            None => return Ok(Outcome::UpToDate),
        };

        on_phase(Phase::Installing, None);
        let pointer = self.store.commit(&bundle)?;
        self.store.prune();
        tracing::info!(
            courses = pointer.meta.counts.courses,
            source = %pointer.meta.source_generated_at,
            "catalogue updated to {}",
            pointer.dir
        );
        Ok(Outcome::Updated(pointer))
    }

    async fn download_and_build(
        &self,
        staging: &Path,
        on_phase: &(dyn Fn(Phase, Option<f64>) + Send + Sync),
    ) -> Result<Option<Bundle>, UpdateError> {
        // Two files share one progress bar: universities (~2.8 MB) then courses (~9.6 MB).
        let report = |base: f64, span: f64| {
            move |p: Progress| {
                if let Some(total) = p.total.filter(|t| *t > 0) {
                    #[allow(clippy::cast_precision_loss)]
                    let frac = (p.received as f64 / total as f64).min(1.0);
                    on_phase(Phase::Downloading, Some(base + span * frac));
                }
            }
        };
        let unis_file = self
            .source
            .download("universities.json", staging, &report(0.0, 0.25))
            .await?;
        let courses_file = self
            .source
            .download("courses.json", staging, &report(0.25, 0.75))
            .await?;
        tracing::info!(
            universities_sha256 = %unis_file.sha256,
            courses_sha256 = %courses_file.sha256,
            bytes = unis_file.bytes + courses_file.bytes,
            "downloaded upstream catalogue"
        );

        on_phase(Phase::Installing, None);
        let today = self.today.clone();
        let photos = self.photos.clone();
        let (unis_path, courses_path) = (unis_file.path, courses_file.path);
        // Parsing + transforming ~12 MB is CPU work: keep it off the async workers.
        let built = tokio::task::spawn_blocking(move || -> Result<Bundle, UpdateError> {
            let courses: UpstreamCourses = parse(&courses_path, "courses.json")?;
            let unis: UpstreamUniversities = parse(&unis_path, "universities.json")?;
            Ok(transform(&courses, &unis, &today, photos.as_ref())?)
        })
        .await
        .map_err(|e| UpdateError::Task(e.to_string()))??;

        // The raw CDN can briefly serve a new summary with old data files: building the same
        // source again would loop forever, so treat it as "nothing new yet".
        if self.baseline.source_generated_at.as_deref()
            == Some(built.catalogue.source_generated_at.as_str())
        {
            tracing::info!("data files not yet updated upstream; keeping the active bundle");
            return Ok(None);
        }
        if let Some(active) = self.baseline.courses.filter(|n| *n > 0) {
            #[allow(clippy::cast_precision_loss)]
            let ratio = built.catalogue.counts.courses as f64 / active as f64;
            if ratio < MIN_COURSE_RATIO {
                return Err(UpdateError::Suspicious(format!(
                    "only {} courses (active bundle has {active})",
                    built.catalogue.counts.courses
                )));
            }
        }
        Ok(Some(built))
    }
}

fn parse<T: serde::de::DeserializeOwned>(path: &Path, file: &str) -> Result<T, UpdateError> {
    let bytes = std::fs::read(path).map_err(|e| UpdateError::Parse {
        file: file.into(),
        message: e.to_string(),
    })?;
    serde_json::from_slice(&bytes).map_err(|e| UpdateError::Parse {
        file: file.into(),
        message: e.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::fs;
    use std::sync::Mutex;

    fn write_upstream(dir: &Path, generated: &str, courses: usize) {
        fs::create_dir_all(dir).unwrap();
        fs::write(
            dir.join("summary.json"),
            json!({ "generatedAt": generated }).to_string(),
        )
        .unwrap();
        let list: Vec<_> = (0..courses)
            .map(|i| {
                json!({
                    "key": format!("k{i}"), "name": "Course", "level": "MBA",
                    "field": "Business & Management", "universityId": "u1",
                    "city": "London", "province": "England", "tuitionPerYear": 1000,
                    "durationMonths": [12], "intakes": [], "tags": [], "summaryHtml": "<p>x</p>"
                })
            })
            .collect();
        fs::write(
            dir.join("courses.json"),
            json!({ "generatedAt": generated, "fxToUsd": { "USD": 1.0 }, "fxDate": "2026-11",
                    "courses": list })
            .to_string(),
        )
        .unwrap();
        fs::write(
            dir.join("universities.json"),
            json!({ "universities": [{ "id": "u1", "name": "Uni", "country": "uk",
                                       "courseCount": courses }] })
            .to_string(),
        )
        .unwrap();
    }

    async fn attempt(
        store: &Store,
        source: &Source,
        baseline: Baseline,
    ) -> Result<Outcome, UpdateError> {
        let phases = Mutex::new(Vec::new());
        let result = Attempt {
            store,
            source,
            today: "2026-11-26".into(),
            photos: None,
            baseline,
        }
        .run(&|p, _| phases.lock().unwrap().push(p))
        .await;
        assert_eq!(phases.lock().unwrap().first(), Some(&Phase::Checking));
        result
    }

    fn rt() -> tokio::runtime::Runtime {
        tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .unwrap()
    }

    #[test]
    fn same_fingerprint_is_up_to_date_without_downloading() {
        let tmp = tempfile::tempdir().unwrap();
        let up = tmp.path().join("up");
        write_upstream(&up, "g1", 3);
        let store = Store::new(tmp.path().join("store"));
        let baseline = Baseline {
            source_generated_at: Some("g1".into()),
            courses: Some(3),
        };
        let out = rt()
            .block_on(attempt(&store, &Source::Dir(up), baseline))
            .unwrap();
        assert_eq!(out, Outcome::UpToDate);
        assert!(store.current().is_none());
    }

    #[test]
    fn new_fingerprint_downloads_transforms_and_commits() {
        let tmp = tempfile::tempdir().unwrap();
        let up = tmp.path().join("up");
        write_upstream(&up, "g2", 3);
        let store = Store::new(tmp.path().join("store"));
        let baseline = Baseline {
            source_generated_at: Some("g1".into()),
            courses: Some(3),
        };
        let out = rt()
            .block_on(attempt(&store, &Source::Dir(up), baseline))
            .unwrap();
        let Outcome::Updated(p) = out else {
            panic!("expected an update")
        };
        assert_eq!(p.meta.source_generated_at, "g2");
        assert_eq!(p.meta.counts.courses, 3);
        assert_eq!(store.current().unwrap(), p);
        assert!(
            !tmp.path().join("store/staging").exists(),
            "staging cleared"
        );
    }

    #[test]
    fn corrupt_download_keeps_the_active_bundle() {
        let tmp = tempfile::tempdir().unwrap();
        let up = tmp.path().join("up");
        write_upstream(&up, "g2", 3);
        fs::write(up.join("courses.json"), "{ truncated").unwrap();
        let store = Store::new(tmp.path().join("store"));
        let err = rt()
            .block_on(attempt(&store, &Source::Dir(up), Baseline::default()))
            .unwrap_err();
        assert!(matches!(err, UpdateError::Parse { .. }), "{err}");
        assert!(store.current().is_none());
        assert!(!tmp.path().join("store/staging").exists());
    }

    #[test]
    fn missing_file_is_a_failure_not_a_crash() {
        let tmp = tempfile::tempdir().unwrap();
        let up = tmp.path().join("up");
        write_upstream(&up, "g2", 3);
        fs::remove_file(up.join("universities.json")).unwrap();
        let store = Store::new(tmp.path().join("store"));
        let err = rt()
            .block_on(attempt(&store, &Source::Dir(up), Baseline::default()))
            .unwrap_err();
        assert!(
            matches!(err, UpdateError::Fetch(FetchError::Io { .. })),
            "{err}"
        );
    }

    #[test]
    fn a_suspiciously_small_catalogue_is_rejected() {
        let tmp = tempfile::tempdir().unwrap();
        let up = tmp.path().join("up");
        write_upstream(&up, "g2", 2);
        let store = Store::new(tmp.path().join("store"));
        let baseline = Baseline {
            source_generated_at: Some("g1".into()),
            courses: Some(100),
        };
        let err = rt()
            .block_on(attempt(&store, &Source::Dir(up), baseline))
            .unwrap_err();
        assert!(matches!(err, UpdateError::Suspicious(_)), "{err}");
        assert!(store.current().is_none());
    }

    #[test]
    fn stale_data_behind_a_new_summary_does_not_loop() {
        let tmp = tempfile::tempdir().unwrap();
        let up = tmp.path().join("up");
        write_upstream(&up, "g1", 3);
        fs::write(
            up.join("summary.json"),
            json!({ "generatedAt": "g2" }).to_string(),
        )
        .unwrap();
        let store = Store::new(tmp.path().join("store"));
        let baseline = Baseline {
            source_generated_at: Some("g1".into()),
            courses: Some(3),
        };
        let out = rt()
            .block_on(attempt(&store, &Source::Dir(up), baseline))
            .unwrap();
        assert_eq!(out, Outcome::UpToDate);
        assert!(store.current().is_none());
    }

    #[test]
    fn unreachable_host_reports_offline() {
        // Port 9 (discard) on localhost is closed on CI machines: connection refused.
        let tmp = tempfile::tempdir().unwrap();
        let store = Store::new(tmp.path());
        let source = Source::http("http://127.0.0.1:9");
        let err = rt()
            .block_on(attempt(&store, &source, Baseline::default()))
            .unwrap_err();
        assert!(err.is_offline(), "{err}");
    }
}
