import type { RankingRow } from '../types'
import { formatYield } from '../lib/format'

interface BarViewProps {
  rows: RankingRow[]
  onSelect: (row: RankingRow) => void
}

export function BarView({ rows, onSelect }: BarViewProps) {
  if (rows.length === 0) {
    return <p className="empty-state">No ranked protocols match the current filters.</p>
  }

  const maxYield = Math.max(...rows.map((row) => row.revenueYield), 0)

  return (
    <div className="bar-list" role="list" aria-label="Revenue yield bar chart">
      {rows.map((row) => {
        const width =
          maxYield === 0 ? 0 : Math.max((row.revenueYield / maxYield) * 100, 2)
        return (
          <div key={row.id} role="listitem">
            <button
              type="button"
              className="bar-row-button"
              onClick={() => onSelect(row)}
              aria-label={`${row.name} revenue yield ${formatYield(row.revenueYield)}`}
            >
              <div className="bar-label">
                <strong>
                  #{row.rank} {row.name}
                </strong>
                <span>{row.symbol}</span>
              </div>
              <div className="bar-track" aria-hidden="true">
                <div className="bar-fill" style={{ width: `${width}%` }} />
              </div>
              <div className="bar-value">{formatYield(row.revenueYield)}</div>
            </button>
          </div>
        )
      })}
    </div>
  )
}
