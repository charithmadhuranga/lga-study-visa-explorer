---
name: LGA Catalogue Data
description: The LGA Study Visa Explorer catalogue - schema v2, bundling from the reference data, the Rust transform that ports tools/build_data.py, HTML sanitisation, the online auto-update pipeline and parity testing. Load for any data, updater or content-pipeline task.
---

# Catalogue data & the auto-updater

Sources of truth: `SPEC.md` §7 (schema), §8 (update system, transform rules); the reference
pipeline `reference/tools/build_data.py` (read-only, it is the algorithm we port).
Upstream data: `github.com/charithmadhuranga/visa-website` → `scraper/data/processed/`
(`summary.json` 1.3 KB · `universities.json` 2.8 MB · `courses.json` 9.6 MB — public repo).

## 1. Two data paths

```
BOOTSTRAP (build time, Node)                 RUNTIME (Rust, auto-update)
reference/data/*.js  ──scripts/import──►      raw.githubusercontent.com  ──fetch──►
src/assets/data/{catalogue,details/*.json}    staging/  ──transform──►  updates/vN/
        │                                              │
        └────────── both produce schema v2 ─────────────┴──► current.json → UI hot-swap
```

- The **bootstrap snapshot** ships in the installer so the app is useful on day one and offline.
- The **runtime path** replaces it when upstream `generatedAt` changes (FR-19).
- Both must be byte-comparable in structure: same schema, same counts, same field semantics.

## 2. Schema v2 (authoritative copy: `SPEC.md` §7.1)

Key points that bite:

- `universities[]` and `courses[]` are **named-field objects**, not the reference's tuples.
  Tuple→object mapping is in `SPEC.md` §7.1 — use it for parity work, never guess field order.
- `level` is an index into `levels[]` (`0 Bachelor's, 1 Master's, 2 MBA`); `field` is the string.
- `tags` is an object of three booleans; upstream's other tags (`top`, `jobs`, `popular`, `loan`)
  are ignored, exactly as the reference ignores them.
- `intakes[]` is pre-filtered to `start >= bundle date` at transform time **and** re-filtered
  against today at render time (FR-23).
- Long HTML (`summary`, `about`, `accommodation`) lives in `details/<country>.json`, never in
  `catalogue.json` — that is what keeps the main file at ~1.1 MB.
- `meta` (`built`, `sourceGeneratedAt`, `fxDate`, `fx`, `counts`) drives every footnote and stat
  in the UI. Never hard-code a date, fee or count in a component.

## 3. Bootstrap: `npm run data:import`

`scripts/import-reference-data.mjs`:

1. Read `reference/data/catalog.js` → strip `window.LGA_CATALOG=` / trailing `;` → JSON.
2. Read each `reference/data/detail-<country>.js` → strip `window.LGA_DETAIL=…;window.LGA_DETAIL["<c>"]=` → JSON.
3. Convert tuples to schema v2 (`key,name,uni,lvl,fld,fee,app,m0,m1,ins,tags,city,prov` → named fields).
4. Set `photo: 'img/uni/<id>.webp'` when `reference/img/uni/<id>.webp` exists (24 curated), else `''`.
5. Copy `reference/img/**` → `src/assets/img/`.
6. Write `src/assets/data/catalogue.json` and `src/assets/data/details/<country>.json`.

**Never write into `reference/`.** The script only reads from it.

## 4. Runtime transform (Rust) — port of `tools/build_data.py`

`src-tauri/src/catalogue/transform.rs`, with `sanitize.rs` alongside.

| # | Rule | Source line in `build_data.py` |
|---|---|---|
| 1 | Skip universities with `courseCount == 0` (440 → 436) | `if not u['courseCount']: continue` |
| 2 | Fix source typo `Camrbridge` → `Cambridge` on courses and campuses | 71–78 |
| 3 | Apply `LOCFIX` (21 institutions get city/province when scraped location is empty) | 60–70 |
| 4 | Derive `campuses` from the institution's own courses when missing | 90–95 |
| 5 | `about` snippet = first ~230 chars, cut at a sentence boundary (`.` + space, only if > 80 chars) else last word + `…` | `first_sentences` |
| 6 | Keep intakes with `start >= today`; encode `start\|deadline` only when deadline ≠ start | 111–113 |
| 7 | Tags: `scholarship=1, coop=2, pathway=4` (sum into the bitmask) | `TAGBITS` |
| 8 | Levels fixed `["Bachelor's","Master's","MBA"]`; fields = sorted distinct with `Other` last | 44–45 |
| 9 | HTML allowlist sanitisation (below) | `San` class |
| 10 | **No image processing** — the updater keeps `photo` for the ids that have one in the embedded snapshot (read via the asset resolver); remote `logoUrl` covers the rest | divergence, `SPEC` §8.3 |
| 11 | Course `country`/`currency` follow the university; summaries filed under that country | `SPEC` D14 (fixes ~16 hidden summaries) |

The transform must be **deterministic**: same input → identical output (this is what makes parity
tests meaningful). Use a fixed `today` parameter in tests rather than `Utc::now()`.

### 4.1 Sanitisation allowlist (FR-26)

Allowed tags: `p, ul, ol, li, h4, strong, b, em, i, br`. Everything else is unwrapped (its text
kept) except `script, style, iframe, object, embed, svg, video, audio` whose **contents are
dropped**. Headings `h1, h2, h3, h5, h6` become `h4`. All attributes are stripped. Text is
escaped. Empty `p/li/h4` are removed. Output must be re-parseable by `components/RichText.tsx`
which renders only those tags — the frontend never uses `innerHTML`.

