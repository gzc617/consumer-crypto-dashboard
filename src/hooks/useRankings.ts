import { useEffect, useState } from 'react'
import fallbackSnapshot from '../data/rankings.json'
import type { RankingsSnapshot } from '../types'

export type RankingsLoadStatus = 'loading' | 'live' | 'error'

export interface UseRankingsResult {
  data: RankingsSnapshot
  status: RankingsLoadStatus
  error: string | null
  usingFallback: boolean
}

const fallback = fallbackSnapshot as RankingsSnapshot

export function useRankings(
  fetchImpl: typeof fetch = fetch,
): UseRankingsResult {
  const [data, setData] = useState<RankingsSnapshot>(fallback)
  const [status, setStatus] = useState<RankingsLoadStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(true)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const response = await fetchImpl('/api/rankings')
        if (!response.ok) {
          throw new Error(`Rankings API returned ${response.status}`)
        }
        const body = (await response.json()) as RankingsSnapshot
        if (cancelled) return
        setData(body)
        setStatus('live')
        setError(null)
        setUsingFallback(false)
      } catch (cause) {
        if (cancelled) return
        const message =
          cause instanceof Error ? cause.message : 'Failed to load rankings'
        setData(fallback)
        setStatus('error')
        setError(message)
        setUsingFallback(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [fetchImpl])

  return { data, status, error, usingFallback }
}
