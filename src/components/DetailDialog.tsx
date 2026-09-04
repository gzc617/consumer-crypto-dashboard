import { useEffect, useId, useState } from 'react'
import type {
  HistoryDays,
  ProtocolHistoryResponse,
  RankingRow,
} from '../types'
import { formatCompactUsd, formatUsd, formatYield } from '../lib/format'
import { Dialog } from './Dialog'
import { HistoryChart } from './HistoryChart'

const DAY_OPTIONS: HistoryDays[] = [30, 60, 90]

interface DetailDialogProps {
  row: RankingRow | null
  metric: string
  open: boolean
  onClose: () => void
  fetchImpl?: typeof fetch
}

type HistoryState =
  | { status: 'idle' }
  | { status: 'loading'; days: HistoryDays }
  | { status: 'ready'; days: HistoryDays; data: ProtocolHistoryResponse }
  | { status: 'error'; days: HistoryDays; message: string }

export function DetailDialog({
  row,
  metric,
  open,
  onClose,
  fetchImpl = fetch,
}: DetailDialogProps) {
  const rangeId = useId()
  const [days, setDays] = useState<HistoryDays>(30)
  const [history, setHistory] = useState<HistoryState>({ status: 'idle' })

  useEffect(() => {
    if (!open || !row) {
      setHistory({ status: 'idle' })
      return
    }

    let cancelled = false
    setHistory({ status: 'loading', days })

    void (async () => {
      try {
        const response = await fetchImpl(
          `/api/protocols/${encodeURIComponent(row.id)}/history?days=${days}`,
        )
        if (!response.ok) {
          throw new Error(`History API returned ${response.status}`)
        }
        const body = (await response.json()) as ProtocolHistoryResponse
        if (cancelled) return
        setHistory({ status: 'ready', days, data: body })
      } catch (cause) {
        if (cancelled) return
        setHistory({
          status: 'error',
          days,
          message:
            cause instanceof Error ? cause.message : 'Failed to load history',
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, row, days, fetchImpl])

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

      <div className="detail-block history-block">
        <div className="history-header">
          <h3>Revenue & token price history</h3>
          <div
            className="range-toggle"
            role="group"
            aria-labelledby={rangeId}
          >
            <span id={rangeId} className="sr-only">
              History range
            </span>
            {DAY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={days === option}
                onClick={() => setDays(option)}
              >
                {option}d
              </button>
            ))}
          </div>
        </div>
        <p className="history-note">
          Daily protocol revenue from DeFiLlama and token USD price from CoinGecko
          when a gecko_id is present. Market-cap history is not shown or implied.
          Missing days are omitted, not interpolated.
        </p>

        {history.status === 'loading' || history.status === 'idle' ? (
          <p className="chart-state" role="status">
            Loading {days}-day history…
          </p>
        ) : null}

        {history.status === 'error' ? (
          <p className="chart-state" role="alert">
            Could not load history ({history.message}). Ranking metrics above remain
            available.
          </p>
        ) : null}

        {history.status === 'ready' ? (
          <>
            <HistoryChart
              label="Daily protocol revenue"
              unitLabel="USD revenue"
              points={history.data.revenue.points}
              available={history.data.revenue.available}
              error={history.data.revenue.error}
              emptyMessage="No revenue history points for this range."
            />
            <HistoryChart
              label="Token USD price"
              unitLabel="USD price"
              points={history.data.price.points}
              available={history.data.price.available}
              error={history.data.price.error}
              emptyMessage="Token price history is unavailable for this protocol."
            />
            <p className="history-attribution">
              Sources:{' '}
              {history.data.revenue.source ? (
                <a href={history.data.revenue.source} target="_blank" rel="noreferrer">
                  DeFiLlama dailyRevenue
                </a>
              ) : (
                'DeFiLlama dailyRevenue'
              )}
              {' · '}
              {history.data.price.geckoId ? (
                <a href={history.data.price.source} target="_blank" rel="noreferrer">
                  CoinGecko market_chart ({history.data.price.geckoId})
                </a>
              ) : (
                'CoinGecko market_chart (no gecko_id)'
              )}
            </p>
          </>
        ) : null}
      </div>

      <div className="detail-block">
        <h3>Source provenance</h3>
        <ul>
          <li>Market cap source: {row.marketCapSource}</li>
          <li>Data quality: {row.quality}</li>
          <li>
            Adapter / methodology:{' '}
            {row.methodologyUrl ? (
              <a href={row.methodologyUrl} target="_blank" rel="noreferrer">
                DeFiLlama dimension adapter
              </a>
            ) : (
              'Not provided'
            )}
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
          <li>Not investment advice. Coverage is limited to protocols meeting eligibility filters.</li>
        </ul>
      </div>
    </Dialog>
  )
}
