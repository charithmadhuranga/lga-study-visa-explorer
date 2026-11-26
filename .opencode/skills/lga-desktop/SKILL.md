---
name: LGA Desktop App
description: Build features in the LGA Study Explorer Tauri + React desktop app - routing, state, data selectors, screens, filters, shortlist, tests and repo conventions. Load for any general frontend task in this repository.
---

# LGA desktop app — core procedures

Everything here assumes you have read `AGENTS.md` (rules, commands, DoD) and `SKILL.md`.
Requirements live in `SPEC.md`, visuals in `DESIGN.md`.

## Target layout

```
src/
  main.tsx  App.tsx  router.tsx
  styles/tokens.css  styles/base.css
  screens/       Welcome Destinations Country University Course CourseFinder Services Journey Shortlist
  components/    TopBar BrandLockup NavPill Breadcrumbs Button Card DestinationCard UniversityCard
                 LogoBadge Pill FactStrip Tabs FilterRail ChipFilter BudgetRange ResultRow EmptyState
                 Pager Panel KeyValue TickList IntakeList Stepper RichText Toast IdleDialog
                 StatusPopover UpdateBanner Skeleton
  data/          types.ts content.ts catalogue.ts selectors.ts filters.ts format.ts
  store/         session.ts filters.ts catalogue.ts appearance.ts
  animation/     variants.ts usePageTransition.ts useCountUp.ts useMotionEnabled.ts
  assets/img/    hero.webp dest-*.webp logo.png uni/*.webp   (copied from reference/img)
```

Route table (`SPEC.md` §6) is registered only in `router.tsx` with `createHashRouter`:
`/`, `/destinations`, `/c/:countryId`, `/u/:universityId`, `/k/:courseKey`,
`/finder`, `/services`, `/journey`, `/shortlist`.

## Adding or changing a screen — checklist

1. Find the requirement in `SPEC.md` (FR-01…FR-26) and the layout in `DESIGN.md` §6.
2. Open `reference/index.html` and read the matching `v*()` function — it is the behaviour spec.
3. Create `src/screens/<Name>.tsx` (default export) and register it in `router.tsx`.
4. Get data from selectors (`src/data/selectors.ts`), never by parsing JSON in a component.
5. Use tokens/`DESIGN.md` components only — no new colours, radii, shadows or font sizes.
6. Add motion via `usePageTransition` + the screen's GSAP context (see the `lga-design-system` skill).
7. Verify: full route renders at 1920×1080, works offline, reduced-motion path, keyboard path.
8. Test at the lowest useful level; tick the `PLAN.md` task.

## Data access pattern

```ts
// src/data/catalogue.ts — the only place that reads bundle files
export async function loadCatalogue(): Promise<Catalogue>       // active bundle root → catalogue.json
export async function loadDetail(country: CountryId): Promise<DetailFile>   // session-cached
export function activeMeta(): BundleMeta                        // built, sourceGeneratedAt, fx, counts
```

- In the browser (`npm run dev`) these read `src/assets/data/*.json` through a dev shim; under
  Tauri they read through `convertFileSrc` from the path returned by the `catalogue_active`
  command. Both paths return the same TypeScript types — never branch inside components.
- Store the loaded catalogue in `src/store/catalogue.ts` (Zustand). One load per app session,
  re-loaded in place when `catalogue://updated` fires (no navigation, no spinner).
- Details load lazily per country and are cached for the session; a failure resolves to an empty
  file so the screen still renders with the “your counsellor will walk you through it” copy.

## Selectors and performance

- Index once on load: `byKey`, `byId`, `byCountry`, and per-university course arrays (the
  reference does this in `index.html` lines 216–219).
- All list filtering goes through `match(course, filters, scope)` in `src/data/filters.ts` —
  port the reference logic exactly: level, field, country, province, intake month, budget
  (US$ comparison when `scope === 'all'`), `tags.scholarship`, `tags.coop`.
- Memoise with `useMemo` keyed on `[courses, filters]`; benchmark target < 50 ms over 4,225
  courses (NFR-03).
- Paging: 24 rows, +24 per click; the finder shows `show + 6` per page (reference behaviour).

## Session state (`src/store/session.ts`)

- `shortlist: string[]` (course keys) — in memory only, mirror the reference's `sessionStorage`
  semantics: lost on reload, cleared by the idle reset. Persisting to disk is forbidden (NFR-10).
- `toast(message)` — 2 s navy/gold pill, `aria-live="polite"`.
- Idle timer (FR-12): 4 min → dialog with 20 s countdown → `resetSession()` clears shortlist,
  filters, tab state and navigates to `/`. Test with fake timers; any input while the dialog is
  open only restarts the dialog countdown, and “Continue consultation” cancels it.

## Filters state (`src/store/filters.ts`)

Scopes: `country:<id>`, `university:<id>`, `finder`. Each scope holds
`{ q, prov:Set, lvl:Set, fld:Set, co:Set, mon:Set, max, sch, coop, sort, show, provAll }`.
Scopes never share state, but a university scope is **seeded once** from its country scope on
first open (reference `vUni` behaviour) — implement as an explicit `inheritFrom()` call, not as
live binding.

## Keyboard map (FR-13)

| Key | Action | Where |
|---|---|---|
| `Esc` | `history.back()`, blur focused input first | global keydown |
| `Home` | navigate to `/destinations` | global keydown |
| `←` / `→` | previous/next sibling course | only on `/k/:key` |
| `F11` | toggle fullscreen (inert in kiosk) | Rust global shortcut |
| `Ctrl/Cmd+Q` | quit | Rust global shortcut |

Never swallow keys while an `<input>`/`<select>` is focused except `Esc` (blur).

## Testing

```bash
npm run test                 # vitest + Testing Library
npm run data:parity          # bundled snapshot vs reference/data
```

- Screen test = render with a fixture catalogue, assert the heading, one data point, and the
  primary action; use `createMemoryRouter` for route-level tests.
- Timer tests use `vi.useFakeTimers()`.
- Never snapshot-test animation output; assert final DOM state with reduced motion on.

## Definition of done reminder

`SPEC` FR satisfied · `DESIGN` tokens respected · offline-safe · reduced-motion-safe ·
`typecheck && lint && test` green · `PLAN.md` updated · FR IDs in the summary.
