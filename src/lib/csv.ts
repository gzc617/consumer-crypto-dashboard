import type { RankingRow } from '../types'

const CSV_FIELDS = [
  'rank',
  'name',
  'symbol',
  'category',
  'revenue30d',
  'annualizedRevenue',
  'marketCap',
  'revenueYield',
  'marketCapSource',
  'quality',
] as const

function escapeCsv(value: string | number): string {
  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

export function rankingsToCsv(rows: RankingRow[]): string {
  const lines = [CSV_FIELDS.join(',')]
  for (const row of rows) {
    lines.push(CSV_FIELDS.map((key) => escapeCsv(row[key])).join(','))
  }
  return `${lines.join('\n')}\n`
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
