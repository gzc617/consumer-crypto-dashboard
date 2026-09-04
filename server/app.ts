import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ProtocolHistoryResponse, RankingsSnapshot } from '../src/types.ts'
import { loadRankings } from './loadRankings.ts'
import {
  createProtocolHistoryService,
  parseHistoryDays,
  type ProtocolHistoryService,
} from './protocolHistory.ts'

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

export interface AppOptions {
  distDir?: string
  getRankings?: () => RankingsSnapshot
  /** @deprecated Prefer getRankings for live snapshots. */
  rankings?: RankingsSnapshot
  historyService?: ProtocolHistoryService
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  })
  res.end(payload)
}

function sendText(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

function safeJoin(root: string, requestPath: string): string | null {
  const decoded = decodeURIComponent(requestPath.split('?')[0] ?? '/')
  const relative = decoded.replace(/^\/+/, '')
  const candidate = normalize(join(root, relative))
  const rootWithSep = root.endsWith(sep) ? root : root + sep
  if (candidate !== root && !candidate.startsWith(rootWithSep)) {
    return null
  }
  return candidate
}

function contentTypeFor(filePath: string): string {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

function sendFile(res: ServerResponse, filePath: string): void {
  const { size } = statSync(filePath)
  res.writeHead(200, {
    'Content-Type': contentTypeFor(filePath),
    'Content-Length': size,
  })
  createReadStream(filePath).pipe(res)
}

const HISTORY_PATH =
  /^\/api\/protocols\/([^/]+)\/history\/?$/

export function createApp(options: AppOptions = {}): Server {
  const distDir =
    options.distDir ??
    join(fileURLToPath(new URL('.', import.meta.url)), '../dist')
  const getRankings =
    options.getRankings ??
    (() => {
      const staticSnapshot = options.rankings ?? loadRankings()
      return () => staticSnapshot
    })()
  const historyService =
    options.historyService ?? createProtocolHistoryService()

  return createServer((req: IncomingMessage, res: ServerResponse) => {
    const method = req.method ?? 'GET'
    const url = new URL(req.url ?? '/', 'http://localhost')

    if (method !== 'GET' && method !== 'HEAD') {
      sendText(res, 405, 'Method Not Allowed')
      return
    }

    if (url.pathname === '/api/health') {
      sendJson(res, 200, { ok: true })
      return
    }

    if (url.pathname === '/api/rankings') {
      sendJson(res, 200, getRankings())
      return
    }

    const historyMatch = HISTORY_PATH.exec(url.pathname)
    if (historyMatch) {
      const encodedSlug = historyMatch[1] ?? ''
      let slug = ''
      try {
        slug = decodeURIComponent(encodedSlug)
      } catch {
        sendJson(res, 400, { error: 'Invalid protocol slug encoding' })
        return
      }
      if (!slug) {
        sendJson(res, 400, { error: 'Protocol slug is required' })
        return
      }

      const days = parseHistoryDays(url.searchParams.get('days'))
      if (days === null) {
        sendJson(res, 400, {
          error: 'Query parameter days must be one of 30, 60, or 90',
        })
        return
      }

      void historyService
        .getHistory(slug, days)
        .then((body: ProtocolHistoryResponse) => {
          sendJson(res, 200, body)
        })
        .catch((error: unknown) => {
          console.error('protocol history failed', error)
          sendJson(res, 200, {
            slug,
            days,
            revenue: {
              source: '',
              available: false,
              points: [],
              error: 'Unexpected history handler failure.',
            },
            price: {
              source: '',
              available: false,
              points: [],
              error: 'Unexpected history handler failure.',
            },
          } satisfies ProtocolHistoryResponse)
        })
      return
    }

    if (url.pathname.startsWith('/api/')) {
      sendJson(res, 404, { error: 'Not found' })
      return
    }

    const requested = safeJoin(distDir, url.pathname === '/' ? '/index.html' : url.pathname)
    if (!requested) {
      sendText(res, 400, 'Bad Request')
      return
    }

    if (existsSync(requested) && statSync(requested).isFile()) {
      if (method === 'HEAD') {
        const { size } = statSync(requested)
        res.writeHead(200, {
          'Content-Type': contentTypeFor(requested),
          'Content-Length': size,
        })
        res.end()
        return
      }
      sendFile(res, requested)
      return
    }

    const indexPath = join(distDir, 'index.html')
    if (existsSync(indexPath)) {
      if (method === 'HEAD') {
        const { size } = statSync(indexPath)
        res.writeHead(200, {
          'Content-Type': contentTypeFor(indexPath),
          'Content-Length': size,
        })
        res.end()
        return
      }
      sendFile(res, indexPath)
      return
    }

    sendText(res, 404, 'Not Found')
  })
}
