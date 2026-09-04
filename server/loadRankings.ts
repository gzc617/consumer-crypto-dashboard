import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RankingsSnapshot } from '../src/types.ts'

const RANKINGS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/data/rankings.json',
)

export function loadRankings(): RankingsSnapshot {
  const raw = readFileSync(RANKINGS_PATH, 'utf8')
  return JSON.parse(raw) as RankingsSnapshot
}

export function rankingsPath(): string {
  return RANKINGS_PATH
}
