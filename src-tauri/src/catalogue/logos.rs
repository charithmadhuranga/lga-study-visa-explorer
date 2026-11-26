//! University logo disk cache (SPEC FR-22, PLAN 6.8).
//!
//! The UI asks `logo_src(url)`: a cached copy comes back as an absolute path (read through the
//! asset protocol), a miss returns `None` — the UI shows the remote URL (or the crest offline)
//! and a background download fills the cache for next time. Once a logo has been seen online it
//! keeps showing when the office internet drops.
//!
//! Guards: https only, known logo hosts only, `image/*` responses only, ≤ 1 MB per file,
//! 50 MB total with least-recently-used eviction (file mtime is the "last used" stamp).
//! SVG is allowed: rendered through `<img>`, an SVG cannot run script.

use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, SystemTime};

use sha2::{Digest, Sha256};

/// Hosts that serve logos in the catalogue (checked 2026-11-26: applyboard 415, wikimedia 19).
const ALLOWED_HOSTS: &[&str] = &[
    "photos.applyboard.com",
    "upload.wikimedia.org",
    "commons.wikimedia.org",
    "thumb.wikimedia.org",
];
pub const MAX_FILE_BYTES: usize = 1024 * 1024;
pub const CAP_BYTES: u64 = 50 * 1024 * 1024;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum LogoError {
    #[error("logo URL not allowed: {0}")]
    NotAllowed(String),
    #[error("not an image ({0})")]
    NotImage(String),
    #[error("logo too large ({0} bytes)")]
    TooLarge(usize),
    #[error("logo download failed: {0}")]
    Network(String),
    #[error("logo cache write failed: {0}")]
    Io(String),
}

pub struct LogoCache {
    dir: PathBuf,
    cap: u64,
    client: reqwest::Client,
    in_flight: Mutex<HashSet<String>>,
}

/// `https://` on one of the known logo hosts.
pub fn allowed(url: &str) -> bool {
    let Some(rest) = url.strip_prefix("https://") else {
        return false;
    };
    let host = rest.split(['/', '?', '#']).next().unwrap_or("");
    ALLOWED_HOSTS.contains(&host)
}

/// File stem for a URL: sha-256 hex, so nothing from the URL reaches the filesystem.
pub fn key(url: &str) -> String {
    Sha256::digest(url.as_bytes())
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}

/// Every extension `extension_for` can produce (lookup order = most common first).
const EXTENSIONS: [&str; 6] = ["png", "jpg", "svg", "webp", "gif", "avif"];

/// Content-Type → extension (the asset protocol picks the MIME type from it).
pub fn extension_for(content_type: &str) -> Option<&'static str> {
    let mime = content_type
        .split(';')
        .next()
        .unwrap_or("")
        .trim()
        .to_ascii_lowercase();
    Some(match mime.as_str() {
        "image/png" => "png",
        "image/jpeg" | "image/jpg" => "jpg",
        "image/gif" => "gif",
        "image/webp" => "webp",
        "image/svg+xml" => "svg",
        "image/avif" => "avif",
        _ => return None,
    })
}

impl LogoCache {
    pub fn new(dir: impl Into<PathBuf>) -> Self {
        Self::with_cap(dir, CAP_BYTES)
    }

