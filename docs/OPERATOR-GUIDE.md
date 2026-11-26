# Operator guide — LGA Study Visa Explorer

For the person who sets up and looks after the consultation screens at LGA Visa.
No programming needed.

---

## 1. Install

Download the installer for the machine from the latest release:
<https://github.com/charithmadhuranga/lga-study-visa-explorer/releases/latest>

| Machine | Download | Install |
|---|---|---|
| **Windows 10 / 11** | `LGA Study Visa Explorer_<version>_x64-setup.exe` | Run it, accept the licence, click **Install**. No administrator rights needed. It adds a Start-menu entry; leave **Create desktop shortcut** ticked on the last page. |
| **Mac with Apple chip** (M1 or later) | `…_aarch64.dmg` | Open it, drag the app into **Applications**. |
| **Mac with Intel chip** | `…_x64.dmg` | As above. |
| **Linux** | `…_amd64.AppImage` (recommended) | Make it executable (right-click → Properties → *Allow executing*), then double-click. |

**First launch on a Mac:** the app is not yet notarised by Apple, so macOS warns about it.
Right-click the app in **Applications**, choose **Open**, then **Open** again. You only do this once.

**Windows SmartScreen:** if Windows shows "Windows protected your PC", click **More info →
Run anyway**. (The installer is not yet code-signed with a Windows certificate.)

## 2. Everyday use

- The app opens full screen on the welcome page. Press **Start the consultation**.
- The top bar shows the five chapters: **About LGA → Destinations → Courses → Shortlist → Next steps**.
  A presentation clicker's next/previous buttons move between chapters.
- **Keys:** `Esc` back · `Home` destinations · `←`/`→` previous/next course · `F11` full screen
  on/off · `Ctrl+Q` (`⌘Q` on Mac) quit.
- After **4 minutes** without anyone touching the screen, a 20-second countdown appears and the
  app returns to the welcome page, clearing the shortlist for the next visitor. Tap
  **Continue consultation** to keep going.

## 3. Kiosk mode (unattended screens)

Kiosk mode locks the app full screen and on top, and hides the mouse cursor. Only
`Ctrl+Q` / `⌘Q` exits. Add `--kiosk` when starting the app:

- **Windows:** right-click the desktop shortcut → **Properties** → at the end of **Target**, after
  the closing quote, add a space and `--kiosk` → **OK**. To start it automatically at sign-in,
  press `Win+R`, type `shell:startup`, and copy that shortcut into the folder that opens.
- **Mac:** in Terminal run `open -a "LGA Study Visa Explorer" --args --kiosk`. To start it at
  login, save that line in an Automator *Application* and add it under **System Settings →
  General → Login Items**.
- **Linux:** run `./LGA*.AppImage --kiosk`. To start at login, create
  `~/.config/autostart/lga.desktop` with an `Exec=` line pointing at the AppImage plus `--kiosk`.

## 4. Keeping it up to date

Two kinds of update happen on their own. Nobody needs to copy files.

| What | How it updates | What you see |
|---|---|---|
| **Course catalogue** (universities, courses, fees, intakes) | Checked a few seconds after start and every 6 hours while online; downloaded and swapped in silently. | The chip at the top right: **Up to date · date**, **Updating… %**, or **Offline · showing date**. Click it for details and **Check for updates**. |
| **The app itself** | Checked once a day. | A slim banner: *Version x is ready*. Click **Restart & update** between consultations (about a minute). **Later** hides it. It never updates by itself mid-consultation. |

The app works fully **offline**. Without internet it keeps showing the last catalogue it had,
and university logos it has seen before. Logos it has never seen show the university's initials.

## 5. Troubleshooting

| Problem | What to do |
|---|---|
| The chip says **Offline** | Normal without internet. Everything still works. It updates when the connection returns. |
| The chip says **Update failed — retrying** | It retries automatically after 1, 5, 15 and 60 minutes. Click the chip for the reason. The data on screen is unaffected. |
| A logo shows initials instead of the logo | That logo hasn't been downloaded yet. It appears once the screen has been online on that page. |
| The screen is stuck in kiosk mode | Press `Ctrl+Q` (`⌘Q` on Mac) to quit, then start the app without `--kiosk`. |
| Text looks too small or too large | The app scales with the screen resolution. Use 1920×1080 or higher, and set display scaling to 100 %. |
| Light theme wanted | Click the sun icon in the top bar, or choose **Auto / Light / Dark** in the catalogue chip. |

## 6. Questions about the data

- **Where do the courses come from?** LGA's course catalogue, built from the processed scraper
  data in the `visa-website` repository. Each page shows the catalogue and exchange-rate dates.
- **Fees in US$?** Converted with the exchange rates of the month shown in the chip
  (e.g. *Exchange rates 2026-11*). They are guidance only.
- **Visa and work rules?** Written by LGA and checked on the date shown under each country.
  Before each intake, someone at LGA should review them and ask for an app update if they changed.
- **Closed intakes?** Never shown: intakes before today are hidden automatically.

## 7. Contact

Problems or requests: **admin@lgavisa.com** · +94 71 722 5223.
