import type { EolResult } from './types'
import eolCycles from './data/eol-cycles.json'
import dellEol from './data/dell-eol.json'

type CycleCache = Record<string, unknown[]>
type DellCache = Record<string, Partial<EolResult>>

const cycleCache = eolCycles as CycleCache
const dellCache = dellEol as DellCache

// Returns all slugs available in the local cache
export function getCachedSlugs(): string[] {
  return Object.keys(cycleCache)
}

// Returns cached cycles for a slug, or null if not cached
export function getCachedCycles(slug: string): unknown[] | null {
  return cycleCache[slug] ?? null
}

// Normalise a product name for Dell lookup
function normaliseDell(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}

// Look up a Dell product in the local DB.
// Tries exact match first, then strips trailing version suffixes.
export function lookupDell(productName: string): Partial<EolResult> | null {
  const key = normaliseDell(productName)
  if (dellCache[key]) return dellCache[key]

  // Also try without trailing model suffix variations (e.g. "R740 XD" → "R740xd")
  const collapsed = key.replace(/\s/g, '')
  const found = Object.keys(dellCache).find(k => k.replace(/\s/g, '') === collapsed)
  return found ? dellCache[found] : null
}
