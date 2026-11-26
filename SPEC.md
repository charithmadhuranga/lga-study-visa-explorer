# SPEC — LGA Study Visa Explorer (Tauri edition)

**Product:** `lga-study-visa-explorer` · productName **LGA Study Visa Explorer** · appId `com.lgavisa.studyvisaexplorer` · version line **2.x** (the Tauri rewrite; the Electron mock in `reference/` is 1.0.0)
**Status:** v1.1 — presentation redesign + rename to *LGA Study Visa Explorer* (2026-11-26); v1.0 approved baseline
**Owners:** Lanka Global Access (Pvt) Ltd (LGA Visa), Nugegoda, Sri Lanka
**Baseline:** `reference/` (Electron + vanilla JS mock, single `index.html`, built 2026-11-23)

This document is the contract for what the desktop application must do. It refines the
implicit behaviour of the reference mock into testable requirements. `DESIGN.md` defines how
it looks and moves, `PLAN.md` defines when it is built, `AGENTS.md` defines how agents work
here, `SKILL.md` is the working index.

---

## 1. Why this product exists

LGA Visa consultants sit with a student (and often the parents) in front of a large office
screen and talk them through destinations, universities, courses, fees, visas and work rights.
Today that conversation is carried by a PDF deck, a website and the consultant's memory.

This application replaces the deck. It is a **full-screen, offline-capable presentation
application** that a consultant drives by hand while speaking: choose a country, filter
universities, open a course, add it to a shortlist, compare three options side by side, copy
the summary into WhatsApp. It must never ask the customer to wait, never show a browser
address bar, never show the previous customer's shortlist, and must keep working when the
office internet drops.

Because it **is the pitch**, the app is organised as a presentation, not a website: five
numbered chapters — *01 About LGA → 02 Destinations → 03 Find a course → 04 Shortlist →
05 Next steps* — that the consultant walks through in order (or jumps between), each opening
with a slide-style title, ending on a call to action (FR-27).

### 1.1 Success definition

| # | Signal | Target |
|---|---|---|
| S1 | Consultant can run a full consultation with no keyboard help | 0 support questions after 15 min training |
| S2 | Screen readable from ~4 m across a meeting room | body text ≥ 16 px at 1080p, contrast ≥ 4.5:1 (see `DESIGN.md`) |
| S3 | Works with the cable unplugged | every screen, every filter, full shortlist flow |
| S4 | Catalogue never embarrasses the consultant | auto-updates when online; always shows the bundle date |
| S5 | Next customer never sees the last one's data | idle reset verified |
| S6 | Runs on the three office OSes | Windows 10/11 x64, macOS 12+ (arm64/x86_64), Ubuntu 22.04+ / AppImage |

---

## 2. Reference baseline (parity contract)

`reference/` is **read-only**. It is the behavioural and visual specification of record: if this
document and the mock disagree, the mock wins unless a deviation is listed in §12.

| Area | What the mock does | Must be preserved |
|---|---|---|
| Shell | Electron, 1920×1080, starts fullscreen, `#0B1F3A` window background, no menu bar | ✅ (Tauri window, same defaults) |
| Shortcuts | `F11` fullscreen toggle (disabled with `--kiosk`), `Ctrl/Cmd+Q` quit | ✅ |
| Routes | `#/welcome #/destinations #/c-<country> #/u-<uni> #/k-<courseKey> #/finder #/services #/journey #/shortlist` | ✅ same route shapes |
| Nav | Destinations · Course finder · Our services · Your journey · Shortlist *(n)* · Full screen | ✅ |
| Keyboard | `Esc` back · `Home` destinations · `←`/`→` step a university's courses | ✅ |
| Idle reset | 4 min no input → “Still with us?” → 20 s countdown → clear shortlist+filters → welcome | ✅ |
| Session state | shortlist in `sessionStorage`, filters in memory (both lost on reload) | ✅ (session-scoped, never on disk) |
| Data | `data/catalog.js` (436 unis / 4,225 courses / 5 countries / 12 fields / 3 levels) + `data/detail-<country>.js` lazy per country | ✅ same content, new schema (§7) |
| Images | `img/` 4.7 MB: `hero.webp`, 5 × `dest-*.webp`, `logo.png`, 24 curated `uni/*.webp` | ✅ bundled |
| Logos | remote `logoUrl` with lettered-crest fallback on failure/offline | ✅ |
| Footers | “Visa and work rules checked November 2026 (source: …)” and “Fees and intakes … (updated …)” | ✅ read from live bundle meta |
| Offline | works fully offline except remote logos | ✅ |
| Build | `python3 tools/build_data.py <visa-website-repo> .` regenerates data | ❌ replaced by in-app updater (§8) |

