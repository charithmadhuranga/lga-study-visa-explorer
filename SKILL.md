# SKILL — LGA Study Explorer working index

The master index for building the LGA Study Explorer desktop app (Tauri 2 + Rust + React).
Load this first for any task; load the detailed skill that matches the task afterwards.

---

## 1. One-paragraph brief

A full-screen, offline-first presentation app that LGA Visa consultants drive on a large office
screen to walk students and parents through destinations, partner universities, courses, fees,
visas and work rights. It must look like the navy-and-gold reference mock in `reference/`, animate
smoothly (GSAP + Motion), run on Windows/macOS/Linux, keep its catalogue up to date by itself
while online, and update its own binary through a signed release feed.

## 2. Read in this order

| Order | File | Why |
|---|---|---|
| 1 | `AGENTS.md` | rules, commands, conventions, definition of done |
| 2 | `PLAN.md` | which milestone is next and what its gate requires |
| 3 | `SPEC.md` | the requirement you are implementing (FR-xx / NFR-xx) |
| 4 | `DESIGN.md` | tokens, component, layout and motion rules for that screen |
| 5 | `.opencode/skills/<skill>/SKILL.md` | the detailed procedure |
| 6 | `reference/index.html` | the authoritative behaviour — read-only, look, don't edit |

## 3. Skill map

| Skill ID | Load when the task is… |
|---|---|
| `lga-desktop` | general app work: routing, stores, selectors, screens, tests, repo layout |
| `lga-design-system` | visuals, tokens, components, GSAP/Motion animation, theme, accessibility |
| `lga-catalogue-data` | catalogue schema, import/transform, sanitisation, the online updater, parity |
| `lga-tauri-shell` | Rust side: window/fullscreen/kiosk, shortcuts, CSP, plugins, packaging, app updates |

## 4. The five facts that decide most questions

1. **`reference/` is the specification and is read-only.** Behaviour, copy, colours and layout
   already exist there. Port them; never re-invent them.
2. **All numbers come from the active catalogue bundle** — counts, fees, FX, dates. Only the
   company copy (services, journey, visa rules, contact) lives in `src/data/content.ts`.
3. **Offline is the default assumption.** Bundled data first, network second, graceful degradation
   always (crest logos, honest status chip).
4. **Two motion libraries with a strict split:** `motion` for component state changes,
   GSAP for mount choreography and scroll. Never both on one property of one element.
5. **The consultant is mid-sentence.** Nothing may block, surprise or trap them: no modal without
   an exit, no auto-install, no reset except the documented 4-minute idle rule.

## 5. Standard task loop

```
read SKILL.md → find the FR in SPEC.md → read the DESIGN.md section for that screen
   → load the matching skill (@lga-desktop | @lga-design-system | @lga-catalogue-data | @lga-tauri-shell)
   → implement the smallest slice → write/run its test
   → check offline + reduced-motion behaviour → update PLAN.md checkbox → report with FR IDs
```

## 6. Command card

```bash
npm run tauri dev            # run the app (windowed in dev)
npm run dev                  # Vite only, browser
npm run typecheck && npm run lint && npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run data:import          # rebuild the bundled snapshot from reference/data
npm run data:parity          # prove the snapshot matches the reference
npm run tauri build          # release installers + signed updater artefacts
```

## 7. Reference numbers (from `reference/data/catalog.js`, built 2026-11-23)

- 436 institutions · 4,225 courses · 5 destinations · 12 fields · 3 levels (Bachelor's, Master's, MBA)
- By country: USA 1,147 · UK 1,037 · Canada 953 · Australia 848 · New Zealand 240
- FX (2026-11): USD 1.0 · CAD 0.72 · AUD 0.66 · GBP 1.3 · NZD 0.6
- Detail files: uk 1.6 MB · usa 1.8 MB · canada 1.4 MB · australia 1.0 MB · new-zealand 0.2 MB
- Images bundled from `reference/img`: hero, 5 destination photos, logo, 24 curated campus photos (4.7 MB)

## 8. Escalate rather than improvise

If the spec is silent, ambiguous or contradicted by `reference/`, stop and ask. The cost of a
wrong assumption here (a screen redesigned, a schema changed, a dependency added) is far higher
than the cost of a question.
