export type MarketCapSource = 'DeFiLlama' | 'CoinGecko fallback'

export type DataQuality = 'Direct match' | 'Reviewed override'

export interface RankingRow {
  id: string
  name: string
  symbol: string
  category: string
  chains: string[]
  revenue30d: number
  annualizedRevenue: number
  marketCap: number
  revenueYield: number
  marketCapSource: MarketCapSource | string
  quality: DataQuality | string
  note: string
  methodologyUrl: string
  rank: number
}

export interface WatchlistRow {
  id: string
  name: string
  category: string
  revenue30d: number
  reason: string
}

export interface RankingsSnapshot {
  asOf: string
  metric: string
  methodology: {
    revenueSource: string
    primaryMarketCapSource: string
    fallbackMarketCapSource: string
    categories: string[]
    limitations: string[]
  }
  rankings: RankingRow[]
  watchlist: WatchlistRow[]
  coverage: {
    eligibleRows: number
    rankedRows: number
    unrankedWatchlistRows: number
  }
}

export type SortKey =
  | 'rank'
  | 'name'
  | 'category'
  | 'revenue30d'
  | 'annualizedRevenue'
  | 'marketCap'
  | 'revenueYield'

export type SortDirection = 'asc' | 'desc'
