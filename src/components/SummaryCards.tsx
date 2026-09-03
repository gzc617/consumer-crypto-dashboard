import { formatCompactUsd, formatYield } from '../lib/format'

interface SummaryCardsProps {
  coveredMarketCap: number
  revenue30d: number
  medianYield: number | null
  rankedApps: number
}

export function SummaryCards({
  coveredMarketCap,
  revenue30d,
  medianYield,
  rankedApps,
}: SummaryCardsProps) {
  return (
    <section className="summary-grid" aria-label="Snapshot summary">
      <article className="summary-card">
        <p className="label">Covered market cap</p>
        <p className="value">{formatCompactUsd(coveredMarketCap)}</p>
        <p className="hint">Sum of ranked circulating caps</p>
      </article>
      <article className="summary-card">
        <p className="label">30-day revenue</p>
        <p className="value">{formatCompactUsd(revenue30d)}</p>
        <p className="hint">Across ranked apps</p>
      </article>
      <article className="summary-card">
        <p className="label">Median revenue yield</p>
        <p className="value">
          {medianYield === null ? '—' : formatYield(medianYield)}
        </p>
        <p className="hint">Of the filtered ranked set</p>
      </article>
      <article className="summary-card">
        <p className="label">Ranked apps</p>
        <p className="value">{rankedApps}</p>
        <p className="hint">Draft universe snapshot</p>
      </article>
    </section>
  )
}
