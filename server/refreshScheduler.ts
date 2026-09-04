import type { RankingsSnapshot } from '../src/types.ts'

/** Exactly four hours. */
export const REFRESH_INTERVAL_MS = 14_400_000

export interface RefreshSchedulerOptions {
  loadFallback: () => RankingsSnapshot
  build: () => Promise<RankingsSnapshot>
  intervalMs?: number
  onUpdate?: (snapshot: RankingsSnapshot) => void
  onError?: (error: unknown, phase: 'startup' | 'interval') => void
  /** Injectable timer APIs for tests. */
  setIntervalFn?: typeof setInterval
  clearIntervalFn?: typeof clearInterval
}

export interface RefreshScheduler {
  /** Last-known-good snapshot (fallback or latest successful refresh). */
  getSnapshot(): RankingsSnapshot
  isRefreshing(): boolean
  /** Attempt an immediate refresh without starting the interval. */
  refreshNow(phase?: 'startup' | 'interval'): Promise<boolean>
  /**
   * Load fallback, attempt startup refresh, then schedule exact-interval repeats.
   * Safe to call once; subsequent calls are no-ops while running.
   */
  start(): Promise<void>
  /** Stop the interval timer. In-flight refresh is allowed to finish. */
  stop(): void
}

export function createRefreshScheduler(
  options: RefreshSchedulerOptions,
): RefreshScheduler {
  const intervalMs = options.intervalMs ?? REFRESH_INTERVAL_MS
  const setIntervalFn = options.setIntervalFn ?? setInterval
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval

  let snapshot = options.loadFallback()
  let refreshing = false
  let timer: ReturnType<typeof setInterval> | undefined
  let started = false

  const publish = (next: RankingsSnapshot) => {
    snapshot = next
    options.onUpdate?.(next)
  }

  const refreshNow = async (
    phase: 'startup' | 'interval' = 'interval',
  ): Promise<boolean> => {
    if (refreshing) {
      return false
    }
    refreshing = true
    try {
      const next = await options.build()
      publish(next)
      return true
    } catch (error) {
      options.onError?.(error, phase)
      return false
    } finally {
      refreshing = false
    }
  }

  return {
    getSnapshot() {
      return snapshot
    },
    isRefreshing() {
      return refreshing
    },
    refreshNow,
    async start() {
      if (started) {
        return
      }
      started = true
      snapshot = options.loadFallback()
      options.onUpdate?.(snapshot)
      await refreshNow('startup')
      timer = setIntervalFn(() => {
        void refreshNow('interval')
      }, intervalMs)
    },
    stop() {
      if (timer !== undefined) {
        clearIntervalFn(timer)
        timer = undefined
      }
      started = false
    },
  }
}
