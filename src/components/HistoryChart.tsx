import type { DailyPoint } from '../types'
import { formatCompactUsd, formatUsd } from '../lib/format'

interface HistoryChartProps {
  label: string
  unitLabel: string
  points: DailyPoint[]
  available: boolean
  error?: string
  emptyMessage: string
}

function formatValue(value: number, unitLabel: string): string {
  if (unitLabel.toLowerCase().includes('price')) {
    return formatUsd(value, true)
  }
  return Math.abs(value) >= 1000 ? formatCompactUsd(value) : formatUsd(value, true)
}

export function HistoryChart({
  label,
  unitLabel,
  points,
  available,
  error,
  emptyMessage,
}: HistoryChartProps) {
  if (!available) {
    return (
      <div className="chart-state" role="status">
        <p>
          <strong>{`${label} unavailable.`}</strong>
        </p>
        <p>{error || emptyMessage}</p>
      </div>
    )
  }

  if (points.length === 0) {
    return (
      <div className="chart-state" role="status">
        <p>
          <strong>{label}</strong>: {emptyMessage}
        </p>
      </div>
    )
  }

  const width = 640
  const height = 220
  const pad = { top: 16, right: 16, bottom: 36, left: 56 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom

  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || Math.abs(max) || 1

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? pad.left + innerW / 2
        : pad.left + (index / (points.length - 1)) * innerW
    const y = pad.top + ((max - point.value) / span) * innerH
    return { x, y, point }
  })

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const first = points[0]!
  const last = points[points.length - 1]!

  return (
    <figure className="history-chart">
      <figcaption>
        <strong>{label}</strong>
        <span>
          {unitLabel} · {points.length} daily points · {first.date} → {last.date}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label} from ${first.date} to ${last.date}`}
      >
        <title>
          {label}: {formatValue(first.value, unitLabel)} on {first.date} to{' '}
          {formatValue(last.value, unitLabel)} on {last.date}
        </title>
        <line
          className="chart-axis"
          x1={pad.left}
          y1={pad.top}
          x2={pad.left}
          y2={pad.top + innerH}
        />
        <line
          className="chart-axis"
          x1={pad.left}
          y1={pad.top + innerH}
          x2={pad.left + innerW}
          y2={pad.top + innerH}
        />
        <text className="chart-label" x={pad.left} y={pad.top - 4}>
          {formatValue(max, unitLabel)}
        </text>
        <text
          className="chart-label"
          x={pad.left}
          y={pad.top + innerH + 14}
        >
          {formatValue(min, unitLabel)}
        </text>
        <text
          className="chart-label"
          x={pad.left}
          y={height - 8}
        >
          {first.date}
        </text>
        <text
          className="chart-label"
          x={pad.left + innerW}
          y={height - 8}
          textAnchor="end"
        >
          {last.date}
        </text>
        <polyline
          className="chart-line"
          fill="none"
          points={polyline}
        />
        {coords.map(({ x, y, point }) => (
          <circle
            key={point.date}
            className="chart-point"
            cx={x}
            cy={y}
            r={3}
          >
            <title>
              {point.date}: {formatValue(point.value, unitLabel)}
            </title>
          </circle>
        ))}
      </svg>
    </figure>
  )
}