    pub fn with_cap(dir: impl Into<PathBuf>, cap: u64) -> Self {
        let client = reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(30))
            .user_agent(concat!(
                "lga-study-visa-explorer/",
                env!("CARGO_PKG_VERSION")
            ))
            .build()
            .unwrap_or_default();
        Self {
            dir: dir.into(),
            cap,
            client,
            in_flight: Mutex::new(HashSet::new()),
        }
    }

    /// The cached file for `url`, marked as just used; `None` on a miss.
    /// A handful of `stat`s — never a directory scan (this runs for every logo on a page).
    pub fn lookup(&self, url: &str) -> Option<PathBuf> {
        let stem = key(url);
        let path = EXTENSIONS
            .iter()
            .map(|ext| self.dir.join(format!("{stem}.{ext}")))
            .find(|p| p.is_file())?;
        // Touch for LRU; failure only makes eviction slightly less accurate.
        if let Ok(f) = fs::File::options().append(true).open(&path) {
            let _ = f.set_modified(SystemTime::now());
        }
        Some(path)
    }

    /// Validate and write one downloaded logo (temp file + rename), then enforce the cap.
    pub fn store(&self, url: &str, content_type: &str, bytes: &[u8]) -> Result<PathBuf, LogoError> {
        if !allowed(url) {
            return Err(LogoError::NotAllowed(url.into()));
        }
        let ext =
            extension_for(content_type).ok_or_else(|| LogoError::NotImage(content_type.into()))?;
        if bytes.len() > MAX_FILE_BYTES {
            return Err(LogoError::TooLarge(bytes.len()));
        }
        fs::create_dir_all(&self.dir).map_err(|e| LogoError::Io(e.to_string()))?;
        let path = self.dir.join(format!("{}.{ext}", key(url)));
        let tmp = path.with_extension(format!("{ext}.tmp"));
        fs::write(&tmp, bytes).map_err(|e| LogoError::Io(e.to_string()))?;
        fs::rename(&tmp, &path).map_err(|e| LogoError::Io(e.to_string()))?;
        self.enforce_cap();
        Ok(path)
    }

    /// Download `url` into the cache. Concurrent requests for the same URL are collapsed.
    pub async fn fetch(&self, url: &str) -> Result<Option<PathBuf>, LogoError> {
        if !allowed(url) {
            return Err(LogoError::NotAllowed(url.into()));
        }
        {
            let mut busy = self
                .in_flight
                .lock()
                .map_err(|e| LogoError::Io(e.to_string()))?;
            if !busy.insert(url.to_string()) {
                return Ok(None);
            }
        }
        let result = self.download(url).await;
        if let Ok(mut busy) = self.in_flight.lock() {
            busy.remove(url);
        }
        result.map(Some)
    }

    async fn download(&self, url: &str) -> Result<PathBuf, LogoError> {
        let net = |e: reqwest::Error| LogoError::Network(e.to_string());
        let resp = self.client.get(url).send().await.map_err(net)?;
        if !resp.status().is_success() {
            return Err(LogoError::Network(format!(
                "HTTP {}",
                resp.status().as_u16()
            )));
        }
        let content_type = resp
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();
        if extension_for(&content_type).is_none() {
            return Err(LogoError::NotImage(content_type));
        }
        if let Some(len) = resp.content_length() {
            if len > MAX_FILE_BYTES as u64 {
                return Err(LogoError::TooLarge(
                    usize::try_from(len).unwrap_or(usize::MAX),
                ));
            }
        }
        let bytes = resp.bytes().await.map_err(net)?;
        self.store(url, &content_type, &bytes)
    }

    /// Delete least-recently-used files until the cache fits under the cap.
    fn enforce_cap(&self) {
        let mut files: Vec<(SystemTime, u64, PathBuf)> = fs::read_dir(&self.dir)
            .into_iter()
            .flatten()
            .flatten()
            .filter_map(|e| {
                let meta = e.metadata().ok()?;
                meta.is_file().then(|| {
                    (
                        meta.modified().unwrap_or(SystemTime::UNIX_EPOCH),
                        meta.len(),
                        e.path(),
                    )
                })
            })
            .collect();
        let mut total: u64 = files.iter().map(|(_, len, _)| len).sum();
        if total <= self.cap {
            return;
        }
        files.sort_by_key(|(t, _, _)| *t);
        for (_, len, path) in files {
            if total <= self.cap {
                break;
            }
            if fs::remove_file(&path).is_ok() {
                total = total.saturating_sub(len);
            }
        }
    }

    pub fn dir(&self) -> &Path {
        &self.dir
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const URL: &str = "https://photos.applyboard.com/schools/logos/small/x.png?1";

    #[test]
    fn only_https_known_hosts_are_allowed() {
        assert!(allowed(URL));
        assert!(allowed("https://upload.wikimedia.org/a.svg"));
        assert!(!allowed("http://photos.applyboard.com/x.png"), "plain http");
        assert!(!allowed("https://evil.example/x.png"));
        assert!(
            !allowed("https://photos.applyboard.com.evil.example/x.png"),
            "suffix trick"
        );
        assert!(!allowed("file:///etc/passwd"));
        assert!(!allowed(""));
    }

    #[test]
    fn keys_are_stable_hex_and_extensions_follow_the_mime_type() {
        assert_eq!(key(URL), key(URL));
        assert_eq!(key(URL).len(), 64);
        assert!(key(URL).bytes().all(|b| b.is_ascii_hexdigit()));
        assert_eq!(extension_for("image/png"), Some("png"));
        assert_eq!(extension_for("image/svg+xml; charset=utf-8"), Some("svg"));
        assert_eq!(extension_for("IMAGE/JPEG"), Some("jpg"));
        assert_eq!(extension_for("text/html"), None);
    }

    #[test]
    fn store_then_lookup_round_trips() {
        let tmp = tempfile::tempdir().unwrap();
        let cache = LogoCache::new(tmp.path());
        assert!(cache.lookup(URL).is_none());
        let path = cache.store(URL, "image/png", b"png-bytes").unwrap();
        assert_eq!(path.extension().unwrap(), "png");
        assert_eq!(cache.lookup(URL).unwrap(), path);
        assert_eq!(fs::read(path).unwrap(), b"png-bytes");
    }

    #[test]
    fn store_rejects_non_images_oversized_files_and_foreign_hosts() {
        let tmp = tempfile::tempdir().unwrap();
        let cache = LogoCache::new(tmp.path());
        assert!(matches!(
            cache.store(URL, "text/html", b"<html>"),
            Err(LogoError::NotImage(_))
        ));
        let big = vec![0u8; MAX_FILE_BYTES + 1];
        assert!(matches!(
            cache.store(URL, "image/png", &big),
            Err(LogoError::TooLarge(_))
        ));
        assert!(matches!(
            cache.store("https://evil.example/x.png", "image/png", b"x"),
            Err(LogoError::NotAllowed(_))
        ));
        assert_eq!(fs::read_dir(tmp.path()).map(|d| d.count()).unwrap_or(0), 0);
    }

    #[test]
    fn cap_evicts_the_least_recently_used_logo() {
        let tmp = tempfile::tempdir().unwrap();
        let cache = LogoCache::with_cap(tmp.path(), 25);
        let a = "https://photos.applyboard.com/a.png";
        let b = "https://photos.applyboard.com/b.png";
        let c = "https://photos.applyboard.com/c.png";
        let pa = cache.store(a, "image/png", &[1; 10]).unwrap();
        let pb = cache.store(b, "image/png", &[2; 10]).unwrap();
        // Make `a` old, then use it again so `b` becomes the least recently used.
        let old = SystemTime::now() - Duration::from_secs(3600);
        fs::File::options()
            .append(true)
            .open(&pa)
            .unwrap()
            .set_modified(old)
            .unwrap();
        fs::File::options()
            .append(true)
            .open(&pb)
            .unwrap()
            .set_modified(old + Duration::from_secs(60))
            .unwrap();
        cache.lookup(a).unwrap();
        cache.store(c, "image/png", &[3; 10]).unwrap(); // 30 bytes > cap 25
        assert!(cache.lookup(a).is_some(), "recently used kept");
        assert!(cache.lookup(b).is_none(), "least recently used evicted");
        assert!(cache.lookup(c).is_some(), "new logo kept");
    }
}
