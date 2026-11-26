# PLAN — LGA Study Visa Explorer (Tauri) delivery plan

**Baseline:** `reference/` · **Spec:** `SPEC.md` · **Design:** `DESIGN.md` · **Rules:** `AGENTS.md`
**Status board:** this file is updated as milestones progress. Tick tasks as they complete.

Estimates are **ideal engineering days** for one agent working full time, including tests and
documentation. Milestones are sequential gates; tasks inside a milestone may overlap.

---

## Status at a glance (2026-11-26)

| Milestone | State | Notes |
|---|---|---|
| M0 Docs | ✅ | v1.1 docs: rename + presentation redesign (SPEC FR-27/28, D10–D13; DESIGN v2) |
| M1 Scaffold | ✅ (gate partly open) | release-build fullscreen check pending a first `tauri build` |
| M2 Data foundation | ✅ | parity, filters, formatting, RichText tests green |
| M3 Screen parity | ✅ (sign-off pending) | all nine routes + idle reset + keys; sign-off now against DESIGN v2 |
| M4 Presentation redesign & motion | ✅ (audit pending) | axe audit + frame-chart pass still to do |
| M5 Desktop shell | ✅ (gate ⏳) | CSP finalised; kiosk run-through on the office screen pending |
| M6 Catalogue updater | ✅ (gate ⏳) | Rust updater, exact upstream parity, status chip, hot-swap, offline logo cache |
| M7 App self-update | ✅ (gate ⏳) | signed updater, CI + release workflows, key in Actions secrets |
| M8 Packaging & QA | ✅ v0.1.0 released | hands-on QA rows in docs/ACCEPTANCE.md ⏳ |
| M9 Stability & e2e | ✅ | Playwright suite (Chromium + WebKit), glitch fixes, movable window, Close button |

Legend: ✅ done · 🟡 in progress · ☐ not started · ⏳ needs a manual check on real hardware.

---

## 0. Prerequisites

- [x] `git init` + `.gitignore` (`node_modules/`, `dist/`, `src-tauri/target/`, `.env*`, `*.log`, `*.tsbuildinfo`)
- [x] Toolchain confirmed: Node 20+ (24 present), Rust ≥ 1.90 (1.99 present), `npm`
- [x] Platform build deps for Tauri 2 on Linux (`cargo check`/`clippy` build the crate)
- [ ] GitHub repository decided for releases (`SPEC.md` A4) and a signing key generated:
      `npm run tauri signer generate` → private key stored in CI secrets **only**
- [x] Reference facts re-verified: 436 institutions / 4,225 courses / 5 countries (`npm run data:parity`)

---

## M0 — Documentation set  ✅ complete

| # | Task | Status |
|---|---|---|
| 0.1 | Analyse `reference/` (mock shell, 9 screens, filter engine, idle reset, data pipeline) | ✅ |
| 0.2 | Verify upstream `visa-website/scraper/data/processed` schema, sizes, public access | ✅ |
| 0.3 | `SPEC.md` — requirements, schema v2, update system, NFRs, acceptance gate | ✅ |
| 0.4 | `DESIGN.md` — tokens, typography, layout, components, screens, motion system | ✅ (v2) |
| 0.5 | `AGENTS.md` — repo map, ground rules, commands, conventions, DoD | ✅ |
| 0.6 | `SKILL.md` + `.opencode/skills/*` (4 skills) + `opencode.json` | ✅ |
| 0.7 | `PLAN.md` — this document | ✅ |
| 0.8 | Rename to **LGA Study Visa Explorer** (`com.lgavisa.studyvisaexplorer`) across app, crate and docs | ✅ |

---

## M1 — Project scaffold (≈2 d)  ✅

