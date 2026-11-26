//! Commands exposed to the frontend. Keep this surface small (AGENTS §5): anything else
//! belongs in the webview. Multi-MB data never crosses this bridge — the UI reads bundle
//! files through the asset protocol instead (SPEC §7.2).

use std::sync::Arc;

use serde::Serialize;
use tauri::{AppHandle, State};

use crate::catalogue::{ActiveBundle, Service, Status};
use crate::window::LaunchMode;

/// Which bundle the UI should read. `None` means "use the snapshot shipped inside the app" —
/// the first-run state, and the fallback whenever the store is missing or damaged (SPEC §7.2).
#[tauri::command]
pub fn catalogue_active(service: State<'_, Arc<Service>>) -> Option<ActiveBundle> {
    service.active()
}

/// Status-chip state (FR-20).
#[tauri::command]
pub fn catalogue_status(service: State<'_, Arc<Service>>) -> Status {
    service.status()
}

/// "Check for updates" (FR-20): wakes the background scheduler; never blocks the UI.
#[tauri::command]
pub fn catalogue_check(service: State<'_, Arc<Service>>) {
    service.check_now();
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
