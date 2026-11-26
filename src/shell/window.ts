/**
 * Thin bridge to the desktop shell (SPEC FR-13/FR-14). Everything degrades to the browser
 * Fullscreen API under `npm run dev`, so the same UI works with and without Tauri.
 *
 * F11 and Ctrl/Cmd+Q are handled in the webview (see `useGlobalKeys`) rather than through
 * OS-wide global shortcuts: a global F11 would be stolen from every other app on the
 * consultant's machine while this one is running.
 */

import { isTauri } from '../data/catalogue';

export interface ShellInfo {
  kiosk: boolean;
}

let shellInfo: Promise<ShellInfo> | undefined;

/** Kiosk flag from the Rust side (`--kiosk`); `false` in the browser. Cached for the session. */
export function getShellInfo(): Promise<ShellInfo> {
  shellInfo ??= (async (): Promise<ShellInfo> => {
    if (!isTauri()) return { kiosk: false };
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<ShellInfo>('shell_info');
    } catch {
      return { kiosk: false };
    }
  })();
  return shellInfo;
}

/** F11 / top-bar button. Inert in kiosk mode (FR-14: no way out except Ctrl/Cmd+Q). */
export async function toggleFullscreen(): Promise<void> {
  if ((await getShellInfo()).kiosk) return;
  if (isTauri()) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      await win.setFullscreen(!(await win.isFullscreen()));
      return;
    } catch {
      /* fall through to the browser API */
    }
  }
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    /* fullscreen refused (e.g. not triggered by a user gesture): nothing to do */
  }
}

/** Ctrl/Cmd+Q — the only exit in kiosk mode. No-op in the browser. */
export async function quitApp(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('app_quit');
  } catch {
    /* the shell is already going away */
  }
}
