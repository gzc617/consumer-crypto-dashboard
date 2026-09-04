import { useEffect, useMemo, useState } from 'react'
import { BarView } from './components/BarView'
import { CoveragePanel } from './components/CoveragePanel'
import { DetailDialog } from './components/DetailDialog'
import { MethodologyDialog } from './components/MethodologyDialog'
import { Pagination } from './components/Pagination'
import { RankedTable } from './components/RankedTable'
import { SummaryCards } from './components/SummaryCards'
import { useRankings } from './hooks/useRankings'
import { downloadCsv, rankingsToCsv } from './lib/csv'
import { formatTimestamp, median, sum } from './lib/format'
import { PAGE_SIZE, clampPage, slicePage } from './lib/pagination'
import {
  defaultSortDirection,
  filterRankings,
  nextSortState,
  sortRankings,
} from './lib/rankings'
import type { RankingRow, SortDirection, SortKey } from './types'

type ViewMode = 'table' | 'bars'

export default function App() {
  const { data, status, error, usingFallback } = useRankings()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<RankingRow | null>(null)
  const [methodologyOpen, setMethodologyOpen] = useState(false)

  const categories = useMemo(() => {
    const fromData = new Set(data.rankings.map((row) => row.category))
    return ['all', ...[...fromData].sort((a, b) => a.localeCompare(b))]
  }, [data.rankings])

  const filtered = useMemo(
    () => filterRankings(data.rankings, search, category),
    [data.rankings, search, category],
  )

  const visible = useMemo(
    () => sortRankings(filtered, sortKey, sortDirection),
    [filtered, sortKey, sortDirection],
  )

  const safePage = clampPage(page, visible.length)
  const paged = useMemo(
    () => slicePage(visible, safePage),
    [visible, safePage],
  )

  useEffect(() => {
    setPage(1)
  }, [search, category, sortKey, sortDirection, data.asOf])

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage)
    }
  }, [page, safePage])

  const coveredMarketCap = sum(filtered.map((row) => row.marketCap))
  const revenue30d = sum(filtered.map((row) => row.revenue30d))
  const medianYield = median(filtered.map((row) => row.revenueYield))

  const handleSort = (key: SortKey) => {
    const next = nextSortState(sortKey, sortDirection, key)
    setSortKey(next.sortKey)
    setSortDirection(next.sortDirection)
  }

  const excludedTotal =
    data.coverage.excluded.missingProtocolMatch +
    data.coverage.excluded.nonPositiveRevenue +
    data.coverage.excluded.belowMinMarketCap +
    data.coverage.excluded.invalidSymbol

  return (
    <div className="app-shell">
      <a className="sr-only" href="#main-content">
        Skip to main content
      </a>

      <header className="site-header">
        <div className="brand-row">
          <div className="brand-block">
            <p className="eyebrow">Draft research terminal</p>
            <h1>DeFi Protocol Revenue Yield</h1>
            <p className="lede">
              Ranking DeFiLlama protocols with positive trailing-30-day revenue and
              circulating market cap of at least $1,000,000 by annualized revenue
              divided by market cap. Every eligible category is included; the list is
              not truncated.
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
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                downloadCsv('defi-protocol-revenue-yield.csv', rankingsToCsv(visible))
              }
            >
              Export CSV
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
              {data.coverage.rankedRows} ranked / {excludedTotal} excluded
            </strong>
          </span>
          <span className="meta-chip" role="status">
            {status === 'loading'
              ? 'Loading live rankings…'
              : status === 'live'
                ? 'Live API snapshot'
                : 'Checked-in snapshot fallback'}
          </span>
          <p className="disclaimer">Not investment advice · Eligibility filters apply</p>
        </div>
        {status === 'error' && usingFallback && error ? (
          <p className="banner-warning" role="status">
            Live rankings unavailable ({error}). Showing the checked-in snapshot for
            static development and tests.
          </p>
        ) : null}
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
              <h2 id="rankings-heading">Ranked protocols</h2>
              <p>
                Showing {visible.length} of {data.rankings.length} ranked protocols
                matching current filters.
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

          <Pagination
            page={safePage}
            pageSize={PAGE_SIZE}
            totalItems={visible.length}
            onPageChange={setPage}
          />

          {viewMode === 'table' ? (
            <RankedTable
              rows={paged}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              onSelect={setSelected}
            />
          ) : (
            <BarView rows={paged} onSelect={setSelected} />
          )}

          <Pagination
            page={safePage}
            pageSize={PAGE_SIZE}
            totalItems={visible.length}
            onPageChange={setPage}
          />
        </section>

        <CoveragePanel coverage={data.coverage} />

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
                Market cap is DeFiLlama circulating mcap only; there is no CoinGecko
                market-cap fallback for rankings.
              </li>
              <li>
                Detail price charts use CoinGecko when a protocol exposes gecko_id;
                missing price data does not remove the protocol from rankings.
              </li>
            </ul>
          </div>
        </section>

        <p className="footer-note">
          Production serves the latest successful in-memory snapshot from{' '}
          <code>GET /api/rankings</code> (refreshed on startup and every 4 hours). A
          checked-in snapshot in <code>src/data/rankings.json</code> backs static
          development, tests, and startup fallback.
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
