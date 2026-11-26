# Acceptance record — v0.1.0 (SPEC §10)

Run 2026-11-26 for the first release. ✅ verified · ⏳ needs a person at a real screen or
machine · ➖ partly verified (detail given).

| # | SPEC §10 gate | Status | Evidence |
|---|---|---|---|
| 1 | All nine routes render from the active bundle with reference-identical content | ✅ | `npm run data:parity` (436 / 4,225 / 4,202 summaries); screenshots of every route at 1920×1080 in `docs/screenshots/`; route error screen for anything unexpected |
| 2 | Every acceptance criterion in §5 passes | ➖ | 55 frontend + 32 Rust unit tests and the upstream parity gate cover FR-01…FR-28 behaviour; items needing hands-on checks are rows 4, 7, 8 and 10 |
| 3 | FR-12 idle reset — fake timers and at the office screen | ➖ | `tests/idle.test.tsx` ✅ · office screen ⏳ |
| 4 | Airplane-mode walkthrough of a full consultation (NFR-07) | ⏳ | Designed for it: bundled snapshot, crest/cached logos, offline status chip (unit-tested) |
| 5 | Catalogue update — synthetic change and real upstream (FR-19) | ➖ | Synthetic: updater tests (new fingerprint, corrupt download, crash before pointer swap, stale data, offline) ✅ · real upstream: live full update into a temp store, 4,225 courses in 3.5 s ✅ · inside the desktop app ⏳ |
| 6 | App update from a published `latest.json` on all three OSes (FR-24) | ⏳ | Signed builds for all four targets ✅ (release dry run); update rehearsal needs v0.1.0 installed, then v0.1.1 published |
| 7 | Visual sign-off at 1920×1080 against DESIGN v2, dark and light | ➖ | Dark: every route screenshotted ✅ · light theme and the office screen ⏳ |
| 8 | Reduced-motion pass (NFR-11) | ➖ | Single motion flag, screenshots taken with reduced motion, count-up fix tested ✅ · manual pass ⏳ |
| 9 | `typecheck && lint && test && cargo test` green | ✅ | Locally and in GitHub Actions CI on every push |
| 10 | Installers produced for Windows/macOS/Linux and installed on a clean machine | ➖ | Produced and signed by `release.yml` ✅ · clean-machine install ⏳ |

Not run here (need hardware and time): NFR-13 8-hour soak on the welcome screen, NFR-04/05
frame chart and memory on an office PC, the 4K and laptop-mirror pass (NFR-07, M8.4), and the
kiosk run-through (Gate G5).

**Release decision:** v0.1.0 ships as the first public build for in-office trials. Close the ⏳
rows on the office screen before calling a release production-ready (target v1.0.0).
