import type { RankingRow, SortDirection, SortKey } from '../types'

export function filterRankings(
  rows: RankingRow[],
  search: string,
  category: string,
): RankingRow[] {
  const query = search.trim().toLowerCase()
  return rows.filter((row) => {
    const matchesCategory = category === 'all' || row.category === category
    if (!matchesCategory) return false
    if (!query) return true
    return (
      row.name.toLowerCase().includes(query) ||
      row.symbol.toLowerCase().includes(query) ||
      row.category.toLowerCase().includes(query) ||
      row.chains.some((chain) => chain.toLowerCase().includes(query))
    )
  })
}

export function sortRankings(
  rows: RankingRow[],
  sortKey: SortKey,
  sortDirection: SortDirection,
): RankingRow[] {
  const direction = sortDirection === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const left = a[sortKey]
    const right = b[sortKey]
    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * direction
    }
    return String(left).localeCompare(String(right)) * direction
  })
}

export function nextSortState(
  currentKey: SortKey,
  currentDirection: SortDirection,
  nextKey: SortKey,
): { sortKey: SortKey; sortDirection: SortDirection } {
  if (currentKey === nextKey) {
    return {
      sortKey: nextKey,
      sortDirection: currentDirection === 'asc' ? 'desc' : 'asc',
    }
  }
  const defaultDesc: SortKey[] = [
    'revenueYield',
    'revenue30d',
    'annualizedRevenue',
    'marketCap',
  ]
  return {
    sortKey: nextKey,
    sortDirection: defaultDesc.includes(nextKey) ? 'desc' : 'asc',
  }
}
