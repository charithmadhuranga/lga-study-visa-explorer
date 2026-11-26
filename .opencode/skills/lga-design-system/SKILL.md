---
name: LGA Design System
description: Design tokens, components, layout, theming, accessibility and the GSAP + Motion animation system for the LGA Study Explorer presentation app. Load when styling, animating or building UI components in this repository.
---

# LGA design system & motion

Source of truth: `DESIGN.md`. This skill is the procedure for applying it. The visual baseline is
`reference/index.html` — port values from there; invent nothing.

## 1. Tokens first, always

`src/styles/tokens.css` holds every colour/radius/shadow/clamp; `base.css` holds resets, the root
scale and global focus/scrollbar rules. Tailwind v4 consumes them via `@theme`:

```css
@import "./tokens.css";
@import "tailwindcss";

@theme {
  --color-navy: #0B1F3A;   --color-navy2: #16305A;
  --color-gold: #C9A45C;   --color-gold2: #E3C88A;  --color-gold3: #A9813F;
  --color-bg: var(--bg);   --color-card: var(--card);
  --color-ink: var(--ink); --color-mute: var(--mute); --color-line: var(--line);
  --font-display: "Montserrat", system-ui, sans-serif;
  --font-sans: "Inter", system-ui, sans-serif;
}
```

- Root scale (do not change): `html { font-size: clamp(15px, calc(9px + .55vw), 22px) }` — this
  is what makes the app readable at 4K and at 1080p.
- Semantic colours switch with `color-scheme` (`light-dark()`), exactly as the mock.
- **Forbidden:** any hex value outside `tokens.css`, a new radius, a third shadow, a gradient not
  listed in `DESIGN.md`.

## 2. Component rules

- Real `<button>`/`<input>`/`<select>` elements only; `min-height: 44px` for interactive, `48px`
  for primary buttons.
- Primary button = gold gradient `linear-gradient(135deg, var(--gold2), var(--gold))` with navy
  Montserrat 700 text; `alt` = navy/white; `line` = transparent with 2 px `--line` border.
- Cards: `--card` background, 1 px `--line`, radius `18px`; hover `translateY(-3px)` +
  `0 16px 32px -20px rgba(11,31,58,.5)` (the only two shadows in the app).
- Pills/chips: radius `999px`; inactive = `--chip`; active = navy bg + gold border + white text;
  gold variant = `rgba(201,164,92,.2)` bg with `--goldInk` text.
- Photos: always full-bleed under a navy scrim (`linear-gradient(180deg, rgba(11,31,58,.05) 25%, rgba(11,31,58,.92) 78%)`
  for cards, `90deg` for bands) before any text sits on them.
- Empty states are a component (dashed panel + title + hint + action), never a bare sentence.

## 3. Layout recipes

| Pattern | CSS | Used by |
|---|---|---|
| Page wrapper | `max-width:1760px; padding: clamp(18px,2.2vw,40px) max(3vw,16px)` | every screen |
| Rail + results | `grid-template-columns: 18rem minmax(0,1fr); gap:1.5rem` with sticky rail at `top:5.2rem` | country, university, finder |
| Content + aside | `minmax(0,1.55fr) minmax(0,1fr); gap:1.4rem` | visa tab, course, about |
| Card grid | `repeat(auto-fill, minmax(min(100%,19rem), 1fr)); gap:1.1rem` | destinations (5-up), universities, services |
| Fact strip | 4 equal cells, 1 px `--line` separators inside a bordered rounded box | country, university |

Responsive: 1200 / 900 / 600 px breakpoints exactly as the mock; ≥1200 px is the design target.

## 4. Motion — library split (the rule that prevents bugs)

| Library | Owns | Never |
|---|---|---|
| `motion` (Motion for React) | component enter/exit (`AnimatePresence`), layout/FLIP (`layout`, `layoutId`), hover/press, toast & dialog springs, shared tab underline | page-load sequences, scroll |
| GSAP (+ `ScrollTrigger`) | mount choreography (timelines, staggers, count-ups), parallax, multi-element sequences | anything also inside `AnimatePresence` |

**Never animate the same property of the same element from both.**

