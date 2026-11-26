---
name: LGA Tauri Shell
description: The Rust desktop shell of LGA Study Visa Explorer - window and fullscreen/kiosk behaviour, shell commands (shell_info, app_quit), CSP and capabilities, plugins (clipboard, store, updater, process), packaging and signing for Windows/macOS/Linux, and the signed app self-update. Load for any src-tauri or packaging task.
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

## 6. App self-update (FR-24) — implemented (M7)

- Plugins: `tauri-plugin-updater` + `tauri-plugin-process`, registered in `lib.rs`;
  capabilities `updater:allow-check`, `updater:allow-download-and-install`, `process:allow-restart`.
- Config (`tauri.conf.json`): `bundle.createUpdaterArtifacts: true`; `plugins.updater.pubkey`
  (the key's **contents**, pinned); endpoint
  `https://github.com/charithmadhuranga/lga-study-visa-explorer/releases/latest/download/latest.json`;
  `plugins.updater.windows.installMode: "passive"`.
- Frontend: `src/store/appUpdate.ts` (check 10 s after launch, every 24 h, on demand; plugin
  calls behind `updaterBackend` so tests inject fakes) → `UpdateBanner` under the top bar and
  `AppVersion` in the status popover → click → `downloadAndInstall()` with progress →
  `relaunch()`. **Never installs without an explicit click.** A failed check is quiet (popover
  only); a failed install (e.g. signature mismatch) keeps the offer and shows the error.
- Linux: **AppImage is the only self-updating artefact**; the `.deb` needs a manual reinstall.

### Signing key custody

- Generated 2026-11-26 with `tauri signer generate`, kept **outside the repo** at
  `~/.tauri/lga-study-visa-explorer.key` (+ `.key.password`, `.key.pub`), mode 600.
- In GitHub Actions secrets: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
- **Back up the key and password in a password manager.** Losing them means installed copies
  can never update again (they only trust the pinned public key). Never paste either into a
  file in this repo, an issue, a log or a chat.
- Local signed build (Linux): `TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/lga-study-visa-explorer.key)"
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$(cat ~/.tauri/lga-study-visa-explorer.key.password)"
  npx tauri build --bundles appimage`.

## 7. Packaging & release (`.github/workflows/release.yml`)

| OS | Artefact (matrix `args`) | Notes |
|---|---|---|
| Windows 10/11 x64 | NSIS `…-setup.exe` + `.sig` (`--bundles nsis`) | passive update install |
| macOS arm64 / x64 | `.app` + `.dmg`, updater `.app.tar.gz` + `.sig` (`--target …`) | unsigned/not notarised until an Apple Developer account exists (PLAN R6) |
| Linux x64 | `.AppImage` + `.sig`, `.deb` (`--bundles appimage,deb`) | built on ubuntu-22.04 for glibc reach |

How to release:

1. Bump the version in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`
   (the workflow refuses a tag that does not match).
2. `git tag vX.Y.Z && git push origin vX.Y.Z` → all four builds → a **draft** release with the
   installers, signatures and `latest.json`.
3. Review the draft, then **Publish** it. Only then do installed apps see the update
   (`/releases/latest/` ignores drafts and pre-releases).

Dry run: *Actions → Release → Run workflow* builds and signs everything and uploads the
installers as workflow artefacts — no release, nothing reaches installed apps.

`.github/workflows/ci.yml` runs typecheck, lint, tests, data parity, build, `cargo fmt`,
`clippy` and `cargo test` on every push to `main` and every pull request (NFR-15).

## 8. Commands exposed to the frontend

| Command | Purpose |
|---|---|
| `catalogue_active()` | `{ root, meta, source }` of the committed bundle, or `null` → embedded snapshot |
| `catalogue_status()` | current updater state for the status chip on boot |
| `catalogue_check()` | wake the scheduler now ("Check for updates") |
| `logo_src(url)` | cached logo path, or `null` (+ background download) — FR-22 |
| `shell_info()` | `{ kiosk }` — makes F11 inert in kiosk mode |
| `app_quit()` | Ctrl/Cmd+Q |

App updates use the updater/process plugin APIs directly from `src/store/appUpdate.ts`; there is
no custom command for them. No `open_external` — the product opens no external links (D12).

Events (Rust → JS): `catalogue://status` (every state change, includes download progress),
`catalogue://updated` (after a commit), `catalogue://failed` (non-offline failures).
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