| # | Task | Status |
|---|---|---|
| 1.1 | Vite + React 19 + TS + Tailwind v4 + ESLint/Prettier + Vitest | ✅ |
| 1.2 | `src-tauri` Tauri 2 shell: window config, CSP, asset protocol scope, capabilities | ✅ |
| 1.3 | Hash router with all nine routes (+ error boundary, unknown → destinations) | ✅ |
| 1.4 | `tokens.css` + `base.css` + `components.css` + Tailwind `@theme` + self-hosted fonts | ✅ (stylesheet import fixed 2026-11-26) |
| 1.5 | TopBar + chapter nav + Breadcrumbs + button system + Toast | ✅ |
| 1.6 | `scripts/import-reference-data.mjs` → `public/data/*.json` + image copy | ✅ |
| 1.7 | `scripts/check-parity.mjs` + vitest parity test | ✅ |
| 1.8 | Dev-vs-release behaviour: fullscreen only in release, windowed 1600×900 in dev | ✅ code · ⏳ verify in a release build |

**Gate G1:** `npm run tauri dev` opens windowed; release build opens fullscreen on the welcome
screen with the correct tokens, fonts and nav. `npm test` proves the bundled snapshot matches the
reference data. — *tests ✅; release-build check ⏳.*

---

## M2 — Data foundation (≈3 d)  ✅

| # | Task | Status |
|---|---|---|
| 2.1 | `src/data/types.ts` (schema v2) + `content.ts` (copy ported verbatim; `CONTACT_DETAILS`) | ✅ |
| 2.2 | Bundle loader: `catalogue_active()` command (stub until M6) + asset-protocol reads + store | ✅ |
| 2.3 | Index maps + selectors (incl. `countrySummary` for FR-28) | ✅ |
| 2.4 | Per-country detail loader with session cache + failure fallback | ✅ |
| 2.5 | Filter engine: scope state, chips, budget, extras, sort, paging | ✅ (stable-selector + inherit fixes 2026-11-26) |
| 2.6 | Unit tests: filters, currency/US$, duration/date formatting, intake freshness | ✅ |
| 2.7 | `RichText` allowlist renderer + XSS fixture tests | ✅ |
| 2.8 | Logo loader with crest fallback (disk cache in M6) | ✅ |

**Gate G2:** ✅ data drives every screen from the bundled snapshot with zero network; parity and
filter tests green.

---

## M3 — Screen parity (≈5 d)  ✅ (sign-off ⏳)

| # | Task | FR | Status |
|---|---|---|---|
| 3.1 | `Welcome` | FR-01 | ✅ |
| 3.2 | `Destinations` | FR-02 | ✅ |
| 3.3 | `Country` + tabs + facts + Why/Visa | FR-03 | ✅ |
| 3.4 | `Country → Universities` (rail + grid + sort + paging) | FR-10 | ✅ |
| 3.5 | `University` | FR-04 | ✅ |
| 3.6 | `Course` | FR-05 | ✅ |
| 3.7 | `CourseFinder` | FR-06 | ✅ |
| 3.8 | `Shortlist` (table, copy summary, reset) | FR-07 | ✅ |
| 3.9 | `Services`, `Journey` | FR-08, FR-09 | ✅ |
| 3.10 | Idle reset with fake-timer tests | FR-12 | ✅ |
| 3.11 | Keyboard map + toast behaviours | FR-13, FR-15 | ✅ |
| 3.12 | Sign-off per route at 1920×1080 — **now against DESIGN v2**, dark + light | all | ⏳ |

**Gate G3:** a consultant can complete a full consultation with the network unplugged, and the
sign-off checklist is ticked route by route.

---

## M4 — Presentation redesign & motion (≈4 d)  ✅ (audit ⏳)

Re-scoped 2026-11-26: the mock's look read as a website; the product replaces a pitch deck
(SPEC D10/D11). Work items:

