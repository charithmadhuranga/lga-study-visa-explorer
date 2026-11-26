//! On-disk bundle store (SPEC §7.2, NFR-12).
//!
//! ```text
//! <root>/current.json          pointer { schemaVersion, dir, meta } — the ONLY thing the UI trusts
//! <root>/updates/v<N>/          catalogue.json · details/*.json · meta.json
//! <root>/staging/<id>/          in-progress downloads, never referenced by current.json
//! ```
//!
//! No `current.json` means "use the snapshot shipped inside the app". Every write a user
//! depends on is temp-file + fsync + rename, so a crash at any instant leaves either the old or
//! the new pointer — never a half-written one.

use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::model::{Bundle, BundleMeta, SCHEMA_VERSION};

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("filesystem error at {path}: {source}")]
    Io {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },
    #[error("could not encode {what}: {source}")]
    Json {
        what: &'static str,
        #[source]
        source: serde_json::Error,
    },
}

fn io(path: &Path) -> impl FnOnce(std::io::Error) -> StoreError + '_ {
    move |source| StoreError::Io {
        path: path.to_path_buf(),
        source,
    }
}

/// `current.json`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Pointer {
    pub schema_version: u32,
    /// Relative to the store root, e.g. `updates/v3`
    pub dir: String,
    pub meta: BundleMeta,
}

#[derive(Debug, Clone)]
pub struct Store {
    root: PathBuf,
}

/// How many committed versions to keep (the active one + one rollback).
pub const KEEP_VERSIONS: usize = 2;

impl Store {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    fn updates(&self) -> PathBuf {
        self.root.join("updates")
    }

    fn pointer_path(&self) -> PathBuf {
        self.root.join("current.json")
    }

    /// The active bundle, if an update has ever been committed and is still intact.
    /// A missing, corrupt, wrong-schema or dangling pointer reads as `None` (bundled snapshot).
    pub fn current(&self) -> Option<Pointer> {
        let text = fs::read_to_string(self.pointer_path()).ok()?;
        let pointer: Pointer = serde_json::from_str(&text)
            .map_err(|e| tracing::warn!("ignoring unreadable current.json: {e}"))
            .ok()?;
        if pointer.schema_version != SCHEMA_VERSION {
            tracing::warn!(
                "ignoring current.json with schema {}",
                pointer.schema_version
            );
            return None;
        }
        if !self
            .root
            .join(&pointer.dir)
            .join("catalogue.json")
            .is_file()
        {
            tracing::warn!("current.json points at missing {}", pointer.dir);
            return None;
        }
        Some(pointer)
    }

    pub fn active_dir(&self) -> Option<PathBuf> {
        self.current().map(|p| self.root.join(p.dir))
    }

    /// A fresh, empty staging directory for one update attempt.
    pub fn new_staging(&self) -> Result<PathBuf, StoreError> {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_or(0, |d| d.as_nanos());
        let dir = self
            .root
            .join("staging")
            .join(format!("{nanos:x}-{}", std::process::id()));
        fs::create_dir_all(&dir).map_err(io(&dir))?;
        Ok(dir)
    }

    /// Remove every staging directory (left over from a crash or a failed attempt).
    pub fn clear_staging(&self) {
        let dir = self.root.join("staging");
        if dir.exists() {
            if let Err(e) = fs::remove_dir_all(&dir) {
                tracing::warn!("could not clear staging: {e}");
            }
        }
    }

    fn versions(&self) -> Vec<u32> {
        let mut v: Vec<u32> = fs::read_dir(self.updates())
            .into_iter()
            .flatten()
            .flatten()
            .filter_map(|e| e.file_name().to_str()?.strip_prefix('v')?.parse().ok())
            .collect();
        v.sort_unstable();
        v
    }

    /// Write the bundle to `updates/v<N>/`, fsync it, then atomically repoint `current.json`.
    /// Returns the new pointer. On any error the previous pointer is untouched.
    pub fn commit(&self, bundle: &Bundle) -> Result<Pointer, StoreError> {
        let next = self.versions().last().copied().unwrap_or(1) + 1;
        let rel = format!("updates/v{next}");
        let dir = self.root.join(&rel);
        // A leftover directory with this number can only be a crashed, unreferenced attempt.
        if dir.exists() {
            fs::remove_dir_all(&dir).map_err(io(&dir))?;
        }
        let details_dir = dir.join("details");
        fs::create_dir_all(&details_dir).map_err(io(&details_dir))?;

        write_json(&dir.join("catalogue.json"), &bundle.catalogue, "catalogue")?;
        for (country, detail) in &bundle.details {
            write_json(
                &details_dir.join(format!("{country}.json")),
                detail,
                "detail file",
            )?;
        }
        let meta = bundle.catalogue.meta();
        write_json(&dir.join("meta.json"), &meta, "meta")?;
        sync_dir(&details_dir);
        sync_dir(&dir);

        let pointer = Pointer {
            schema_version: SCHEMA_VERSION,
            dir: rel,
            meta,
        };
        write_json_atomic(&self.pointer_path(), &pointer)?;
        sync_dir(&self.root);
        Ok(pointer)
    }

