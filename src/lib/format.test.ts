import { describe, expect, it } from 'vitest'
import {
  annualizeRevenue,
  computeRevenueYield,
  formatCompactUsd,
  formatTimestamp,
  formatYield,
  median,
} from '../lib/format'
import {
  defaultSortDirection,
  filterRankings,
  nextSortState,
  sortRankings,
} from '../lib/rankings'
import snapshot from '../data/rankings.json'
import type { RankingRow, RankingsSnapshot } from '../types'

const data = snapshot as RankingsSnapshot

const sample: RankingRow[] = [
  {
    id: 'a',
    name: 'Alpha',
    symbol: 'AAA',
    category: 'Launchpad',
    chains: ['Solana'],
    revenue30d: 100,
    annualizedRevenue: 1216.67,
    marketCap: 1000,
    revenueYield: 1.21667,
    marketCapSource: 'DeFiLlama',
    quality: 'Direct match',
    note: 'test',
    methodologyUrl: 'https://example.com',
    rank: 1,
  },
  {
    id: 'b',
    name: 'Beta Bot',
    symbol: 'BBB',
    category: 'Telegram Bot',
    chains: ['Base'],
    revenue30d: 50,
    annualizedRevenue: 608.33,
    marketCap: 2000,
    revenueYield: 0.304,
    marketCapSource: 'DeFiLlama',
    quality: 'Direct match',
    note: 'test',
    methodologyUrl: 'https://example.com',
    rank: 2,
  },
]

describe('format helpers', () => {
  it('formats yield as a percent', () => {
    expect(formatYield(0.26197)).toContain('%')
  })

  it('formats compact usd', () => {
    expect(formatCompactUsd(1_700_554_002)).toMatch(/\$1\.77B|\$1\.70B/)
  })

  it('formats snapshot timestamps in UTC', () => {
    expect(formatTimestamp('2026-09-03T23:41:10.236309+00:00')).toContain('UTC')
  })

  it('computes median for odd and even sets', () => {
    expect(median([1, 3, 2])).toBe(2)
    expect(median([1, 4, 2, 3])).toBe(2.5)
    expect(median([])).toBeNull()
  })

  it('annualizes trailing 30d revenue per the brief formula', () => {
    expect(annualizeRevenue(30)).toBe(365)
    expect(computeRevenueYield(30, 365)).toBe(1)
  })
})

describe('snapshot calculation integrity', () => {
  it('keeps annualized revenue and yield consistent with the brief metric', () => {
    for (const row of data.rankings) {
      const annualized = annualizeRevenue(row.revenue30d)
      const yieldValue = computeRevenueYield(row.revenue30d, row.marketCap)
      expect(row.annualizedRevenue).toBeCloseTo(annualized, 6)
      expect(row.revenueYield).toBeCloseTo(yieldValue, 10)
      expect(row.revenue30d).toBeGreaterThan(0)
      expect(row.marketCap).toBeGreaterThan(0)
    }
  })

  it('ranks by revenue yield descending without inventing rows', () => {
    const sorted = [...data.rankings].sort(
      (a, b) => b.revenueYield - a.revenueYield || a.name.localeCompare(b.name),
    )
    expect(data.rankings.map((row) => row.id)).toEqual(sorted.map((row) => row.id))
    expect(data.rankings.map((row) => row.rank)).toEqual(
      sorted.map((_, index) => index + 1),
    )
    expect(data.coverage.rankedRows).toBe(data.rankings.length)
    expect(data.watchlist[0]?.name).toBe('GMGN')
  })
})

describe('ranking helpers', () => {
  it('filters by search and category', () => {
    expect(filterRankings(sample, 'beta', 'all')).toHaveLength(1)
    expect(filterRankings(sample, '', 'Launchpad')).toHaveLength(1)
    expect(filterRankings(sample, 'solana', 'all')[0]?.id).toBe('a')
  })

  it('sorts by numeric and string keys', () => {
    const byYield = sortRankings(sample, 'revenueYield', 'asc')
    expect(byYield.map((row) => row.id)).toEqual(['b', 'a'])
    const byName = sortRankings(sample, 'name', 'desc')
    expect(byName.map((row) => row.id)).toEqual(['b', 'a'])
  })

  it('toggles sort direction for the same key', () => {
    expect(nextSortState('rank', 'asc', 'rank')).toEqual({
      sortKey: 'rank',
      sortDirection: 'desc',
    })
    expect(nextSortState('rank', 'asc', 'revenueYield')).toEqual({
      sortKey: 'revenueYield',
      sortDirection: 'desc',
    })
    expect(defaultSortDirection('name')).toBe('asc')
    expect(defaultSortDirection('marketCap')).toBe('desc')
  })
})