| # | Task | Status |
|---|---|---|
| 4.1 | Token system v2: layered surfaces, space scale, radii, elevation, scrims (`DESIGN` §2–4) | ✅ |
| 4.2 | Chapter navigation (FR-27): numbered pills, sliding ink, shortlist badge, PageUp/PageDown | ✅ + tests |
| 4.3 | `PageHeader` slide header on every chapter screen; `Segmented`, `SourceNote`, `Icon`, `ContactLine` | ✅ |
| 4.4 | Restyle all nine screens (bands + glass tiles, numbered features, visa timeline, FAQ, journey timeline, CTA band, course kv tiles, sticky aside, stepper cards) | ✅ |
| 4.5 | Destination comparison view (FR-28) + `countrySummary` selector | ✅ + tests |
| 4.6 | Motion choreography per `DESIGN` §7.3 (GSAP mounts, Motion inks/badge/transitions) | ✅ |
| 4.7 | Single reduced-motion flag; count-up final value under reduced motion (bug fixed) | ✅ |
| 4.8 | Theme: default dark + top-bar dark/light toggle persisted in `tauri-plugin-store` | ✅ (`Auto` in M6 popover) |
| 4.9 | Empty / error states (`EmptyState`, `RouteError`), idle-dialog focus trap | ✅ |
| 4.10 | Accessibility audit (axe) | ☐ |
| 4.11 | Performance pass: 60 fps, no task > 50 ms, memory < 400 MB | ☐ ⏳ on office hardware |

Dropped: university-hero scroll parallax (scroll-linked motion distracts on a presentation
screen; `DESIGN` §7.3 no longer lists it).

**Gate G4:** motion matches `DESIGN §7.3`, reduced-motion pass complete, axe clean, frame chart clean.

---

## M5 — Desktop shell (≈2 d)  🟡

| # | Task | Status |
|---|---|---|
| 5.1 | `window.rs`: fullscreen defaults, `--kiosk` (`LaunchMode`, unit-tested) | ✅ |
| 5.2 | F11 / Ctrl-Cmd+Q / PageUp / PageDown handled in the webview + `shell_info`, `app_quit` commands (replaces `tauri-plugin-global-shortcut`, SPEC D12) | ✅ |
| 5.3 | External links — none exist in the product; `tauri-plugin-opener` not needed (SPEC D12) | ✅ n/a |
| 5.4 | Clipboard write for “Copy summary” via `tauri-plugin-clipboard-manager` + capability | ✅ |
| 5.5 | CSP finalisation: all network I/O is in Rust, so `connect-src` allows no external host | ✅ |
| 5.6 | Icons (LGA logo), app metadata, identifiers, product name, version `0.1.0` | ✅ |
| 5.7 | Window close/quit behaviour: closing the window quits (mock parity) | ✅ |

**Gate G5:** kiosk run-through on a large screen: no way out except `Ctrl/Cmd+Q`; CSP
violations = 0 in the console. — ⏳

---

## M6 — Catalogue updater (≈4 d)  ✅ (in-app gate ⏳)

| # | Task | Status |
|---|---|---|
| 6.1 | `catalogue/store.rs`: `updates/vN`, atomic `current.json`, prune (keep 2), dangling/corrupt pointer → snapshot | ✅ + tests |
| 6.2 | `catalogue/fetch.rs`: HTTP (rustls, OS certs) or local dir source; streamed download, progress, SHA-256 | ✅ + live test |
| 6.3 | `catalogue/transform.rs`: port of `build_data.py` (+ `LOCFIX`, rules 1–11) | ✅ + tests |
| 6.4 | `catalogue/sanitize.rs` allowlist + XSS fixtures | ✅ + tests |
| 6.5 | Scheduler: 8 s after launch, 6 h, on demand, backoff 1/5/15/60 min; status events | ✅ |
| 6.6 | Frontend hot-swap: `store/updates.ts` → `reload()` (keeps old data on failure) + toast | ✅ |
| 6.7 | Status chip + popover (`StatusPopover`): states, provenance, Check for updates, Auto/Light/Dark | ✅ + tests |
| 6.8 | Logo disk cache: `logo_src` command, https + known hosts only, image types, ≤ 1 MB each, LRU 50 MB, served through the asset protocol | ✅ + tests (live logo cached) |
| 6.9 | Upstream parity: Rust transform reproduces the bundled snapshot record for record (`npm run data:parity:upstream`) | ✅ 436 / 4,225 / 4,202 identical |
| 6.10 | Failure injection: crash before pointer swap, corrupt JSON, missing file, offline, stale data behind a new summary, suspiciously small catalogue | ✅ tests |

