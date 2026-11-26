# LGA Study Explorer

A full-screen consultation app for the LGA office screen. Counsellors use it to walk students through destinations, universities and courses instead of explaining everything verbally.

## Run it on the office PC (Windows)

1. Install Node.js LTS from nodejs.org (one time).
2. Unzip this folder, open a terminal inside it and run:
   ```
   npm install
   npm start
   ```
   The app opens full screen. **F11** toggles full screen, **Ctrl+Q** quits.
3. For a locked-down screen (no way to leave the app by accident): `npm run kiosk`
4. To make a normal Windows installer (.exe) to install on any PC: `npm run dist`. The installer appears in `dist/`.

It works offline. University logos load when the PC is online; without internet a lettered badge shows instead.

## Using it in a consultation

| Screen | What it's for |
|---|---|
| Welcome | Leave this on the screen between visitors. Tap **Get started**. |
| Destinations | The five countries, with post-study work rights and counts. |
| Country | Three tabs: **Universities & courses** (filter by region, level, field, intake, budget, scholarships, co-op), **Why study here**, **Visa & work**. |
| University | About, campuses and facilities, and the courses list with filters. Filters chosen on the country page carry over. |
| Course | Overview, fees, intakes, work rights after graduation. **Add to shortlist**. Use ← → keys to step through a university's courses. |
| Course finder | Search every course in all five countries at once. Budget is in US$ equivalent. |
| Shortlist | Side-by-side comparison. **Copy summary** puts it on the clipboard to paste into WhatsApp or email. **Start new consultation** clears everything. |

Keyboard: **Esc** goes back, **Home** goes to Destinations. After 4 minutes with no activity the screen asks "Still with us?" and then returns to the welcome screen and clears the shortlist, so the next visitor never sees the last student's choices.

## Updating the course data

The catalogue comes from the website repo's scraper output (`scraper/data/processed/`). After the scraper runs again:

```
pip install pillow
python3 tools/build_data.py <path-to-visa-website-repo> .
```

This regenerates `data/catalog.js`, `data/detail-*.js` and the images. Country visa and work-rule text is in `index.html` (search for `COUNTRIES`) and was checked in November 2026; review it before each intake.
