//! Catalogue updater (SPEC FR-19/FR-20/FR-21, §8.1): keeps the course catalogue current while
//! the app runs, without ever blocking startup or touching what the consultant is presenting.
//!
//! * `transform` + `sanitize` — the Rust port of `tools/build_data.py`
//! * `fetch`   — upstream source (HTTP or a local directory)
//! * `store`   — versioned bundles + the atomic `current.json` pointer
//! * `updater` — one attempt, Tauri-free and unit-tested
//! * `logos`   — offline cache of university logos (FR-22)
//! * this file — the managed service, scheduler, status model and events

pub mod fetch;
pub mod logos;
pub mod model;
pub mod sanitize;
pub mod store;
pub mod transform;
pub mod updater;

use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Notify;

use fetch::Source;
use model::BundleMeta;
use store::Store;
use updater::{Attempt, Baseline, Outcome, Phase};

/// Folder under the Tauri app-data dir; must match `assetProtocol.scope` in tauri.conf.json.
pub const DIR_NAME: &str = "lga-study-visa-explorer";
/// First check after launch — the UI is interactive long before this (SPEC §8.1, NFR-01).
const STARTUP_DELAY: Duration = Duration::from_secs(8);
const INTERVAL: Duration = Duration::from_secs(6 * 60 * 60);
const BACKOFF: [u64; 4] = [60, 5 * 60, 15 * 60, 60 * 60];

pub const EVENT_STATUS: &str = "catalogue://status";
pub const EVENT_UPDATED: &str = "catalogue://updated";
pub const EVENT_FAILED: &str = "catalogue://failed";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum State {
    Idle,
    Checking,
    Downloading,
    Installing,
    UpToDate,
    Updated,
    Offline,
    Failed,
}

/// Everything the top-bar status chip needs (FR-20).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub state: State,
    /// 0…1 while downloading
    pub progress: Option<f64>,
    pub message: Option<String>,
    /// ISO timestamp of the last completed check (any outcome)
    pub last_checked: Option<String>,
    pub retry_in_secs: Option<u64>,
}

/// What `catalogue_active` returns: where the UI should read the bundle from (SPEC §7.2).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveBundle {
    /// Absolute directory, read through the asset protocol with `convertFileSrc()`
    pub root: String,
    pub meta: BundleMeta,
    /// `updates/vN`
    pub source: String,
}

pub struct Service {
    store: Store,
    source: Source,
    status: Mutex<Status>,
    wake: Notify,
}

impl Service {
    fn new(root: PathBuf, source: Source) -> Self {
        Self {
            store: Store::new(root),
            source,
            status: Mutex::new(Status {
                state: State::Idle,
                progress: None,
                message: None,
                last_checked: None,
                retry_in_secs: None,
            }),
            wake: Notify::new(),
        }
    }

    pub fn active(&self) -> Option<ActiveBundle> {
        let pointer = self.store.current()?;
        Some(ActiveBundle {
            root: self.store.root().join(&pointer.dir).display().to_string(),
            meta: pointer.meta,
            source: pointer.dir,
        })
    }

    pub fn status(&self) -> Status {
        self.status
            .lock()
            .map_or_else(|p| p.into_inner().clone(), |s| s.clone())
    }

    /// "Check for updates" (FR-20): wake the scheduler now.
    pub fn check_now(&self) {
        self.wake.notify_one();
    }

    fn set_status(&self, app: &AppHandle, update: impl FnOnce(&mut Status)) {
        let snapshot = {
            let mut guard = match self.status.lock() {
                Ok(g) => g,
                Err(p) => p.into_inner(),
            };
            update(&mut guard);
            guard.clone()
        };
        let _ = app.emit(EVENT_STATUS, &snapshot);
    }
}

/// Create the service, register it as managed state and start the scheduler.
/// Never blocks: the first check waits `STARTUP_DELAY` on a background task.
pub fn init(app: &AppHandle) -> tauri::Result<()> {
    let root = app.path().app_data_dir()?.join(DIR_NAME);
    let source = Source::from_env_or_default();
    tracing::info!(root = %root.display(), source = %source.describe(), "catalogue service");
    app.manage(Arc::new(logos::LogoCache::new(root.join("logos"))));
    let service = Arc::new(Service::new(root, source));
    service.store.clear_staging(); // leftovers from a crash mid-download
    app.manage(service.clone());

    let app = app.clone();
    tauri::async_runtime::spawn(async move { schedule(app, service).await });
    Ok(())
}

