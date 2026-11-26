# AGENTS — how to work in this repository

Read this before touching anything. It is loaded automatically by OpenCode as project
instructions, and it is the rulebook for humans too.

## 1. What this project is

A **cross-platform (Windows / macOS / Linux) full-screen presentation desktop app** that LGA Visa
consultants drive by hand on a large office screen while explaining services, partner
universities, courses, visas and work rights to prospective students.

Stack: **Tauri 2 (Rust) + React + TypeScript + Vite + Tailwind CSS v4**, motion by
**GSAP** (page choreography) and **`motion`** (component motion).

**Documents are the contract.** In this order of authority:

| File | Says |
|---|---|
| `SPEC.md` | what the app must do (requirements, data schema, updates, NFRs) |
| `DESIGN.md` | how it looks, lays out and moves (tokens, components, motion) |
| `PLAN.md` | the order it is built in (milestones, gates, risks) |
| `SKILL.md` | the working index — start here for any task |
| `.opencode/skills/*/SKILL.md` | deep, task-specific procedures |

If code and documents disagree, the documents win; then update the document in the same change.

## 2. Repository map

```
reference/                 READ-ONLY baseline: the Electron mock, its data, images and build script
SPEC.md DESIGN.md PLAN.md SKILL.md AGENTS.md    this documentation set
.opencode/skills/          project skills (lga-desktop, lga-design-system, lga-catalogue-data, lga-tauri-shell)
opencode.json              OpenCode project config
src/                       React app (screens, components, data loaders, animation, store, styles, assets)
src-tauri/                 Rust shell (window/kiosk, catalogue updater, transform, commands, capabilities)
scripts/                   Node build tools (data import, parity check)
tests/                     cross-cutting test fixtures (upstream JSON subsets for parity)
```

Target structure (created during M1, per `PLAN.md`):

```
src/
  main.tsx  App.tsx  router.tsx
  styles/            tokens.css  base.css
  screens/           Welcome Destinations Country University Course CourseFinder Services Journey Shortlist
  components/        TopBar Button Card ChipFilter FilterRail Panel Pill RichText Toast IdleDialog StatusPopover …
  data/              types.ts  content.ts  catalogue.ts (loaders)  selectors.ts  filters.ts
  store/             session.ts  filters.ts  catalogue.ts  appearance.ts
  animation/         variants.ts  usePageTransition.ts  useCountUp.ts  useMotionEnabled.ts
  assets/img/        copied from reference/img (hero, dest-*, logo, uni/*)
src-tauri/src/
  main.rs  lib.rs
  window.rs          fullscreen / kiosk / shortcuts
  catalogue/         mod.rs store.rs fetch.rs transform.rs sanitize.rs
  commands.rs        catalogue_*, updater_*, clipboard, open_external
  updater.rs         app self-update glue
scripts/
  import-reference-data.mjs   reference/data/*.js  →  src/assets/data/*.json (+ images)
  check-parity.mjs            asserts the snapshot matches reference counts and golden records
```

## 3. Ground rules (non-negotiable)

1. **`reference/` is read-only.** Never edit, format, move or delete anything in it. Copy *out*
   of it (images, data) — never write into it.
2. **No `innerHTML` / `dangerouslySetInnerHTML`** with content. Render scraped HTML through
   `components/RichText.tsx` (allowlist). Sanitisation happens in Rust at transform time.
3. **No hard-coded catalogue values** in components: counts, fees, FX, dates and bundle meta come
   from the active bundle; company copy comes from `src/data/content.ts`.
4. **No new npm/crate dependency** without recording it in `PLAN.md` (dependency table) and, if it
   affects visuals or motion, in `DESIGN.md`.
5. **Animations must be reduced-motion safe** and use the library split in `DESIGN.md §7.1`.
   GSAP tweens live inside `gsap.context()` and are reverted on cleanup.
6. **Offline first.** Anything that needs the network must degrade: bundled data → crest badges →
   a clear status chip. Never a spinner that never ends, never a blank screen.
7. **Never block startup on the network.** Update checks run after the UI is interactive.
8. **Session privacy:** shortlist and filters are in-memory/session-scoped only and are cleared by
   the idle reset. Never persist customer-facing state to disk.
9. **No secrets in the repo.** Signing keys only via `TAURI_SIGNING_PRIVATE_KEY` in CI.
10. **Keep the diff reviewable:** one milestone task or one coherent feature per change.

