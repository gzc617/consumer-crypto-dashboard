import type { RankingRow, SortDirection, SortKey } from '../types'
import { formatCompactUsd, formatUsd, formatYield } from '../lib/format'

interface RankedTableProps {
  rows: RankingRow[]
  sortKey: SortKey
  sortDirection: SortDirection
  onSort: (key: SortKey) => void
  onSelect: (row: RankingRow) => void
}

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'rank', label: 'Rank', numeric: true },
  { key: 'name', label: 'App / token' },
  { key: 'category', label: 'Category' },
  { key: 'revenue30d', label: '30d revenue', numeric: true },
  { key: 'annualizedRevenue', label: 'Annualized', numeric: true },
  { key: 'marketCap', label: 'Market cap', numeric: true },
  { key: 'revenueYield', label: 'Revenue yield', numeric: true },
]

function qualityClass(quality: string): string {
  return quality === 'Reviewed override' ? 'override' : 'direct'
}

export function RankedTable({
  rows,
  sortKey,
  sortDirection,
  onSort,
  onSelect,
}: RankedTableProps) {
  if (rows.length === 0) {
    return <p className="empty-state">No ranked apps match the current filters.</p>
  }

  return (
    <>
      <div className="table-wrap desktop-only">
        <table className="data-table">
          <caption className="sr-only">
            Ranked consumer crypto apps by revenue yield
          </caption>
          <thead>
            <tr>
              {COLUMNS.map((column) => {
                const active = sortKey === column.key
                const ariaSort = active
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={column.numeric ? 'numeric' : undefined}
                    aria-sort={ariaSort}
                  >
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{
                        minHeight: 'auto',
                        padding: '0.15rem 0.2rem',
                        fontSize: 'inherit',
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                        textTransform: 'uppercase',
                        color: active ? 'var(--purple)' : 'inherit',
                      }}
                      onClick={() => onSort(column.key)}
                    >
                      {column.label}
                      {active ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                )
              })}
              <th scope="col">Data quality</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                tabIndex={0}
                onClick={() => onSelect(row)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(row)
                  }
                }}
                aria-label={`Open details for ${row.name}`}
              >
                <td className="numeric">{row.rank}</td>
                <td>
                  <div className="app-cell">
                    <span className="name">{row.name}</span>
                    <span className="symbol">{row.symbol}</span>
                    {row.quality === 'Reviewed override' ? (
                      <span className="row-note">{row.note}</span>
                    ) : null}
                  </div>
                </td>
                <td>{row.category}</td>
                <td className="numeric">{formatUsd(row.revenue30d, true)}</td>
                <td className="numeric">{formatCompactUsd(row.annualizedRevenue)}</td>
                <td className="numeric">{formatCompactUsd(row.marketCap)}</td>
                <td className="numeric yield-cell">{formatYield(row.revenueYield)}</td>
                <td>
                  <span className={`status-pill ${qualityClass(row.quality)}`}>
                    {row.quality}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-cards mobile-only">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            className="rank-card"
            onClick={() => onSelect(row)}
          >
            <div className="rank-card-top">
              <div className="app-cell">
                <span className="name">
                  #{row.rank} {row.name}
                </span>
                <span className="symbol">
                  {row.symbol} · {row.category}
                </span>
                {row.quality === 'Reviewed override' ? (
                  <span className="row-note">{row.note}</span>
                ) : null}
              </div>
              <strong className="yield-cell">{formatYield(row.revenueYield)}</strong>
            </div>
            <div className="rank-card-grid">
              <div>
                <span>30d revenue</span>
                <strong>{formatCompactUsd(row.revenue30d)}</strong>
              </div>
              <div>
                <span>Market cap</span>
                <strong>{formatCompactUsd(row.marketCap)}</strong>
              </div>
              <div>
                <span>Annualized</span>
                <strong>{formatCompactUsd(row.annualizedRevenue)}</strong>
              </div>
              <div>
                <span>Quality</span>
                <strong>{row.quality}</strong>
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}