### 2.1 Reference facts (verified 2026-11-26)

- Catalogue: `built 2026-11-23`, `fxDate 2026-11`, 436 institutions, 4,225 courses,
  by country: USA 1,137 · UK 1,035 · Canada 965 · Australia 848 · New Zealand 240.
- Upstream (`visa-website/scraper/data/processed/`): `summary.json` `generatedAt
  2026-11-22T15:11:57Z`, 4,225 published courses, 440 universities (436 with courses),
  9.6 MB `courses.json`, 2.8 MB `universities.json`, 1.3 KB `summary.json`.
- The upstream repository is **public** (verified unauthenticated), so `raw.githubusercontent.com`
  is a valid update source without tokens.

---

## 3. Scope

### 3.1 In scope (v1.0)

The nine screens of the mock with full parity, the Tauri desktop shell (fullscreen/kiosk,
shortcuts, idle reset), the offline catalogue, background catalogue updates from the
visa-website scraper output, signed app self-update, installers for Windows/macOS/Linux,
and the motion/visual system in `DESIGN.md`.

### 3.2 Out of scope (explicitly not built)

- Student login, lead capture, CRM, payments, bookings, chat.
- Editing catalogue content by hand (content comes from the scraper pipeline).
- Multi-language UI (English only; the audience is Sri Lankan students and parents).
- Publishing to an app store (side-loaded installers / GitHub Releases only).
- Running the scraper itself — the app **consumes** `scraper/data/processed/`, it never scrapes.
- The `reference/` Electron app remains as a read-only baseline; it is not shipped.

---

## 4. Users and usage context

| Persona | Role | Needs |
|---|---|---|
| **Consultant** (primary driver) | LGA counsellor at the office screen | Fast navigation, filters that answer “what fits this budget/intake”, shortlist to share, never lose the customer's context mid-sentence |
| **Student / parent** (viewer) | Sees the screen | Big readable type, attractive imagery, trustworthy numbers with dates |
| **Office manager** (maintainer) | Keeps the app current | Updates itself when online; visible “data from …” date; no manual file copying |

Context: 1920×1080 or 4K panel, mouse or touch, sometimes a laptop mirror, frequently
offline or on a flaky connection, one consultation runs 20–60 minutes, then a new customer.

---

## 5. Functional requirements

Acceptance criteria are written as the check that must pass.

### A — Presentation screens

**FR-01 Welcome / attract screen**
Shows the hero photograph with navy gradient, LGA lockup, eyebrow “Free study visa consultation”, headline “Study abroad with Sri Lanka's *student visa specialists*”, lead paragraph, gold **Start the consultation →** (chapter 01) and secondary **Explore destinations** CTAs, live stats (institutions, courses, destinations, “Free first consultation”) as glass tiles, and the contact details with icons.
*AC:* stats are computed from the active bundle, not hard-coded (and show final values under reduced motion); **Start the consultation** navigates to `#/services`, **Explore destinations** to `#/destinations`; the screen is the default route and the idle-reset target.

**FR-02 Destinations**
Chapter 02. An **Explore / Compare** switch over the same five countries:
*Explore* — five full-bleed destination cards (UK, Australia, Canada, New Zealand, USA) each with photograph, country name, post-study-work and main-intake facts, institution and course counts and an “Explore …” affordance; *Compare* — the side-by-side table of FR-28. Plus **Search all courses**.
*AC:* counts match the active bundle per country; cards are keyboard-focusable buttons; the chosen view persists for the session.

**FR-03 Country**
Cinematic photo band with the title, tagline and the four key facts as glass tiles; a segmented tab control — **Universities & courses** / **Why <country>** / **Visa & work** — and the source footnote.
*AC:* tab state survives navigating to a course and back; “Why” shows four numbered reasons and the cities; “Visa & work” shows the visa steps as a numbered timeline, the FAQ as expandable questions (answers revealed on demand), post-study-work and work-while-studying panels and the LGA disclaimer.

**FR-04 University**
Hero band with logo, 4-cell facts, About (clamped with **Read more**), At-a-glance list, Accommodation (hidden when empty), then the course list with its own filter rail.
*AC:* filters inherited from the country page (level, field, intake, scholarships, co-op, budget) apply on first render; lazy detail loads `about`/`accommodation` without blocking first paint.

**FR-05 Course**
Course name, pills (level, field, scholarships, co-op, pathway), key/value grid (duration, tuition/yr with US$ equivalent, application fee, campus), overview, upcoming intakes, post-study-work panel, **Add to shortlist**, prev/next stepper through the university's courses.
*AC:* `←`/`→` walk siblings sorted by level then name; US$ conversion uses the bundle `fx`; “On request” shown when tuition is 0.

