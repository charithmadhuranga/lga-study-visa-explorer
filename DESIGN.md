# DESIGN — LGA Study Explorer visual, layout and motion system

**Baseline:** `reference/index.html` (all values lifted verbatim unless marked *new*).
**Stack:** React + Tailwind CSS v4 tokens + CSS Modules for complex visuals, `motion` (Motion for React) for component motion, GSAP for page choreography.

> Rule of the whole document: **the mock's look is the spec**. Every colour, radius, clamp and
> spacing value below already exists in `reference/index.html`. Do not invent new values; extend
> this table instead.

---

## 1. Design principles

1. **Read across the room.** A consultant and two parents read this from 3–5 m. Big type, high
   contrast, few words per line, no dense paragraphs on the first level of any screen.
2. **A guided walk, not a dashboard.** The journey is *where → which country → which
   university → which course → compare*. Every screen answers one question and hands to the next.
3. **Premium, calm, navy.** Gold is an accent used for emphasis and action — never a wash.
   Gold appears on: primary buttons, active states, focus rings, stat numbers, tick marks, the
   shortlist badge border, the toast border.
4. **Presentation-first.** No browser chrome, no address bar, no scroll bars styled like a
   website, no hover-only information, nothing that requires precision pointing.
5. **Honest numbers.** Every fee, count and rule carries its date (bundle date / FX date / rule
   check date) so a consultant can speak to it.
6. **Motion supports the sentence.** Animations emphasise what the consultant is currently
   saying; they never delay content or run while idle.

---

## 2. Colour tokens

Defined once in `src/styles/tokens.css` as CSS custom properties and exposed to Tailwind v4
through `@theme` so utilities like `bg-navy`, `text-gold`, `border-line` exist.

### 2.1 Brand (theme-independent)

| Token | Value | Use |
|---|---|---|
| `--navy` | `#0B1F3A` | top bar, brand backgrounds, dark buttons, window background, crest |
| `--navy2` | `#16305A` | gradients, image band fallback, chip in dark theme |
| `--gold` | `#C9A45C` | primary accent: buttons, focus ring, tick diamond, active borders |
| `--gold2` | `#E3C88A` | gradient end, text on navy (headline `em`, stats, brand `small`) |
| `--gold3` | `#A9813F` | range input / checkbox accent |
| `--white` | `#FFFFFF` | text on navy, logo plate |

### 2.2 Semantic (theme-dependent via `light-dark()`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F3F4F7` | `#07152A` | page background |
| `--card` | `#FFFFFF` | `#0F2547` | cards, panels, rows, fact cells |
| `--ink` | `#0B1F3A` | `#EEF1F6` | body text |
| `--mute` | `#566079` | `#9DAAC0` | secondary text, labels, breadcrumbs |
| `--line` | `#DFE3EA` | `#1F3A63` | borders, dividers, table rules |
| `--chip` | `#EDF0F5` | `#16305A` | inactive chip background |
| `--goldInk` | `#86662B` | `#E3C88A` | gold text on light surfaces (breadcrumb links, “Show all”) |

### 2.3 On-navy text ramp (fixed, both themes)

| Token | Value | Use |
|---|---|---|
| `--on-navy-lead` | `#D2DAE7` | welcome lead paragraph |
| `--on-navy-meta` | `#B8C4D8` | stat captions |
| `--on-navy-contact` | `#9AA9C2` | contact line |
| `--on-navy-soft` | `#C9D3E3` | hero band secondary text |
| `--on-navy-card` | `#D0D9E7` | destination card meta |
| `--on-navy-band` | `#D5DDEA` | country band tagline |
| `--on-navy-dark` | `#BAC6DA` | muted text inside dark panels |

### 2.4 Verified contrast (WCAG)

