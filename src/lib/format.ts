const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
})

const fullCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const preciseCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
})

export function formatCompactUsd(value: number): string {
  return compactCurrency.format(value)
}

export function formatUsd(value: number, precise = false): string {
  if (precise || Math.abs(value) < 1000) {
    return preciseCurrency.format(value)
  }
  return fullCurrency.format(value)
}

export function formatYield(value: number): string {
  return percent.format(value)
}

/** Brief metric: annualize trailing-30-day revenue, then divide by circulating mcap. */
export function annualizeRevenue(revenue30d: number): number {
  return (revenue30d * 365) / 30
}

export function computeRevenueYield(revenue30d: number, marketCap: number): number {
  return annualizeRevenue(revenue30d) / marketCap
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date) + ' UTC'
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2
  }
  return sorted[mid]!
}

export function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0)
}