**FR-06 Course finder**
Search across all 4,225 courses with destination / level / field / intake chips, US$ budget slider, scholarship & co-op toggles, result rows showing university + country, “Show more” paging.
*AC:* typing 3+ characters updates results in < 50 ms; budget is compared in US$ for all countries.

**FR-07 Shortlist**
Side-by-side comparison table (university, destination, level, duration, tuition/yr, next intake, work after study), **Copy summary**, **Start new consultation**.
*AC:* copy puts plain text on the clipboard formatted for WhatsApp/email including the contact line; reset clears shortlist + filters and returns to welcome; empty state offers **Explore destinations**.

**FR-08 About LGA (services)**
Chapter 01. Three service cards with icons (University admissions, Student visas, IELTS & PTE classes) with bullet lists, then the four “Why LGA” panels.
*AC:* content matches `SERVICES`/`WHY` in the reference verbatim.

**FR-09 Next steps (journey)**
Chapter 05, the closing slide. Six numbered journey steps on a connected timeline, then the two document checklists (Academic, Financial), a call-to-action band (shortlist count, **Review shortlist**, contact details) and the funds warning note.
*AC:* content matches `STEPS`/`DOCS` in the reference verbatim.

**FR-10 Filter engine (shared)**
Search text, region/province chips (with “Show all N” beyond 10), study level, field of study, upcoming intake, budget slider (step 1,000 / 2,000, top = “Any budget”), scholarships, co-op, sort (featured / most matching / lowest tuition / A–Z), 24-row paging, **Clear all filters**.
*AC:* filter state is scoped per route (`country`, `university`, `finder`) and never leaks between them; results re-render without losing scroll position.

**FR-11 Chrome**
Sticky navy top bar with brand lockup (`LGA VISA` / `STUDY VISA EXPLORER`), the five numbered chapters as one pill group with a sliding active indicator (FR-27), the shortlist counter badge on chapter 04, an appearance toggle and a **Full screen** button; breadcrumbs with **← Back**; page transition; a branded error screen inside the shell if any route fails.
*AC:* brand lockup always returns to welcome; back uses history when available; detail routes light their parent chapter; a route error never shows a stack trace or a blank page.

### B — Consultation session behaviour

**FR-12 Idle reset (privacy)**
After 4 minutes with no pointer/key/wheel/touch input on a non-welcome route, show a modal “Still with us?” with a 20-second countdown and **Continue consultation**. On expiry: clear shortlist, clear all filters, clear tab state, navigate to welcome. Any input while the dialog is visible restarts only the dialog timer; **Continue consultation** cancels it.
*AC:* automated test drives the timer with fake timers; the next session cannot observe the previous shortlist.

**FR-13 Keyboard**
`Esc` → back (never exits the app) · `Home` → destinations · `PageDown`/`PageUp` → next/previous chapter (presentation clickers send these) · `←`/`→` → course stepper · `F11` → fullscreen toggle · `Ctrl/Cmd+Q` → quit. Keys are handled by the app window (not OS-wide global shortcuts) and ignored while a text input is focused (except `Esc` to blur).
*AC:* in `--kiosk`, `F11` is inert and all window decorations/exit affordances are removed; no key is captured while another application is focused.

**FR-14 Fullscreen and kiosk**
App starts fullscreen with no menu bar and `#0B1F3A` background. `--kiosk` additionally removes decorations, pins the window on top and hides the cursor, and disables `F11`.
*AC:* `Ctrl/Cmd+Q` still quits from kiosk (deliberate, matches mock); launching without flags never traps the consultant.

**FR-15 Feedback**
Toast (navy pill, gold border, 2 s) for shortlist add/remove, copy success/failure, fullscreen unavailable, and update events.
*AC:* toast is an `aria-live="polite"` region and never covers the bottom nav.

**FR-16 Branding & contact**
LGA lockup (`LGA VISA` / `LANKA GLOBAL ACCESS`), logo image, and `+94 71 722 5223 · admin@lgavisa.com · lgavisa.com · 1st Floor, 464 High Level Road, Nugegoda` on welcome.
*AC:* contact string identical to the reference `CONTACT`.

### C — Content, data and updates

**FR-17 Bundled catalogue (offline baseline)**
The installer ships `catalogue.json` + `details/<country>.json` + images, generated from the reference data by `npm run data:import`.
*AC:* with the network disabled, every screen in §5A renders with real data; first paint < 1.5 s.

