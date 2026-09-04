#!/usr/bin/env python3
"""Build a reproducible consumer-crypto revenue-yield snapshot.

Revenue is sourced from DeFiLlama's free fees/revenue API. Market cap is
sourced from DeFiLlama /protocols when present, with reviewed CoinGecko
fallbacks for protocols whose DeFiLlama market cap is blank.
"""
from __future__ import annotations

import csv
import json
import math
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "data" / "rankings.json"
CSV_OUT = ROOT / "data" / "top20.csv"

REVENUE_URL = (
    "https://api.llama.fi/overview/fees"
    "?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true"
    "&dataType=dailyRevenue"
)
PROTOCOLS_URL = "https://api.llama.fi/protocols"
COINGECKO_MARKETS_URL = "https://api.coingecko.com/api/v3/coins/markets"

CONSUMER_CATEGORIES = {
    "Launchpad",
    "Telegram Bot",
    "Trading App",
    "Prediction Market",
    "NFT Marketplace",
    "Gaming",
    "Interface",
    "Social",
    "InfoFi",
    "Physical TCG",
}

# Reviewed exceptions only. CoinGecko is used because DeFiLlama's protocol
# records currently expose no market cap for these tokens.
FALLBACKS = {
    "pump.fun": {
        "name": "pump.fun",
        "symbol": "PUMP",
        "category": "Launchpad",
        "revenue_slugs": ["pump.fun"],
        "coingecko_id": "pump-fun",
        "note": "Core pump.fun adapter only; related PUMP products are not summed to reduce double-counting risk.",
    },
    "pons": {
        "name": "Pons",
        "symbol": "PONS",
        "category": "Launchpad",
        "revenue_slugs": ["pons-v1", "pons-v2"],
        "coingecko_id": "pons",
        "note": "Pons V1 and V2 revenue are aggregated; review version overlap before production use.",
    },
}

WATCHLIST_SLUGS = ["gmgn", "axiom", "fomo-wallet", "terminal", "trojan"]


def get_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "consumer-crypto-revenue-dashboard/0.1"})
    with urllib.request.urlopen(req, timeout=45) as response:
        return json.load(response)


def finite_positive(value) -> bool:
    return isinstance(value, (int, float)) and math.isfinite(value) and value > 0


