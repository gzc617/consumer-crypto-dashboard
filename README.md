# Consumer Crypto Revenue Yield

Research dashboard ranking a draft universe of tokenized, consumer-facing crypto apps by annualized revenue / circulating market cap.

## Scripts

- `npm run dev` — local Vite frontend (reads the checked-in snapshot directly)
- `npm run build` — typecheck + Vite production build into `dist/`
- `npm start` — production Node server (serves `dist/` and API routes)
- `npm run preview` — Vite preview of the static build only
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript project references check
- `npm test` — Vitest (frontend + backend)
- `npm run refresh-data` — regenerate `src/data/rankings.json` via Python

## Local development

```bash
npm install
npm run dev
```

The UI imports the checked-in snapshot in `src/data/rankings.json` and works offline after install/build. Ranking methodology is unchanged; refresh only regenerates the snapshot and also exports `data/top20.csv`.

To exercise the production server locally:

```bash
npm run build
npm start
```

Then open `http://localhost:3000` (or the port in `PORT`). The server binds to `0.0.0.0` and exposes:

- `GET /api/health` — `{ "ok": true }`
- `GET /api/rankings` — the same checked-in rankings snapshot JSON
- static files from `dist/` (SPA fallback to `index.html`)

## Railway deployment

Deploy as **one** Node service from this repo:

1. Connect the repo in Railway (Nixpacks uses `railway.toml`).
2. Build runs `npm run build`; start runs `npm start`.
3. Railway sets `PORT`; health checks hit `/api/health`.

No environment secrets are required. Do not add API keys or paid third-party credentials for this deploy path.

## Non-goals

Auth, database, cron refresh, third-party paid services, and ranking-methodology changes are out of scope for this service.
