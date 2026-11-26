# Changelog

All notable changes to LGA Study Visa Explorer. Versions follow [Semantic Versioning](https://semver.org).

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