**FR-18 Per-country detail**
Course summaries and university about/accommodation HTML live in per-country files loaded on first visit and cached for the session.
*AC:* visiting a country never downloads more than one detail file; a missing/failed file degrades to “Your counsellor will walk you through …”.

**FR-19 Catalogue auto-update (online)**
While running, the app checks the upstream `summary.json` fingerprint on launch, every 6 hours, when connectivity returns, and on demand. If `generatedAt` differs from the active bundle, it downloads `courses.json` + `universities.json` to a staging area, validates, transforms, and atomically swaps the active bundle, then hot-swaps the running UI without a restart.
*AC:* a failed/interrupted download never corrupts the active bundle; the previous bundle is retained for rollback; the UI shows a toast “Catalogue updated · N courses · D Mon YYYY”.

**FR-20 Update status + manual check**
A status chip in the top bar shows the active bundle state: *Checking for updates…* / *Updating catalogue… 42%* / *Up to date · 23 Nov 2026* / *Updated · …* / *Offline · showing 23 Nov 2026* / *Update failed — retrying*. Clicking it opens a popover with the catalogue build date, source data date, course/institution counts, FX month, the retry note, **Check for updates**, the Auto/Light/Dark appearance choice and (M7) **Check for app update**.
*AC:* every state is reachable in a test by stubbing the network.

**FR-21 Provenance footnotes**
Course pages and country pages show the bundle build date, FX date and the official source of visa rules, exactly as the mock does, read from active-bundle meta (not hard-coded).
*AC:* after an update, footnotes change without a code change.

**FR-22 Logos and imagery**
University logos load from `logoUrl` when online and are cached on disk (LRU, 50 MB cap) by the `logo_src` command: https on the known logo hosts only (`photos.applyboard.com`, Wikimedia), `image/*` responses only, ≤ 1 MB each; a cached logo is served from disk through the asset protocol, a miss uses the remote URL and is cached in the background. Failures fall back to a navy crest badge with the institution's initials. Destination/hero/curated-campus images are bundled and always available.
*AC:* airplane mode shows crests, never broken-image icons.

**FR-23 Fresh intakes**
Intake lists are filtered against the current date at render time, so an old bundle never advertises a closed intake.
*AC:* a bundle built 6 months ago shows no intake earlier than today.

**FR-24 App self-update (signed)**
The installed app checks a signed static JSON feed (GitHub Releases `latest.json`) on launch (delayed 10 s), every 24 h and on demand. When a newer version exists it shows a non-installing banner; the consultant chooses **Restart to apply**, which downloads, verifies the signature and relaunches.
*AC:* no update is ever installed in the middle of a consultation without an explicit click; a signature mismatch aborts with a logged error; `Ctrl/Cmd+Q` still works.

