# DESIGN — LGA Study Visa Explorer visual, layout and motion system (v2)

**Status:** v2 "presentation" system, 2026-11-26. Supersedes v1, which copied the mock's look.
**Baseline:** `reference/index.html` is the **functional and content** baseline (copy, data,
behaviour). Its visual layer is superseded by this document (SPEC §12 D10).
**Stack:** React + Tailwind CSS v4 (tokens + layout utilities) + one global design-system
stylesheet (`src/styles/components.css`), `motion` for component motion, GSAP for page
choreography.

> Rule of the whole document: **every colour, radius, shadow, space and duration comes from
> `src/styles/tokens.css`.** Do not invent values in components; extend the token table here
> and in `tokens.css` in the same change.

---

## 1. Design principles

1. **It is the pitch.** The app replaces a slide deck. Every chapter screen opens like a slide
   (eyebrow → title → lead → actions), says one thing, and hands over to the next chapter.
2. **Read across the room.** A consultant and two parents read this from 3–5 m. Big type,
   high contrast, few words per line, no dense paragraphs at the first level of any screen.
3. **A guided story.** Five numbered chapters — *About LGA → Destinations → Find a course →
   Shortlist → Next steps* — always visible in the top bar, steppable with a clicker.
4. **Premium, calm, navy.** Layered navy surfaces, photography behind navy scrims, gold for
   emphasis and action only (primary buttons, active states, focus, key numbers, markers).
5. **Honest numbers.** Every fee, count and rule carries its date (bundle / FX / rule check)
   in a provenance note with an info icon.
6. **Motion supports the sentence.** Entrances play once, quickly, then everything is still.
   Nothing loops, nothing blocks input, everything has a reduced-motion path.

---

## 2. Colour tokens

Defined once in `src/styles/tokens.css`; semantic ones are exposed to Tailwind v4 through
`@theme inline` (`bg-card`, `text-mute`, `border-line` …).

### 2.1 Brand (theme-independent)

| Token | Value | Use |
|---|---|---|
| `--navy` | `#0B1F3A` | top bar, dark panels, crest, window background |
| `--navy2` | `#16305A` | gradient start (`--navy-grad`) |
| `--navy3` | `#0A1A33` | reserved deep navy |
| `--gold` | `#C9A45C` | primary accent: buttons, focus ring, active borders, markers |
| `--gold2` | `#E3C88A` | gold on navy: numbers, eyebrows, brand `small` |
| `--gold3` | `#A9813F` | range / checkbox accent |
| `--white` | `#FFFFFF` | text on navy, logo plate |
| `--gold-grad` | `135deg gold2 → gold` | primary button, headline gold words, markers |
| `--navy-grad` | `150deg navy2 → navy` | dark panels, CTA band, plain heroes |

### 2.2 Surfaces and text (theme-dependent via `light-dark()`)

Three surface layers: **page → card → raised**.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F4F5F8` | `#061328` | page background |
| `--card` | `#FFFFFF` | `#0C2044` | cards, panels, rows, tiles |
| `--card2` | `#F1F3F7` | `#12294F` | raised / table label column / FAQ items / row hover |
| `--ink` | `#0B1F3A` | `#EEF1F6` | headings, primary text |
| `--ink2` | `#2B3A55` | `#C8D2E2` | body text, lead paragraphs |
| `--mute` | `#566079` | `#9DAAC0` | secondary text, labels |
| `--line` | `#E0E4EB` | `#1D3760` | borders, dividers |
| `--line2` | `#CDD3DE` | `#2A4A7A` | stronger borders (ghost buttons, hover) |
| `--chip` | `#EDF0F5` | `#15305A` | pills, inactive chips |
| `--goldInk` | `#86662B` | `#E3C88A` | gold text on card surfaces (eyebrows, links, numbers) |
| `--gold-wash` | gold @ 14 % | gold @ 16 % | gold pill, icon badge, highlighted tile |
| `--edge` | transparent | white @ 5 % | 1 px inner top highlight on dark cards |

### 2.3 On-navy / on-photo (fixed in both themes)

