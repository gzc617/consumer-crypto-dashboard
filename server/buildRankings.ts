import { annualizeRevenue, computeRevenueYield } from '../src/lib/format.ts'
import type { RankingRow, RankingsSnapshot } from '../src/types.ts'
import { fetchJson } from './http.ts'

export const REVENUE_URL =
  'https://api.llama.fi/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyRevenue'

export const PROTOCOLS_URL = 'https://api.llama.fi/protocols'

/** Inclusive minimum DeFiLlama circulating market cap for ranked protocols. */
export const MIN_CIRCULATING_MARKET_CAP = 1_000_000

interface RevenueProtocol {
  slug?: string
  name?: string
  displayName?: string
  category?: string
  chains?: string[]
  total30d?: number | null
  methodologyURL?: string
}

interface ProtocolRecord {
  slug?: string
  symbol?: string | null
  mcap?: number | null
  gecko_id?: string | null
}

interface RevenueOverview {
  protocols?: RevenueProtocol[]
}

export function finitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function isValidTokenSymbol(symbol: unknown): symbol is string {
  return typeof symbol === 'string' && symbol !== '' && symbol !== '-'
}

export function buildRankingsSnapshot(
  revenuePayload: RevenueOverview,
  protocols: ProtocolRecord[],
  asOf: string = new Date().toISOString(),
): RankingsSnapshot {
  const revenueProtocols = revenuePayload.protocols ?? []
  const protocolBySlug = new Map(
    protocols
      .filter((row): row is ProtocolRecord & { slug: string } => Boolean(row.slug))
      .map((row) => [row.slug, row]),
  )

  const excluded = {
    missingProtocolMatch: 0,
    nonPositiveRevenue: 0,
    belowMinMarketCap: 0,
    invalidSymbol: 0,
  }

  const rows: RankingRow[] = []
  const categories = new Set<string>()

  for (const revenue of revenueProtocols) {
    const slug = revenue.slug
    const revenue30d = revenue.total30d

    if (!finitePositive(revenue30d)) {
      excluded.nonPositiveRevenue += 1
      continue
    }
    if (!slug) {
      excluded.missingProtocolMatch += 1
      continue
    }

    const protocol = protocolBySlug.get(slug)
    if (!protocol) {
      excluded.missingProtocolMatch += 1
      continue
    }

    if (
      typeof protocol.mcap !== 'number' ||
      !Number.isFinite(protocol.mcap) ||
      protocol.mcap < MIN_CIRCULATING_MARKET_CAP
    ) {
      excluded.belowMinMarketCap += 1
      continue
    }

    if (!isValidTokenSymbol(protocol.symbol)) {
      excluded.invalidSymbol += 1
      continue
    }

    const category = revenue.category || 'Unknown'
    categories.add(category)
    const annualizedRevenue = annualizeRevenue(revenue30d)
    const marketCap = protocol.mcap

    rows.push({
      id: slug,
      name: revenue.displayName || revenue.name || slug,
      symbol: protocol.symbol,
      category,
      chains: Array.isArray(revenue.chains) ? revenue.chains : [],
      revenue30d,
      annualizedRevenue,
      marketCap,
      revenueYield: computeRevenueYield(revenue30d, marketCap),
      marketCapSource: 'DeFiLlama',
      quality: 'Direct match',
      note: 'Revenue and market cap records matched by DeFiLlama protocol slug.',
      methodologyUrl: revenue.methodologyURL || '',
      rank: 0,
    })
  }

  rows.sort(
    (a, b) =>
      b.revenueYield - a.revenueYield || a.name.localeCompare(b.name),
  )
  rows.forEach((row, index) => {
    row.rank = index + 1
  })

  return {
    asOf,
    metric:
      'Trailing-30-day protocol revenue annualized (×365/30), divided by circulating market cap',
    methodology: {
      revenueSource: REVENUE_URL,
      primaryMarketCapSource: PROTOCOLS_URL,
      categories: [...categories].sort((a, b) => a.localeCompare(b)),
      eligibility: [
        'Any DeFiLlama revenue category is eligible when other filters pass.',
        'Trailing-30-day protocol revenue (total30d) must be finite and > 0.',
        'Circulating market cap from DeFiLlama /protocols must be finite and at least $1,000,000 (inclusive).',
        'Token symbol must be present and not a placeholder ("-").',
        'Protocols are matched by DeFiLlama slug; there is no CoinGecko market-cap fallback.',
        'All eligible matches are ranked globally; the list is not truncated.',
      ],
      limitations: [
        'Only protocols with positive DeFiLlama revenue and circulating market cap of at least $1,000,000 are ranked; others are counted in coverage exclusions, not ranked.',
        'Revenue is not profit, cash flow, or tokenholder revenue.',
        'Annualizing 30 days can overstate temporary activity.',
        'Market cap and revenue timestamps may differ slightly.',
        'Small or illiquid tokens can dominate the ratio.',
        'Category labels follow DeFiLlama and can change over time.',
      ],
    },
    rankings: rows,
    coverage: {
      revenueProtocolsSeen: revenueProtocols.length,
      eligibleRows: rows.length,
      rankedRows: rows.length,
      excluded,
      notes: [
        'Ranked rows equal eligible rows; nothing is truncated after filtering.',
        'Excluded counts explain protocols that appear in the revenue feed but fail eligibility.',
      ],
    },
  }
}

export async function fetchRankingsSnapshot(
  fetchImpl: typeof fetchJson = fetchJson,
): Promise<RankingsSnapshot> {
  const [revenuePayload, protocols] = await Promise.all([
    fetchImpl<RevenueOverview>(REVENUE_URL),
    fetchImpl<ProtocolRecord[]>(PROTOCOLS_URL),
  ])
  return buildRankingsSnapshot(revenuePayload, protocols)
}

export function rankingsToCsv(rows: RankingRow[]): string {
  const fieldnames = [
    'rank',
    'name',
    'symbol',
    'category',
    'revenue30d',
    'annualizedRevenue',
    'marketCap',
    'revenueYield',
    'marketCapSource',
    'quality',
  ] as const

  const escape = (value: string | number): string => {
    const text = String(value)
    if (/[",\n]/.test(text)) {
      return `"${text.replaceAll('"', '""')}"`
    }
    return text
  }

  const lines = [fieldnames.join(',')]
  for (const row of rows) {
    lines.push(fieldnames.map((key) => escape(row[key])).join(','))
  }
  return `${lines.join('\n')}\n`
}
