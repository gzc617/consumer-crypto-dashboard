/** @vitest-environment node */
import { describe, expect, it } from 'vitest'
import {
  buildRankingsSnapshot,
  finitePositive,
  isValidTokenSymbol,
  rankingsToCsv,
} from './buildRankings.ts'

describe('buildRankingsSnapshot', () => {
  const revenuePayload = {
    protocols: [
      {
        slug: 'alpha',
        name: 'Alpha',
        displayName: 'Alpha Protocol',
        category: 'Dexes',
        chains: ['Ethereum'],
        total30d: 30,
        methodologyURL: 'https://example.com/alpha',
      },
      {
        slug: 'beta',
        name: 'Beta',
        category: 'Lending',
        chains: ['Base'],
        total30d: 300,
        methodologyURL: 'https://example.com/beta',
      },
      {
        slug: 'gamma',
        name: 'Gamma',
        category: 'Launchpad',
        chains: ['Solana'],
        total30d: 10,
      },
      {
        slug: 'delta',
        name: 'Delta',
        category: 'Gaming',
        total30d: 50,
      },
      {
        slug: 'epsilon',
        name: 'Epsilon',
        category: 'Bridge',
        total30d: 0,
      },
      {
        slug: 'zeta',
        name: 'Zeta',
        category: 'Social',
        total30d: 20,
      },
      {
        name: 'NoSlug',
        category: 'Other',
        total30d: 5,
      },
      // Extra consumer + non-consumer categories beyond any former allowlist.
      {
        slug: 'theta',
        name: 'Theta',
        category: 'Derivatives',
        chains: ['Arbitrum'],
        total30d: 90,
      },
      {
        slug: 'iota',
        name: 'Iota',
        category: 'Liquid Staking',
        total30d: 45,
      },
      {
        slug: 'kappa',
        name: 'Kappa',
        category: 'Yield',
        total30d: 12,
      },
      {
        slug: 'lambda',
        name: 'Lambda',
        category: 'RWA',
        total30d: 18,
      },
      {
        slug: 'mu',
        name: 'Mu',
        category: 'CDP',
        total30d: 22,
      },
      {
        slug: 'nu',
        name: 'Nu',
        category: 'Oracle',
        total30d: 8,
      },
      {
        slug: 'xi',
        name: 'Xi',
        category: 'Privacy',
        total30d: 14,
      },
      {
        slug: 'omicron',
        name: 'Omicron',
        category: 'Insurance',
        total30d: 16,
      },
      {
        slug: 'pi',
        name: 'Pi',
        category: 'Synthetics',
        total30d: 11,
      },
      {
        slug: 'rho',
        name: 'Rho',
        category: 'Algo-Stables',
        total30d: 13,
      },
      {
        slug: 'sigma',
        name: 'Sigma',
        category: 'Farm',
        total30d: 17,
      },
      {
        slug: 'tau',
        name: 'Tau',
        category: 'Indexes',
        total30d: 19,
      },
      {
        slug: 'upsilon',
        name: 'Upsilon',
        category: 'Payments',
        total30d: 21,
      },
      {
        slug: 'phi',
        name: 'Phi',
        category: 'NFT Marketplace',
        total30d: 23,
      },
      {
        slug: 'chi',
        name: 'Chi',
        category: 'Prediction Market',
        total30d: 25,
      },
      {
        slug: 'psi',
        name: 'Psi',
        category: 'Trading App',
        total30d: 27,
      },
      {
        slug: 'omega',
        name: 'Omega',
        category: 'Telegram Bot',
        total30d: 29,
      },
      {
        slug: 'extra-1',
        name: 'Extra One',
        category: 'Chain',
        total30d: 31,
      },
      {
        slug: 'extra-2',
        name: 'Extra Two',
        category: 'CEX',
        total30d: 33,
      },
    ],
  }

  const protocols = [
    { slug: 'alpha', symbol: 'AAA', mcap: 365 },
    { slug: 'beta', symbol: 'BBB', mcap: 1000 },
    { slug: 'gamma', symbol: '-', mcap: 100 },
    { slug: 'delta', symbol: 'DDD', mcap: 0 },
    { slug: 'zeta', symbol: 'ZZZ', mcap: null },
    { slug: 'theta', symbol: 'THETA', mcap: 1000 },
    { slug: 'iota', symbol: 'IOTA', mcap: 1000 },
    { slug: 'kappa', symbol: 'KAPPA', mcap: 1000 },
    { slug: 'lambda', symbol: 'LAMBDA', mcap: 1000 },
    { slug: 'mu', symbol: 'MU', mcap: 1000 },
    { slug: 'nu', symbol: 'NU', mcap: 1000 },
    { slug: 'xi', symbol: 'XI', mcap: 1000 },
    { slug: 'omicron', symbol: 'OMI', mcap: 1000 },
    { slug: 'pi', symbol: 'PI', mcap: 1000 },
    { slug: 'rho', symbol: 'RHO', mcap: 1000 },
    { slug: 'sigma', symbol: 'SIG', mcap: 1000 },
    { slug: 'tau', symbol: 'TAU', mcap: 1000 },
    { slug: 'upsilon', symbol: 'UPS', mcap: 1000 },
    { slug: 'phi', symbol: 'PHI', mcap: 1000 },
    { slug: 'chi', symbol: 'CHI', mcap: 1000 },
    { slug: 'psi', symbol: 'PSI', mcap: 1000 },
    { slug: 'omega', symbol: 'OMG', mcap: 1000 },
    { slug: 'extra-1', symbol: 'EX1', mcap: 1000 },
    { slug: 'extra-2', symbol: 'EX2', mcap: 1000 },
  ]

  it('includes every eligible category and retains more than 20 ranked rows', () => {
    const snapshot = buildRankingsSnapshot(revenuePayload, protocols, '2026-09-04T00:00:00.000Z')
    expect(snapshot.rankings.length).toBeGreaterThan(20)
    expect(snapshot.coverage.rankedRows).toBe(snapshot.rankings.length)
    expect(snapshot.coverage.eligibleRows).toBe(snapshot.rankings.length)
    expect(snapshot.coverage.rankedRows).toBe(snapshot.coverage.eligibleRows)
    expect(snapshot.methodology.categories).toEqual(
      expect.arrayContaining(['Derivatives', 'Lending', 'Dexes', 'Telegram Bot']),
    )
    expect(snapshot.methodology).not.toHaveProperty('fallbackMarketCapSource')
    expect(snapshot).not.toHaveProperty('watchlist')
    expect(snapshot.rankings.every((row) => row.marketCapSource === 'DeFiLlama')).toBe(
      true,
    )
  })

  it('ranks globally by revenue yield and reports exclusion reasons', () => {
    const snapshot = buildRankingsSnapshot(revenuePayload, protocols)
    expect(snapshot.rankings[0]?.id).toBe('beta')
    expect(snapshot.rankings.map((row) => row.rank)).toEqual(
      snapshot.rankings.map((_, index) => index + 1),
    )
    expect(snapshot.coverage.revenueProtocolsSeen).toBe(revenuePayload.protocols.length)
    expect(snapshot.coverage.excluded).toEqual({
      missingProtocolMatch: 1,
      nonPositiveRevenue: 1,
      nonPositiveMarketCap: 2,
      invalidSymbol: 1,
    })
  })

  it('treats placeholder symbols and non-positive values as ineligible', () => {
    expect(finitePositive(1)).toBe(true)
    expect(finitePositive(0)).toBe(false)
    expect(isValidTokenSymbol('-')).toBe(false)
    expect(isValidTokenSymbol('ETH')).toBe(true)
  })

  it('serializes CSV for the full ranked set', () => {
    const snapshot = buildRankingsSnapshot(revenuePayload, protocols)
    const csv = rankingsToCsv(snapshot.rankings)
    const lines = csv.trim().split('\n')
    expect(lines[0]).toContain('revenueYield')
    expect(lines.length - 1).toBe(snapshot.rankings.length)
    expect(lines.length - 1).toBeGreaterThan(20)
  })
})
