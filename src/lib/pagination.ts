export const PAGE_SIZE = 50

export function pageCount(totalItems: number, pageSize = PAGE_SIZE): number {
  if (totalItems <= 0) return 1
  return Math.ceil(totalItems / pageSize)
}

export function clampPage(page: number, totalItems: number, pageSize = PAGE_SIZE): number {
  const pages = pageCount(totalItems, pageSize)
  if (!Number.isFinite(page) || page < 1) return 1
  if (page > pages) return pages
  return page
}

export function slicePage<T>(
  items: T[],
  page: number,
  pageSize = PAGE_SIZE,
): T[] {
  const safePage = clampPage(page, items.length, pageSize)
  const start = (safePage - 1) * pageSize
  return items.slice(start, start + pageSize)
}