| Pair | Ratio | Verdict |
|---|---|---|
| `--gold2` `#E3C88A` on `--navy` | ≈ 10.1:1 | AAA |
| `--gold` `#C9A45C` on `--navy` | ≈ 7.0:1 | AAA |
| `--on-navy-lead` on `--navy` | ≈ 11:1 | AAA |
| `--mute` `#566079` on light `--bg` | ≈ 5.7:1 | AA |
| `--goldInk` `#86662B` on white | ≈ 5.3:1 | AA |
| `--mute` `#9DAAC0` on dark `--bg` | ≈ 7.9:1 | AAA |

Never place `--gold` text on `--bg` light (`≈ 2.6:1`) — use `--goldInk` instead.
Never place `--ink` on `--navy` — use `--white` or `--on-navy-*`.

### 2.5 Theme

```css
:root { color-scheme: light dark; }                    /* parity with mock */
:root[data-theme="dark"]  { color-scheme: dark;  }
:root[data-theme="light"] { color-scheme: light; }
```
App default is **`dark`** (SPEC §12 D1); `Auto` restores OS-following behaviour. The setting
lives in the status popover, persisted with `tauri-plugin-store` under key `appearance`.

---

## 3. Typography

Self-hosted (offline): `@fontsource/montserrat` weights **500, 600, 700, 800** and
`@fontsource/inter` weights **400, 500, 600**. No network font requests — CSP `font-src 'self'`.

| Role | Family | Rule (verbatim from mock) |
|---|---|---|
| Root scale | Inter | `html { font-size: clamp(15px, calc(9px + .55vw), 22px) }` — **this is the big-screen scaling mechanism; never replace with fixed px** |
| Body | Inter 400/500/600 | `1rem/1.55`, `--ink` |
| `h1` | Montserrat 800 | `clamp(1.9rem, 3.1vw, 2.8rem)`, `line-height: 1.08`, `-.01em` |
| `h2` | Montserrat 700 | `1.4rem / 1.15` |
| `h3` | Montserrat 700 | `1.08rem / 1.25` |
| Welcome `h1` | Montserrat 800 | `clamp(2.3rem, 4.4vw, 4.4rem)`, `max-width: 13em` |
| Buttons | Montserrat 700 | `1rem`, never smaller than `0.88rem` |
| Micro labels | Inter 600 | `0.75–0.82rem`, `--mute`, often uppercase-free |
| Brand `b` | Montserrat 800 | `1.2em`, `.03em` tracking |
| Brand `small` | Montserrat 500 | `0.62em`, `.14em` tracking, `--gold2` |

Text rules: `text-wrap: balance` on headings, `overflow-wrap: anywhere` on long course names,
never truncate a fee or a date.

---

## 4. Layout system

| Token | Value | Notes |
|---|---|---|
| Content width | `max-width: 1760px` centred | `.wrap` |
| Page padding | `clamp(18px, 2.2vw, 40px) max(3vw, 16px)` | |
| Top bar | sticky, `z-20`, navy, `padding: .5rem max(3vw,16px)` | brand left, nav right |
| Grid | `repeat(auto-fill, minmax(min(100%,19rem), 1fr))`, gap `1.1rem` | uni/service cards |
| Destination grid | 5 columns, card height `clamp(22rem, 62vh, 44rem)` | `dgrid` |
| Split (rail + results) | `18rem  minmax(0,1fr)`, gap `1.5rem` | rail sticky at `top: 5.2rem` |
| Two-column (content + aside) | `minmax(0,1.55fr) minmax(0,1fr)`, gap `1.4rem` | |
| Radii | `12` logo-plate · `14` rows/kv · `16` panels/journey · `18` cards · `22` hero bands · `999` pills/buttons | |
| Borders | `1px solid var(--line)` everywhere; `2px` on `.btn.line`; `3px` focus ring gold with `2px` offset | |
| Shadows | card hover `0 16px 32px -20px rgba(11,31,58,.5)`; logo plate `0 6px 16px -8px rgba(0,0,0,.4)` | only two shadows in the app |
| Vertical rhythm | card body padding `1.1rem 1.2rem 1.2rem`, gap `.45rem`; panel padding `1.3rem 1.4rem` | |
| Touch targets | `min-height: 44px` interactive, `48px` primary buttons | required for the touch panel |

Breakpoints (from the mock, keep them):

