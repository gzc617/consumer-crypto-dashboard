/** @vitest-environment node */
import { mkdtempSync, writeFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ProtocolHistoryResponse, RankingsSnapshot } from '../src/types.ts'
import { createApp } from './app.ts'
import { loadRankings } from './loadRankings.ts'
import { createProtocolHistoryService } from './protocolHistory.ts'

function listen(app: ReturnType<typeof createApp>): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    app.listen(0, '127.0.0.1', () => {
      const { port } = app.address() as AddressInfo
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            app.close((error) => (error ? closeReject(error) : closeResolve()))
          }),
      })
    })
    app.on('error', reject)
  })
}

describe('production server', () => {
  const snapshot = loadRankings()
  let liveSnapshot = snapshot
  let baseUrl = ''
  let close: (() => Promise<void>) | undefined
  let distDir = ''

  beforeAll(async () => {
    distDir = mkdtempSync(join(tmpdir(), 'ccd-dist-'))
    writeFileSync(
      join(distDir, 'index.html'),
      '<!doctype html><title>DeFi Protocol Revenue Yield</title><h1>Dashboard</h1>',
    )
    writeFileSync(join(distDir, 'app.js'), 'console.log("ok")')

    const historyService = createProtocolHistoryService({
      fetchJsonFn: (async (url: string) => {
        if (url.includes('/summary/fees/')) {
          return {
            slug: 'demo',
            gecko_id: 'demo-token',
            totalDataChart: [[Date.parse('2026-09-01T00:00:00.000Z') / 1000, 5]],
          }
        }
        return {
          prices: [[Date.parse('2026-09-01T12:00:00.000Z'), 1.5]],
        }
      }) as never,
    })

    const app = createApp({
      distDir,
      getRankings: () => liveSnapshot,
      historyService,
    })
    const listening = await listen(app)
    baseUrl = listening.baseUrl
    close = listening.close
  })

  afterAll(async () => {
    await close?.()
  })

  it('GET /api/health returns ok', async () => {
    const response = await fetch(`${baseUrl}/api/health`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('GET /api/rankings returns the current in-memory snapshot', async () => {
    const response = await fetch(`${baseUrl}/api/rankings`)
    expect(response.status).toBe(200)
    const body = (await response.json()) as RankingsSnapshot
    expect(body.asOf).toBe(liveSnapshot.asOf)
    expect(body.rankings).toHaveLength(liveSnapshot.rankings.length)
    expect(body.rankings.length).toBeGreaterThan(20)
    expect(body.coverage.rankedRows).toBe(body.rankings.length)
    expect(body.coverage.eligibleRows).toBe(body.rankings.length)

    liveSnapshot = {
      ...liveSnapshot,
      asOf: '2099-01-01T00:00:00.000Z',
    }
    const refreshed = await fetch(`${baseUrl}/api/rankings`)
    const refreshedBody = (await refreshed.json()) as RankingsSnapshot
    expect(refreshedBody.asOf).toBe('2099-01-01T00:00:00.000Z')
  })

  it('GET /api/protocols/:slug/history validates days and returns normalized data', async () => {
    const invalid = await fetch(`${baseUrl}/api/protocols/demo/history?days=7`)
    expect(invalid.status).toBe(400)

    const encoded = await fetch(
      `${baseUrl}/api/protocols/${encodeURIComponent('pump.fun')}/history?days=30`,
    )
    expect(encoded.status).toBe(200)
    const body = (await encoded.json()) as ProtocolHistoryResponse
    expect(body.slug).toBe('pump.fun')
    expect(body.days).toBe(30)
    expect(body.revenue.points).toEqual([{ date: '2026-09-01', value: 5 }])
    expect(body.price.points).toEqual([{ date: '2026-09-01', value: 1.5 }])
  })

  it('serves the built frontend index and assets', async () => {
    const indexResponse = await fetch(`${baseUrl}/`)
    expect(indexResponse.status).toBe(200)
    expect(indexResponse.headers.get('content-type')).toMatch(/text\/html/)
    expect(await indexResponse.text()).toContain('Dashboard')

    const assetResponse = await fetch(`${baseUrl}/app.js`)
    expect(assetResponse.status).toBe(200)
    expect(assetResponse.headers.get('content-type')).toMatch(/javascript/)
    expect(await assetResponse.text()).toContain('console.log')
  })

  it('returns 404 JSON for unknown API routes', async () => {
    const response = await fetch(`${baseUrl}/api/missing`)
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Not found' })
  })
})

describe('loadRankings', () => {
  it('loads rankings from the checked-in snapshot file', () => {
    const data = loadRankings()
    expect(data.rankings.length).toBeGreaterThan(20)
    expect(data.coverage.rankedRows).toBe(data.rankings.length)
    expect(data).not.toHaveProperty('watchlist')
    expect(typeof data.asOf).toBe('string')
  })
})