def main() -> None:
    revenue_payload = get_json(REVENUE_URL)
    protocols = get_json(PROTOCOLS_URL)
    revenue_by_slug = {row["slug"]: row for row in revenue_payload["protocols"]}
    protocol_by_slug = {row["slug"]: row for row in protocols}

    rows = []
    for slug, revenue in revenue_by_slug.items():
        protocol = protocol_by_slug.get(slug)
        revenue_30d = revenue.get("total30d")
        if (
            revenue.get("category") not in CONSUMER_CATEGORIES
            or not finite_positive(revenue_30d)
            or not protocol
            or not finite_positive(protocol.get("mcap"))
            or protocol.get("symbol") in (None, "", "-")
        ):
            continue
        annualized = revenue_30d * 365 / 30
        rows.append(
            {
                "id": slug,
                "name": revenue.get("displayName") or revenue["name"],
                "symbol": protocol["symbol"],
                "category": revenue["category"],
                "chains": revenue.get("chains", []),
                "revenue30d": revenue_30d,
                "annualizedRevenue": annualized,
                "marketCap": protocol["mcap"],
                "revenueYield": annualized / protocol["mcap"],
                "marketCapSource": "DeFiLlama",
                "quality": "Direct match",
                "note": "Revenue and market cap records matched by DeFiLlama protocol slug.",
                "methodologyUrl": revenue.get("methodologyURL"),
            }
        )

    cg_ids = [item["coingecko_id"] for item in FALLBACKS.values()]
    params = urllib.parse.urlencode({"vs_currency": "usd", "ids": ",".join(cg_ids)})
    cg_rows = get_json(f"{COINGECKO_MARKETS_URL}?{params}")
    cg_by_id = {row["id"]: row for row in cg_rows}

    # Replace any accidental direct matches with the reviewed record.
    fallback_revenue_slugs = {slug for item in FALLBACKS.values() for slug in item["revenue_slugs"]}
    rows = [row for row in rows if row["id"] not in fallback_revenue_slugs]
    for item_id, item in FALLBACKS.items():
        market = cg_by_id.get(item["coingecko_id"], {})
        market_cap = market.get("market_cap")
        if not finite_positive(market_cap):
            raise RuntimeError(f"Missing CoinGecko market cap for {item_id}")
        components = [revenue_by_slug.get(slug) for slug in item["revenue_slugs"]]
        if any(component is None for component in components):
            raise RuntimeError(f"Missing DeFiLlama revenue adapter for {item_id}")
        revenue_30d = sum(component.get("total30d") or 0 for component in components)
        annualized = revenue_30d * 365 / 30
        chains = sorted({chain for component in components for chain in component.get("chains", [])})
        rows.append(
            {
                "id": item_id,
                "name": item["name"],
                "symbol": item["symbol"],
                "category": item["category"],
                "chains": chains,
                "revenue30d": revenue_30d,
                "annualizedRevenue": annualized,
                "marketCap": market_cap,
                "revenueYield": annualized / market_cap,
                "marketCapSource": "CoinGecko fallback",
                "quality": "Reviewed override",
                "note": item["note"],
                "methodologyUrl": components[0].get("methodologyURL"),
            }
        )

    rows.sort(key=lambda row: row["revenueYield"], reverse=True)
    top20 = rows[:20]
    for index, row in enumerate(top20, 1):
        row["rank"] = index

    watchlist = []
    ranked_ids = {row["id"] for row in top20}
    for slug in WATCHLIST_SLUGS:
        revenue = revenue_by_slug.get(slug)
        if not revenue or slug in ranked_ids:
            continue
        watchlist.append(
            {
                "id": slug,
                "name": revenue.get("displayName") or revenue["name"],
                "category": revenue.get("category"),
                "revenue30d": revenue.get("total30d"),
                "reason": "No verifiable circulating token market cap in the configured source set.",
            }
        )

    snapshot = {
        "asOf": datetime.now(timezone.utc).isoformat(),
        "metric": "Trailing-30-day protocol revenue annualized (×365/30), divided by circulating market cap",
        "methodology": {
            "revenueSource": REVENUE_URL,
            "primaryMarketCapSource": PROTOCOLS_URL,
            "fallbackMarketCapSource": COINGECKO_MARKETS_URL,
            "categories": sorted(CONSUMER_CATEGORIES),
            "limitations": [
                "Draft category screen, not a canonical list of every consumer crypto app.",
                "Revenue is not profit, cash flow, or tokenholder revenue.",
                "Annualizing 30 days can overstate temporary activity.",
                "Market cap and revenue timestamps may differ slightly.",
                "Small or illiquid tokens can dominate the ratio.",
            ],
        },
        "rankings": top20,
        "watchlist": watchlist,
        "coverage": {
            "eligibleRows": len(rows),
            "rankedRows": len(top20),
            "unrankedWatchlistRows": len(watchlist),
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(snapshot, indent=2) + "\n")
    CSV_OUT.parent.mkdir(parents=True, exist_ok=True)
    with CSV_OUT.open("w", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "rank",
                "name",
                "symbol",
                "category",
                "revenue30d",
                "annualizedRevenue",
                "marketCap",
                "revenueYield",
                "marketCapSource",
                "quality",
            ],
        )
        writer.writeheader()
        writer.writerows({key: row.get(key) for key in writer.fieldnames} for row in top20)
    print(f"Wrote {OUT} and {CSV_OUT} with {len(top20)} ranked rows")


if __name__ == "__main__":
    main()
