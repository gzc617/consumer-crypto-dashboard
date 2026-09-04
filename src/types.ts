export type MarketCapSource = 'DeFiLlama'

export type DataQuality = 'Direct match'

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

export interface CoverageExclusionCounts {
  missingProtocolMatch: number
  nonPositiveRevenue: number
  nonPositiveMarketCap: number
  invalidSymbol: number
}

export interface RankingsSnapshot {
  asOf: string
  metric: string
  methodology: {
    revenueSource: string
    primaryMarketCapSource: string
    categories: string[]
    eligibility: string[]
    limitations: string[]
  }
  rankings: RankingRow[]
  coverage: {
    revenueProtocolsSeen: number
    eligibleRows: number
    rankedRows: number
    excluded: CoverageExclusionCounts
    notes: string[]
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

export type HistoryDays = 30 | 60 | 90

export interface DailyPoint {
  /** UTC calendar date YYYY-MM-DD */
  date: string
  value: number
}

export interface ProtocolHistorySeries {
  source: string
  available: boolean
  points: DailyPoint[]
  geckoId?: string | null
  error?: string
}

export interface ProtocolHistoryResponse {
  slug: string
  days: HistoryDays
  revenue: ProtocolHistorySeries
  price: ProtocolHistorySeries
}