| Width | Behaviour |
|---|---|
| ≥ 1200 px | full design: 5-up destinations, 6-up journey, side rail |
| < 1200 px | destinations `minmax(17rem,1fr)`, journey 3-up |
| < 900 px | facts 2-up, split/two collapse to one column, rail becomes static, stats 2-up |
| < 600 px | nav pills shrink, rows stack, journey 1-up, hero stacks vertically |

The **primary target is ≥ 1200 px**; smaller breakpoints exist so a consultant's laptop mirror
is usable, not because we support phones.

### Fullscreen presentation specifics (*new*)

- Window: `fullscreen: true`, `decorations: false`, background `#0B1F3A`, title `LGA Study Explorer`.
- No visible scrollbars on the app shell (`scrollbar-width: thin`, gold thumb at 30 % opacity).
- No hover-only affordances: every hover has a focus/pressed equivalent.
- `cursor: default` (never `none`) outside kiosk; kiosk hides it (SPEC FR-14).
- At 4K the `clamp()` root scale already enlarges type; do not add a separate zoom mode.
- The welcome screen must look intentional left alone for 30 minutes — it is the room's idle face.

---

## 5. Component inventory

Each component: one file in `src/components/`, named export, CSS Module for complex visuals,
Tailwind utilities for trivial ones. States listed are mandatory.

| Component | Variants / states | Notes |
|---|---|---|
| `TopBar` | active route, shortlist count badge, update status | sticky navy; brand lockup → `#/welcome` |
| `BrandLockup` | `default` \| `compact` | logo 2.6 em square + `LGA VISA` / `LANKA GLOBAL ACCESS` |
| `NavPill` | `idle` \| `current` \| `gold` (shortlist) | pill, 44 px min, current = white bg / navy text |
| `Breadcrumbs` | back button + trail | `← Back` chip style; segments `--goldInk` |
| `Button` | `primary` (gold gradient) \| `alt` (navy) \| `line` | 999 radius, Montserrat 700, 48 px min |
| `DestinationCard` | photo + navy scrim + name + fact + counts | whole card is a button; 5-up |
| `UniversityCard` | photo/band + crest logo + name + pills + “Tuition from” | logo overlaps band by `-2.6rem` |
| `LogoBadge` | `image` → `crest` fallback → `loading` | crest = navy square, initials, Montserrat 800 |
| `Pill` | neutral chip / gold chip (`--gold2` @ 20 % bg) | nowrap, 0.78 rem |
| `FactStrip` | 4 cells, 1 px separators, `b` + `span` | |
| `Tabs` | 3 items, animated underline (`layoutId`) | gold 3 px indicator |
| `FilterRail` | search, chip groups, “Show all N”, budget range, toggles, clear | sticky, scrollable, own heading style |
| `ChipFilter` | `off` \| `on` (navy + gold border) \| `count` | `aria-pressed` |
| `BudgetRange` | label value + range input | `accent-color: --gold3`, “Any budget” at max |
| `ResultCount` | heading + sort select | |
| `ResultGrid` / `ResultRow` | grid card / list row | row: content left, fee right |
| `EmptyState` | dashed border panel, title + hint | never a blank area |
| `Pager` | “Show more (N left)” | |
| `Panel` | `default` \| `dark` (navy gradient) | |
| `KeyValue` | label + big value + optional sub | course facts |
| `TickList` | diamond marker `--gold` rotated 45° | |
| `IntakeList` | date + deadline rows | |
| `Stepper` | prev/next sibling course | max 48 % width each |
| `RichText` | allowlist renderer for sanitized HTML | **no `innerHTML`** |
| `Toast` | enter/leave, `aria-live=polite` | bottom centre pill |
| `IdleDialog` | backdrop `rgba(5,15,32,.8)`, countdown, one button | modal, focus trapped |
| `StatusPopover` *(new)* | states: `idle/checking/up-to-date/available/updated/offline/failed` | top bar chip |
| `UpdateBanner` *(new)* | persistent slim banner, dismissible | “Version 1.2.0 ready — Restart to apply” |
| `Skeleton` | shimmering `--chip` blocks | used while a detail file loads |
| `RichText` list items | `p, ul, ol, li, h4, strong, b, em, i, br` only | unknown tags render as their text |

