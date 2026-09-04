import type { RankingsSnapshot } from '../src/types.ts'
import { loadRankings } from './loadRankings.ts'

export interface RankingsStore {
  get(): RankingsSnapshot
  set(snapshot: RankingsSnapshot): void
}

export function createRankingsStore(
  initial?: RankingsSnapshot,
): RankingsStore {
  let snapshot = initial ?? loadRankings()
  return {
    get() {
      return snapshot
    },
    set(next) {
      snapshot = next
    },
  }
}
