import { v4 as uuidv4 } from 'uuid'
import { getAllProductSlugs, findSlugHeuristic, lookupEolData } from './eol-api'
import { mapToEolSlug, generateEolEstimate, generateReplacementInfo } from './claude'
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
    const slugs = await getAllProductSlugs()

    // 1. Try local heuristic first (free)
    let slug = findSlugHeuristic(productName, slugs)

    // 2. Fall back to Claude slug mapping
    if (!slug) {
      slug = await mapToEolSlug(productName, slugs)
    }

    let eolData: Partial<EolResult> | null = null

    if (slug) {
      eolData = await lookupEolData(slug, productName)
    }

    if (eolData && eolData.status !== undefined) {
      const replacement = await generateReplacementInfo(productName, eolData)
      return { ...base, ...eolData, ...replacement, productName, id: base.id }
    }

    // Not in endoflife.date — use full AI estimate
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
