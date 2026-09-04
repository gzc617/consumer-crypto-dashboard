# Consumer Crypto Revenue Yield

Research dashboard ranking a draft universe of tokenized, consumer-facing crypto apps by annualized revenue / circulating market cap.

## Scripts

- `npm run dev` — local Vite server
- `npm run build` — typecheck + production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript project references check
- `npm test` — Vitest
- `npm run refresh-data` — regenerate `src/data/rankings.json` via Python

The UI reads the checked-in snapshot in `src/data/rankings.json` and works offline after install/build.
The refresh also exports the current ranking to `data/top20.csv`.
