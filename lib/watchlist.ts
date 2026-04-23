import type { EolResult } from './types'

const KEY = 'ht-watchlist'

export function getWatchlist(): EolResult[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveToWatchlist(result: EolResult): void {
  const list = getWatchlist()
  const filtered = list.filter(r => r.productName !== result.productName)
  localStorage.setItem(KEY, JSON.stringify([result, ...filtered]))
}

export function removeFromWatchlist(productName: string): void {
  const list = getWatchlist()
  localStorage.setItem(KEY, JSON.stringify(list.filter(r => r.productName !== productName)))
}

export function isInWatchlist(productName: string): boolean {
  return getWatchlist().some(r => r.productName === productName)
}
