// Prevents an extra console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // WebKitGTK's DMA-BUF renderer flickers, tears and stalls repaints on many Linux GPU drivers
    // (notably NVIDIA) — the "page loading and animation glitches" seen on office machines.
    // Disable it unless the user set the variable themselves. Must happen before any thread or
    // the webview starts, i.e. here.
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
    lga_study_visa_explorer_lib::run()
}
