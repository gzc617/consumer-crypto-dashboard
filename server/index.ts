import { createApp } from './app.ts'
import { fetchRankingsSnapshot } from './buildRankings.ts'
import { loadRankings } from './loadRankings.ts'
import { createProtocolHistoryService } from './protocolHistory.ts'
import { createRankingsStore } from './rankingsStore.ts'
import {
  createRefreshScheduler,
  REFRESH_INTERVAL_MS,
} from './refreshScheduler.ts'

const host = '0.0.0.0'
const port = Number(process.env.PORT) || 3000

const store = createRankingsStore(loadRankings())
const historyService = createProtocolHistoryService()

const scheduler = createRefreshScheduler({
  loadFallback: loadRankings,
  build: fetchRankingsSnapshot,
  intervalMs: REFRESH_INTERVAL_MS,
  onUpdate(snapshot) {
    store.set(snapshot)
  },
  onError(error, phase) {
    console.error(`Rankings refresh failed (${phase}); retaining last-known-good snapshot.`, error)
  },
})

const server = createApp({
  getRankings: () => store.get(),
  historyService,
})

server.listen(port, host, () => {
  console.log(`Listening on http://${host}:${port}`)
  console.log(
    `Rankings refresh interval ${REFRESH_INTERVAL_MS}ms; serving last-known-good via GET /api/rankings`,
  )
  void scheduler.start().then(() => {
    console.log(
      `Rankings snapshot ready (${store.get().rankings.length} ranked, asOf ${store.get().asOf})`,
    )
  })
})

function shutdown(signal: string): void {
  console.log(`Received ${signal}; stopping refresh scheduler`)
  scheduler.stop()
  server.close(() => {
    process.exit(0)
  })
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))
