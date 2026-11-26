---
name: LGA Design System
description: Design tokens, components, layout, theming, accessibility and the GSAP + Motion animation system for the LGA Study Visa Explorer presentation app (DESIGN v2). Load when styling, animating or building UI components in this repository.
---

# LGA design system & motion (v2 "presentation")

Source of truth: `DESIGN.md` (v2). This skill is the procedure for applying it. The reference
mock is the **content/behaviour** baseline only — its look is superseded (SPEC §12 D10).

## 1. Where styles live

| File | Holds |
|---|---|
| `src/styles/tokens.css` | every colour, gradient, scrim, space, radius, elevation, motion token + Tailwind `@theme` |
| `src/styles/base.css` | root scale, element defaults, type roles (`.eyebrow`, `.lead`, `.num`), `.wrap`, `.section`, `.prose`, `.sr-only`, reduced-motion clamp |
| `src/styles/components.css` | one commented section per component; classes prefixed by component (`.dest-card__go`) |

- Root scale (never change): `html { font-size: clamp(15px, calc(9px + .55vw), 22px) }`.
- Semantic colours use `light-dark()`; `data-theme` on `<html>` forces dark/light.
- **Forbidden:** colours (hex or rgba) outside `tokens.css`; new radii/shadows not in the token
  table; inline `style` (except GSAP initial states and the welcome `--hero` URL).
- Gold text on light surfaces is always `--goldInk`, never `--gold`/`--gold2`.

## 2. Building a screen

1. Chapter screens start with `<PageHeader eyebrow="NN · Chapter" title lead actions />`.
   The chapter number/label must match `src/data/chapters.ts`.
2. Detail screens start with `<Breadcrumbs>` then a photo band (`.band` / `.uni-hero`) — text on
   photos always sits on a `--scrim-*`; facts on photos are glass `.tile`s, facts on surfaces are
   `.fact` / `.kv` tiles.
3. Lists: `.split` (rail + results) with `<FilterRail>`, `.results-head`, `.grid` of cards or
   `<CourseRow>`s, `<Pager>` (never > 60 items unpaged), `<EmptyState>` when empty.
4. Any money, count or rule gets a `<SourceNote>` with the bundle/FX/rule date.
5. Use `<Icon name>` (inline SVG set in `components/Icon.tsx`); add a path there rather than a
   dependency.

## 3. Component vocabulary

| Need | Use |
|---|---|
| Primary / secondary / quiet action | `.btn` · `.btn--navy` · `.btn--ghost` (`--lg`, `--sm`, `--block`) · `.link-btn` |
| View switch or tabs | `<Segmented id label options value onChange asTabs?>` |
| Numbered reasons | `.card.feature` with `.feature__num` |
| Process | `.steps` (vertical, visa) · `.journey` (horizontal, 6 steps) |
| Expandable Q&A | `.faq` + `.faq__q[aria-expanded]` |
| Side-by-side comparison | `.compare-wrap > table.compare` (`--auto` when columns are user-chosen) |
| Highlight panel | `.panel--dark` (navy) · `.panel--gold` (gold-washed) · `.panel__big` key figure |
| Icon in a square | `.icon-badge` |
| Closing call to action | `.cta-band` + `<ContactLine className="cta-band__contact">` |

## 4. Motion — library split (prevents bugs)

| Library | Owns | Never |
|---|---|---|
| `motion` | page transition on `<main>`, shared inks (`layoutId="chapter-ink"`, `seg-<id>`), badge spring, course content slide, toast, dialog | mount sequences |
| GSAP (core) | one-shot mount choreography in `gsap.context(…, root)` reverted on cleanup | anything Motion also animates |

```tsx
const root = useRef<HTMLElement>(null);
useMountAnimation(
  root,
  ({ reveal }) => {
    reveal('.dest-card', { y: 32, opacity: 0, duration: 0.55, stagger: 0.06 });
  },
  [view], // re-run only when these change
);
```

`useMountAnimation` runs in `useLayoutEffect` (no flash of the final state), suspends CSS
transitions on the animated elements (no GSAP-vs-hover fight) and clears every inline style
when done; reduced motion skips it. **Never write a raw `useEffect` + `gsap.from` again** —
that pattern produced the stuck/jumping elements the e2e suite caught.

Rules: `transform`/`opacity` only; ≤ ~12 staggered children; plays once; nothing loops;
never re-animate on filter changes; Motion transitions get `{ duration: 0 }` when `!enabled`.
`npm run e2e` fails on anything left semi-transparent or translated after motion settles.
Choreography per screen: `DESIGN.md` §7.3.

**Gotcha:** a selector like `.chapter span { position: relative }` also hits the absolutely
positioned ink span — write `> span:not(.chapter__ink)`. Same for `.segmented`.

## 5. Theme (FR-25)

Default dark. Top-bar sun/moon toggles dark ⇄ light via `useAppearance().setMode`; persisted in
`tauri-plugin-store` (browser: `localStorage`). `Auto` arrives with the status popover (M6).
Check every change in **both** themes.

## 6. Accessibility (NFR-11)

Gold 3 px focus ring everywhere · chapter nav `aria-current="page"` · `Segmented` uses
`tablist/tab/aria-selected` or `aria-pressed` · FAQ `aria-expanded` · tables use `scope` ·
dialog `aria-modal`, focus trapped and restored · toast in a persistent `aria-live` region ·
icons `aria-hidden`.

## 7. Verify visually

Run `npx vite --port 5199` and screenshot with headless Chromium at 1920×1080. Add
`--force-prefers-reduced-motion` to see final states — headless virtual time freezes GSAP
mid-tween otherwise:

```bash
chromium --headless=new --hide-scrollbars --force-prefers-reduced-motion \
  --window-size=1920,1080 --virtual-time-budget=8000 \
  --screenshot=/tmp/shot.png "http://localhost:5199/#/destinations"
```

## 8. Before you call it done

`DESIGN.md` §9 Do/Don't · both themes · reduced motion · no colour outside `tokens.css` ·
no `innerHTML` (`RichText` only) · `npm run typecheck && npm run lint && npm test` green.
