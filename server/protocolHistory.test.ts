/** @vitest-environment node */
import { describe, expect, it, vi } from 'vitest'
import {
  clipToTrailingDays,
  createProtocolHistoryService,
  normalizeDailyPoints,
  parseHistoryDays,
  toUtcDateString,
} from './protocolHistory.ts'

describe('protocol history helpers', () => {
  it('accepts only 30, 60, and 90 day ranges', () => {
    expect(parseHistoryDays('30')).toBe(30)
    expect(parseHistoryDays('60')).toBe(60)
    expect(parseHistoryDays('90')).toBe(90)
    expect(parseHistoryDays('7')).toBeNull()
    expect(parseHistoryDays('abc')).toBeNull()
    expect(parseHistoryDays(null)).toBeNull()
  })

  it('normalizes to UTC daily points without inventing gaps', () => {
    const points = normalizeDailyPoints([
      { timestampMs: Date.parse('2026-09-01T01:00:00.000Z'), value: 1 },
      { timestampMs: Date.parse('2026-09-01T23:00:00.000Z'), value: 2 },
      { timestampMs: Date.parse('2026-09-03T12:00:00.000Z'), value: 3 },
    ])
    expect(points).toEqual([
      { date: '2026-09-01', value: 2 },
      { date: '2026-09-03', value: 3 },
    ])
    expect(toUtcDateString(Date.parse('2026-09-01T00:00:00.000Z') / 1000)).toBe(
      '2026-09-01',
    )
    expect(
      clipToTrailingDays(
        [
          { date: '2026-08-01', value: 1 },
          { date: '2026-09-01', value: 2 },
          { date: '2026-09-10', value: 3 },
        ],
        30,
        '2026-09-10',
      ).map((point) => point.date),
    ).toEqual(['2026-09-01', '2026-09-10'])
  })
})

describe('createProtocolHistoryService', () => {
  it('normalizes mocked upstream revenue and price series', async () => {
    const fetchJsonFn = vi.fn(async (url: string) => {
      if (url.includes('/summary/fees/')) {
        expect(url).toContain(encodeURIComponent('pump.fun'))
        return {
          slug: 'pump.fun',
          gecko_id: 'pump-fun',
          totalDataChart: [
            [Date.parse('2026-08-01T00:00:00.000Z') / 1000, 10],
            [Date.parse('2026-09-01T00:00:00.000Z') / 1000, 20],
            [Date.parse('2026-09-02T00:00:00.000Z') / 1000, 30],
          ],
        }
      }
      expect(url).toContain(encodeURIComponent('pump-fun'))
      expect(url).toContain('days=30')
      return {
        prices: [
          [Date.parse('2026-09-01T04:00:00.000Z'), 1.1],
          [Date.parse('2026-09-01T20:00:00.000Z'), 1.2],
          [Date.parse('2026-09-02T12:00:00.000Z'), 1.3],
        ],
      }
    })

    const service = createProtocolHistoryService({
      fetchJsonFn: fetchJsonFn as never,
      revenueUrl: (slug) =>
        `https://api.llama.fi/summary/fees/${encodeURIComponent(slug)}?dataType=dailyRevenue`,
      priceUrl: (geckoId, days) =>
        `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(geckoId)}/market_chart?vs_currency=usd&days=${days}`,
    })

    const body = await service.getHistory('pump.fun', 30)
    expect(body.days).toBe(30)
    expect(body.revenue.available).toBe(true)
    expect(body.revenue.points).toEqual([
      { date: '2026-09-01', value: 20 },
      { date: '2026-09-02', value: 30 },
    ])
    expect(body.price.available).toBe(true)
    expect(body.price.geckoId).toBe('pump-fun')
    expect(body.price.points).toEqual([
      { date: '2026-09-01', value: 1.2 },
      { date: '2026-09-02', value: 1.3 },
    ])
  })

  it('keeps revenue when price id/data is missing and treats upstream errors as non-fatal', async () => {
    const fetchJsonFn = vi.fn(async (url: string) => {
      if (url.includes('/summary/fees/')) {
        return {
          slug: 'no-price',
          gecko_id: null,
          totalDataChart: [[Date.parse('2026-09-03T00:00:00.000Z') / 1000, 42]],
        }
      }
      throw new Error('should not fetch price without gecko id')
    })

    const service = createProtocolHistoryService({
      fetchJsonFn: fetchJsonFn as never,
    })
    const body = await service.getHistory('no-price', 60)
    expect(body.revenue.available).toBe(true)
    expect(body.revenue.points).toEqual([{ date: '2026-09-03', value: 42 }])
    expect(body.price.available).toBe(false)
    expect(body.price.error).toMatch(/no resolvable coingecko id/i)
    expect(fetchJsonFn).toHaveBeenCalledTimes(1)
  })
})
