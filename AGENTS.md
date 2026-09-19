# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **frontend-only Vite PWA** (`honey-tasting-pwa`) — a QR-code honey tasting survey. There is no backend service in this repo.

### Services / commands
- **Dev server:** `npm run dev` (Vite, serves on port `5173` with `host: true`). This is the primary way to run the app for development.
- **Build:** `npm run build` (multi-page build; inputs are `index.html`, `supplier.html`, `partner.html`, `print.html`, `qr.html` — see `vite.config.js`). Output goes to `dist/` (a `dist/` is committed).
- **Preview built output:** `npm run preview`.
- **Lint/tests:** none are configured (no `lint`/`test` scripts, no test framework, no ESLint config). Don't expect `npm test`/`npm run lint` to exist.

### Non-obvious notes
- **External backend via Google Apps Script:** `src/main.js` defines `SUBMIT_URL` pointing at a deployed Google Apps Script endpoint. The live honey catalog is fetched from it via JSONP on load, and survey submissions are POSTed there (fire-and-forget, `no-cors`). The Apps Script source lives in `google-apps-script.js` (deployed separately, not run in this repo).
- If the Apps Script endpoint is unreachable (offline), the app **falls back to the built-in `SAMPLE_TEMPLATES`** in `src/main.js`, so the tasting flow still works. When online, the straw list reflects the live catalog (e.g. "Bubba's Bees", "Honeycutt Homestead", "Barnes Bees") rather than the hardcoded templates.
- Session/rating state is persisted in **IndexedDB** (`idb`) plus `localStorage` (`honey-session`), so ratings survive reloads. Use `?new=1` in the URL to clear the session and start fresh.
- The PWA service worker is configured `selfDestroying: true` (no offline caching) — it intentionally clears old service workers so devices always get fresh assets.
