# PLAN — LGA Study Explorer (Tauri) delivery plan

**Baseline:** `reference/` · **Spec:** `SPEC.md` · **Design:** `DESIGN.md` · **Rules:** `AGENTS.md`
**Status board:** this file is updated as milestones progress. Tick tasks as they complete.

Estimates are **ideal engineering days** for one agent working full time, including tests and
documentation. Milestones are sequential gates; tasks inside a milestone may overlap.

---

## 0. Prerequisites

- [ ] `git init` + `.gitignore` (`node_modules/`, `dist/`, `src-tauri/target/`, `.env*`, `*.log`)
- [ ] Toolchain confirmed: Node 20+ (24 present), Rust ≥ 1.90 (1.99 present), `npm`
- [ ] Platform build deps for Tauri 2 on Linux: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`,
      `libayatana-appindicator3-dev`, `librsvg2-dev`, `patchelf`, `libssl-dev`
      (`sudo apt install` — required before `cargo build` on the Linux dev machine)
- [ ] GitHub repository decided for releases (`SPEC.md` A4) and a signing key generated:
      `npm run tauri signer generate` → private key stored in CI secrets **only**
- [ ] Reference facts re-verified: 436 institutions / 4,225 courses / 5 countries

---

## M0 — Documentation set  ✅ complete

| # | Task | Status |
|---|---|---|
| 0.1 | Analyse `reference/` (mock shell, 9 screens, filter engine, idle reset, data pipeline) | ✅ |
| 0.2 | Verify upstream `visa-website/scraper/data/processed` schema, sizes, public access | ✅ |
| 0.3 | `SPEC.md` — requirements, schema v2, update system, NFRs, acceptance gate | ✅ |
| 0.4 | `DESIGN.md` — tokens, typography, layout, components, screens, motion system | ✅ |
| 0.5 | `AGENTS.md` — repo map, ground rules, commands, conventions, DoD | ✅ |
| 0.6 | `SKILL.md` + `.opencode/skills/*` (4 skills) + `opencode.json` | ✅ |
| 0.7 | `PLAN.md` — this document | ✅ |

**Gate:** user reviews and approves the five documents and the skills before any product code.

---

## M1 — Project scaffold (≈2 d)

| # | Task | Depends | Notes |
|---|---|---|---|
| 1.1 | Vite + React 19 + TS + Tailwind v4 + ESLint/Prettier + Vitest | 0.x | `npm create tauri-app` baseline, then adjust |
| 1.2 | `src-tauri` Tauri 2 shell: window config (fullscreen, `#0B1F3A`, no menu), CSP, asset protocol scope, capabilities | 1.1 | `SPEC` §7.2, §9 |
| 1.3 | Hash router with all nine routes wired to placeholder screens | 1.1 | route table `SPEC` §6 |
| 1.4 | `tokens.css` + `base.css` + Tailwind `@theme` + self-hosted Montserrat/Inter | 1.1 | `DESIGN` §2–3 |
| 1.5 | TopBar + NavPill + Breadcrumbs + Button + Toast shells | 1.4 | |
| 1.6 | `scripts/import-reference-data.mjs` → `src/assets/data/*.json` + image copy | 0.x | schema v2, `SPEC` §7.1 |
| 1.7 | `scripts/check-parity.mjs` + vitest parity test | 1.6 | asserts 436 / 4,225 / golden records |
| 1.8 | Dev-vs-release behaviour: fullscreen only in release, windowed 1600×900 in dev | 1.2 | |

**Gate G1:** `npm run tauri dev` opens windowed; release build opens fullscreen on the welcome
screen with the correct tokens, fonts and nav. `npm test` proves the bundled snapshot matches the
reference data.

---

## M2 — Data foundation (≈3 d)

| # | Task | Depends | Notes |
|---|---|---|---|
| 2.1 | `src/data/types.ts` (schema v2) + `content.ts` (COUNTRIES, SERVICES, WHY, STEPS, DOCS, CONTACT ported verbatim) | 1.6 | `SPEC` §7, §5 FR-16 |
| 2.2 | Bundle loader: `catalogue_active()` command + asset-protocol reads + store | 1.2 | never block startup |
| 2.3 | Index maps (by key, by id, by country) + memoised selectors | 2.1 | NFR-03 |
| 2.4 | Per-country detail loader with session cache + failure fallback | 2.2 | FR-18 |
| 2.5 | Filter engine: scope state, chips, budget, extras, sort, paging | 2.3 | FR-10, parity with `match()` |
| 2.6 | Unit tests: filters, currency/US$ conversion, duration/date formatting, intake freshness | 2.5 | FR-23, NFR-16 |
| 2.7 | `RichText` allowlist renderer + fixture tests (XSS payloads) | 2.1 | FR-26 |
| 2.8 | Logo loader with crest fallback + disk cache hooks (cache impl in M6) | 2.2 | FR-22 |

**Gate G2:** data drives every screen from the bundled snapshot with zero network; parity and
filter tests green.

---

## M3 — Screen parity (≈5 d)

Order follows the consultant's conversation; each task ends with a side-by-side check at
1920×1080 against `reference/`.

| # | Task | FR |
|---|---|---|
| 3.1 | `Welcome` (hero, stats, contact) | FR-01 |
| 3.2 | `Destinations` (5-up cards, counts) | FR-02 |
| 3.3 | `Country` + tabs + fact strip + Why/Visa bodies | FR-03 |
| 3.4 | `Country → Universities` (rail + result grid + sort + paging) | FR-10 |
| 3.5 | `University` (hero, facts, About/Read more, At a glance, course list, inherited filters) | FR-04 |
| 3.6 | `Course` (kv grid, overview, intakes, work panel, shortlist, stepper) | FR-05 |
| 3.7 | `CourseFinder` (global search, US$ budget, paging) | FR-06 |
| 3.8 | `Shortlist` (table, copy summary, reset) | FR-07 |
| 3.9 | `Services`, `Journey` (verbatim content) | FR-08, FR-09 |
| 3.10 | Idle reset with fake-timer tests | FR-12 |
| 3.11 | Keyboard map (Esc/Home/←/→) + toast behaviours | FR-13, FR-15 |
| 3.12 | Visual parity sign-off checklist per route | all |

**Gate G3:** a consultant can complete a full consultation with the network unplugged, and the
parity checklist is signed off route by route.

---

## M4 — Design & motion polish (≈3 d)

| # | Task | Notes |
|---|---|---|
| 4.1 | `variants.ts` + `usePageTransition` (AnimatePresence on `<main>`) | `DESIGN` §7.3 |
| 4.2 | Welcome GSAP timeline (hero scale, headline stagger, gold wipe, count-up) | |
| 4.3 | Destinations stagger + hover scale; country fact/tab motion (`layoutId`) | |
| 4.4 | Filter re-layout with `layout`, result-set `AnimatePresence`, shortlist badge spring | |
| 4.5 | Parallax on university hero + direction-aware course stepper | |
| 4.6 | `useMotionEnabled` single reduced-motion flag across both libraries | NFR-11 |
| 4.7 | Theme: default dark + Auto/Light/Dark override persisted in `tauri-plugin-store` | FR-25 |
| 4.8 | Skeletons, empty states, focus rings, aria audit (axe) | NFR-11 |
| 4.9 | Performance pass: 60 fps, no task > 50 ms, memory < 400 MB | NFR-04/05 |

**Gate G4:** motion matches `DESIGN §7.3`, reduced-motion pass complete, frame chart clean.

---

## M5 — Desktop shell (≈2 d)

| # | Task | Notes |
|---|---|---|
| 5.1 | `window.rs`: fullscreen defaults, `--kiosk` (decorations off, always-on-top, cursor hidden, F11 inert) | FR-14 |
| 5.2 | Global shortcuts F11 / Ctrl-Cmd+Q via `tauri-plugin-global-shortcut` | FR-13 |
| 5.3 | External links through `tauri-plugin-opener` (https/mailto only), never inside the app | parity with mock |
| 5.4 | Clipboard write for “Copy summary” via `tauri-plugin-clipboard-manager` + capability | FR-07 |
| 5.5 | CSP finalisation (`default-src 'self' asset:`, `img-src 'self' https: data:`, `connect-src` limited to the two raw hosts + release host) | NFR-08 |
| 5.6 | Icons, app metadata, identifiers, product name, version `2.0.0` | |
| 5.7 | Window close/quit behaviour: `window-all-closed` quits (mock parity) | |

**Gate G5:** kiosk run-through on a large screen: no way out except `Ctrl/Cmd+Q`; external links
open the system browser; CSP violations = 0 in the console.

---

## M6 — Catalogue updater (≈4 d)

| # | Task | Depends | Notes |
|---|---|---|---|
| 6.1 | `catalogue/store.rs`: bundle layout, `current.json` atomic pointer, prune, rollback | 2.2 | `SPEC` §7.2 |
| 6.2 | `catalogue/fetch.rs`: fingerprint → staged download → progress events → validation | 6.1 | FR-19 |
| 6.3 | `catalogue/transform.rs` (Rust port of `tools/build_data.py`, minus image work) + `LOCFIX` | 6.1 | `SPEC` §8.3 |
| 6.4 | `catalogue/sanitize.rs` allowlist + unit tests (XSS fixtures) | 6.3 | FR-26 |
| 6.5 | Scheduler: launch + 6 h + on-demand + backoff; failure/toast states | 6.2 | FR-19/20 |
| 6.6 | Frontend hot-swap: store update + toast + footnote refresh, no restart | 6.5 | FR-21 |
| 6.7 | Status chip + popover (states, counts, **Check for updates**) | 6.5 | FR-20 |
| 6.8 | Logo disk cache (LRU 50 MB) served through the asset protocol | 6.1 | FR-22 |
| 6.9 | Parity tests: Rust transform vs reference counts/golden records (`LGA_UPSTREAM_DIR` gated) | 6.3 | |
| 6.10 | Failure-injection tests: kill mid-download, corrupt JSON, offline, stale fingerprint | 6.2 | NFR-12 |

**Gate G6:** with a synthetic `summary.json` change the app downloads, swaps and re-renders with
no restart; killing the app mid-update leaves a working bundle; airplane mode shows the correct
status chip.

---

## M7 — App self-update (≈2 d)

| # | Task | Notes |
|---|---|---|
| 7.1 | `tauri-plugin-updater` + `tauri-plugin-process`; `createUpdaterArtifacts: true`; pubkey pinned | FR-24 |
| 7.2 | Release channel: GitHub Releases `latest.json` generated in CI with all four platform keys | |
| 7.3 | UI: delayed launch check, 24 h timer, **Check for app update**, banner → `downloadAndInstall` → `relaunch` | FR-24 |
| 7.4 | CI workflow (GitHub Actions): matrix build (win x64, macos arm64/x64, linux AppImage), sign, publish | |
| 7.5 | Install-and-update rehearsal on a clean machine per OS | NFR-14 |

**Gate G7:** a prerelease version installs on a test machine on all three OSes after one click;
a bad signature is rejected and logged.

---

## M8 — Packaging, QA & handover (≈3 d)

| # | Task | Notes |
|---|---|---|
| 8.1 | Windows NSIS installer (per-machine, desktop shortcut), macOS `.dmg`, Linux AppImage (+ optional deb) | FR-14 |
| 8.2 | Full acceptance run of `SPEC.md` §10 (automated + manual checklists) | |
| 8.3 | Soak test 8 h on the welcome screen; memory/CPU check | NFR-13 |
| 8.4 | Airplane-mode full consultation; 4K + 1080p + laptop-mirror pass | NFR-07 |
| 8.5 | Operator handover: `reference/README.md`-style usage doc updated for the new app, data-source FAQ | |
| 8.6 | Tag `v2.0.0`, publish release, close milestone | |

**Gate G8 (release):** `SPEC.md` §10 checklist fully ticked.

---

## Dependency summary

```
M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8
              └───────────────┘        └─ M7 needs M6? no: M7 depends on M5 only
```
M4 (motion) and M5 (shell) can run in parallel after M3. M6 depends on M2 (data loaders) and M5
(CSP/opener capabilities). M7 depends on M5 (window/plugins) but not on M6.

**Total: ≈24 ideal days** (M0 1, M1 2, M2 3, M3 5, M4 3, M5 2, M6 4, M7 2, M8 3 incl. review).

---

## Dependencies (third-party)

| Package | Purpose | Where recorded |
|---|---|---|
| `@tauri-apps/cli` 2, `tauri` 2 (crate) | shell | `PLAN` M1 |
| `tauri-plugin-updater`, `tauri-plugin-process` | FR-24 | `SPEC` §8.2 |
| `tauri-plugin-opener`, `tauri-plugin-clipboard-manager`, `tauri-plugin-store`, `tauri-plugin-global-shortcut` | FR-07/14/13/25 | `SPEC` §5, `DESIGN` §2.5 |
| `react`, `react-dom` 19, `react-router-dom` 7 | UI + routes | `SPEC` §6 |
| `zustand` | session/filter/catalogue stores | `SPEC` §5 |
| `motion` (Motion for React) | component motion | `DESIGN` §7.1 |
| `gsap` (+ `ScrollTrigger`) | page choreography | `DESIGN` §7.1 |
| `tailwindcss` 4 + `@tailwindcss/vite` | styling | `DESIGN` §2 |
| `html-react-parser` | `RichText` allowlist rendering | `SPEC` FR-26 |
| `@fontsource/montserrat`, `@fontsource/inter` | offline fonts | `DESIGN` §3 |
| `vite`, `typescript`, `vitest`, `@testing-library/react`, `eslint`, `prettier` | toolchain | `AGENTS` §4 |
| Rust: `serde`, `serde_json`, `tokio`, `reqwest`(rustls), `sha2`, `walkdir`, `thiserror`, `tracing`, `chrono` | updater core | `SPEC` §8 |

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
| R11 | Electron mock and Tauri app drift during transition | M | M | parity sign-off in M3.12; after G3 the reference becomes documentation only | a FR references mock behaviour that changed |

---

## Traceability (FR → milestone → gate)

| FR group | Milestone | Gate |
|---|---|---|
| FR-01…FR-11 | M1–M3 | G2, G3 |
| FR-12…FR-16 | M3, M5 | G3, G5 |
| FR-17, FR-18, FR-21, FR-22, FR-23, FR-26 | M2 | G2 |
| FR-19, FR-20 | M6 | G6 |
| FR-24 | M7 | G7 |
| FR-25 | M4 | G4 |
| NFR-01…NFR-06 | M4, M8 | G4, G8 |
| NFR-07…NFR-13 | M5, M6, M8 | G5, G6, G8 |
| NFR-14…NFR-16 | M7, M8 | G7, G8 |