Live checks run 2026-11-26: HTTPS summary fetch ✅; full live update into a temp store (4,225
courses, progress to 100 %, 3.5 s) ✅.

**Gate G6:** with a synthetic `summary.json` change (`LGA_CATALOGUE_SOURCE=<dir>`) the app
downloads, swaps and re-renders with no restart; killing the app mid-update leaves a working
bundle; airplane mode shows the correct status chip. — *covered by unit/integration tests;
⏳ run once in the desktop app.*

---

## M7 — App self-update (≈2 d)  ✅ (first release + clean-machine rehearsal ⏳)

| # | Task | Status |
|---|---|---|
| 7.1 | `tauri-plugin-updater` + `tauri-plugin-process`; `createUpdaterArtifacts: true`; pubkey pinned; minimal capabilities | ✅ |
| 7.2 | Release channel: `latest.json` generated by `tauri-action` into a **draft** GitHub release on tag `vX.Y.Z` (all four platform keys) | ✅ workflow |
| 7.3 | UI: `store/appUpdate.ts` (10 s, 24 h, on demand), `UpdateBanner`, `AppVersion` in the popover → `downloadAndInstall` with progress → `relaunch`; never installs without a click | ✅ + tests |
| 7.4 | CI: `ci.yml` (checks on every push/PR) + `release.yml` (Windows NSIS, macOS arm64/x64, Linux AppImage/deb; tag/version guard; manual dry run uploads artefacts) | ✅ |
| 7.5 | Install-and-update rehearsal on a clean machine per OS | ⏳ needs the first two releases |

Signing key generated 2026-11-26 and stored outside the repo (`~/.tauri/`), uploaded to the
repo's Actions secrets. Local signed AppImage build verified (artefact + `.sig`).

**Gate G7:** a prerelease version installs on a test machine on all three OSes after one click;
a bad signature is rejected and logged. — ⏳ v0.1.1 published 2026-11-27: confirm an installed v0.1.0 offers and installs it on each OS.

---

## M8 — Packaging, QA & handover (≈3 d)  ✅ v0.1.0 released (hands-on QA ⏳)

| # | Task | Status |
|---|---|---|
| 8.1 | Installers: Windows NSIS (current-user, no admin, licence page, Start menu + optional desktop shortcut), macOS `.dmg` (arm64, x64), Linux AppImage + deb; publisher/copyright/category metadata | ✅ |
| 8.2 | Acceptance run of `SPEC.md` §10 → [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md) | ➖ automated ✅, hands-on ⏳ |
| 8.3 | Soak test 8 h on the welcome screen; memory/CPU check | ⏳ office PC |
| 8.4 | Airplane-mode full consultation; 4K + 1080p + laptop-mirror pass | ⏳ office screen |
| 8.5 | Operator handover: [`docs/OPERATOR-GUIDE.md`](docs/OPERATOR-GUIDE.md), README, CHANGELOG | ✅ |
| 8.6 | Tag `v0.1.0`, publish the release with installers | ✅ |

Windows installs per user rather than per machine (SPEC D16): no administrator rights are
needed to install or to apply updates, which matters on office PCs without admin accounts.

**Gate G8 (release):** `SPEC.md` §10 checklist fully ticked — v0.1.0 ships for in-office trials
with the ⏳ rows open; close them before 1.0.0.

---

## M9 — Stability & end-to-end suite (≈2 d)  ✅

Raised by hands-on testing of v0.1.0: page-load and animation glitches (fullscreen and
windowed), a window that could not be moved, no close button, slow / stuck data loading.