### 4.1 Shared variants — `src/animation/variants.ts`

```ts
export const pageVariants = {
  initial: { opacity: 0, y: 16 },
  enter:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -8,  transition: { duration: 0.25, ease: 'easeIn' } },
};
export const stagger = (n = 0.06) => ({ staggerChildren: n });
export const itemVariants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
export const spring = { type: 'spring', stiffness: 420, damping: 34 } as const;
```

### 4.2 Page transition — `usePageTransition`

Wrap the route outlet in `<motion.main variants={pageVariants} initial="initial" animate="enter" exit="exit">`
inside `<AnimatePresence mode="wait">` in `router.tsx`. Every screen inherits it — screens must
not add their own whole-page fade.

### 4.3 GSAP mount sequences

```tsx
const root = useRef<HTMLDivElement>(null);
const enabled = useMotionEnabled();                 // single reduced-motion flag
useEffect(() => {
  if (!enabled) return;
  const ctx = gsap.context(() => {
    gsap.timeline()
      .from('.hero-img', { scale: 1.08, duration: 1.2, ease: 'power2.out' })
      .from('.headline > *', { y: 40, opacity: 0, duration: 0.6, stagger: 0.06 }, '-=0.8')
      .from('.cta', { y: 12, opacity: 0, duration: 0.4 }, '-=0.2');
  }, root);                                          // scope — mandatory
  return () => ctx.revert();                        // cleanup — mandatory
}, [enabled]);
```

Rules: always scoped, always reverted, `transform`/`opacity` only, ≤ 12 animated children per
grid (fade the rest), no infinite loops except the update-chip pulse.

### 4.4 Screen choreography map (from `DESIGN.md` §7.3)

| Screen | Motion |
|---|---|
| Welcome | hero scale 1.08→1, headline word stagger 0.06 s, gold `<em>` wipe, stat count-ups, CTA last |
| Destinations | card stagger `y 40→0`; hover image `scale 1.06` + scrim deepen |
| Country | fact cells stagger 0.05 s; tab underline `layoutId="tab-ink"`; results FLIP on filter change |
| University | hero parallax `yPercent 10` (`ScrollTrigger`); logo plate `scale .94→1` |
| Course | kv values stagger; stepper slides `x ±40` direction-aware |
| Finder | animate only on result-set change, never per keystroke |
| Shortlist | column `layout` on add/remove; top-bar badge spring `1→1.15→1` |
| Idle dialog | backdrop fade 0.25 s, panel `scale .96→1` |
| Toast | in `y 24→0` 0.25 s / out 0.2 s |
| Status chip | pulsing dot while checking; checkmark `pathLength 0→1` when done |

### 4.5 Reduced motion

One flag: `src/animation/useMotionEnabled.ts` reading
`window.matchMedia('(prefers-reduced-motion: reduce)')` (and, when implemented, the appearance
setting). Every animation path checks it; when off, render final states instantly (no tween, no
parallax, no counters). Never scatter ad-hoc `prefers-reduced-motion` checks in components.

## 5. Theme (FR-25)

- Default: `data-theme="dark"` on `<html>`; `Auto` restores OS-following `color-scheme`.
- Persist with `tauri-plugin-store` (key `appearance`, values `auto|light|dark`); in the browser
  dev shim fall back to `localStorage`.
- Switching must not reload the app or clear filters — it only swaps one attribute.
- Light theme must remain fully legible (verify `--goldInk` links, chips and cards).

## 6. Accessibility pass (NFR-11)

- Global `:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px }`.
- `role="tablist"/"tab"` + `aria-selected`; dialog `role="dialog" aria-modal="true"` with focus
  trap and return; toast `role="status" aria-live="polite"`; chips `aria-pressed`.
- Contrast table in `DESIGN.md` §2.4 — re-check if you change any token.
- Keyboard-only navigation must reach every action on every screen.

## 7. Before you call it done

`DESIGN.md` §9 “Do / Don't” list · reduced-motion verified · no hex outside `tokens.css` ·
no `innerHTML` (`RichText` only) · frame chart clean at 1920×1080 · side-by-side against
`reference/` for the route you touched.