| Token | Value | Use |
|---|---|---|
| `--on-navy-lead` | `#D2DAE7` | lead text on navy/photo |
| `--on-navy-meta` | `#B8C4D8` | captions in tiles |
| `--on-navy-mute` | `#9AA9C2` | contact line |
| `--on-navy-line` | white @ 16 % | dividers on navy |
| `--on-navy-glass` | navy @ 55 % | glass tiles, nav track, ghost button on photo |
| `--on-navy-glass-line` | white @ 14 % | glass tile border |
| `--backdrop` | `rgba(3,10,24,.78)` | idle dialog backdrop |
| `--scrim-hero` / `--scrim-band` / `--scrim-bottom` | navy gradients | text over photography — **always** |
| `--ok` | `#5CC98A` | status-chip dot only: up to date / updated |
| `--danger` | `#E8796F` | status-chip dot only: update failed |

### 2.4 Contrast (WCAG)

| Pair | Ratio | Verdict |
|---|---|---|
| `--gold2` on `--navy` | ≈ 10.1:1 | AAA |
| `--gold` on `--navy` | ≈ 7.0:1 | AAA |
| `--on-navy-lead` on `--navy` | ≈ 11:1 | AAA |
| `--ink2` dark on `--card` dark | ≈ 10:1 | AAA |
| `--mute` light on `--bg` light | ≈ 5.7:1 | AA |
| `--goldInk` light on white | ≈ 5.3:1 | AA |
| `--mute` dark on `--bg` dark | ≈ 8:1 | AAA |

Never put `--gold`/`--gold2` text on a light surface — use `--goldInk`. Never put `--ink` on
navy — use `--white` or `--on-navy-*`.

### 2.5 Theme

App default is **dark** (SPEC §12 D1). A sun/moon button in the top bar toggles dark ⇄ light
(FR-25); `Auto` arrives with the status popover (M6). Persisted with `tauri-plugin-store`
(key `appearance`); `index.html` applies it before first paint.

---

## 3. Typography

Self-hosted: `@fontsource/montserrat` 500/600/700/800 and `@fontsource/inter` 400/500/600.

| Role | Rule |
|---|---|
| Root scale | `html { font-size: clamp(15px, calc(9px + .55vw), 22px) }` — **the big-screen scaling mechanism; never fixed px** |
| Body | Inter 400, `1rem/1.55`, `--ink` |
| Lead (`.lead`) | Inter, `1.12rem/1.55`, `--ink2`, max 44em |
| Eyebrow (`.eyebrow`) | Montserrat 700, `.78rem`, `.16em` tracking, uppercase, `--goldInk`, gold 2 px dash before |
| `h1` | Montserrat 800, `clamp(2rem, 3.2vw, 3.1rem)`, `1.06`, `-.015em` |
| Welcome title | Montserrat 800, `clamp(2.6rem, 4.6vw, 4.8rem)`, `1.03`, gold-gradient words |
| Country band title | Montserrat 800, `clamp(2.3rem, 3.8vw, 3.8rem)` |
| `h2` / `h3` | Montserrat 700, `1.45rem` / `1.1rem` |
| Numbers (stats, fees, tiles) | Montserrat 800, tabular figures |
| Buttons | Montserrat 700, `1rem` (lg `1.15rem`, sm `.88rem`) |
| Micro labels (rail groups) | Montserrat 700, `.72rem`, `.12em`, uppercase, `--mute` |

`text-wrap: balance` on headings; `overflow-wrap: anywhere` on course names; never truncate a
fee or date (breadcrumb "here" and stepper titles may ellipsize).

---

## 4. Layout, space, radius, elevation

| Token | Value |
|---|---|
| `--content-max` | `1760px` (`.wrap`) |
| `--gutter` | `max(3vw, 20px)` |
| `--bar-h` | `4.4rem` (sticky offsets use it) |
| Space `--s-1 … --s-16` | `.25, .5, .75, 1, 1.25, 1.5, 2, 2.5, 3, 4 rem` |
| Radii | `--r-sm 10` · `--r-md 14` (rows, tiles, kv) · `--r-lg 20` (cards, panels) · `--r-xl 28` (bands, heroes, CTA) · `--r-pill` |
| Elevation | `--e1` resting cards · `--e2` raised (bands, hovered rows, bar) · `--e3` lifted (hovered cards, toast, dialog) · `--e-gold` primary button glow |

