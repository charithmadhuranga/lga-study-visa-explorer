//! Commands exposed to the frontend. Keep this surface small (AGENTS §5): anything else
//! belongs in the webview. Multi-MB data never crosses this bridge — the UI reads bundle
//! files through the asset protocol instead (SPEC §7.2).

use serde::Serialize;
use tauri::{AppHandle, State};

use crate::window::LaunchMode;

/// Bundle provenance handed to the UI for the status popover and page footnotes (FR-21).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveBundle {
    /// Absolute root of the active bundle, for `convertFileSrc()`
    pub root: String,
    pub meta: BundleMeta,
    /// 'bundled' | 'updates/vN'
    pub source: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleMeta {
    pub schema_version: u32,
    pub built: String,
    pub source_generated_at: String,
    pub fx_date: String,
    pub fx: serde_json::Map<String, serde_json::Value>,
}

/// Which bundle the UI should read. `None` means "use the bundled snapshot shipped in
/// `dist/data`" — the first-run state, and the fallback whenever anything is wrong.
///
/// M6 (PLAN) replaces the body with the committed `current.json` pointer; the signature
/// stays identical so the frontend never changes.
#[tauri::command]
pub fn catalogue_active() -> Option<ActiveBundle> {
    None
}

/// Status-chip state for boot, before any check has run (FR-20).
#[tauri::command]
pub fn catalogue_status() -> serde_json::Value {
    serde_json::json!({ "state": "bundled" })
}

/// Launch facts the UI needs: kiosk mode makes F11 inert (FR-14).
#[derive(Debug, Serialize)]
pub struct ShellInfo {
    pub kiosk: bool,
}

#[tauri::command]
pub fn shell_info(mode: State<'_, LaunchMode>) -> ShellInfo {
    ShellInfo { kiosk: mode.kiosk }
}

/// Ctrl/Cmd+Q from the webview (FR-13) — the only exit in kiosk mode.
#[tauri::command]
pub fn app_quit(app: AppHandle) {
    // `tracing` arrives with the catalogue updater (M6); until then keep a stderr trail.
    eprintln!("[lga-shell] quit requested from the UI");
    app.exit(0);
}
