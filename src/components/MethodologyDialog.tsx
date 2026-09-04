import type { RankingsSnapshot } from '../types'
import { Dialog } from './Dialog'

interface MethodologyDialogProps {
  snapshot: RankingsSnapshot
  open: boolean
  onClose: () => void
}

export function MethodologyDialog({
  snapshot,
  open,
  onClose,
}: MethodologyDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Methodology"
      eyebrow="Revenue yield definition"
    >
      <div className="detail-block">
        <h3>Metric</h3>
        <p className="formula">
          (DeFiLlama trailing-30-day protocol revenue × 365 / 30) / circulating market
          cap
        </p>
        <p style={{ marginTop: '0.5rem' }}>{snapshot.metric}</p>
      </div>

      <div className="detail-block">
        <h3>Sources</h3>
        <ul>
          <li>
            Revenue:{' '}
            <a href={snapshot.methodology.revenueSource} target="_blank" rel="noreferrer">
              DeFiLlama fees overview (dailyRevenue)
            </a>
          </li>
          <li>
            Circulating market cap:{' '}
            <a
              href={snapshot.methodology.primaryMarketCapSource}
              target="_blank"
              rel="noreferrer"
            >
              DeFiLlama protocols
            </a>
          </li>
          <li>
            Detail charts: DeFiLlama{' '}
            <code>summary/fees/&#123;slug&#125;?dataType=dailyRevenue</code> and CoinGecko
            free <code>market_chart</code> when <code>gecko_id</code> is present.
          </li>
        </ul>
      </div>

      <div className="detail-block">
        <h3>Eligibility</h3>
        <ul>
          {snapshot.methodology.eligibility.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p style={{ marginTop: '0.75rem' }}>
          Categories currently represented in the ranked set:{' '}
          {snapshot.methodology.categories.join(', ') || 'none'}.
        </p>
      </div>

      <div className="detail-block">
        <h3>Limitations</h3>
        <ul>
          {snapshot.methodology.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </Dialog>
  )
}
