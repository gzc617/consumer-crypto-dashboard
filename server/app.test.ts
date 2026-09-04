/** @vitest-environment node */
import { mkdtempSync, writeFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { RankingsSnapshot } from '../src/types.ts'
import { createApp } from './app.ts'
import { loadRankings } from './loadRankings.ts'

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
  let baseUrl = ''
  let close: (() => Promise<void>) | undefined
  let distDir = ''

  beforeAll(async () => {
    distDir = mkdtempSync(join(tmpdir(), 'ccd-dist-'))
    writeFileSync(
      join(distDir, 'index.html'),
      '<!doctype html><title>Consumer Crypto</title><h1>Dashboard</h1>',
    )
    writeFileSync(join(distDir, 'app.js'), 'console.log("ok")')

    const app = createApp({ distDir, rankings: snapshot })
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

  it('GET /api/rankings returns the checked-in snapshot', async () => {
    const response = await fetch(`${baseUrl}/api/rankings`)
    expect(response.status).toBe(200)
    const body = (await response.json()) as RankingsSnapshot
    expect(body.asOf).toBe(snapshot.asOf)
    expect(body.rankings).toHaveLength(snapshot.rankings.length)
    expect(body.rankings[0]?.id).toBe(snapshot.rankings[0]?.id)
    expect(body.coverage).toEqual(snapshot.coverage)
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
    expect(data.rankings.length).toBeGreaterThan(0)
    expect(data.watchlist.length).toBeGreaterThan(0)
    expect(typeof data.asOf).toBe('string')
  })
})
