# Consumer Crypto Revenue Yield — dashboard brief

## Objective
Create a responsive research dashboard ranking a draft universe of 20 tokenized, consumer-facing crypto applications by annualized revenue / circulating market capitalization.

## Metric
`revenue yield = (DeFiLlama trailing-30-day protocol revenue × 365 / 30) / circulating market cap`

This is a revenue yield, not profit, cash flow, tokenholder yield, or investment advice. A high value may reflect a tiny or illiquid token, temporary revenue, mismatched token economics, or bad source data.

## Draft universe
Include DeFiLlama revenue protocols in these retail-facing categories: Launchpad, Telegram Bot, Trading App, Prediction Market, NFT Marketplace, Gaming, Interface, Social, InfoFi, and Physical TCG. Require positive 30-day revenue and a verifiable token market cap. Match the revenue protocol to DeFiLlama `/protocols` by slug and require a non-placeholder token symbol. Add reviewed exceptions through an explicit override file.

Known exception handling:
- PUMP: use the `pump.fun` revenue adapter rather than summing every `parent#pump` product, avoiding possible cross-product double counting.
- PONS: aggregate `pons-v1` and `pons-v2`; flag the aggregation in the UI.
- GMGN: show in the unranked watchlist because DeFiLlama reports revenue but no token/market cap is verifiable in the current source set.
- Use DeFiLlama `/protocols` market cap when available. Use CoinGecko only as an explicit fallback for reviewed IDs that DeFiLlama leaves blank (currently PUMP and PONS).

## Interface
- Kraken-inspired research terminal: white/cool-gray surfaces, near-black text, purple `#7132f5`, green for positive states, 12px radii, Inter.
- Header with title, snapshot timestamp, methodology drawer, and source links.
- Summary cards: covered market cap, 30-day revenue, median revenue yield, ranked apps.
- Main ranked table with rank, app/token, category, 30d revenue, annualized revenue, market cap, revenue yield, and data-quality status.
- Horizontal bar visualization of revenue yield.
- Search, category filter, sort controls, and mobile cards.
- Detail drawer/modal on row click with formula, source provenance, adapter notes, and caveats.
- Unranked watchlist led by GMGN; explain why each item lacks a ratio.
- Prominent “Draft universe” and “Not investment advice” language.
- Do not fabricate historical data, prices, sparklines, liquidity, or tokenholder accrual.

## Technical requirements
- Vite + React + TypeScript; no backend required.
- Source snapshot generated into `src/data/rankings.json` by `python3 scripts/refresh_data.py`.
- Dashboard reads the checked-in snapshot and works offline after install/build.
- `npm run build` and lint/typecheck must pass.
- Accessible keyboard interactions, semantic table, visible focus, sufficient contrast, reduced-motion support.
- Responsive at 320, 375, 768, 1024, and 1440px.