**FR-25 Theme**
Dark navy presentation theme by default (recommended for the office screen), with a one-tap dark/light toggle in the top bar and the full `Auto / Light / Dark` choice in the status popover (M6), persisted locally. Light theme tokens exist and are fully styled (parity with the mock's `light-dark()` system).
*AC:* switching theme does not reload the app or lose filters.

**FR-26 Safe rich text**
Scraped HTML (course summaries, about, accommodation) is sanitised in Rust at transform time to a fixed allowlist and rendered by a React component that maps allowed tags to elements. No `innerHTML` with unsanitised input anywhere in the app.
*AC:* a unit test feeds `<script>`, `<img onerror>`, `<iframe>` and `<a href="javascript:">` through the pipeline and asserts they are gone.

### D — Presentation flow

**FR-27 Presentation chapters**
The consultation is five numbered chapters in pitch order: `01 About LGA` (`#/services`), `02 Destinations` (`#/destinations`, owning `#/c/*` and `#/u/*`), `03 Find a course` (`#/finder`, owning `#/k/*`), `04 Shortlist` (`#/shortlist`), `05 Next steps` (`#/journey`). Each chapter screen opens with a slide header: gold eyebrow `NN · Chapter`, title, lead and actions. `PageDown`/`PageUp` step forward/back (welcome ⇄ 01 … 05).
*AC:* unit-tested chapter map and clicker stepping; the top bar always lights exactly one chapter off the welcome screen.

**FR-28 Destination comparison**
The Destinations *Compare* view shows the five countries as columns (photo header → country page) and rows: work after you graduate, main intakes, work while studying, typical tuition / year (median of listed fees, local currency + ≈ US$), tuition from, institutions & courses in the catalogue, and one “good to know” fact.
*AC:* tuition and counts are computed from the active bundle (`countrySummary` selector, unit-tested; “on request” fees excluded); rules come from `content.ts`; the provenance note shows the bundle and FX dates.

---

## 6. Screen and route inventory

| Route (hash) | Screen component | Primary data | Reference function |
|---|---|---|---|
| `#/welcome` | `screens/Welcome` | bundle counts | `vWelcome` |
| `#/destinations` | `screens/Destinations` | countries + counts | `vDest` |
| `#/c/:countryId` | `screens/Country` | country content + uni/course lists | `vCountry` |
| `#/u/:universityId` | `screens/University` | university + its courses + detail | `vUni` |
| `#/k/:courseKey` | `screens/Course` | course + siblings + detail | `vCourse` |
| `#/finder` | `screens/CourseFinder` | all courses | `vFinder` |
| `#/services` | `screens/Services` | static content | `vServices` |
| `#/journey` | `screens/Journey` | static content | `vJourney` |
| `#/shortlist` | `screens/Shortlist` | session shortlist | `vShortlist` |
| `#/*` (unknown) | `screens/Destinations` | — | *new* |
| — (route error) | `screens/RouteError` | — | *new* |
| — (overlay) | `components/IdleDialog` | session timer | `#idle` |
| — (popover) | `components/StatusPopover` | update state | *new* |

Route shapes are hash-based (`createHashRouter`) so deep links, back/forward and the
custom-protocol origin behave exactly like the mock.

---

## 7. Data model

### 7.1 Schema v2 (app-internal)

The reference encodes courses as a 13-element tuple with positional keys (`k.m0`, `k.ins`, …).
That is unreadable and un-typeable, so the app uses named fields. Field names are otherwise
unchanged from the reference so the transform and parity tests are a direct mapping.

```ts
type CountryId = 'uk' | 'australia' | 'canada' | 'new-zealand' | 'usa';
type LevelIndex = 0 | 1 | 2;              // 0 Bachelor's, 1 Master's, 2 MBA

interface Catalogue {
  schemaVersion: 2;
  built: string;                          // 'YYYY-MM-DD' — when this bundle was produced
  sourceGeneratedAt: string;              // upstream courses.json generatedAt
  fxDate: string;                         // 'YYYY-MM'
  fx: Record<string, number>;             // { USD:1, CAD:.72, AUD:.66, GBP:1.3, NZD:.6 }
  levels: string[];                       // 3 entries
  fields: string[];                       // 12 entries
  counts: { universities: number; courses: number; byCountry: Record<CountryId, number> };
  universities: University[];
  courses: Course[];                      // flat, indexed by key
}

interface University {
  id: string; name: string; country: CountryId;
  category: string; type: string; founded: string;
  city: string; province: string; campuses: string[];
  logoUrl: string; photo: string;         // photo: bundled relative path or ''
  website: string; students: number;
  canWork: boolean; coop: boolean; housing: boolean;
  durations: string[];                    // 'Average undergraduate program: One Year'
  about: string;                          // sanitized HTML, from aboutHtml
  accommodation: string;                  // sanitized HTML, '' when absent
  featured: boolean;                      // curated flag
  courseCount: number;
}

interface Course {
  key: string; name: string; universityId: string; country: CountryId;
  level: LevelIndex; field: string;
  tuitionPerYear: number; currency: string | null; applicationFee: number;
  durationMonths: [number, number];
  intakes: { start: string; deadline?: string }[];   // already >= bundle date at transform time
  tags: { scholarship: boolean; coop: boolean; pathway: boolean };
  city: string; province: string;
  summary: string;                        // sanitized HTML — stored in detail file, not here
}

interface DetailFile {                    // details/<country>.json
  country: CountryId;
  courses: Record<courseKey, string>;     // sanitized summary HTML
  universities: Record<uniId, { about: string; accommodation: string }>;
}
```

**Tuple → object mapping (reference → app):** `[key,name,uniIdx,lvl,fldIdx,fee,app,m0,m1,ins,tags,city,prov]`
→ `{key,name,universityId,level,field,tuitionPerYear,applicationFee,durationMonths:[m0,m1],intakes,tags:{bit1 scholarship,bit2 coop,bit4 pathway},city,province}`.

### 7.2 Bundle layout on disk

```
<APP_DATA>/lga-study-visa-explorer/            # Tauri app_data_dir
├── current.json                          # pointer: { schemaVersion, dir, meta }  (atomic write)
│                                         # absent ⇒ the snapshot shipped inside the app (D15)
├── updates/
│   ├── v2/ … vN/                         # produced by the updater; keep last 2
│   │   ├── catalogue.json
│   │   ├── details/*.json
│   │   └── meta.json                     # { built, sourceGeneratedAt, sha256, counts }
├── staging/<id>/                         # in-progress download, never referenced by current.json
└── logos/                                # LRU cache of logoUrl, 50 MB cap (PLAN 6.8)
```

The frontend never parses a path from user input: it asks Rust for the active bundle root
(`catalogue_active()`) and loads files through the **asset protocol**
(`app.security.assetProtocol.enable`, scope `$APPDATA/lga-study-visa-explorer/**/*` +
`$RESOURCE/**/*`) using `convertFileSrc`. This keeps multi-MB reads off the IPC bridge.

### 7.3 Provenance

`built`, `sourceGeneratedAt`, `fxDate`, `counts` and the visa-rule check date come from the
active bundle or from static country content in `src/data/content.ts` (the `COUNTRIES`,
`SERVICES`, `WHY`, `STEPS`, `DOCS`, `CONTACT` constants ported verbatim from `index.html`).
Nothing about fees, counts or dates is hard-coded in components.

---

## 8. Update system

Two independent update paths, both must be safe to run while a consultant is presenting.

### 8.1 Catalogue data (automatic, background)

| Step | Behaviour |
|---|---|
| Trigger | 8 s after launch (UI already interactive), every 6 h, on-demand (`catalogue_check`), after a failed check with backoff 1 m → 5 m → 15 m → 1 h (connectivity returning is caught by the backoff) |
| Fingerprint | `GET …/scraper/data/processed/summary.json` (~1.3 KB) with a cache-busting query param; compare `generatedAt` to `meta.sourceGeneratedAt` |
| Download | `courses.json` (9.6 MB) + `universities.json` (2.8 MB) into `staging/<uuid>/`, streamed with progress events `catalogue://progress { phase, received, total }` |
| Validate | JSON parses · `courses.length > 0` · every `universityId` resolves · known levels and countries · unique course keys · `fxToUsd.USD === 1.0` · SHA-256 logged · **the new bundle has ≥ 50 % of the active bundle's courses** (a broken scrape never replaces good data) · if the data files still carry the active `generatedAt` (CDN lag), nothing is committed |
| Transform | port of `reference/tools/build_data.py` in Rust (§8.3) |
| Commit | write `updates/v<N>/{catalogue.json,details/*.json,meta.json}`, fsync, then replace `current.json` via write-temp+rename |
| Notify | `catalogue://status` on every state change (chip); `catalogue://updated { root, meta, source }` after a commit — the frontend swaps the store in place (keeping the old data if the new bundle fails to load), re-renders and toasts “Catalogue updated · N courses · D Mon YYYY” |
| Failure | delete staging, keep the active bundle, emit `catalogue://failed { reason }`, retry later |
| Prune | keep the two newest committed versions |

Never block startup: the UI boots from `current.json` (or the bundled snapshot) first and the
check runs afterwards.

**Endpoints (raw, public repo — no auth, no GitHub API):**

```
https://raw.githubusercontent.com/charithmadhuranga/visa-website/main/scraper/data/processed/summary.json
https://raw.githubusercontent.com/charithmadhuranga/visa-website/main/scraper/data/processed/courses.json
https://raw.githubusercontent.com/charithmadhuranga/visa-website/main/scraper/data/processed/universities.json
```

Deliberately **not** the GitHub API (60 requests/hour per IP is too low for an office full of
machines). All fetching happens in Rust (`reqwest`, rustls with the OS certificate store), so the
webview CSP `connect-src` allows **no** external host — only `'self'`, the asset protocol and IPC.
For QA, `LGA_CATALOGUE_SOURCE` may point at a local `processed/` directory or another base URL
(Gate G6 synthetic `summary.json` test).

### 8.2 App binary (manual-confirmed)

- `bundle.createUpdaterArtifacts: true`; `plugins.updater.pubkey` pinned in `tauri.conf.json`;
  signing key only via `TAURI_SIGNING_PRIVATE_KEY` env var in CI (`.env` files are ignored by Tauri).
- Endpoint: `https://github.com/<owner>/lga-study-visa-explorer/releases/latest/download/latest.json`
  (static JSON, `platforms` keys `windows-x86_64`, `darwin-aarch64`, `darwin-x86_64`, `linux-x86_64`).
- Flow: check on launch (10 s delay) + every 24 h + **Check for app update** → banner →
  `downloadAndInstall()` on click → `relaunch()` from `@tauri-apps/plugin-process`.
- Windows installs the update by exiting the process (platform limitation), so installation is
  **only** ever triggered by an explicit click, never automatically.
- Platform matrix: Windows NSIS `x86_64` · macOS `.app` + `.dmg` (arm64, x86_64) ·
  Linux **AppImage** is the auto-updating artefact (deb/rpm show the notice but require a manual
  reinstall — documented for the office).

### 8.3 Transform rules (Rust port of `tools/build_data.py`)

1. Drop universities with `courseCount == 0` (440 → 436).
2. Fix the `Camrbridge` source typo on courses and campuses.
3. Apply `LOCFIX` (21 curated institutions get a main-campus city/province when the scraped
   record has none) — table ported verbatim.
4. Derive campus list from the institution's courses when missing.
5. `about` = first ~230 characters of `aboutText` truncated at a sentence boundary (parity with
   `first_sentences`), full HTML kept in the detail file.
6. Intakes: keep only `start >= today`, encode `start|deadline` when a deadline differs.
7. Tags: `scholarship → 1`, `coop → 2`, `pathway → 4` (other upstream tags such as `top`,
   `jobs`, `popular`, `loan` are ignored, as in the reference).
8. Levels fixed to `["Bachelor's","Master's","MBA"]`; fields = sorted distinct set with `Other` last.
9. Sanitise HTML: allow `p, ul, ol, li, h4, strong, b, em, i, br`; drop `script, style, iframe`
   contents; demote `h1–h3, h5, h6` to `h4`; escape text; remove empty `p/li/h4`.
10. **No image processing at runtime** (the reference needed Pillow for campus photos): the 24
    curated campus photos ship in the bundle; the updater reads which university ids have one
    from the embedded snapshot and keeps `photo` for exactly those. Everything else uses the
    remote `logoUrl` with crest fallback.
11. Course country and currency follow the course's **university** (as the bootstrap snapshot
    does); course summaries are filed in that country's detail file (D14).