| # | Task | Status |
|---|---|---|
| 9.1 | Playwright suite (`e2e/`): every route, navigation, clicker keys, drill-down, scroll position, rapid navigation, flows, idle reset, close dialog, performance; glitch detectors for stuck elements, overflow, long tasks, console errors | ✅ 28 specs × 6 projects (Chromium + WebKit; fullscreen, windowed, slow CPU, reduced motion) |
| 9.2 | Mount animations via `useMountAnimation`: layout effect (no flash), CSS transitions suspended during GSAP, props cleared; finder never re-animates on filtering | ✅ |
| 9.3 | Navigation: instant scroll-to-top (no smooth scroll racing the transition); old page leaves instantly, new page fades in 0.32 s; search results follow typing via `useDeferredValue` | ✅ |
| 9.4 | Window: decorations only removed in kiosk (movable/closable after F11), hidden until configured, min size; Close button with confirmation (hidden in kiosk) | ✅ |
| 9.5 | Linux: `WEBKIT_DISABLE_DMABUF_RENDERER=1` (NVIDIA/WebKitGTK flicker) | ✅ |
| 9.6 | Data: `logo_src`/`catalogue_active` async (off the UI thread), logo lookup by direct stat; minified snapshot (catalogue 3.25 → 2.54 MB); snapshot carries the real upstream `generatedAt`, so a fresh install no longer re-downloads identical data on first launch | ✅ |
| 9.7 | CI: `e2e` job runs the full suite in Chromium and WebKit, uploads report + traces on failure | ✅ |
| 9.8 | Weak-hardware pass (found by CI's GPU-less WebKit and a new 4× slow-CPU Chromium project): no full-screen photo zooms or backdrop blur; `decoding="async"` images; memoised country/finder chip options and results; `<html data-animating>` signal so tests wait for real completion | ✅ Canada page freeze 363 → ≤ 63 ms, finder 117 → ~55 ms, typing 1,350 → ~920 ms (4× throttled) |

Measured (Chromium, production build): every route ready 0.5–1.1 s cold; no task ≥ 50 ms on
route changes; search keeps up with typing. WebKit: all specs green.

---

## Dependency summary

```
M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8
              └───────────────┘        └─ M7 needs M6? no: M7 depends on M5 only
```
M4 (motion) and M5 (shell) can run in parallel after M3. M6 depends on M2 (data loaders) and M5
(CSP capabilities). M7 depends on M5 (window/plugins) but not on M6.

**Total: ≈25 ideal days** (M0 1, M1 2, M2 3, M3 5, M4 4, M5 2, M6 4, M7 2, M8 3 incl. review).

---

## Dependencies (third-party)

| Package | Purpose | Where recorded |
|---|---|---|
| `@tauri-apps/cli` 2, `tauri` 2 (crate) | shell | `PLAN` M1 |
| `tauri-plugin-updater`, `tauri-plugin-process` (JS + crate, added in M7 — not installed before) | FR-24 | `SPEC` §8.2 |
| `tauri-plugin-clipboard-manager`, `tauri-plugin-store` | FR-07/25 | `SPEC` §5, `DESIGN` §2.5 |
| ~~`tauri-plugin-opener`, `tauri-plugin-global-shortcut`~~ | removed 2026-11-26 | `SPEC` §12 D12 |
| `react`, `react-dom` 19, `react-router-dom` 7 | UI + routes | `SPEC` §6 |
| `zustand` | session/filter/catalogue stores | `SPEC` §5 |
| `motion` (Motion for React) | component motion | `DESIGN` §7.1 |
| `gsap` (core only) | page choreography | `DESIGN` §7.1 |
| `tailwindcss` 4 + `@tailwindcss/vite` | styling | `DESIGN` §2 |
| `html-react-parser` | `RichText` allowlist rendering | `SPEC` FR-26 |
| `@fontsource/montserrat`, `@fontsource/inter` | offline fonts | `DESIGN` §3 |
| `vite`, `typescript`, `vitest`, `@testing-library/react`, `eslint`, `prettier` | toolchain | `AGENTS` §4 |
| Rust: `serde`, `serde_json`, `tokio` (time, sync, fs, io-util), `reqwest` 0.13 (`rustls`, `gzip`), `sha2`, `thiserror`, `tracing`, `tracing-subscriber` (fmt), `chrono` (clock) | updater core | `SPEC` §8 |
| Rust dev: `tempfile` | store/updater tests | `AGENTS` §5 |
| `@playwright/test` (dev) | end-to-end suite, NFR-17 | `AGENTS` §4–5 |

No other runtime dependencies may be introduced without updating this table.

---

## Risk register

| # | Risk | L | I | Mitigation | Trigger to act |
|---|---|---|---|---|---|
| R1 | Rust transform diverges from `build_data.py` → wrong counts/fees | M | H | golden-record parity tests (6.9), port table in `SPEC` §8.3, keep both bundles side by side | any parity mismatch > 0 |
| R2 | Upstream schema changes without notice | M | H | fingerprint check + strict validation, keep last 2 bundles, log and alert in status chip | validation failure |
| R3 | Upstream repo goes private or is renamed | L | H | endpoints are config constants; fallback = bundled data (app still works) | 404 on fingerprint |
| R4 | GSAP + Motion fighting over the same element | M | M | `DESIGN` §7.1 split + review checklist | double tweens in a route change |
| R5 | Linux auto-update only works for AppImage | H | M | ship AppImage as the default Linux artefact; document deb/rpm manual reinstall | M7.1 |
| R6 | macOS signing/notarisation not available (Gate G7 fails on mac) | M | M | ship unsigned-with-instructions build; notarisation is a release-blocker only for public distribution | M7.4 |
| R7 | Hotlinking `photos.applyboard.com` blocked/CDN change | M | L | crest fallback already designed (FR-22), optional local logo cache | broken images in QA |
| R8 | 4K scaling or low-DPI mismatch makes type unreadable | L | M | `clamp()` root scale; verify at 4K in M8.4 | any text < 16 px at 1080p |
| R9 | Update downloads during a consultation consume bandwidth | M | L | only fingerprint on the 6 h timer; big download starts only after a fingerprint change; progress shown but never blocking | consultant reports lag |
| R10 | Idle timer frustrates long consultations | M | L | exact parity (4 min + 20 s) + “Continue consultation”; any input while dialog is open keeps the session | consultant feedback |
| R11 | Electron mock and Tauri app drift during transition | M | M | content/behaviour parity tests; the look is owned by DESIGN v2 (D10); after G3 the reference becomes documentation only | a FR references mock behaviour that changed |
| R13 | Linux AppImage is ~89 MB (bundles WebKit), above NFR-06's 40 MB installer target | H | L | NFR-06 applies to the Windows/macOS installers; document AppImage size; `.deb` is ~10× smaller | release review |
| R12 | LGA prefers a different chapter order or wording for their pitch | M | L | chapters are one data table (`src/data/chapters.ts`); copy lives in `content.ts` | consultant feedback in sign-off |

---

## Traceability (FR → milestone → gate)

| FR group | Milestone | Gate |
|---|---|---|
| FR-01…FR-11 | M1–M3 | G2, G3 |
| FR-12…FR-16 | M3, M5 | G3, G5 |
| FR-17, FR-18, FR-21, FR-22, FR-23, FR-26 | M2 | G2 |
| FR-19, FR-20 | M6 | G6 |
| FR-24 | M7 | G7 |
| FR-25, FR-27, FR-28 | M4 | G4 |
| NFR-01…NFR-06 | M4, M8 | G4, G8 |
| NFR-07…NFR-13 | M5, M6, M8 | G5, G6, G8 |
| NFR-14…NFR-16 | M7, M8 | G7, G8 |
