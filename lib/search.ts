import { v4 as uuidv4 } from 'uuid'
import { getAllProductSlugs, findSlugHeuristic, lookupEolData } from './eol-api'
import { mapToEolSlug, generateEolEstimate, generateReplacementInfo } from './claude'
import { lookupDell } from './local-db'
import type { EolResult } from './types'

export async function lookupProduct(productName: string): Promise<EolResult> {
  const base: EolResult = {
    id: uuidv4(),
    productName,
    status: 'unknown',
    eolDate: null,
    eolDateConfidence: 'unknown',
    eosaleDate: null,
    eosupportDate: null,
    replacementProduct: 'Contact vendor',
    replacementCostEstimate: 'Contact vendor',
    notes: '',
    source: 'not-found',
  }

  try {
    // 1. Dell hardware local DB (no API call needed)
    const dellLocal = lookupDell(productName)
    if (dellLocal) {
      const replacement = await generateReplacementInfo(productName, dellLocal)
      return { ...base, ...dellLocal, source: 'local-db', ...replacement, productName, id: base.id }
    }

    const slugs = await getAllProductSlugs()

    // 2. Try local heuristic (free, uses cached slug list)
    let slug = findSlugHeuristic(productName, slugs)

    // 3. Fall back to Claude slug mapping
    if (!slug) {
      slug = await mapToEolSlug(productName, slugs)
    }

    let eolData: Partial<EolResult> | null = null

    if (slug) {
      // 4. Cycle lookup — served from local cache for known slugs, API for others
      eolData = await lookupEolData(slug, productName)
    }

    if (eolData && eolData.status !== undefined) {
      // endoflife.date confirmed EOL but didn't record the specific date —
      // supplement with AI while keeping all other confirmed fields.
      let enriched: Partial<EolResult> = eolData
      if (eolData.status === 'eol' && !eolData.eolDate) {
        const aiSupp = await generateEolEstimate(productName, eolData)
        enriched = {
          ...aiSupp,
          ...eolData,
          eolDate: aiSupp.eolDate ?? null,
          eosupportDate: eolData.eosupportDate ?? aiSupp.eosupportDate ?? null,
          source: 'endoflife.date',
        }
      }

      const replacement = await generateReplacementInfo(productName, enriched)
      return { ...base, ...enriched, ...replacement, productName, id: base.id }
    }

    // 5. Not found anywhere — use full AI estimate
    const aiEstimate = await generateEolEstimate(productName, eolData ?? undefined)
    return { ...base, ...aiEstimate, productName, id: base.id }
  } catch (err) {
    console.error(`Lookup failed for "${productName}":`, err)
    return { ...base, notes: 'Lookup failed. Please try again.' }
  }
}

export async function batchLookup(productNames: string[], concurrency = 4): Promise<EolResult[]> {
  const results: EolResult[] = []
  for (let i = 0; i < productNames.length; i += concurrency) {
    const batch = productNames.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(lookupProduct))
    results.push(...batchResults)
  }
  return results
}
