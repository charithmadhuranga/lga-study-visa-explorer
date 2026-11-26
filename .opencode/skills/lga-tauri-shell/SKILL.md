---
name: LGA Tauri Shell
description: The Rust desktop shell of LGA Study Visa Explorer - window and fullscreen/kiosk behaviour, shell commands (shell_info, app_quit), CSP and capabilities, plugins (clipboard, store, updater), packaging and signing for Windows/macOS/Linux, and the signed app self-update. Load for any src-tauri or packaging task.
---

# Tauri shell, security and releases

Requirements: `SPEC.md` §5 FR-13/FR-14/FR-24, §9 NFR-08/09/12/14; `AGENTS.md` §5 (Rust rules).
Target crate layout is in `AGENTS.md` §2.

## 1. Window configuration

`src-tauri/tauri.conf.json` (release behaviour):

```jsonc
{
  "productName": "LGA Study Visa Explorer",
  "version": "2.0.0",
  "identifier": "com.lgavisa.studyvisaexplorer",
  "app": {
    "windows": [{
      "title": "LGA Study Visa Explorer",
      "width": 1920, "height": 1080, "center": true,
      "fullscreen": true, "decorations": false,
      "backgroundColor": "#0B1F3A"
    }],
    "security": {
      "csp": { /* §3 */ },
      "assetProtocol": { "enable": true, "scope": ["$APPDATA/lga-study-visa-explorer/**/*", "$RESOURCE/**/*"] }
    }
  },
  "bundle": { "createUpdaterArtifacts": true, "targets": "all", "icon": [...] }
}
```

- **Dev vs release:** fullscreen is applied in Rust only under `#[cfg(not(debug_assertions))]`;
  `npm run tauri dev` must open a windowed 1600×900 window so the developer is not trapped.
- `--kiosk` (CLI flag, parity with `reference/main.js`) additionally sets
  `decorations(false)`, `always_on_top(true)`, `cursor_visible(false)`. It is parsed once into
  `window::LaunchMode` (managed state, unit-tested) and exposed to the UI through the
  `shell_info` command, which makes F11 inert. `Ctrl/Cmd+Q` still quits — deliberate parity
  (FR-14 AC).
- `window-all-closed` → `app.quit()` (Electron parity); no dock/taskbar surprises.
- Do not add a menu bar (`Menu.setApplicationMenu(null)` equivalent: no `menu` in the config).

## 2. Shortcuts

All keys are handled **in the webview** (`src/hooks/useGlobalKeys.ts`) — no
`tauri-plugin-global-shortcut` (SPEC §12 D12): OS-wide shortcuts would steal F11 from every other
app on the consultant's machine while this one runs.

| Key | Handler | Notes |
|---|---|---|
| `F11` | `shell/window.ts → toggleFullscreen()` → `getCurrentWindow().setFullscreen` | returns early when `shell_info().kiosk` |
| `Ctrl/Cmd+Q` | `shell/window.ts → quitApp()` → `app_quit` command → `app.exit(0)` | works in kiosk |
| `PageUp`/`PageDown`, `Esc`, `Home`, `←`, `→` | frontend keydown | see `lga-desktop` skill |

Capabilities needed: `core:window:allow-set-fullscreen`, `core:window:allow-is-fullscreen`
(the two commands are app commands, allowed by `core:default` + `generate_handler!`).

## 3. CSP (NFR-08)

Set `app.security.csp` explicitly; Tauri appends nonces/hashes for bundled code automatically.

```jsonc
{
  "default-src": "'self' asset: http://asset.localhost",
  "connect-src": "'self' asset: http://asset.localhost ipc: http://ipc.localhost https://raw.githubusercontent.com https://objects.githubusercontent.com https://github.com",
  "img-src": "'self' asset: http://asset.localhost https: data: blob:",
  "font-src": "'self'",
  "style-src": "'self' 'unsafe-inline'",
  "script-src": "'self'",
  "frame-src": "'none'", "object-src": "'none'", "base-uri": "'self'"
}
```

- `img-src https:` is deliberate: university logos come from the source image host and degrade to
  a crest when offline (FR-22).
- `style-src 'unsafe-inline'` is required because GSAP/Motion inject `<style>` elements and set
  inline keyframes; JavaScript-set `element.style` is unaffected either way.
- `connect-src` must stay limited to the two catalogue hosts and the release host — adding `https:`
  here would defeat the point.
- Zero CSP violations in the console is part of Gate G5.

## 4. Capabilities (`src-tauri/capabilities/default.json`)

Grant the minimum, per plugin:

```jsonc
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "clipboard-manager:allow-write-text",// FR-07 copy summary
    "store:default",                    // FR-25 appearance setting
    "updater:default"                   // FR-24 (check / download / install / download-and-install)
  ]
}
```

