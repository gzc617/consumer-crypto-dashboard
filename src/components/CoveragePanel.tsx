import type { RankingsSnapshot } from '../types'

interface CoveragePanelProps {
  coverage: RankingsSnapshot['coverage']
}

export function CoveragePanel({ coverage }: CoveragePanelProps) {
  const excludedTotal =
    coverage.excluded.missingProtocolMatch +
    coverage.excluded.nonPositiveRevenue +
    coverage.excluded.nonPositiveMarketCap +
    coverage.excluded.invalidSymbol

  return (
    <section className="panel" aria-labelledby="coverage-heading">
      <div className="panel-header">
        <div>
          <h2 id="coverage-heading">Coverage & exclusions</h2>
          <p>
            Protocols lacking positive revenue, positive DeFiLlama circulating market
            cap, a valid token symbol, or a slug match are not ranked.
          </p>
        </div>
      </div>
      <div className="coverage-grid">
        <article className="coverage-card">
          <p className="label">Revenue protocols seen</p>
          <p className="value">{coverage.revenueProtocolsSeen}</p>
        </article>
        <article className="coverage-card">
          <p className="label">Eligible / ranked</p>
          <p className="value">
            {coverage.eligibleRows} / {coverage.rankedRows}
          </p>
        </article>
        <article className="coverage-card">
          <p className="label">Excluded total</p>
          <p className="value">{excludedTotal}</p>
        </article>
      </div>
      <ul className="coverage-reasons">
        <li>
          Non-positive trailing-30d revenue:{' '}
          <strong>{coverage.excluded.nonPositiveRevenue}</strong>
        </li>
        <li>
          Missing DeFiLlama protocol slug match:{' '}
          <strong>{coverage.excluded.missingProtocolMatch}</strong>
        </li>
        <li>
          Non-positive DeFiLlama circulating market cap:{' '}
          <strong>{coverage.excluded.nonPositiveMarketCap}</strong>
        </li>
        <li>
          Invalid or placeholder token symbol:{' '}
          <strong>{coverage.excluded.invalidSymbol}</strong>
        </li>
      </ul>
      <ul className="coverage-notes">
        {coverage.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  )
}