    /// Keep the newest `KEEP_VERSIONS` committed versions; never delete the active one.
    pub fn prune(&self) {
        let active = self.current().map(|p| p.dir);
        let versions = self.versions();
        let cutoff = versions.len().saturating_sub(KEEP_VERSIONS);
        for v in &versions[..cutoff] {
            let rel = format!("updates/v{v}");
            if active.as_deref() == Some(rel.as_str()) {
                continue;
            }
            let path = self.root.join(&rel);
            if let Err(e) = fs::remove_dir_all(&path) {
                tracing::warn!("could not prune {}: {e}", path.display());
            }
        }
    }
}

fn write_json<T: Serialize>(path: &Path, value: &T, what: &'static str) -> Result<(), StoreError> {
    let bytes = serde_json::to_vec(value).map_err(|source| StoreError::Json { what, source })?;
    let mut file = File::create(path).map_err(io(path))?;
    file.write_all(&bytes).map_err(io(path))?;
    file.sync_all().map_err(io(path))?;
    Ok(())
}

/// temp file in the same directory → fsync → rename over the target.
fn write_json_atomic<T: Serialize>(path: &Path, value: &T) -> Result<(), StoreError> {
    let tmp = path.with_extension("json.tmp");
    write_json(&tmp, value, "pointer")?;
    fs::rename(&tmp, path).map_err(io(path))?;
    Ok(())
}

/// Persist directory entries (renames) on Unix; a no-op where directories cannot be opened.
fn sync_dir(dir: &Path) {
    #[cfg(unix)]
    if let Ok(f) = File::open(dir) {
        let _ = f.sync_all();
    }
    #[cfg(not(unix))]
    let _ = dir;
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::catalogue::model::{Catalogue, Counts, DetailFile};
    use std::collections::BTreeMap;

    fn bundle(generated: &str) -> Bundle {
        let catalogue = Catalogue {
            schema_version: SCHEMA_VERSION,
            built: "2026-11-26".into(),
            source_generated_at: generated.into(),
            fx_date: "2026-11".into(),
            fx: BTreeMap::from([("USD".into(), 1.0)]),
            levels: vec![],
            fields: vec![],
            counts: Counts {
                universities: 0,
                courses: 0,
                by_country: BTreeMap::new(),
            },
            universities: vec![],
            courses: vec![],
        };
        Bundle {
            catalogue,
            details: BTreeMap::from([("uk".into(), DetailFile::default())]),
        }
    }

    #[test]
    fn empty_store_means_bundled_snapshot() {
        let tmp = tempfile::tempdir().unwrap();
        assert!(Store::new(tmp.path()).current().is_none());
    }

    #[test]
    fn commit_writes_files_and_repoints() {
        let tmp = tempfile::tempdir().unwrap();
        let store = Store::new(tmp.path());
        let p = store.commit(&bundle("a")).unwrap();
        assert_eq!(p.dir, "updates/v2");
        assert_eq!(store.current().unwrap().meta.source_generated_at, "a");
        for f in ["catalogue.json", "meta.json", "details/uk.json"] {
            assert!(tmp.path().join("updates/v2").join(f).is_file(), "{f}");
        }
        assert!(!tmp.path().join("current.json.tmp").exists());
    }

    #[test]
    fn prune_keeps_the_two_newest_and_the_active() {
        let tmp = tempfile::tempdir().unwrap();
        let store = Store::new(tmp.path());
        for g in ["a", "b", "c", "d"] {
            store.commit(&bundle(g)).unwrap();
        }
        store.prune();
        assert_eq!(store.versions(), vec![4, 5]);
        assert_eq!(store.current().unwrap().dir, "updates/v5");
    }

    #[test]
    fn corrupt_or_dangling_pointer_falls_back_to_bundled() {
        let tmp = tempfile::tempdir().unwrap();
        let store = Store::new(tmp.path());
        fs::write(tmp.path().join("current.json"), "{ not json").unwrap();
        assert!(store.current().is_none());

        store.commit(&bundle("a")).unwrap();
        fs::remove_dir_all(tmp.path().join("updates/v2")).unwrap();
        assert!(
            store.current().is_none(),
            "pointer to a deleted version is ignored"
        );
    }

    #[test]
    fn crash_before_rename_keeps_the_old_pointer() {
        let tmp = tempfile::tempdir().unwrap();
        let store = Store::new(tmp.path());
        store.commit(&bundle("old")).unwrap();
        // Simulate a crash after the new version was written but before the pointer swap.
        fs::create_dir_all(tmp.path().join("updates/v3/details")).unwrap();
        fs::write(tmp.path().join("updates/v3/catalogue.json"), "{ half").unwrap();
        fs::write(tmp.path().join("current.json.tmp"), "{ half").unwrap();
        assert_eq!(store.current().unwrap().meta.source_generated_at, "old");
        // The next commit reuses the number cleanly.
        let p = store.commit(&bundle("new")).unwrap();
        assert_eq!(p.dir, "updates/v4");
        assert_eq!(store.current().unwrap().meta.source_generated_at, "new");
    }

    #[test]
    fn staging_is_created_and_cleared() {
        let tmp = tempfile::tempdir().unwrap();
        let store = Store::new(tmp.path());
        let s = store.new_staging().unwrap();
        assert!(s.is_dir());
        store.clear_staging();
        assert!(!s.exists());
    }
}
