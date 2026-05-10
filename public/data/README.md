# Data files

The app auto-seeds from these files **only when localStorage is empty** (e.g. fresh browser, first visit, or after Reset). Once seeded, all further changes live in localStorage; these files are not re-read.

## How to populate

### Planner — `planner.json`
1. Open the Planner page.
2. Click **Export** in the topbar — you'll get `telegram-plan-<date>.json`.
3. Save / copy that file as `public/data/planner.json` in this repo.

### Analysis — `analysis.json`
1. Open the Analysis page.
2. Click **Export** in the topbar — you'll get `telegram-analysis-<date>.json`.
3. Save / copy that file as `public/data/analysis.json` in this repo.

## What gets seeded

- A fresh browser, or one where you clicked Reset, will fetch these files on first load. Anything inside is treated as the starting state.
- Edit either file directly and reload the page (after wiping localStorage) to see changes.
- Delete a file (or rename it) and the app falls back to the built-in sample state.

## Privacy note

These JSON files are committed to git as-is — they are bundled with the app. Don't put anything sensitive in them that you don't want public if the repo is public.
