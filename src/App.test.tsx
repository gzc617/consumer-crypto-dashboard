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
  })

  it('filters rankings by search', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText(/search/i), 'pump')
    expect(screen.getAllByText('pump.fun').length).toBeGreaterThan(0)
    expect(screen.queryByText(data.rankings[0]!.name)).not.toBeInTheDocument()
    expect(screen.getByText(/showing 1 of 20 ranked protocols/i)).toBeInTheDocument()
  })

  it('opens an accessible detail dialog from a ranked row', async () => {
    const user = userEvent.setup()
    render(<App />)
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
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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

  it('switches to bar view', async () => {
    const user = userEvent.setup()
    render(<App />)
    const toggle = screen.getByRole('group', { name: /result view/i })
    await user.click(within(toggle).getByRole('button', { name: 'Bars' }))
    expect(
      screen.getByRole('list', { name: /revenue yield bar chart/i }),
    ).toBeInTheDocument()
  })
})