Grids: `.grid` auto-fill `minmax(19.5rem,1fr)`; `.grid--2/3/4` fixed columns; `.dest-grid`
5 columns; `.split` = `19rem` rail + results; `.two` = `1.55fr / 1fr` content + aside.
Touch targets ≥ 44 px (48 px buttons, 60 px large CTAs).

| Width | Behaviour |
|---|---|
| ≥ 1400 px | full design |
| < 1400 | (reserved) long chapter labels hide |
| < 1200 | destinations 3-up, journey 3-up without connector, `.grid--4` and kv 2-up, chapter numbers hidden |
| < 900 | chapter nav wraps to its own scrollable row; tiles/facts/stats 2-up; split/two/CTA stack; rail static |
| < 600 | single column everywhere; course row fee moves under the title |

Primary target is ≥ 1200 px; smaller widths exist for a laptop mirror.

### Fullscreen presentation specifics

- Window: fullscreen in release, `decorations: false`, background `#0B1F3A`, title
  `LGA Study Visa Explorer`; windowed 1600×900 in dev.
- Thin gold scrollbars; no browser chrome; no hover-only information.
- Kiosk hides the cursor (SPEC FR-14); otherwise `cursor: default`.
- The welcome screen must look intentional left alone for hours — it is the room's idle face.

---

## 5. Component inventory

All in `src/components/`, named exports, visuals in `components.css` (one section per
component, classes prefixed by the component).

| Component | Variants / states | Notes |
|---|---|---|
| `TopBar` | active chapter, shortlist badge, theme, fullscreen | brand lockup `LGA VISA / STUDY VISA EXPLORER` → welcome |
| (chapters nav) | `.chapter` idle / `aria-current=page` | glass pill track; white sliding ink (`layoutId="chapter-ink"`); `NN` number in gold |
| `PageHeader` | eyebrow, title, lead, actions | the slide title; every chapter screen starts with one |
| `Segmented` | toggle group / `asTabs` tablist | navy sliding ink with gold underline (`layoutId`) |
| `Breadcrumbs` | back pill + trail | `/` separators; current crumb ellipsizes |
| `Button` (`.btn`) | gold (default) · `--navy` · `--ghost` · `--lg` · `--sm` · `--block` | pill; icon slot; 1 px lift on hover |
| `.link-btn` | — | gold-ink text action ("Read more", "Clear all", "Remove") |
| `Icon` | 27 inline stroke icons | no icon dependency; `aria-hidden` |
| Destination card (`.dest-card`) | rest / hover (lift + image zoom) | photo, bottom scrim, name, two gold facts, counts, "Explore …" |
| Compare table (`.compare`) | fixed (destinations) / `--auto` (shortlist) | photo column headers, label column on `--card2`, row hover |
| Country band (`.band`) + `.tile` | — | photo, side scrim, eyebrow, title, tagline, 4 glass tiles |
| Fact tiles (`.facts .fact`) / `.kv` | `kv__primary` gold-washed | university facts / course key figures with icons |
| `UniversityCard` | photo / patterned plain band | overlapping logo plate, location, level pills, fee footer |
| `LogoBadge` | `md` / `lg`; image → crest fallback | crest = navy gradient, gold initials |
| `CourseRow` | rest / hover (gold border, nudge) | title, optional university line, pills, fee, arrow |
| `FilterRail` | — | "Refine" header + Clear all, icon search, grouped chips, budget, extras |
| `.chips` | off / `aria-pressed` on (navy + gold border) | counts in muted italics-free `<i>` |
| `.feature` | numbered `01…04` | Why-country / Why-LGA cards |
| `.icon-badge` | — | gold-washed square with gold icon |
| `.steps` | numbered visa timeline | navy discs, gold → line connector |
| FAQ (`.faq`) | collapsed / `aria-expanded` | plus icon rotates to ×; answer revealed on demand |
| `.journey` | 6-step horizontal timeline | gold-ringed numbered discs on a gradient connector |
| `.cta-band` | — | closing call to action with contact details |
| `.panel` | default · `--dark` · `--gold` | `.panel__big` key figure |
| `EmptyState` | icon, title, hint, action | dashed panel; never a blank area |
| `Pager` | — | ghost "Show N more · X of Y remaining" |
| `SourceNote` | — | info icon + provenance text above a hairline |
| `ContactLine` | welcome / CTA | phone, email, web, address with icons |
| `Toast` | enter/leave | navy pill, gold border, check icon, `aria-live` wrapper |
| `IdleDialog` | countdown | dark backdrop (no blur), eyebrow, big ringed countdown, focus trapped |
| `CloseButton` | hidden in kiosk | top-bar ✕ (red on hover) → confirmation dialog (same backdrop/panel), **Keep presenting** focused by default |
| `RouteError` (screen) | — | branded failure inside the shell |
| `StatusPopover` | chip: `ok` / `busy` (pulsing dot while a check runs) / `warn` (offline) / `error` | glass chip in the top bar (label hides < 1200 px); popover: catalogue + source dates, counts, FX month, retry note, **Check for updates**, Auto/Light/Dark `Segmented` |
| `UpdateBanner` | offer / downloading (%) / restarting | sticky navy2 strip under the top bar with a gold inset edge: "Version x is ready … best between consultations" + **Restart & update** / **Later** (hides that version) |
| `AppVersion` | — | status popover section: app version, **Check for app update**, feedback only for manual checks |

