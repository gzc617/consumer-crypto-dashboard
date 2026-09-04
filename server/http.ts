export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export interface FetchJsonOptions {
  timeoutMs?: number
  headers?: Record<string, string>
  signal?: AbortSignal
}

export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 45_000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const onAbort = () => controller.abort()
  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timer)
      throw new Error('Request aborted')
    }
    options.signal.addEventListener('abort', onAbort, { once: true })
  }

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'defi-protocol-revenue-yield/0.1',
        ...options.headers,
      },
    })
    if (!response.ok) {
      throw new HttpError(
        response.status,
        `Upstream ${response.status} for ${url}`,
      )
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', onAbort)
  }
}
