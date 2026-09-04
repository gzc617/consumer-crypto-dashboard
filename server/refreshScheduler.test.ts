/** @vitest-environment node */
import { describe, expect, it, vi } from 'vitest'
import type { RankingsSnapshot } from '../src/types.ts'
import {
  createRefreshScheduler,
  REFRESH_INTERVAL_MS,
} from './refreshScheduler.ts'

function snapshot(label: string): RankingsSnapshot {
  return {
    asOf: label,
    metric: 'test',
    methodology: {
      revenueSource: 'https://example.com/revenue',
      primaryMarketCapSource: 'https://example.com/protocols',
      categories: ['Dexes'],
      eligibility: [],
      limitations: [],
    },
    rankings: [],
    coverage: {
      revenueProtocolsSeen: 0,
      eligibleRows: 0,
      rankedRows: 0,
      excluded: {
        missingProtocolMatch: 0,
        nonPositiveRevenue: 0,
        nonPositiveMarketCap: 0,
        invalidSymbol: 0,
      },
      notes: [],
    },
  }
}

describe('refreshScheduler', () => {
  it('uses an exact 4-hour interval constant', () => {
    expect(REFRESH_INTERVAL_MS).toBe(14_400_000)
  })

  it('falls back on startup failure and retains last-known-good later', async () => {
    const fallback = snapshot('fallback')
    const good = snapshot('good')
    const build = vi
      .fn()
      .mockRejectedValueOnce(new Error('startup boom'))
      .mockResolvedValueOnce(good)
      .mockRejectedValueOnce(new Error('interval boom'))
    const onError = vi.fn()
    const clearIntervalFn = vi.fn()
    let intervalMsSeen = 0

    const scheduler = createRefreshScheduler({
      loadFallback: () => fallback,
      build,
      intervalMs: REFRESH_INTERVAL_MS,
      onError,
      setIntervalFn: ((_cb: () => void, ms: number) => {
        intervalMsSeen = ms
        return 1 as unknown as ReturnType<typeof setInterval>
      }) as typeof setInterval,
      clearIntervalFn: clearIntervalFn as unknown as typeof clearInterval,
    })

    await scheduler.start()
    expect(intervalMsSeen).toBe(REFRESH_INTERVAL_MS)
    expect(scheduler.getSnapshot()).toEqual(fallback)
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'startup')

    await expect(scheduler.refreshNow('interval')).resolves.toBe(true)
    expect(scheduler.getSnapshot()).toEqual(good)

    await expect(scheduler.refreshNow('interval')).resolves.toBe(false)
    expect(scheduler.getSnapshot()).toEqual(good)
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'interval')

    scheduler.stop()
    expect(clearIntervalFn).toHaveBeenCalledWith(1)
  })

  it('prevents overlapping refreshes and is cleanly stoppable', async () => {
    let release!: (value: RankingsSnapshot) => void
    const gate = new Promise<RankingsSnapshot>((resolve) => {
      release = resolve
    })
    const build = vi.fn(() => gate)
    const clearIntervalFn = vi.fn()

    const scheduler = createRefreshScheduler({
      loadFallback: () => snapshot('fallback'),
      build,
      intervalMs: REFRESH_INTERVAL_MS,
      setIntervalFn: (() => 7 as unknown as ReturnType<typeof setInterval>) as typeof setInterval,
      clearIntervalFn: clearIntervalFn as unknown as typeof clearInterval,
    })

    const startPromise = scheduler.start()
    expect(scheduler.isRefreshing()).toBe(true)

    await expect(scheduler.refreshNow('interval')).resolves.toBe(false)
    expect(build).toHaveBeenCalledTimes(1)

    release(snapshot('slow'))
    await startPromise
    expect(scheduler.getSnapshot().asOf).toBe('slow')

    scheduler.stop()
    expect(clearIntervalFn).toHaveBeenCalledWith(7)
  })
})