---

## 6. Screen designs

| Route | Chapter | Layout |
|---|---|---|
| `#/welcome` | — | Full-bleed hero (`--scrim-hero`), brand, eyebrow "Free study visa consultation", word-staggered title with gold words, lead, **Start the consultation →** + ghost **Explore destinations**, 4 glass stat tiles, icon contact line. No top bar. |
| `#/services` | 01 About LGA | Slide header (+ **Choose a destination →**), 3 service panels with icon badges + tick lists, "Why students choose LGA" 4 numbered features. |
| `#/destinations` | 02 Destinations | Slide header with **Explore / Compare** segmented + **Search all courses**; Explore = 5 tall photo cards; Compare = country comparison table (FR-28); provenance note. |
| `#/c/:id` | 02 | Breadcrumbs → cinematic band with 4 fact tiles → segmented tabs → *Universities* (rail + card grid + sort + pager) / *Why* (4 numbered features + city pills) / *Visa & work* (numbered steps + FAQ, sticky aside: dark post-study panel, work-while-studying, gold "LGA handles this"). |
| `#/u/:id` | 02 | Breadcrumbs → hero (campus photo or patterned navy) with large logo plate → 4 fact tiles → About (clamped, Read more) + At a glance / Accommodation → rail + course rows. |
| `#/k/:key` | 03 | Breadcrumbs → course head (large logo, university line, title, pills) → 4 kv tiles (tuition highlighted, duration, next intake, application fee) → overview + sticky aside (shortlist CTA, work-after panel, intakes) → previous/next stepper cards. |
| `#/finder` | 03 Find a course | Slide header → rail + course rows with university line → pager. |
| `#/shortlist` | 04 Shortlist | Slide header with **Copy summary** + **Start new consultation** → compare table (`--auto`) or an empty state offering Find a course / Explore destinations. |
| `#/journey` | 05 Next steps | Slide header → 6-step connected timeline → document panels → CTA band (shortlist count, **Review shortlist**, contacts) → funds warning. |

---

## 7. Motion design

### 7.1 Library split (non-negotiable)

| Library | Owns | Never does |
|---|---|---|
| **`motion`** | page transitions (`AnimatePresence` on `<main>`), shared-element inks (`chapter-ink`, `seg-*`), shortlist badge spring, course content slide, toast, idle dialog | long mount sequences |
| **GSAP** | per-screen mount choreography (timelines, staggers), hero zoom | animating an element Motion also animates |

**Never animate the same property of the same element from both libraries.** GSAP runs inside
`gsap.context()` scoped to the screen root and is reverted on cleanup.

### 7.2 Tokens

| Token | Value |
|---|---|
| Ease | `cubic-bezier(.22,1,.36,1)` (`--ease-out-expo`) |
| Spring | `{ stiffness: 420, damping: 34 }` |
| Durations | fast `.15s` · base `.35s` · slow `.7s` (hero zooms ≤ 1.4 s) |
| Stagger | `.04–.08s` |
| Travel | `8–44px` — content arrives, it does not fly |

