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
              DeFiLlama fees overview
            </a>
          </li>
          <li>
            Primary market cap:{' '}
            <a
              href={snapshot.methodology.primaryMarketCapSource}
              target="_blank"
              rel="noreferrer"
            >
              DeFiLlama protocols
            </a>
          </li>
          <li>
            Fallback market cap:{' '}
            <a
              href={snapshot.methodology.fallbackMarketCapSource}
              target="_blank"
              rel="noreferrer"
            >
              CoinGecko markets
            </a>{' '}
            (reviewed IDs only)
          </li>
        </ul>
      </div>

      <div className="detail-block">
        <h3>Universe screen</h3>
        <p>
          Retail-facing DeFiLlama categories with positive 30-day revenue and a
          verifiable token market cap. Categories:{' '}
          {snapshot.methodology.categories.join(', ')}.
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
