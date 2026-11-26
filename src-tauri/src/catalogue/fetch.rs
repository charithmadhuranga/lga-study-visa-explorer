//! Where upstream data comes from (SPEC §8.1).
//!
//! * `Source::Http` — production: raw.githubusercontent.com, no GitHub API (rate limits).
//! * `Source::Dir`  — a local copy of `scraper/data/processed/` for tests, the upstream parity
//!   gate and offline QA (`LGA_CATALOGUE_SOURCE=/path/to/processed`).
//!
//! Downloads stream straight to the staging directory with throttled progress callbacks and
//! a SHA-256 of the bytes written; nothing multi-megabyte is held in memory twice.

use std::path::{Path, PathBuf};
use std::time::Duration;

use sha2::{Digest, Sha256};
use tokio::io::AsyncWriteExt;

use super::transform::UpstreamSummary;

pub const UPSTREAM_BASE: &str =
    "https://raw.githubusercontent.com/charithmadhuranga/visa-website/main/scraper/data/processed";

#[derive(Debug, thiserror::Error)]
pub enum FetchError {
    #[error("offline or upstream unreachable: {0}")]
    Offline(String),
    #[error("upstream returned HTTP {status} for {file}")]
    Status { file: String, status: u16 },
    #[error("network error while fetching {file}: {message}")]
    Network { file: String, message: String },
    #[error("could not read {file}: {message}")]
    Io { file: String, message: String },
    #[error("{file} is not valid JSON: {message}")]
    Json { file: String, message: String },
}

impl FetchError {
    pub fn is_offline(&self) -> bool {
        matches!(self, Self::Offline(_))
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Progress {
    pub received: u64,
    pub total: Option<u64>,
}

#[derive(Debug, Clone)]
pub struct Downloaded {
    pub path: PathBuf,
    pub bytes: u64,
    pub sha256: String,
}

#[derive(Debug, Clone)]
pub enum Source {
    Http {
        base: String,
        client: reqwest::Client,
    },
    Dir(PathBuf),
}

impl Source {
    pub fn http(base: &str) -> Self {
        let client = reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(15))
            .read_timeout(Duration::from_secs(45))
            .user_agent(concat!(
                "lga-study-visa-explorer/",
                env!("CARGO_PKG_VERSION")
            ))
            .build()
            // Only fails if the TLS backend cannot initialise; fall back to defaults.
            .unwrap_or_default();
        Self::Http {
            base: base.trim_end_matches('/').to_string(),
            client,
        }
    }

    /// `LGA_CATALOGUE_SOURCE` may be a local directory or an alternative base URL.
    pub fn from_env_or_default() -> Self {
        match std::env::var("LGA_CATALOGUE_SOURCE") {
            Ok(v) if v.starts_with("http://") || v.starts_with("https://") => Self::http(&v),
            Ok(v) if !v.is_empty() => Self::Dir(PathBuf::from(v)),
            _ => Self::http(UPSTREAM_BASE),
        }
    }

    pub fn describe(&self) -> String {
        match self {
            Self::Http { base, .. } => base.clone(),
            Self::Dir(p) => p.display().to_string(),
        }
    }

    /// The ~1 KB fingerprint. Cache-busted so a CDN never serves a stale `generatedAt`.
    pub async fn summary(&self) -> Result<UpstreamSummary, FetchError> {
        let file = "summary.json";
        let bytes = match self {
            Self::Dir(dir) => read_local(dir, file).await?,
            Self::Http { base, client } => {
                let nonce = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map_or(0, |d| d.as_secs());
                let resp = send(client, &format!("{base}/{file}?t={nonce}"), file).await?;
                resp.bytes()
                    .await
                    .map_err(|e| net_error(file, &e))?
                    .to_vec()
            }
        };
        serde_json::from_slice(&bytes).map_err(|e| FetchError::Json {
            file: file.into(),
            message: e.to_string(),
        })
    }

    /// Stream `file` into `dest_dir/file`, reporting progress at most every 256 KB.
    pub async fn download(
        &self,
        file: &str,
        dest_dir: &Path,
        progress: &(dyn Fn(Progress) + Send + Sync),
    ) -> Result<Downloaded, FetchError> {
        let path = dest_dir.join(file);
        let io_err = |e: std::io::Error| FetchError::Io {
            file: file.into(),
            message: e.to_string(),
        };
        let mut out = tokio::fs::File::create(&path).await.map_err(io_err)?;
        let mut hasher = Sha256::new();
        let mut received = 0u64;
        let mut last_report = 0u64;

        match self {
            Self::Dir(dir) => {
                let bytes = read_local(dir, file).await?;
                hasher.update(&bytes);
                out.write_all(&bytes).await.map_err(io_err)?;
                received = bytes.len() as u64;
                progress(Progress {
                    received,
                    total: Some(received),
                });
            }
            Self::Http { base, client } => {
                let mut resp = send(client, &format!("{base}/{file}"), file).await?;
                let total = resp.content_length();
                progress(Progress { received: 0, total });
                while let Some(chunk) = resp.chunk().await.map_err(|e| net_error(file, &e))? {
                    hasher.update(&chunk);
                    out.write_all(&chunk).await.map_err(io_err)?;
                    received += chunk.len() as u64;
                    if received - last_report >= 256 * 1024 {
                        last_report = received;
                        progress(Progress { received, total });
                    }
                }
                progress(Progress {
                    received,
                    total: total.or(Some(received)),
                });
            }
        }
        out.flush().await.map_err(io_err)?;
        out.sync_all().await.map_err(io_err)?;

        Ok(Downloaded {
            path,
            bytes: received,
            sha256: hasher
                .finalize()
                .iter()
                .map(|b| format!("{b:02x}"))
                .collect(),
        })
    }
}

async fn read_local(dir: &Path, file: &str) -> Result<Vec<u8>, FetchError> {
    tokio::fs::read(dir.join(file))
        .await
        .map_err(|e| FetchError::Io {
            file: file.into(),
            message: e.to_string(),
        })
}

async fn send(
    client: &reqwest::Client,
    url: &str,
    file: &str,
) -> Result<reqwest::Response, FetchError> {
    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| net_error(file, &e))?;
    let status = resp.status();
    if !status.is_success() {
        return Err(FetchError::Status {
            file: file.into(),
            status: status.as_u16(),
        });
    }
    Ok(resp)
}

fn net_error(file: &str, e: &reqwest::Error) -> FetchError {
    if e.is_connect() || e.is_timeout() {
        FetchError::Offline(e.to_string())
    } else {
        FetchError::Network {
            file: file.into(),
            message: e.to_string(),
        }
    }
}
