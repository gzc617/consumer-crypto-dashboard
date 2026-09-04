import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import snapshot from './data/rankings.json'
import type { RankingsSnapshot } from './types'

const data = snapshot as RankingsSnapshot

describe('App dashboard', () => {
  it('renders snapshot summary from checked-in data', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /consumer crypto revenue yield/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/draft universe · not investment advice/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        new RegExp(
          `${data.coverage.rankedRows} ranked / ${data.coverage.unrankedWatchlistRows} watchlist`,
          'i',
        ),
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByText(data.rankings[0]!.name).length).toBeGreaterThan(0)
    expect(
      screen.getByRole('heading', { name: /unranked watchlist/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(data.watchlist[0]!.name)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /skip to main content/i }),
    ).toHaveAttribute('href', '#main-content')
  })

  it('filters rankings by search', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText(/search/i), 'pump')
    expect(screen.getAllByText('pump.fun').length).toBeGreaterThan(0)
    expect(screen.queryByText(data.rankings[0]!.name)).not.toBeInTheDocument()
    expect(screen.getByText(/showing 1 of 20 ranked protocols/i)).toBeInTheDocument()
    expect(screen.getByText(/matching current filters/i)).toBeInTheDocument()
  })

  it('surfaces reviewed override notes including PONS aggregation', () => {
    render(<App />)
    const pons = data.rankings.find((row) => row.symbol === 'PONS')
    expect(pons).toBeTruthy()
    expect(screen.getAllByText(pons!.note).length).toBeGreaterThan(0)
  })

  it('opens an accessible detail dialog from a ranked row', async () => {
    const user = userEvent.setup()
    const root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)

    try {
      render(<App />, { container: root })
      const top = data.rankings[0]!
      const table = screen.getByRole('table')
      await user.click(
        within(table).getByRole('row', { name: new RegExp(top.name, 'i') }),
      )
      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByRole('heading', { name: top.name })).toBeInTheDocument()
      expect(within(dialog).getByText(/source provenance/i)).toBeInTheDocument()
      expect(within(dialog).getByText(/adapter notes/i)).toBeInTheDocument()
      expect(within(dialog).getByText(top.note)).toBeInTheDocument()
      expect(root).toHaveAttribute('aria-hidden', 'true')
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(root).not.toHaveAttribute('aria-hidden')
    } finally {
      root.remove()
    }
  })

  it('traps focus inside the open dialog', async () => {
    const user = userEvent.setup()
    render(<App />)
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
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Methodology' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/revenue yield definition/i)).toBeInTheDocument()
    expect(
      within(dialog).getByText(data.methodology.limitations[0]!),
    ).toBeInTheDocument()
  })

  it('switches to bar view with intact button semantics', async () => {
    const user = userEvent.setup()
    render(<App />)
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
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText(/^sort by$/i), 'revenueYield')
    expect(screen.getByLabelText(/^direction$/i)).toHaveValue('desc')
    await user.selectOptions(screen.getByLabelText(/^sort by$/i), 'name')
    expect(screen.getByLabelText(/^direction$/i)).toHaveValue('asc')
  })
})