Parity: `npm run data:parity:upstream` (with `LGA_UPSTREAM_DIR`) runs the Rust transform on the
upstream data the reference was built from and must reproduce the bundled snapshot record for
record — verified 2026-11-26: 436 universities, 4,225 courses, 4,202 summaries, identical.

---

## 9. Non-functional requirements

| ID | Area | Requirement | Measure |
|---|---|---|---|
| NFR-01 | Performance | Cold start to interactive welcome < 1.5 s | release build, 8 GB office PC |
| NFR-02 | Performance | Route change painted < 100 ms; page transition ≤ 450 ms | DevTools profiling |
| NFR-03 | Performance | Filter keystroke → results < 50 ms over 4,225 courses | vitest benchmark |
| NFR-04 | Performance | 60 fps during page transitions on integrated GPU at 1920×1080 | frame chart, no long tasks > 50 ms |
| NFR-05 | Memory | < 400 MB RSS steady state; one detail file resident at a time | task manager |
| NFR-06 | Footprint | Installer ≤ 40 MB; installed ≤ 120 MB including 50 MB logo cache | build output |
| NFR-07 | Offline | 100 % of screens work with network down (logos degrade) | airplane-mode test script |
| NFR-08 | Security | CSP set; no `innerHTML` with untrusted input; asset scope limited to app data | code review + FR-26 test |
| NFR-09 | Security | No secrets in the repo; updater key via CI env only | `git grep` check |
| NFR-10 | Privacy | No personal data persisted; shortlist/filters are session-scoped and wiped on idle reset | FR-12 test |
| NFR-11 | Accessibility | Focus ring visible (3 px gold), ≥ 4.5:1 body contrast, `aria` roles on tabs/toast/dialog, full reduced-motion support | axe + manual |
| NFR-12 | Reliability | Catalogue swap is atomic; a crash mid-update leaves a working bundle | kill-during-update test |
| NFR-13 | Reliability | App runs 8 h without a crash or leak on the welcome screen | soak test |
| NFR-14 | Compatibility | Windows 10/11 x64, macOS 12+ (arm64/x86_64), Ubuntu 22.04+ / AppImage | smoke test per OS |
| NFR-15 | Maintainability | Typecheck + lint + unit tests green in CI on every push | CI status |
| NFR-16 | Localisation of numbers | `en-US` formatting for money and dates (parity with mock `toLocaleString('en-US')`) | unit test |

