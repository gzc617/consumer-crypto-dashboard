# DeFi Protocol Revenue Yield

Research dashboard ranking DeFiLlama protocols by annualized revenue / circulating market cap. Every category is eligible when trailing-30-day revenue is positive, circulating market cap is at least $1,000,000 (inclusive), and the token symbol passes filters. All eligible matches are ranked globally with no truncation.

## Scripts

- `npm run dev` — local Vite frontend (fetches `/api/rankings` when the production server is up; otherwise uses the checked-in snapshot)
- `npm run build` — typecheck + Vite production build into `dist/`
- `npm start` — production Node server (serves `dist/`, API routes, and the 4-hour refresh scheduler)
- `npm run preview` — Vite preview of the static build only
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript project references check
- `npm test` — Vitest (frontend + backend)
- `npm run refresh-data` — regenerate `src/data/rankings.json` and `data/rankings.csv` via TypeScript

## Local development

```bash
npm install
npm run dev
```

For live API + scheduled refresh locally:

```bash
npm run build
npm start
```

Then open `http://localhost:3000` (or the port in `PORT`). The server binds to `0.0.0.0` and exposes:

- `GET /api/health` — `{ "ok": true }`
- `GET /api/rankings` — latest successful in-memory rankings snapshot
- `GET /api/protocols/:slug/history?days=30|60|90` — daily protocol revenue + token USD price history
- static files from `dist/` (SPA fallback to `index.html`)

On startup the server attempts a fresh rankings build, then repeats every exactly 4 hours (`14_400_000` ms). Startup failure falls back to the checked-in snapshot; later failures retain last-known-good. Overlapping refreshes are skipped.

## Railway deployment

Deploy as **one** Node service from this repo:

1. Connect the repo in Railway (Nixpacks uses `railway.toml`).
2. Build runs `npm run build`; start runs `npm start`.
3. Railway sets `PORT`; health checks hit `/api/health`.

No environment secrets are required. Do not add API keys or paid third-party credentials for this deploy path.

## Data notes

- Rankings use DeFiLlama revenue + DeFiLlama circulating market cap only (no CoinGecko market-cap fallback). Ranked protocols must have circulating market cap ≥ $1,000,000.
- Detail price history uses CoinGecko free `market_chart` when DeFiLlama exposes `gecko_id`.
- Upstream rate limits or missing identifiers can leave price series unavailable while revenue still renders.
