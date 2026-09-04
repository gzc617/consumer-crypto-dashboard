#!/usr/bin/env node
/**
 * Build a reproducible DeFi protocol revenue-yield snapshot.
 *
 * Revenue and circulating market cap both come from DeFiLlama free APIs.
 * Every category is eligible; rows require positive trailing-30d revenue,
 * positive circulating mcap, and a valid token symbol. All eligible matches
 * are ranked globally with no truncation.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  fetchRankingsSnapshot,
  rankingsToCsv,
} from '../server/buildRankings.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outJson = join(root, 'src/data/rankings.json')
const outCsv = join(root, 'data/rankings.csv')

async function main(): Promise<void> {
  const snapshot = await fetchRankingsSnapshot()
  mkdirSync(dirname(outJson), { recursive: true })
  mkdirSync(dirname(outCsv), { recursive: true })
  writeFileSync(outJson, `${JSON.stringify(snapshot, null, 2)}\n`)
  writeFileSync(outCsv, rankingsToCsv(snapshot.rankings))
  console.log(
    `Wrote ${outJson} and ${outCsv} with ${snapshot.rankings.length} ranked rows ` +
      `(seen ${snapshot.coverage.revenueProtocolsSeen}, excluded ` +
      `${Object.values(snapshot.coverage.excluded).reduce((a, b) => a + b, 0)})`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
