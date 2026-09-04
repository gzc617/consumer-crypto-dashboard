import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import snapshot from './data/rankings.json'
import type { ProtocolHistoryResponse, RankingsSnapshot } from './types'

const data = snapshot as RankingsSnapshot

function mockRankingsOk(body: RankingsSnapshot = data) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/rankings')) {
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/history')) {
      const history: ProtocolHistoryResponse = {
        slug: 'demo',
        days: 30,
        revenue: {
          source: 'https://api.llama.fi/summary/fees/demo?dataType=dailyRevenue',
          available: true,
          points: [
            { date: '2026-08-20', value: 10 },
            { date: '2026-09-01', value: 20 },
          ],
        },
        price: {
          source: 'https://api.coingecko.com/api/v3/coins/demo/market_chart?vs_currency=usd&days=30',
          available: true,
          geckoId: 'demo',
          points: [
            { date: '2026-08-20', value: 1 },
            { date: '2026-09-01', value: 1.5 },
          ],
        },
      }
      return new Response(JSON.stringify(history), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response('missing', { status: 404 })
  })
}

describe('App dashboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads live rankings from /api/rankings', async () => {
    const fetchMock = mockRankingsOk()
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    expect(await screen.findByRole('heading', { name: /defi protocol revenue yield/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/live api snapshot/i)).toBeInTheDocument()
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/rankings')
    expect(
      screen.getByText(
        new RegExp(`${data.coverage.rankedRows} ranked / .* excluded`, 'i'),
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /coverage & exclusions/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /unranked watchlist/i })).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /skip to main content/i }),
    ).toHaveAttribute('href', '#main-content')
  })

  it('falls back to the checked-in snapshot when the API is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    render(<App />)
    expect(
      await screen.findByText(/checked-in snapshot fallback/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/live rankings unavailable \(network down\)/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /defi protocol revenue yield/i }),
    ).toBeInTheDocument()
  })

  it('filters rankings by search and paginates large sets', async () => {
    vi.stubGlobal('fetch', mockRankingsOk())
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/live api snapshot/i)

    expect(screen.getAllByText(/page 1 of/i).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /next/i })[0]).toBeEnabled()

    const target = data.rankings.find((row) => row.rank > 50) ?? data.rankings[0]!
    await user.type(screen.getByLabelText(/search/i), target.name)
    expect(
      await screen.findByText(
        new RegExp(`showing 1 of ${data.rankings.length} ranked protocols`, 'i'),
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByText(target.name).length).toBeGreaterThan(0)
  })

  it('opens detail dialog with history range controls and charts', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/rankings')) {
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('/history?days=60')) {
        const history: ProtocolHistoryResponse = {
          slug: data.rankings[0]!.id,
          days: 60,
          revenue: {
            source: 'https://api.llama.fi/summary/fees/x?dataType=dailyRevenue',
            available: true,
            points: [{ date: '2026-08-01', value: 9 }],
          },
          price: {
            source: 'https://api.coingecko.com/api/v3/coins/x/market_chart?vs_currency=usd&days=60',
            available: false,
            geckoId: null,
            points: [],
            error: 'No resolvable CoinGecko id (gecko_id) on DeFiLlama protocol metadata.',
          },
        }
        return new Response(JSON.stringify(history), { status: 200 })
      }
      if (url.includes('/history')) {
        const history: ProtocolHistoryResponse = {
          slug: data.rankings[0]!.id,
          days: 30,
          revenue: {
            source: 'https://api.llama.fi/summary/fees/x?dataType=dailyRevenue',
            available: true,
            points: [
              { date: '2026-08-20', value: 10 },
              { date: '2026-09-01', value: 20 },
            ],
          },
          price: {
            source: 'https://api.coingecko.com/api/v3/coins/x/market_chart?vs_currency=usd&days=30',
            available: true,
            geckoId: 'x',
            points: [{ date: '2026-09-01', value: 1.25 }],
          },
        }
        return new Response(JSON.stringify(history), { status: 200 })
      }
      return new Response('missing', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    const root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)

    try {
      render(<App />, { container: root })
      await screen.findByText(/live api snapshot/i)
      const top = data.rankings[0]!
      const table = screen.getByRole('table')
      await user.click(
        within(table).getByRole('row', { name: new RegExp(top.name, 'i') }),
      )
      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByRole('heading', { name: top.name })).toBeInTheDocument()
      expect(
        await within(dialog).findByRole('img', { name: /daily protocol revenue/i }),
      ).toBeInTheDocument()
      expect(
        within(dialog).getByRole('img', { name: /token usd price/i }),
      ).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: '30d' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )

      await user.click(within(dialog).getByRole('button', { name: '60d' }))
      expect(
        await within(dialog).findByText(/token usd price unavailable/i),
      ).toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/protocols/${encodeURIComponent(top.id)}/history?days=60`),
      )

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    } finally {
      root.remove()
    }
  })

  it('traps focus inside the open dialog', async () => {
    vi.stubGlobal('fetch', mockRankingsOk())
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/live api snapshot/i)
    await user.click(screen.getByRole('button', { name: 'Methodology' }))
    const dialog = await screen.findByRole('dialog')
    const close = within(dialog).getByRole('button', { name: /close dialog/i })
    expect(close).toHaveFocus()

    await user.keyboard('{Tab}')
    expect(dialog.contains(document.activeElement)).toBe(true)

    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(close).toHaveFocus()
  })

  it('opens methodology panel', async () => {
    vi.stubGlobal('fetch', mockRankingsOk())
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/live api snapshot/i)
    await user.click(screen.getByRole('button', { name: 'Methodology' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/revenue yield definition/i)).toBeInTheDocument()
    expect(
      within(dialog).getByText(data.methodology.limitations[0]!),
    ).toBeInTheDocument()
  })

  it('switches to bar view with intact button semantics', async () => {
    vi.stubGlobal('fetch', mockRankingsOk())
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/live api snapshot/i)
    const toggle = screen.getByRole('group', { name: /result view/i })
    await user.click(within(toggle).getByRole('button', { name: 'Bars' }))
    expect(
      screen.getByRole('list', { name: /revenue yield bar chart/i }),
    ).toBeInTheDocument()
    const top = data.rankings[0]!
    expect(
      screen.getByRole('button', {
        name: new RegExp(`${top.name} revenue yield`, 'i'),
      }),
    ).toBeInTheDocument()
  })

  it('applies default sort direction from the sort select', async () => {
    vi.stubGlobal('fetch', mockRankingsOk())
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/live api snapshot/i)
    await user.selectOptions(screen.getByLabelText(/^sort by$/i), 'revenueYield')
    expect(screen.getByLabelText(/^direction$/i)).toHaveValue('desc')
    await user.selectOptions(screen.getByLabelText(/^sort by$/i), 'name')
    expect(screen.getByLabelText(/^direction$/i)).toHaveValue('asc')
  })
})
