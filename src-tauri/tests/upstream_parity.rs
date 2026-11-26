//! Upstream parity gate (SPEC §8.3, catalogue skill §7): the Rust transform, run on the same
//! upstream data the reference was built from, must reproduce the bundled snapshot that the
//! Python pipeline produced — record for record.
//!
//! Opt-in (it needs ~12 MB of upstream JSON):
//!   LGA_UPSTREAM_DIR=/path/to/visa-website  (or …/scraper/data/processed) \
//!     cargo test --manifest-path src-tauri/Cargo.toml --test upstream_parity -- --nocapture
//! or `npm run data:parity:upstream`.

use std::collections::{BTreeMap, HashSet};
use std::path::{Path, PathBuf};

use lga_study_visa_explorer_lib::catalogue::model::{Catalogue, DetailFile};
use lga_study_visa_explorer_lib::catalogue::transform::{
    transform, UpstreamCourses, UpstreamUniversities,
};
use serde_json::Value;

/// The reference snapshot was built on this day (`built` in reference/data/catalog.js);
/// intake filtering depends on it.
const REFERENCE_TODAY: &str = "2026-11-23";

fn upstream_dir() -> Option<PathBuf> {
    let root = PathBuf::from(std::env::var_os("LGA_UPSTREAM_DIR")?);
    let nested = root.join("scraper/data/processed");
    Some(if nested.is_dir() { nested } else { root })
}

fn read<T: serde::de::DeserializeOwned>(path: &Path) -> T {
    let bytes = std::fs::read(path).unwrap_or_else(|e| panic!("{}: {e}", path.display()));
    serde_json::from_slice(&bytes).unwrap_or_else(|e| panic!("{}: {e}", path.display()))
}

fn snapshot_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../public/data")
}

#[test]
fn rust_transform_reproduces_the_bundled_snapshot() {
    let Some(dir) = upstream_dir() else {
        eprintln!("LGA_UPSTREAM_DIR not set — skipping the upstream parity gate");
        return;
    };
    let courses: UpstreamCourses = read(&dir.join("courses.json"));
    let unis: UpstreamUniversities = read(&dir.join("universities.json"));
    let snapshot: Catalogue = read(&snapshot_dir().join("catalogue.json"));
    let photos: HashSet<String> = snapshot
        .universities
        .iter()
        .filter(|u| !u.photo.is_empty())
        .map(|u| u.id.clone())
        .collect();

    let bundle = transform(&courses, &unis, REFERENCE_TODAY, Some(&photos)).expect("transform");
    let ours = &bundle.catalogue;

    // Headline numbers first, so a failure reads clearly.
    assert_eq!(ours.counts, snapshot.counts, "counts");
    assert_eq!(ours.levels, snapshot.levels, "levels");
    assert_eq!(ours.fields, snapshot.fields, "fields (Other last)");
    assert_eq!(ours.fx, snapshot.fx, "fx");
    assert_eq!(ours.fx_date, snapshot.fx_date, "fxDate");

    // Every university and course, field for field, in the same order.
    let mut mismatches = Vec::new();
    for (a, b) in ours.universities.iter().zip(&snapshot.universities) {
        if a != b {
            mismatches.push(format!("university {}:\n  ours {a:?}\n  ref  {b:?}", a.id));
        }
    }
    for (a, b) in ours.courses.iter().zip(&snapshot.courses) {
        if a != b {
            mismatches.push(format!("course {}:\n  ours {a:?}\n  ref  {b:?}", a.key));
        }
    }
    let shown: Vec<_> = mismatches.iter().take(8).collect();
    assert!(
        mismatches.is_empty(),
        "{} record mismatches, first ones:\n{}",
        mismatches.len(),
        shown
            .iter()
            .map(|s| s.as_str())
            .collect::<Vec<_>>()
            .join("\n")
    );

    // Detail files: the same HTML for every university, and every snapshot course summary
    // present. (We file summaries under the university's country — SPEC D14 — so compare the
    // union across countries rather than per file.)
    let mut ours_courses = BTreeMap::new();
    let mut ref_courses = BTreeMap::new();
    for country in ["uk", "australia", "canada", "new-zealand", "usa"] {
        let theirs: DetailFile = read(&snapshot_dir().join(format!("details/{country}.json")));
        let mine = &bundle.details[country];
        assert_eq!(
            mine.universities, theirs.universities,
            "university HTML for {country}"
        );
        ours_courses.extend(mine.courses.clone());
        ref_courses.extend(theirs.courses);
    }
    let differing: Vec<_> = ref_courses
        .iter()
        .filter(|(k, v)| ours_courses.get(*k) != Some(*v))
        .map(|(k, _)| k)
        .take(5)
        .collect();
    assert!(
        differing.is_empty(),
        "course summaries differ, e.g. {differing:?}"
    );
    assert_eq!(
        ours_courses.len(),
        ref_courses.len(),
        "course summary count"
    );

    // Same input, same bytes.
    let again = transform(&courses, &unis, REFERENCE_TODAY, Some(&photos)).expect("transform");
    assert_eq!(
        serde_json::to_vec(&again.catalogue).ok(),
        serde_json::to_vec(ours).ok(),
        "transform must be deterministic"
    );

    // And the JSON we write reads back to the same values as the snapshot file.
    let ours_json: Value = serde_json::to_value(ours).expect("serialise");
    let ref_json: Value = read(&snapshot_dir().join("catalogue.json"));
    for key in ["levels", "fields", "counts", "universities", "courses"] {
        assert_eq!(ours_json[key], ref_json[key], "JSON field {key}");
    }
    eprintln!(
        "upstream parity OK — {} universities, {} courses, {} course summaries",
        ours.counts.universities,
        ours.counts.courses,
        ours_courses.len()
    );
}