Rules: never `core:default` + broad fs/shell permissions “for later”; every new permission must be
justified by an FR; no dialog/fs/scope permissions are needed for the catalogue (Rust reads the
files itself and exposes them through the asset protocol).

## 5. External links & clipboard

- The product opens **no external links** (the mock has none either), so there is no opener
  plugin (SPEC §12 D12). If one is ever needed, add `tauri-plugin-opener` with a scope limited to
  `https://*` and `mailto:*`, record it in `PLAN.md`, and never navigate the main webview away.
- “Copy summary” writes plain text (format defined in `SPEC.md` FR-07) through
  `clipboard-manager`; fall back to `navigator.clipboard`; on total failure show the existing
  “Copy is not available here” toast — never a silent no-op.

## 6. App self-update (FR-24)

- Plugins: `tauri-plugin-updater` + `tauri-plugin-process` (`relaunch`).
- Config: `bundle.createUpdaterArtifacts: true`, `plugins.updater.pubkey` (pinned, **not** a file
  path), `plugins.updater.endpoints: ["https://github.com/<owner>/lga-study-visa-explorer/releases/latest/download/latest.json"]`,
  `plugins.updater.windows.installMode: "passive"`.
- Signing: `TAURI_SIGNING_PRIVATE_KEY` (+ optional `_PASSWORD`) from the environment **only** —
  `.env` files are ignored by Tauri and must not be used. Losing the key means installed copies can
  never update again: store it in CI secrets and a password manager.
- Flow in `updater.rs` + `src/store/`: check 10 s after launch and every 24 h and on demand →
  show `UpdateBanner` → user clicks → `downloadAndInstall()` with progress → `relaunch()`.
  **Never install without an explicit click** (a consultant is presenting; Windows additionally
  kills the process at install time).
- `latest.json` platform keys: `windows-x86_64`, `darwin-aarch64`, `darwin-x86_64`, `linux-x86_64`.
  Generate it in CI from the built artefacts (`.sig` contents go in `signature`, not a path).
- Linux: **AppImage is the only self-updating artefact** — ship it as the office default; deb/rpm
  get the notice but need a manual reinstall (document this).

## 7. Packaging matrix (M7/M8)

| OS | Artefact | Notes |
|---|---|---|
| Windows 10/11 x64 | NSIS `…-setup.exe` (+ `.sig`) | per-machine install, desktop shortcut, oneClick false |
| macOS 12+ | `.app` + `.dmg`, updater bundle `.app.tar.gz` (+ `.sig`) | arm64 and x86_64 (or universal); unsigned until an Apple Developer account exists — say so in the release notes |
| Linux | `.AppImage` (+ `.sig`) | optional `.deb`/`.rpm` without auto-update |

CI (GitHub Actions, `.github/workflows/release.yml`): tag `v*` → matrix build → sign with the CI
secret → upload artefacts → publish a release containing `latest.json`.

## 8. Commands exposed to the frontend

| Command | Purpose |
|---|---|
| `catalogue_active()` | returns `{ root, meta }` for the active bundle (asset-protocol reads) |
| `catalogue_check()` | on-demand fingerprint check (status popover) |
| `catalogue_status()` | current state for the status chip on boot |
| `open_external(url)` | validated system-browser open |
| `app_check_update()` | wraps the updater `check()` for the popover |

Emit events (Rust → JS): `catalogue://progress`, `catalogue://updated`, `catalogue://failed`.
Keep the command surface small; anything else belongs in the frontend.

## 9. Rust quality bar

- `cargo clippy --all-targets -- -D warnings` and `cargo fmt --check` green.
- Typed errors (`thiserror`) for the catalogue pipeline; `tracing` for logs; no `unwrap()` on
  I/O or network results outside tests.
- Every user-visible write is atomic (temp + rename + fsync): `current.json`, bundle files.
- Downloads and transforms run in `tokio::spawn`, report progress, and are cancellation-safe.
- Unit tests for: transform determinism, sanitisation payloads, store commit/rollback, and
  fingerprint comparison. Failure-injection tests (kill mid-download, corrupt JSON, offline)
  are part of Gate G6.

## 10. Debugging checklist

| Symptom | Likely cause |
|---|---|
| Blank screen in release | CSP missing `asset:` / `http://asset.localhost` in `default-src`/`connect-src` |
| “asset protocol not configured to allow the path” | scope pattern doesn't match the resolved absolute path (use `$APPDATA/…/**/*`, not `*/**`) |
| Fullscreen in dev traps you | fullscreen must be `cfg(not(debug_assertions))` |
| F11 does nothing | running with `--kiosk` (by design), or focus is inside a text field that swallowed it |
| Update never offered | pubkey mismatch, `latest.json` platform key wrong, or version not > current |
| Update installs without a click | flow bug — installation must be user-triggered (FR-24 AC) |
| Logos missing offline | expected (crest fallback); check `img-src` allows `https:` when online |
| Console CSP violations | compare against §3, then check which resource class changed |