### 7.3 Choreography

| Screen | Sequence (plays once on mount) |
|---|---|
| Welcome | hero fades in (0.8 s, no zoom) · brand drops in · title words rise with .05 s stagger · lead · CTA row · stat tiles stagger · contact fades; stats count up |
| About LGA | service panels and features rise with stagger |
| Destinations | cards `y 40→0` stagger .07 s; switching to Compare staggers table rows; hover = lift 6 px + image zoom 1.06 |
| Country | title/tagline rise · tiles stagger (the photo itself does not move); tab ink slides |
| University | fact tiles stagger, logo plate `scale .94→1` |
| Course | head + kv tiles stagger; ← / → re-mounts content sliding `x ±40` (direction-aware) |
| Finder | rows animate only when the result *count* changes, never per keystroke |
| Shortlist | table `layout` spring on add/remove; top-bar badge pops on count change |
| Next steps | timeline steps stagger, CTA band rises |
| Global | `<main>` exits 0.16 s, jumps (instantly, never smooth) to the top, then fades/rises 16 px in 0.32 s; chapter ink slides |
| Idle dialog | backdrop fade .25 s, panel `scale .96→1` |
| Toast | `y 24→0` in .25 s, out .2 s |

### 7.3a Mount animation rules (learned from the e2e suite)

- Mount choreography runs through `useMountAnimation` (`src/animation/useMountAnimation.ts`):
  **`useLayoutEffect`** so nothing paints in its final state first and then jumps back.
- Elements GSAP animates have their **CSS transitions suspended** for the tween and every inline
  style cleared afterwards — cards and buttons have hover transitions on `transform`, and a
  transition fighting GSAP leaves elements lagging or stuck mid-way.
- Nothing rests with a transform or reduced opacity: the e2e "stuck element" check fails on
  any visible element with opacity < 1 or a translation after motion settles (centre icons
  with `inset`/`margin: auto`, not `translateY(-50%)`).
- Filtering never re-animates results; only arrival on a page does.
- `html` has no `scroll-behavior: smooth` — navigation must start at the top immediately.

### 7.4 Reduced motion

One flag (`useMotionEnabled`) for both libraries. With `prefers-reduced-motion: reduce`: no
GSAP timelines, Motion transitions `duration: 0`, counters show final values, no hover lift or
image zoom; CSS transitions are clamped to ~0 globally.

### 7.5 Performance

Transform/opacity only; at most ~12 staggered children per grid; `clearProps` after mount
tweens; **no `backdrop-filter`** and **no zooming of full-screen photos** (both re-raster huge
areas every frame and stutter on office PCs / software rendering); images use
`decoding="async"`; derived lists are memoised so typing never recomputes chip options; no
task > 50 ms during a transition (e2e budget 200 ms, 250 ms on the 4× slow-CPU project).

---

## 8. Accessibility

- Focus ring: `3px solid var(--gold)`, offset 3 px, on every interactive element.
- Chapter nav: `<nav aria-label="Consultation chapters">`, `aria-current="page"`; the
  shortlist chapter's label includes the count.
- Segmented: `role=tablist/tab` + `aria-selected` for country tabs, `aria-pressed` toggles
  elsewhere. FAQ uses `aria-expanded`. Tables use `scope` on headers.
- Dialog: `role=dialog aria-modal`, labelled + described, focus trapped and restored, `Esc`
  continues. Toast lives in a persistent `role=status aria-live=polite` region.
- All interactive elements are real buttons/inputs/links; icons are `aria-hidden`.
- Text on photos always sits on a navy scrim.

---

## 9. Do / Don't

**Do** — open every chapter with `PageHeader`; use one gold primary action per region; put a
`SourceNote` under any money or rule; use glass tiles on photos and `.fact`/`.kv` tiles on
surfaces; let the root `clamp()` handle 4K.

**Don't** — add colours, radii or shadows outside `tokens.css`; use inline styles for anything
a token or class covers (GSAP initial states and the welcome `--hero` URL are the only
exceptions); use `innerHTML`; add hover-only information; animate forever; show a spinner
without an end; hard-code counts, fees, dates or FX.
