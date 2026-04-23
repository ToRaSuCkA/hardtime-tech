import type { EolResult } from './types'

const EOL_BASE = 'https://endoflife.date/api'

interface EolCycle {
  cycle: string
  releaseDate?: string
  eol: string | boolean
  latest?: string
  latestReleaseDate?: string
  lts?: string | boolean
  support?: string | boolean
  extendedSupport?: string | boolean
}

let slugCache: string[] | null = null

export async function getAllProductSlugs(): Promise<string[]> {
  if (slugCache) return slugCache
  const res = await fetch(`${EOL_BASE}/all.json`, { next: { revalidate: 3600 } })
  if (!res.ok) return []
  slugCache = await res.json()
  return slugCache!
}

function normalizeToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+v?[\d.x]+(\.\d+)*\s*$/, '') // strip trailing version
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function findSlugHeuristic(productName: string, slugs: string[]): string | null {
  const normalized = normalizeToSlug(productName)
  if (slugs.includes(normalized)) return normalized

  // Try progressively shorter prefixes — require at least 2 parts and 4 chars
  const parts = normalized.split('-')
  for (let i = parts.length - 1; i >= 2; i--) {
    const candidate = parts.slice(0, i).join('-')
    if (candidate.length >= 4 && slugs.includes(candidate)) return candidate
  }

  // Only match if our name starts with slug + '-' (prevents "linux" matching "linux-mint")
  const found = slugs.find(s => s.length >= 5 && normalized.startsWith(s + '-'))
  return found ?? null
}

export async function lookupEolData(slug: string, productName?: string): Promise<Partial<EolResult> | null> {
  const res = await fetch(`${EOL_BASE}/${slug}.json`, { next: { revalidate: 3600 } })
  if (!res.ok) return null

  const cycles: EolCycle[] = await res.json()
  if (!cycles.length) return null

  const now = new Date()

  const sorted = [...cycles].sort((a, b) => {
    const da = a.releaseDate ? new Date(a.releaseDate).getTime() : 0
    const db = b.releaseDate ? new Date(b.releaseDate).getTime() : 0
    return db - da
  })

  // Build ordered list of version hints extracted from the product name
  let activeCycle: EolCycle | undefined
  if (productName) {
    const r2Match = productName.match(/\b(20\d{2}\s*R2)\b/i)
    const yearMatch = productName.match(/\b(20\d{2})\b/)
    const majorMinorMatch = productName.match(/\b(\d+\.\d+(?:\.\d+)?)\b/)
    const majorOnlyMatch = productName.match(/(?<!\d)(\d{1,3})(?!\d)/)

    const hints: string[] = []
    if (r2Match) hints.push(r2Match[1].replace(/\s+/, ' '))
    if (yearMatch) hints.push(yearMatch[1])
    if (majorMinorMatch) hints.push(majorMinorMatch[1])
    if (majorOnlyMatch && !yearMatch && !majorMinorMatch) hints.push(majorOnlyMatch[1])

    for (const hint of hints) {
      const match = cycles.find(
        c =>
          c.cycle === hint ||
          c.cycle.toLowerCase() === hint.toLowerCase() ||
          c.cycle.startsWith(hint + ' ') ||
          c.cycle.startsWith(hint + '.')
      )
      if (match) {
        activeCycle = match
        break
      }
    }
  }

  if (!activeCycle) {
    // Prefer most recent cycle that is still active
    activeCycle =
      sorted.find(c => c.eol === false || (typeof c.eol === 'string' && new Date(c.eol) > now)) ??
      sorted[0]
  }

  let eolDate: string | null = null
  let eolDateConfidence: EolResult['eolDateConfidence'] = 'unknown'

  if (typeof activeCycle.eol === 'string') {
    eolDate = activeCycle.eol
    eolDateConfidence = 'confirmed'
  } else if (activeCycle.eol === true) {
    // EOL is confirmed but endoflife.date doesn't have the exact date for this cycle
    eolDateConfidence = 'confirmed'
  }

  // Prefer support date; fall back to extendedSupport
  let eosupportDate: string | null = null
  if (typeof activeCycle.support === 'string') {
    eosupportDate = activeCycle.support
  } else if (typeof activeCycle.extendedSupport === 'string') {
    eosupportDate = activeCycle.extendedSupport
  }

  let status: EolResult['status'] = 'active'
  if (activeCycle.eol === true || (typeof activeCycle.eol === 'string' && new Date(activeCycle.eol) <= now)) {
    status = 'eol'
  } else if (eosupportDate && new Date(eosupportDate) <= now) {
    status = 'end-of-support'
  }

  return {
    cycle: activeCycle.cycle,
    status,
    eolDate,
    eolDateConfidence,
    eosaleDate: null,
    eosupportDate,
    releaseDate: activeCycle.releaseDate,
    latestVersion: activeCycle.latest,
    source: 'endoflife.date',
  }
}