/// Live network smoke test (opt-in: `cargo test -- --ignored live_`): the production source
/// reaches raw.githubusercontent.com over TLS with the OS certificate store.
#[test]
#[ignore = "needs the internet"]
fn live_upstream_summary_is_reachable() {
    use lga_study_visa_explorer_lib::catalogue::fetch::{Source, UPSTREAM_BASE};
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    let summary = rt
        .block_on(Source::http(UPSTREAM_BASE).summary())
        .expect("summary.json over HTTPS");
    assert!(
        summary.generated_at.starts_with("20"),
        "{}",
        summary.generated_at
    );
    eprintln!("live upstream generatedAt = {}", summary.generated_at);
}

/// Full live update into a throwaway store (opt-in): download → transform → commit.
#[test]
#[ignore = "needs the internet; downloads ~12 MB"]
fn live_full_update_commits_a_bundle() {
    use lga_study_visa_explorer_lib::catalogue::fetch::{Source, UPSTREAM_BASE};
    use lga_study_visa_explorer_lib::catalogue::store::Store;
    use lga_study_visa_explorer_lib::catalogue::updater::{Attempt, Baseline, Outcome, Phase};
    use std::sync::Mutex;

    let tmp = tempfile::tempdir().expect("tempdir");
    let store = Store::new(tmp.path());
    let source = Source::http(UPSTREAM_BASE);
    let last_progress = Mutex::new(0.0f64);
    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("runtime");
    let outcome = rt
        .block_on(
            Attempt {
                store: &store,
                source: &source,
                today: "2026-11-23".into(),
                photos: None,
                baseline: Baseline::default(),
            }
            .run(&|phase, p| {
                if let (Phase::Downloading, Some(p)) = (phase, p) {
                    *last_progress.lock().expect("lock") = p;
                }
            }),
        )
        .expect("update");
    let Outcome::Updated(pointer) = outcome else {
        panic!("expected an update")
    };
    assert!(
        (*last_progress.lock().expect("lock") - 1.0).abs() < 1e-9,
        "progress reached 100%"
    );
    assert_eq!(pointer.meta.counts.courses, 4225);
    assert!(tmp
        .path()
        .join(&pointer.dir)
        .join("details/uk.json")
        .is_file());
    eprintln!(
        "live update committed {} with {} courses",
        pointer.dir, pointer.meta.counts.courses
    );
}

/// Live logo cache (opt-in): a real catalogue logo downloads, validates and is found again.
#[test]
#[ignore = "needs the internet"]
fn live_logo_is_cached() {
    use lga_study_visa_explorer_lib::catalogue::logos::LogoCache;
    let snapshot: Catalogue = read(&snapshot_dir().join("catalogue.json"));
    let url = snapshot
        .universities
        .iter()
        .map(|u| u.logo_url.as_str())
        .find(|u| u.starts_with("https://photos.applyboard.com/"))
        .expect("a logo url");
    let tmp = tempfile::tempdir().expect("tempdir");
    let cache = LogoCache::new(tmp.path());
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    let path = rt.block_on(cache.fetch(url)).expect("fetch").expect("path");
    assert_eq!(cache.lookup(url), Some(path.clone()));
    eprintln!(
        "cached {} bytes at {}",
        std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0),
        path.display()
    );
}
