import { useMemo, useState } from 'react'
import snapshot from './data/rankings.json'
import { BarView } from './components/BarView'
import { DetailDialog } from './components/DetailDialog'
import { MethodologyDialog } from './components/MethodologyDialog'
import { RankedTable } from './components/RankedTable'
import { SummaryCards } from './components/SummaryCards'
import { Watchlist } from './components/Watchlist'
import { formatTimestamp, median, sum } from './lib/format'
import {
  defaultSortDirection,
  filterRankings,
  nextSortState,
  sortRankings,
} from './lib/rankings'
import type { RankingRow, RankingsSnapshot, SortDirection, SortKey } from './types'

const data = snapshot as RankingsSnapshot

type ViewMode = 'table' | 'bars'

export default function App() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [selected, setSelected] = useState<RankingRow | null>(null)
  const [methodologyOpen, setMethodologyOpen] = useState(false)

  const categories = useMemo(() => {
    const fromData = new Set(data.rankings.map((row) => row.category))
    return ['all', ...[...fromData].sort((a, b) => a.localeCompare(b))]
  }, [])

  const filtered = useMemo(
    () => filterRankings(data.rankings, search, category),
    [search, category],
  )

  const visible = useMemo(
    () => sortRankings(filtered, sortKey, sortDirection),
    [filtered, sortKey, sortDirection],
  )

  const coveredMarketCap = sum(filtered.map((row) => row.marketCap))
  const revenue30d = sum(filtered.map((row) => row.revenue30d))
  const medianYield = median(filtered.map((row) => row.revenueYield))

  const handleSort = (key: SortKey) => {
    const next = nextSortState(sortKey, sortDirection, key)
    setSortKey(next.sortKey)
    setSortDirection(next.sortDirection)
  }

  return (
    <div className="app-shell">
      <a className="sr-only" href="#main-content">
        Skip to main content
      </a>

      <header className="site-header">
        <div className="brand-row">
          <div className="brand-block">
            <p className="eyebrow">Draft research terminal</p>
            <h1>Consumer Crypto Revenue Yield</h1>
            <p className="lede">
              Ranking tokenized, consumer-facing crypto apps by annualized protocol
              revenue divided by circulating market cap. Snapshot data only — no
              invented prices, history, or liquidity.
            </p>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setMethodologyOpen(true)}
            >
              Methodology
            </button>
            <a
              className="btn btn-secondary"
              href={data.methodology.revenueSource}
              target="_blank"
              rel="noreferrer"
            >
              DeFiLlama revenue
            </a>
            <a
              className="btn btn-secondary"
              href={data.methodology.primaryMarketCapSource}
              target="_blank"
              rel="noreferrer"
            >
              Market caps
            </a>
          </div>
        </div>

        <div className="meta-strip">
          <span className="meta-chip">
            Snapshot <strong>{formatTimestamp(data.asOf)}</strong>
          </span>
          <span className="meta-chip">
            Coverage{' '}
            <strong>
              {data.coverage.rankedRows} ranked / {data.coverage.unrankedWatchlistRows}{' '}
              watchlist
            </strong>
          </span>
          <p className="disclaimer">Draft universe · Not investment advice</p>
        </div>
      </header>

      <main id="main-content">
        <SummaryCards
          coveredMarketCap={coveredMarketCap}
          revenue30d={revenue30d}
          medianYield={medianYield}
          rankedApps={filtered.length}
        />

        <section className="panel" aria-labelledby="rankings-heading">
          <div className="panel-header">
            <div>
              <h2 id="rankings-heading">Ranked apps</h2>
              <p>
                Showing {visible.length} of {data.rankings.length} ranked protocols
                from the checked-in snapshot.
              </p>
            </div>
            <div className="view-toggle" role="group" aria-label="Result view">
              <button
                type="button"
                aria-pressed={viewMode === 'table'}
                onClick={() => setViewMode('table')}
              >
                Table
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'bars'}
                onClick={() => setViewMode('bars')}
              >
                Bars
              </button>
            </div>
          </div>

          <div className="controls">
            <div className="field">
              <label htmlFor="search">Search</label>
              <input
                id="search"
                type="search"
                placeholder="Name, symbol, category, or chain"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item === 'all' ? 'All categories' : item}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sort">Sort by</label>
              <select
                id="sort"
                value={sortKey}
                onChange={(event) => {
                  const key = event.target.value as SortKey
                  setSortKey(key)
                  setSortDirection(defaultSortDirection(key))
                }}
              >
                <option value="rank">Rank</option>
                <option value="name">Name</option>
                <option value="category">Category</option>
                <option value="revenue30d">30d revenue</option>
                <option value="annualizedRevenue">Annualized revenue</option>
                <option value="marketCap">Market cap</option>
                <option value="revenueYield">Revenue yield</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="direction">Direction</label>
              <select
                id="direction"
                value={sortDirection}
                onChange={(event) =>
                  setSortDirection(event.target.value as SortDirection)
                }
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          {viewMode === 'table' ? (
            <RankedTable
              rows={visible}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              onSelect={setSelected}
            />
          ) : (
            <BarView rows={visible} onSelect={setSelected} />
          )}
        </section>

        <Watchlist rows={data.watchlist} />

        <section className="panel" aria-labelledby="caveats-heading">
          <div className="panel-header">
            <div>
              <h2 id="caveats-heading">Caveats & provenance</h2>
              <p>Read before interpreting any ratio.</p>
            </div>
          </div>
          <div className="caveats">
            <ul>
              {data.methodology.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
              <li>
                Known overrides: PUMP uses the core pump.fun adapter only; PONS
                aggregates V1 and V2 and is flagged in row detail.
              </li>
              <li>
                CoinGecko market-cap fallback is used only for reviewed IDs currently
                blank on DeFiLlama (PUMP and PONS).
              </li>
            </ul>
          </div>
        </section>

        <p className="footer-note">
          Source snapshot generated into <code>src/data/rankings.json</code>. This
          dashboard works offline after install/build and does not fabricate
          historical series or tokenholder accrual.
        </p>
      </main>

      <DetailDialog
        row={selected}
        metric={data.metric}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
      <MethodologyDialog
        snapshot={data}
        open={methodologyOpen}
        onClose={() => setMethodologyOpen(false)}
      />
    </div>
  )
}