---

## 6. Screen designs

Layout zones per route. Consultant cues are what the motion should emphasise.

### 6.1 `#/welcome`
Full-viewport, no top bar. Background: `linear-gradient(90deg, rgba(11,31,58,.97) 0%, rgba(11,31,58,.88) 42%, rgba(11,31,58,.3) 100%)` over `hero.webp` at `70% center/cover`.
Top: brand lockup. Middle: `h1` (gold `<em>` on “student visa specialists”), lead, gold **Get started →**.
Bottom: 4-column stat row separated by a `rgba(255,255,255,.18)` rule, then the contact line.
*Consultant cue:* the room's resting screen — motion plays once on entry, then stops.

### 6.2 `#/destinations`
Top bar → hero (“Where would you like to study?” + **Search all courses**) → 5-up destination cards filling `62vh`.
*Consultant cue:* “Pick a country with me.” Cards must be tappable from across the room.

### 6.3 `#/c/:countryId`
Breadcrumbs → country band (photo, scrim, `h1` “Study in …”, tagline) → fact strip → tabs → tab body:
- **Universities & courses:** `split` = filter rail + result grid (institution cards, “Show more”).
- **Why …:** 4 cards with the diamond icon block, then a “Popular student cities” panel of pills.
- **Visa & work:** two-column — visa steps tick list + FAQ (left), dark “Work after you graduate”
  panel + “Work while studying” + “LGA handles this for you” (right) → source note.

### 6.4 `#/u/:universityId`
Breadcrumbs → university hero (photo + navy scrim, 4.6 rem logo plate, `h1`) → fact strip
(type / founded or students / course count / tuition from) → two-column About (clamped + **Read more**)
and At-a-glance tick list (+ Accommodation panel when present) → split rail + course rows → note.

### 6.5 `#/k/:courseKey`
Breadcrumbs → logo + university line → `h1` course name → pills → 4-cell key/value grid →
two-column: overview panel (left); intakes, dark work-after-graduation panel, shortlist button (right)
→ prev/next stepper → provenance note.

### 6.6 `#/finder`
Hero (“Find a course”) → split rail + dense result rows (course name, level/field/duration/next intake
pills, gold university·country pill, fee right-aligned) → “Show more”.

### 6.7 `#/services`, `#/journey`, `#/shortlist`
As the mock: service cards with diamond icon blocks + “Why LGA” panels; journey 6-up numbered
circles + two document panels + note; shortlist comparison table in a horizontally scrollable panel
with header cells as course links and per-column **Remove**.

---

## 7. Motion design

### 7.1 Library split (non-negotiable)

| Library | Owns | Never does |
|---|---|---|
| **`motion` (Motion for React)** | component enter/exit (`AnimatePresence`), layout changes (`layout`, `layoutId`), hover/press, shared-element tab underline, toast/dialog springs | long page-load sequences, scroll effects |
| **GSAP** | mount choreography per screen (timelines, staggers, counters), scroll-linked parallax (`ScrollTrigger`), multi-element sequences | animating a component that is also mounted in `AnimatePresence` |

**Never animate the same property of the same element from both libraries.**
GSAP work runs inside `gsap.context()` scoped to the screen root and is reverted in
`useEffect` cleanup — this is mandatory, otherwise route changes leak tweens.

### 7.2 Motion tokens

| Token | Value |
|---|---|
| Ease (UI) | `cubic-bezier(0.22, 1, 0.36, 1)` (`--ease-out-expo`) |
| Ease (spring, Motion) | `{ type: 'spring', stiffness: 420, damping: 34 }` |
| Duration fast | `0.15 s` (hover/press, chip state) |
| Duration base | `0.35 s` (page fade, panel reveal) |
| Duration slow | `0.7–1.2 s` (hero image, counters, staggers) |
| Stagger | `0.05–0.07 s` between grid children |
| Travel | `8–40 px` — never more; content must feel like it *arrives*, not flies |