async fn schedule(app: AppHandle, svc: Arc<Service>) {
    let bundled = {
        let app = app.clone();
        tauri::async_runtime::spawn_blocking(move || bundled_snapshot(&app))
            .await
            .unwrap_or_default()
    };
    let mut delay = STARTUP_DELAY;
    let mut failures = 0usize;

    loop {
        tokio::select! {
            () = tokio::time::sleep(delay) => {}
            () = svc.wake.notified() => {}
        }

        let baseline = svc
            .store
            .current()
            .map(|p| Baseline::from_meta(&p.meta))
            .unwrap_or_else(|| bundled.baseline.clone());
        let today = chrono::Local::now()
            .date_naive()
            .format("%Y-%m-%d")
            .to_string();

        svc.set_status(&app, |s| {
            s.state = State::Checking;
            s.progress = None;
            s.message = None;
            s.retry_in_secs = None;
        });

        let on_phase = |phase: Phase, progress: Option<f64>| {
            svc.set_status(&app, |s| {
                s.state = match phase {
                    Phase::Checking => State::Checking,
                    Phase::Downloading => State::Downloading,
                    Phase::Installing => State::Installing,
                };
                s.progress = progress;
            });
        };

        let result = Attempt {
            store: &svc.store,
            source: &svc.source,
            today,
            photos: bundled.photos.clone(),
            baseline,
        }
        .run(&on_phase)
        .await;

        let now = chrono::Local::now().to_rfc3339();
        match result {
            Ok(outcome) => {
                failures = 0;
                delay = INTERVAL;
                let updated = matches!(outcome, Outcome::Updated(_));
                svc.set_status(&app, |s| {
                    s.state = if updated {
                        State::Updated
                    } else {
                        State::UpToDate
                    };
                    s.progress = None;
                    s.last_checked = Some(now);
                });
                if updated {
                    if let Some(active) = svc.active() {
                        let _ = app.emit(EVENT_UPDATED, &active);
                    }
                }
            }
            Err(err) => {
                failures += 1;
                let wait = BACKOFF[(failures - 1).min(BACKOFF.len() - 1)];
                delay = Duration::from_secs(wait);
                let offline = err.is_offline();
                if offline {
                    tracing::info!("catalogue check skipped, offline: {err}");
                } else {
                    tracing::warn!("catalogue update failed: {err}");
                }
                let reason = err.to_string();
                svc.set_status(&app, |s| {
                    s.state = if offline {
                        State::Offline
                    } else {
                        State::Failed
                    };
                    s.progress = None;
                    s.message = Some(reason.clone());
                    s.last_checked = Some(now);
                    s.retry_in_secs = Some(wait);
                });
                if !offline {
                    let _ = app.emit(EVENT_FAILED, &serde_json::json!({ "reason": reason }));
                }
            }
        }
    }
}

/// What the snapshot shipped inside the app tells the updater.
#[derive(Debug, Clone, Default)]
struct BundledSnapshot {
    baseline: Baseline,
    /// University ids with a bundled campus photo; `None` when the snapshot is not embedded
    /// (dev server) — then every id gets a path and the UI falls back if the file is absent.
    photos: Option<HashSet<String>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotHead {
    source_generated_at: String,
    counts: SnapshotCounts,
    universities: Vec<SnapshotUni>,
}

#[derive(Deserialize)]
struct SnapshotCounts {
    courses: usize,
}

#[derive(Deserialize)]
struct SnapshotUni {
    id: String,
    #[serde(default)]
    photo: String,
}

fn bundled_snapshot(app: &AppHandle) -> BundledSnapshot {
    let Some(asset) = app.asset_resolver().get("data/catalogue.json".into()) else {
        tracing::info!("bundled snapshot not embedded (dev server); photos resolved by the UI");
        return BundledSnapshot::default();
    };
    match serde_json::from_slice::<SnapshotHead>(&asset.bytes) {
        Ok(head) => BundledSnapshot {
            baseline: Baseline {
                source_generated_at: Some(head.source_generated_at),
                courses: Some(head.counts.courses),
            },
            photos: Some(
                head.universities
                    .into_iter()
                    .filter(|u| !u.photo.is_empty())
                    .map(|u| u.id)
                    .collect(),
            ),
        },
        Err(e) => {
            tracing::warn!("bundled snapshot unreadable: {e}");
            BundledSnapshot::default()
        }
    }
}
