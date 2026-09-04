import type {
  DailyPoint,
  HistoryDays,
  ProtocolHistoryResponse,
  ProtocolHistorySeries,
} from '../src/types.ts'
import { fetchJson, HttpError } from './http.ts'

export const HISTORY_DAYS = [30, 60, 90] as const satisfies readonly HistoryDays[]
export const HISTORY_REQUEST_TIMEOUT_MS = 20_000
export const HISTORY_CACHE_TTL_MS = 15 * 60_000
export const HISTORY_CACHE_MAX_ENTRIES = 64

interface FeeSummaryResponse {
  slug?: string
  gecko_id?: string | null
  totalDataChart?: Array<[number, number]>
}

interface CoinGeckoMarketChart {
  prices?: Array<[number, number]>
}

export interface ProtocolHistoryDeps {
  fetchJsonFn?: typeof fetchJson
  now?: () => number
  revenueUrl?: (slug: string) => string
  priceUrl?: (geckoId: string, days: HistoryDays) => string
  cacheTtlMs?: number
  cacheMaxEntries?: number
  timeoutMs?: number
}

export function parseHistoryDays(raw: string | null): HistoryDays | null {
  if (raw === null || raw === '') return null
  const value = Number(raw)
  if (value === 30 || value === 60 || value === 90) {
    return value
  }
  return null
}

export function toUtcDateString(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function toUtcDateStringFromMs(unixMs: number): string {
  return toUtcDateString(Math.floor(unixMs / 1000))
}

/** Keep the last observation per UTC calendar day; do not invent missing days. */
export function normalizeDailyPoints(
  entries: Array<{ timestampMs: number; value: number }>,
): DailyPoint[] {
  const byDate = new Map<string, { timestampMs: number; value: number }>()
  for (const entry of entries) {
    if (!Number.isFinite(entry.timestampMs) || !Number.isFinite(entry.value)) {
      continue
    }
    const date = toUtcDateStringFromMs(entry.timestampMs)
    const existing = byDate.get(date)
    if (!existing || entry.timestampMs >= existing.timestampMs) {
      byDate.set(date, entry)
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, point]) => ({ date, value: point.value }))
}

export function clipToTrailingDays(
  points: DailyPoint[],
  days: HistoryDays,
  endDate = points.at(-1)?.date,
): DailyPoint[] {
  if (!endDate || points.length === 0) return []
  const end = Date.parse(`${endDate}T00:00:00.000Z`)
  if (!Number.isFinite(end)) return []
  const start = end - (days - 1) * 24 * 60 * 60 * 1000
  return points.filter((point) => {
    const ts = Date.parse(`${point.date}T00:00:00.000Z`)
    return Number.isFinite(ts) && ts >= start && ts <= end
  })
}

function defaultRevenueUrl(slug: string): string {
  return `https://api.llama.fi/summary/fees/${encodeURIComponent(slug)}?dataType=dailyRevenue`
}

function defaultPriceUrl(geckoId: string, days: HistoryDays): string {
  return `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(geckoId)}/market_chart?vs_currency=usd&days=${days}`
}

function unavailable(
  source: string,
  error: string,
  geckoId: string | null = null,
): ProtocolHistorySeries {
  return {
    source,
    available: false,
    points: [],
    geckoId,
    error,
  }
}

export function createProtocolHistoryService(deps: ProtocolHistoryDeps = {}) {
  const fetchJsonFn = deps.fetchJsonFn ?? fetchJson
  const now = deps.now ?? Date.now
  const revenueUrl = deps.revenueUrl ?? defaultRevenueUrl
  const priceUrl = deps.priceUrl ?? defaultPriceUrl
  const cacheTtlMs = deps.cacheTtlMs ?? HISTORY_CACHE_TTL_MS
  const cacheMaxEntries = deps.cacheMaxEntries ?? HISTORY_CACHE_MAX_ENTRIES
  const timeoutMs = deps.timeoutMs ?? HISTORY_REQUEST_TIMEOUT_MS

  const cache = new Map<
    string,
    { expiresAt: number; value: ProtocolHistoryResponse }
  >()

  const remember = (key: string, value: ProtocolHistoryResponse) => {
    cache.set(key, { expiresAt: now() + cacheTtlMs, value })
    while (cache.size > cacheMaxEntries) {
      const oldest = cache.keys().next().value
      if (oldest === undefined) break
      cache.delete(oldest)
    }
  }

  async function loadRevenue(
    slug: string,
    days: HistoryDays,
  ): Promise<{ series: ProtocolHistorySeries; geckoId: string | null }> {
    const source = revenueUrl(slug)
    try {
      const payload = await fetchJsonFn<FeeSummaryResponse>(source, {
        timeoutMs,
      })
      const geckoId =
        typeof payload.gecko_id === 'string' && payload.gecko_id
          ? payload.gecko_id
          : null
      const chart = Array.isArray(payload.totalDataChart)
        ? payload.totalDataChart
        : []
      const normalized = normalizeDailyPoints(
        chart.map(([timestamp, value]) => ({
          timestampMs: timestamp * 1000,
          value,
        })),
      )
      const points = clipToTrailingDays(normalized, days)
      return {
        geckoId,
        series: {
          source,
          available: points.length > 0,
          points,
          geckoId,
          error:
            points.length > 0
              ? undefined
              : 'No daily revenue points returned for the selected range.',
        },
      }
    } catch (error) {
      const message =
        error instanceof HttpError
          ? `Revenue upstream error (${error.status}).`
          : error instanceof Error
            ? error.message
            : 'Revenue upstream error.'
      return {
        geckoId: null,
        series: unavailable(source, message),
      }
    }
  }

  async function loadPrice(
    geckoId: string | null,
    days: HistoryDays,
  ): Promise<ProtocolHistorySeries> {
    if (!geckoId) {
      return unavailable(
        'https://api.coingecko.com/api/v3/coins/{id}/market_chart',
        'No resolvable CoinGecko id (gecko_id) on DeFiLlama protocol metadata.',
        null,
      )
    }
    const source = priceUrl(geckoId, days)
    try {
      const payload = await fetchJsonFn<CoinGeckoMarketChart>(source, {
        timeoutMs,
      })
      const prices = Array.isArray(payload.prices) ? payload.prices : []
      const normalized = normalizeDailyPoints(
        prices.map(([timestampMs, value]) => ({ timestampMs, value })),
      )
      const points = clipToTrailingDays(normalized, days)
      return {
        source,
        available: points.length > 0,
        points,
        geckoId,
        error:
          points.length > 0
            ? undefined
            : 'No daily token USD price points returned for the selected range.',
      }
    } catch (error) {
      const message =
        error instanceof HttpError
          ? `Price upstream error (${error.status}).`
          : error instanceof Error
            ? error.message
            : 'Price upstream error.'
      return unavailable(source, message, geckoId)
    }
  }

  return {
    async getHistory(
      slug: string,
      days: HistoryDays,
    ): Promise<ProtocolHistoryResponse> {
      const cacheKey = `${slug}::${days}`
      const cached = cache.get(cacheKey)
      if (cached && cached.expiresAt > now()) {
        return cached.value
      }

      const { series: revenue, geckoId } = await loadRevenue(slug, days)
      const price = await loadPrice(geckoId, days)
      const value: ProtocolHistoryResponse = {
        slug,
        days,
        revenue,
        price,
      }
      remember(cacheKey, value)
      return value
    },
    clearCache() {
      cache.clear()
    },
  }
}

export type ProtocolHistoryService = ReturnType<
  typeof createProtocolHistoryService
>