---

## 10. Acceptance checklist (release gate)

- [ ] All nine routes render from the active bundle with reference-identical content (copy, counts, rules).
- [ ] Every acceptance criterion in §5 passes (automated where marked, manual checklist otherwise).
- [ ] FR-12 idle reset verified with fake timers and manually at the office screen.
- [ ] Airplane-mode walkthrough of a full consultation passes (NFR-07).
- [ ] Catalogue update verified against a synthetic `summary.json` change (FR-19) and against the real upstream (FR-19 live).
- [ ] App update verified from a prerelease `latest.json` on all three OSes (FR-24).
- [ ] Visual sign-off at 1920×1080 against `DESIGN.md` v2 for every route, in dark and light (the reference is the functional baseline; its look is superseded — D10).
- [ ] Reduced-motion pass: no parallax, no counters, instant transitions (NFR-11).
- [ ] `npm run typecheck && npm run lint && npm test && cargo test` green.
- [ ] Installers produced for Windows/macOS/Linux and installed on a clean machine.

---

## 11. Assumptions and dependencies

| # | Assumption / dependency | Risk if wrong |
|---|---|---|
| A1 | `charithmadhuranga/visa-website` stays public and `scraper/data/processed/*.json` keeps its shape | auto-update stops; bundled data still works |
| A2 | Upstream keeps `key`, `universityId`, `summaryHtml`, `aboutHtml`, `accommodationHtml`, `fxToUsd` | transform must be re-verified after each scraper change |
| A3 | Office machines have a display ≥ 1600 px wide | layouts degrade (handled at 900/600 px breakpoints) |
| A4 | A GitHub repository (or static host) exists to publish releases + `latest.json` | app self-update unavailable (data update unaffected) |
| A5 | LGA approves dark navy as the default presentation theme | one-line change (§12 D1) |
| A6 | Remote logo host (`photos.applyboard.com`) stays hotlink-friendly | crests show instead — acceptable, matches mock |
| A7 | Consultants may press `Ctrl/Cmd+Q` deliberately | documented; kiosk keeps it (parity) |