## 4. Commands

```bash
# frontend
npm install
npm run dev                # Vite only (browser, no Tauri IPC — data loaders use a dev shim)
npm run tauri dev          # full app (windowed in dev; fullscreen only in release builds)
npm run typecheck          # tsc --noEmit
npm run lint               # eslint + prettier --check
npm run test               # vitest run (unit + component + parity of the JS side)
npm run test:watch
npm run build              # tsc && vite build
npm run tauri build        # release installers + updater artefacts

# rust
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo fmt --manifest-path src-tauri/Cargo.toml --check

# data
npm run data:import        # reference/data/*.js → src/assets/data/*.json (+ copies images)
npm run data:parity        # asserts counts/golden records against reference/data
LGA_UPSTREAM_DIR=/path/to/visa-website npm run data:parity:upstream   # full Rust transform parity (optional)
```

`reference/README.md` documents the *old* Electron workflow (`npm start`, `npm run kiosk`,
`npm run dist`, `python3 tools/build_data.py`). Those commands are historical; do not run them.

## 5. Conventions

**TypeScript**
- `strict: true`, no `any`, no non-null assertions without a comment, explicit return types on
  exported functions.
- One component per file; screens are default exports; shared pieces are named exports.
- Route components live in `src/screens/` and are registered only in `router.tsx`.
- Data access only through `src/data/*` + `src/store/*` — components never fetch or parse.

**React**
- Function components + hooks only. No class components, no inline styles for anything that a
  token covers (inline style is acceptable for GSAP-driven initial states only).
- Derive, don't duplicate: selectors in `src/data/selectors.ts` are memoised.
- Keep list virtualisation out of scope (4,225 rows render fine) but never render > 60 cards
  without paging — the mock pages at 24 (+6 in the finder).

**CSS**
- Tailwind utilities for layout/spacing; CSS Modules for component visuals; all colour/typography
  values come from `src/styles/tokens.css`.
- Never hard-code a hex value outside `tokens.css`.

**Rust**
- `clippy -D warnings` clean, `rustfmt` formatted, no `unwrap()` outside tests/parsers that
  validate first; errors are typed and logged with `tracing`.
- Long work (download, transform) runs on a Tokio task and reports progress with `app_handle::emit`.
- Every filesystem write that a user depends on is atomic (temp file + rename).
- Keep the transform deterministic and unit-tested: same input → byte-identical output.

**Testing expectations**
- New behaviour ships with a test at the lowest level that can prove it:
  transform/sanitize/filters → Rust or vitest; screen behaviour → Testing Library; timers → fake
  timers; the Rust transform additionally has parity tests (see the catalogue skill).
- `npm test` and `cargo test` must be green before a change is considered done.

## 6. Definition of done (per task)

- [ ] Requirement satisfied and traceable to a `SPEC.md` FR/NFR ID (mention it in the summary).
- [ ] Matches `DESIGN.md` tokens/components/motion; no new colours, radii or shadows.
- [ ] Works offline / degrades gracefully where the task touches data or images.
- [ ] Reduced-motion path verified (`prefers-reduced-motion: reduce`).
- [ ] `npm run typecheck && npm run lint && npm test` green; `cargo test`/`clippy` green if Rust touched.
- [ ] Docs updated if behaviour, schema, commands or structure changed.
- [ ] Manual check at 1920×1080 if the change is visible.

## 7. Working agreement for large tasks

1. Read `SKILL.md`, then the milestone in `PLAN.md`, then the relevant `SPEC.md` section.
2. Load the matching skill (`@lga-design-system`, `@lga-catalogue-data`, `@lga-tauri-shell`).
3. Implement the smallest slice that satisfies the acceptance criterion; run its test.
4. Update `PLAN.md` checkboxes as you go — the plan is the live status board.
5. If you discover the spec is wrong or incomplete, stop and say so rather than improvising.

## 8. Things that will get a change rejected

- Touching `reference/`.
- A screen that only works online, or a spinner with no timeout.
- Hard-coded `4225`, `£`, `A$` conversion rates, “November 2026”, or contact details outside
  `content.ts` / bundle meta.
- An animation that runs forever, ignores reduced motion, or blocks input.
- A dependency added "just in case".
- A large PR that mixes a milestone with unrelated cleanup.