### 7.3 Per-screen choreography

| Screen | Sequence |
|---|---|
| Welcome | 1) hero `scale 1.08 → 1` over 1.2 s · 2) headline words `y 40 → 0, opacity 0 → 1`, 0.06 s stagger · 3) gold `<em>` wipes in via `background-size` · 4) stats count up (`snap: 1`, 1.0 s) · 5) CTA `y 12 → 0` last |
| Destinations | cards `y 40 → 0` + fade, 0.06 s stagger; hover → image `scale 1.06` + scrim deepen (0.3 s) |
| Country | fact cells stagger 0.05 s; tab underline animates with `layoutId="tab-ink"`; results grid re-flows with `layout` when filters change |
| University | hero image parallax `yPercent 10` with `ScrollTrigger`; logo plate `scale .94 → 1` |
| Course | key/value values fade in staggered; stepper change → content slides `x ±40` with fade (direction-aware) |
| Course finder | rows animate only when the result *set* changes (`AnimatePresence` with `layout`), never per keystroke |
| Shortlist | add/remove column → table cells `layout`; badge in top bar springs `1 → 1.15 → 1` |
| Idle dialog | backdrop fade `0.25 s`, panel `scale .96 → 1` + fade, countdown number flips each second |
| Toast | `y 24 → 0` + fade in `0.25 s`, out in `0.2 s` |
| Update chip | `checking` = pulsing dot (1.6 s loop), `updated` = checkmark `pathLength 0 → 1` |
| Page transitions | whole `<main>` `opacity 0→1, y 16→0` over 0.45 s with `--ease-out-expo`, exit 0.25 s |

### 7.4 Reduced motion (`prefers-reduced-motion: reduce`)

- All entrance animations become instant (final state, no tween) — implemented once in
  `src/animation/useMotionEnabled.ts` and used by every screen.
- No parallax, no counters (show final number), no stagger, no hover image scaling.
- Transitions keep a 0.15 s opacity fade only where it prevents flicker.
- Motion/GSAP both respect the same single flag — never ad-hoc checks in components.

### 7.5 Performance rules

- Animate `transform` and `opacity` only; never `width/height/top/left`.
- Cap simultaneous animated elements: grids animate the first 12 children, the rest fade.
- Remove `will-change` when a sequence finishes (GSAP does this if `autoRound`/cleanup used).
- No `backdrop-filter` on animated panels (the idle backdrop is the single exception).
- Target: no main-thread task > 50 ms during a page transition (NFR-04).

---

## 8. Accessibility

- Focus: `:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px }` (global).
- Tabs use `role="tablist" / role="tab" / aria-selected`; the dialog uses `role="dialog"
  aria-modal="true"` with focus trapped and returned; toast is `role="status" aria-live="polite"`.
- Chips expose `aria-pressed`; the shortlist count is announced through the nav badge label.
- All interactive elements are real `<button>`/`<input>`/`<select>` — no clickable `<div>`.
- Keyboard path covers every route (SPEC FR-13); the mouse is optional for navigation.
- Contrast per §2.4; text on photos always sits behind the navy scrim gradient.

---

## 9. Do / Don't

**Do**
- Reuse `--gold` for exactly one primary action per screen region.
- Keep photos full-bleed with a navy scrim before any text sits on them.
- Let the `clamp()` root scale do the work on 4K.
- Show dates next to money and rules.
- Make the empty state a real component (dashed panel + hint + action).

**Don't**
- Don't add a second accent colour, gradients on text, or drop shadows beyond the two listed.
- Don't use pure black (`#000`) or pure white page backgrounds.
- Don't animate on scroll for anything the consultant must read immediately.
- Don't use `innerHTML`/`dangerouslySetInnerHTML` (SPEC FR-26) — use `RichText`.
- Don't add hover-only information, toasts that block the bottom nav, or modals without `Esc`.
- Don't hard-code counts, fees, dates or FX — they come from the active bundle.