## 12. Deviations from the reference (deliberate)

| ID | Deviation | Why |
|---|---|---|
| D1 | Default theme is **dark** (`#07152A` surfaces) instead of following the OS | presentation screen; override available (FR-25) |
| D2 | Course records use named fields instead of tuples | type safety, testability (§7.1) |
| D3 | Data updates happen in-app from `raw.githubusercontent.com` instead of `python3 tools/build_data.py` | consultants cannot run Python; FR-19 |
| D4 | Intakes are additionally filtered against today at render time | old bundles must not show closed intakes (FR-23) |
| D5 | Fonts are self-hosted (`@fontsource`) instead of Google Fonts | offline requirement (NFR-07) |
| D6 | Rich text is rendered through an allowlist component, not `innerHTML` | security (FR-26) |
| D7 | Status popover + update banner added to the top bar | update visibility (FR-20) |
| D8 | App self-update added (the mock only shipped a Windows installer) | three OSes, unattended offices (FR-24) |
| D9 | Version line starts at 2.0.0 | any existing 1.x install must see this as an upgrade |
| D10 | Visual design is the v2 presentation system in `DESIGN.md` (slide headers, chapter nav, cinematic bands, compare view) — the mock's *content and behaviour* remain the baseline, its *look* does not | the mock read as a website; the product replaces a pitch deck |
| D11 | Navigation is five numbered chapters in pitch order (About LGA first) instead of the mock's four pills + shortlist | mirrors how consultants tell the story; clicker support (FR-27) |
| D12 | `F11` / `Ctrl/Cmd+Q` handled in the window instead of `globalShortcut`; no opener plugin (the mock opens no external links) | OS-wide shortcuts would hijack F11 in other apps; no unused dependency |
| D13 | Product renamed **LGA Study Visa Explorer** (`com.lgavisa.studyvisaexplorer`) | business naming; nothing had shipped under the old identifier |
| D14 | Course summaries are filed under the university's country, not the course record's own `country` | the reference hid ~16 summaries whose course and university countries differ |
| D15 | No first-run copy of the snapshot to disk: no `current.json` ⇒ read the snapshot inside the app. Its `sourceGeneratedAt` is the reference build date, so the first online launch refreshes the catalogue once | saves ~9 MB of writes; that first refresh also re-filters intakes to today |

## 13. Traceability

| Requirement group | Plan milestone | Skill |
|---|---|---|
| FR-01…FR-11 (screens) | M3 | `lga-design-system`, `lga-desktop` |
| FR-12…FR-16 (session/shell) | M3, M5 | `lga-tauri-shell` |
| FR-17…FR-18, FR-21…FR-23, FR-26 (data) | M2 | `lga-catalogue-data` |
| FR-19, FR-20 (data updates) | M6 | `lga-catalogue-data` |
| FR-24 (app updates) | M7 | `lga-tauri-shell` |
| FR-25 (theme) | M4 | `lga-design-system` |
| FR-27, FR-28 (presentation flow) | M4 | `lga-design-system`, `lga-desktop` |
| NFR-01…NFR-16 | M1–M8 | all |
