# DeFi Protocol Revenue Yield — dashboard brief

## Objective
Create a responsive research dashboard ranking every eligible DeFiLlama protocol by annualized revenue / circulating market capitalization. Do not truncate the ranked set.

## Metric
`revenue yield = (DeFiLlama trailing-30-day protocol revenue × 365 / 30) / circulating market cap`

This is a revenue yield, not profit, cash flow, tokenholder yield, or investment advice. A high value may reflect a tiny or illiquid token, temporary revenue, mismatched token economics, or bad source data.

## Universe
Include every DeFiLlama revenue category. Require positive trailing-30-day protocol revenue, circulating market cap of at least $1,000,000 (inclusive) from DeFiLlama `/protocols`, and a non-placeholder token symbol. Match revenue protocols to `/protocols` by slug. Do not use CoinGecko market-cap fallbacks or bespoke watchlists for rankings. Publish honest coverage counts for exclusions.

## Interface
- Kraken-inspired research terminal: white/cool-gray surfaces, near-black text, purple `#7132f5`, green for positive states, 12px radii, Inter.
- Header titled **DeFi Protocol Revenue Yield**, snapshot timestamp, methodology drawer, source links, CSV export.
- Summary cards: covered market cap, 30-day revenue, median revenue yield, ranked protocols.
- Main ranked table with rank, protocol/token, category, 30d revenue, annualized revenue, market cap, revenue yield, and data-quality status.
- Horizontal bar visualization of revenue yield.
- Search, category filter, sort controls, accessible pagination, and mobile cards.
- Detail drawer/modal on row click with formula, provenance, notes, caveats, and selectable 30/60/90-day revenue + token USD price charts from real sources only.
- Coverage panel explaining exclusion counts; do not imply excluded protocols are ranked.
- Prominent “Not investment advice” language.
- Do not invent missing history points, interpolate gaps, or present market-cap history as price history.

## Technical requirements
- Vite + React + TypeScript frontend; Node production server with TypeScript ranking refresh.
- Checked-in snapshot at `src/data/rankings.json`; regenerate with `npm run refresh-data`.
- UI fetches `GET /api/rankings` with loading/error states and checked-in fallback for static development/tests.
- Server refreshes rankings on startup and every exactly 4 hours; serves last-known-good; scheduler must be stoppable for tests.
- `GET /api/protocols/:slug/history?days=30|60|90` for DeFiLlama revenue history + CoinGecko price history when resolvable.
- `npm run build` and lint/typecheck/tests must pass.
- Accessible keyboard interactions, semantic table, visible focus, sufficient contrast, reduced-motion support.
- Responsive at 320, 375, 768, 1024, and 1440px.
