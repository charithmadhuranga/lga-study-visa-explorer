//! Window behaviour: release builds open fullscreen on the office screen, `--kiosk` locks the
//! app down (no decorations, always on top, cursor hidden, F11 inert — reference `main.js`
//! parity, FR-14). Dev builds stay windowed so a developer is never trapped (PLAN task 1.8).

use tauri::{AppHandle, Manager, WebviewWindow};

/// Launch mode, parsed once from the command line and shared with the frontend through
/// the `shell_info` command.
#[derive(Debug, Clone, Copy, Default)]
pub struct LaunchMode {
    pub kiosk: bool,
}

impl LaunchMode {
    pub fn from_args<I, S>(args: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: AsRef<str>,
    {
        Self {
            kiosk: args.into_iter().any(|arg| arg.as_ref() == "--kiosk"),
        }
    }
}

pub fn configure(app: &AppHandle, mode: LaunchMode) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };

    if cfg!(debug_assertions) && !mode.kiosk {
        // `npm run tauri dev`: keep the 1600×900 window from tauri.conf.json.
        return Ok(());
    }

    apply(&window, mode.kiosk)
}

fn apply(window: &WebviewWindow, kiosk: bool) -> tauri::Result<()> {
    window.set_decorations(false)?;
    window.set_fullscreen(true)?;

    if kiosk {
        window.set_always_on_top(true)?;
        window.set_cursor_visible(false)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::LaunchMode;

    #[test]
    fn kiosk_flag_is_detected_anywhere_in_args() {
        assert!(LaunchMode::from_args(["app", "--kiosk"]).kiosk);
        assert!(LaunchMode::from_args(["app", "--kiosk", "--other"]).kiosk);
    }

    #[test]
    fn kiosk_is_off_by_default() {
        assert!(!LaunchMode::from_args(["app"]).kiosk);
        assert!(!LaunchMode::from_args(["app", "--kiosk=false", "kiosk"]).kiosk);
    }
}
