import type { WatchlistRow } from '../types'
import { formatCompactUsd } from '../lib/format'

interface WatchlistProps {
  rows: WatchlistRow[]
}

export function Watchlist({ rows }: WatchlistProps) {
  return (
    <section className="panel" aria-labelledby="watchlist-heading">
      <div className="panel-header">
        <div>
          <h2 id="watchlist-heading">Unranked watchlist</h2>
          <p>
            Apps with reported revenue but no verifiable circulating market cap in
            the current source set.
          </p>
        </div>
      </div>
      <div className="watchlist">
        {rows.map((row) => (
          <article key={row.id} className="watch-item">
            <div className="watch-item-top">
              <h3>
                {row.name}{' '}
                <span className="status-pill watch">{row.category}</span>
              </h3>
              <strong>{formatCompactUsd(row.revenue30d)} 30d revenue</strong>
            </div>
            <p>{row.reason}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
