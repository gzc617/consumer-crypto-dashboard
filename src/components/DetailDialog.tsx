import type { RankingRow } from '../types'
import { formatCompactUsd, formatUsd, formatYield } from '../lib/format'
import { Dialog } from './Dialog'

interface DetailDialogProps {
  row: RankingRow | null
  metric: string
  open: boolean
  onClose: () => void
}

export function DetailDialog({ row, metric, open, onClose }: DetailDialogProps) {
  if (!row) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={row.name}
      eyebrow={`Rank #${row.rank} · ${row.symbol}`}
    >
      <p>
        {row.category}
        {row.chains.length > 0 ? ` · ${row.chains.join(', ')}` : ''}
      </p>

      <div className="detail-grid">
        <div>
          <span>Revenue yield</span>
          <strong className="yield-cell">{formatYield(row.revenueYield)}</strong>
        </div>
        <div>
          <span>30d revenue</span>
          <strong>{formatUsd(row.revenue30d, true)}</strong>
        </div>
        <div>
          <span>Annualized revenue</span>
          <strong>{formatCompactUsd(row.annualizedRevenue)}</strong>
        </div>
        <div>
          <span>Market cap</span>
          <strong>{formatCompactUsd(row.marketCap)}</strong>
        </div>
      </div>

      <div className="detail-block">
        <h3>Formula</h3>
        <p className="formula">
          ({formatUsd(row.revenue30d, true)} × 365 / 30) / {formatUsd(row.marketCap, true)} ={' '}
          {formatYield(row.revenueYield)}
        </p>
        <p style={{ marginTop: '0.5rem' }}>{metric}</p>
      </div>

      <div className="detail-block">
        <h3>Source provenance</h3>
        <ul>
          <li>Market cap source: {row.marketCapSource}</li>
          <li>Data quality: {row.quality}</li>
          <li>
            Adapter / methodology:{' '}
            <a href={row.methodologyUrl} target="_blank" rel="noreferrer">
              DeFiLlama dimension adapter
            </a>
          </li>
        </ul>
      </div>

      <div className="detail-block">
        <h3>Adapter notes</h3>
        <p>{row.note}</p>
      </div>

      <div className="detail-block">
        <h3>Caveats</h3>
        <ul>
          <li>Revenue is not profit, cash flow, or tokenholder yield.</li>
          <li>A high ratio can reflect a tiny or illiquid token or temporary revenue.</li>
          <li>Not investment advice. Draft universe only.</li>
        </ul>
      </div>
    </Dialog>
  )
}
