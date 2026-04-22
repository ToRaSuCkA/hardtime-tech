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

  // Try progressively shorter prefixes (drop last word each time)
  const parts = normalized.split('-')
  for (let i = parts.length - 1; i >= 1; i--) {
    const candidate = parts.slice(0, i).join('-')
    if (slugs.includes(candidate)) return candidate
  }

  // Try if any slug is a substring match
  const found = slugs.find(s => normalized.startsWith(s) || s.startsWith(normalized))
  return found ?? null
}

export async function lookupEolData(slug: string): Promise<Partial<EolResult> | null> {
  const res = await fetch(`${EOL_BASE}/${slug}.json`, { next: { revalidate: 3600 } })
  if (!res.ok) return null

  const cycles: EolCycle[] = await res.json()
  if (!cycles.length) return null

  const now = new Date()

  // Prefer the most recently released active cycle; fall back to latest overall
  const sorted = [...cycles].sort((a, b) => {
    const da = a.releaseDate ? new Date(a.releaseDate).getTime() : 0
    const db = b.releaseDate ? new Date(b.releaseDate).getTime() : 0
    return db - da
  })

  const activeCycle =
    sorted.find(c => c.eol === false || (typeof c.eol === 'string' && new Date(c.eol) > now)) ??
    sorted[0]

  let eolDate: string | null = null
  let eolDateConfidence: EolResult['eolDateConfidence'] = 'unknown'

  if (typeof activeCycle.eol === 'string') {
    eolDate = activeCycle.eol
    eolDateConfidence = 'confirmed'
  } else if (activeCycle.eol === true) {
    eolDateConfidence = 'confirmed'
  }

  let eosupportDate: string | null = null
  if (typeof activeCycle.support === 'string') {
    eosupportDate = activeCycle.support
  }

  let status: EolResult['status'] = 'active'
  if (activeCycle.eol === true || (typeof activeCycle.eol === 'string' && new Date(activeCycle.eol) <= now)) {
    status = 'eol'
  } else if (typeof activeCycle.support === 'string' && new Date(activeCycle.support) <= now) {
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
