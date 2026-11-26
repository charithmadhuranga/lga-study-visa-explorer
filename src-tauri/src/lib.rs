//! LGA Study Visa Explorer desktop shell.
//!
//! The webview loads the built frontend; this crate owns window behaviour (fullscreen/kiosk),
//! the command surface the frontend may call, and plugin wiring. Data updates arrive in M6
//! (`catalogue` module, M6) and app self-updates (`updater` module, M7) plug in here.

pub mod catalogue;
mod commands;
mod window;

pub fn run() {
    let _ = tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .try_init();
    let mode = window::LaunchMode::from_args(std::env::args());

    tauri::Builder::default()
        .manage(mode)
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::catalogue_active,
            commands::catalogue_status,
            commands::catalogue_check,
            commands::shell_info,
            commands::app_quit
        ])
        .setup(move |app| {
            window::configure(app.handle(), mode)?;
            // Starts after a delay on a background task: never blocks startup (SPEC §8.1).
            catalogue::init(app.handle())?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building LGA Study Visa Explorer")
        .run(|app, event| {
            // Electron parity (reference/main.js): closing the only window quits the app on
            // every platform, so an office machine is never left with a hidden process.
            if let tauri::RunEvent::WindowEvent {
                event: tauri::WindowEvent::Destroyed,
                ..
            } = event
            {
                app.exit(0);
            }
        });
}
