# Changelog

All notable changes to LGA Study Visa Explorer. Versions follow [Semantic Versioning](https://semver.org).

## [Unreleased]

### Fixed
- **Sections not loading until a reload (Linux):** after navigating, every section except
  Destinations could stay blank until the app was reloaded. The page fade used an animation
  that never finished in the Linux web engine (WebKitGTK), leaving the page invisible. The
  fade is now a plain CSS animation whose resting state is always visible.
- Escape on the status popover or the Close dialog now only closes it, never also goes back.

### Added
- **Real-engine smoke test** (`npm run e2e:webkitgtk`): drives the app in WebKitGTK — the
  engine the Linux app actually uses — through every section, the drill-down, the overlays and
  the clicker keys, in CI on every push. It fails 11 of 17 navigation steps on v0.1.1.

## [0.1.1] — 2026-11-27

### Fixed
- **Animation glitches:** elements could end stuck part-way through their entrance (e.g. the
  welcome buttons), flash in their final position before animating, or stutter, because GSAP
  and CSS hover transitions fought over the same property. Entrances now run before the first
  paint with transitions suspended, and always finish cleanly.
- **Navigation:** pages now open at the top instantly instead of smooth-scrolling while the
  new page fades in; page transitions are faster.
- **Window:** after leaving full screen (F11) the window has its title bar again, so it can be
  moved, resized and closed; it no longer flashes at the wrong size on start.
- **Linux rendering:** works around WebKitGTK flicker and stalled repaints on NVIDIA and other
  GPU drivers.
- **Slowness / stalls:** logo lookups no longer run on the UI thread; the bundled catalogue is
  22 % smaller; a fresh install no longer re-downloads the whole catalogue on first launch.
- Search filtering no longer re-animates the result list on every keystroke.
- **Smoother on modest hardware:** no more zooming full-screen photos or blurred backdrops;
  images decode off the UI thread; country and finder filters are computed once instead of on
  every keystroke (country pages open up to 6× faster on a slow CPU).

### Added
- **Close button** in the top bar, with a confirmation so a stray tap can't end a consultation
  (hidden in kiosk mode).
- **End-to-end test suite** (Playwright) covering every screen, navigation, data loading,
  animations, layout at full-screen and windowed sizes, and reduced motion — in Chromium and
  WebKit, run in CI on every push.

## [0.1.0] — 2026-11-26

First public release of the Tauri desktop app, replacing the Electron prototype.

### Added
- **Presentation flow** in five chapters — About LGA, Destinations, Find a course, Shortlist,
  Next steps — with slide-style headers and presentation-clicker support (PageUp / PageDown).
- **Destinations** as photo cards and a **Compare** table of work rights, intakes and typical
  tuition (local currency and US$).
- **Country, university and course pages**: key facts, visa steps timeline, expandable FAQs,
  campus facts, course overviews, upcoming intakes and post-study work rules.
- **Course finder** across 4,225 courses with destination, level, field, intake, US$ budget,
  scholarship and co-op filters.
- **Shortlist** comparison with "Copy summary" for WhatsApp or email.
- **Automatic catalogue updates** in the background, with a status chip and popover; a failed
  update never affects what is on screen.
- **Offline university-logo cache.**
- **Signed app self-update** that installs only after an explicit click.
- **Kiosk mode** (`--kiosk`), idle reset after 4 minutes for privacy, dark and light themes,
  reduced-motion support.
- Installers for Windows (x64), macOS (Apple silicon, Intel) and Linux (AppImage, deb).

### Known limitations
- macOS builds are not notarised and Windows installers are not code-signed: first launch shows
  a system warning (see the [operator guide](docs/OPERATOR-GUIDE.md)).
- The Linux AppImage is large (~100 MB) because it bundles its web engine; the `.deb` is smaller
  but does not update itself.
- Visual sign-off on the office screen, the 8-hour soak test and the clean-machine update
  rehearsal are still pending (see [acceptance record](docs/ACCEPTANCE.md)).