Test fixtures must include `<script>`, `<img onerror>`, `<iframe src>`, `<a href="javascript:">`,
`<div onclick>` and a `<style>` block; assert the payloads are gone (FR-26 AC).

## 5. Auto-update pipeline (FR-19/20)

`src-tauri/src/catalogue/{store.rs,fetch.rs}`:

```
triggers: launch(after UI ready) · every 6 h · on-demand command · backoff after failure (1m/5m/15m/1h)
   │
   ├─ GET summary.json  (+ cache-busting query) ── compare generatedAt with meta.sourceGeneratedAt
   │      unchanged ──► done (status chip: up to date)
   │      changed   ──►
   ├─ download courses.json + universities.json → staging/<uuid>/   (emit catalogue://progress)
   ├─ validate: parses · courses > 0 · every universityId resolves · fxToUsd.USD === 1.0 · sha256
   ├─ transform → updates/v<N>/{catalogue.json, details/*.json, meta.json}
   ├─ fsync + replace current.json (write temp → rename)           ← atomic commit point
   ├─ prune: keep the two newest committed versions
   └─ emit catalogue://updated { meta }  →  UI hot-swaps the store + toast (no restart)

any failure ──► delete staging, keep current bundle, emit catalogue://failed { reason }
```

Implementation map: `catalogue/model.rs` (schema v2 structs, numbers written like
`JSON.stringify`), `transform.rs`, `sanitize.rs`, `fetch.rs` (`Source::Http` | `Source::Dir`,
`LGA_CATALOGUE_SOURCE` override), `store.rs`, `updater.rs` (`Attempt::run`, Tauri-free and
unit-tested), `mod.rs` (managed `Service`, scheduler, `catalogue://status|updated|failed` events,
commands `catalogue_active|status|check`). Frontend: `src/store/updates.ts` + `StatusPopover`.

Extra guards beyond the spec table: a new bundle with < 50 % of the active course count is
rejected; if the data files still carry the active `generatedAt` (CDN lag behind a new summary)
nothing is committed — that prevents a download loop.

Hard rules:

- **Never block startup** — the UI boots from `current.json`/bundled snapshot first.
- **Never leave a half-written bundle referenced** — `current.json` is the only pointer and is
  replaced atomically (NFR-12).
- Endpoints are constants in `fetch.rs`. All network I/O is in Rust, so the webview CSP
  `connect-src` contains **no** external host.
- Do **not** use the GitHub API (60 unauthenticated requests/hour per IP is too low for an office).

### Status chip states (FR-20)

`checking` (pulsing dot) · `up-to-date` (“Up to date · 23 Nov 2026”) · `available`/`updating`
(progress %) · `updated` (checkmark, toast) · `offline` (“Offline · showing 23 Nov 2026”) ·
`failed` (“Update failed — retrying”). Every state must be reachable by stubbing the network in a
test.

## 6. On-disk layout

```
<APP_DATA>/lga-study-visa-explorer/
  current.json          { schemaVersion, dir: "updates/vN", meta }   — absent ⇒ embedded snapshot
  updates/vN/           catalogue.json · details/*.json · meta.json
  staging/<uuid>/       in-progress, never referenced by current.json
  logos/                LRU cache of logoUrl, 50 MB cap (FR-22)
```

Frontend access: Rust command `catalogue_active()` returns the root path → the UI reads files
with `convertFileSrc()` + `fetch()` (asset protocol, scope
`$APPDATA/lga-study-visa-explorer/**/*` and `$RESOURCE/**/*`). Multi-MB payloads must not go over the
IPC invoke bridge.

## 7. Parity testing (this is how we know the port is right)

```bash
npm run data:parity                # snapshot vs reference/data (counts + golden records) — always run
LGA_UPSTREAM_DIR=/path/to/visa-website npm run data:parity:upstream   # Rust transform vs bundled snapshot, record for record
cargo test --manifest-path src-tauri/Cargo.toml --test upstream_parity -- --ignored live_   # live HTTPS + full live update
```

Assertions to keep green:

| Check | Expected |
|---|---|
| institutions | 436 |
| courses | 4,225 |
| by country | usa 1137 · uk 1035 · canada 965 · australia 848 · new-zealand 240 |
| levels / fields | 3 / 12, `Other` last |
| fx | USD 1.0, CAD 0.72, AUD 0.66, GBP 1.3, NZD 0.6, `fxDate` `YYYY-MM` |
| golden records | 3 fixed courses (fee, duration, intakes, tags) + 2 universities (city/prov, campus, about snippet) unchanged by the port |
| detail counts | uk 1034 · usa · canada · australia · new-zealand summaries present |

If a number differs, fix the transform — **never** adjust the expected values to make a test pass.

## 8. Common tasks

| Task | Do this |
|---|---|
| New upstream fields appear | add them to `SPEC.md` §7.1 first, then to the transform, then to parity |
| Fee display wrong for a country | check `currency` + `fx` in the bundle, then `format.ts` (`money`, `usd`) |
| A course shows a closed intake | it is render-time filtering (FR-23) — check `filters.ts`, not the bundle |
| Update loop spams downloads | fingerprint compare + `sourceGeneratedAt` guard in `fetch.rs` |
| Logos broken offline | a logo shows offline only if it was seen online before (`catalogue/logos.rs`, `src/data/logos.ts`); otherwise the crest is expected (FR-22). New logo host? add it to `ALLOWED_HOSTS` |
| Need to re-seed data in dev | `npm run data:import`, then restart `npm run tauri dev` |
