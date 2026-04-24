import { v4 as uuidv4 } from 'uuid'
import { getAllProductSlugs, findSlugHeuristic, lookupEolData } from './eol-api'
import { mapToEolSlug, generateEolEstimate, generateReplacementInfo, webValidateProduct } from './claude'
import { lookupDell } from './local-db'
import { lookupVerified, saveVerified } from './web-verified-db'
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
    replacementCostSame: 'Contact vendor',
    replacementProduct: 'Contact vendor',
    replacementCostEstimate: 'Contact vendor',
    notes: '',
    source: 'not-found',
  }

  try {
    // 1. Dell hardware local DB — exact keyed match, always trusted
    const dellLocal = lookupDell(productName)
    if (dellLocal) {
      let replacement = {
        replacementCostSame: (dellLocal as Partial<EolResult>).replacementCostSame ?? 'Contact vendor',
        replacementProduct: dellLocal.replacementProduct ?? 'Contact vendor',
        replacementCostEstimate: dellLocal.replacementCostEstimate ?? 'Contact vendor',
      }
      if (!dellLocal.replacementProduct) {
        replacement = await generateReplacementInfo(productName, dellLocal)
      }
      return { ...base, ...dellLocal, source: 'local-db', ...replacement, productName, id: base.id }
    }

    // 2. Check web-verified cache from previous searches
    const cached = lookupVerified(productName)
    if (cached) {
      if (!cached.isReal) {
        return { ...base, source: 'not-found', notes: 'This product could not be verified as real via web search.' }
      }
      if (cached.data) {
        const replacement = await generateReplacementInfo(productName, cached.data)
        return { ...base, ...cached.data, ...replacement, productName, id: base.id }
      }
    }

    const slugs = await getAllProductSlugs()

    // 3. Try local heuristic (free, uses cached slug list)
    let slug = findSlugHeuristic(productName, slugs)

    // 4. Fall back to Claude slug mapping
    if (!slug) {
      slug = await mapToEolSlug(productName, slugs)
    }

    let eolLookup: { data: Partial<EolResult>; cycleExact: boolean } | null = null

    if (slug) {
      eolLookup = await lookupEolData(slug, productName)
    }

    // 5. If we found an EXACT cycle match (version hint in the query matched a real cycle),
    //    trust the endoflife.date data — no web search needed.
    if (eolLookup && eolLookup.cycleExact) {
      const eolData = eolLookup.data

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

    // 6. No exact cycle match (or no slug at all) — web-search validate the product before
    //    trusting any data. This prevents fabricated products from returning confirmed results.
    let webResult
    try {
      webResult = await webValidateProduct(productName)
    } catch {
      // Web search unavailable — fall back to not-found to avoid returning false data
      console.warn(`[search] web validation unavailable for "${productName}", returning not-found`)
      return {
        ...base,
        source: 'not-found',
        notes: 'Web validation is currently unavailable. Please try again.',
      }
    }

    if (!webResult.isReal) {
      // Product does not exist — cache result and return not-found
      saveVerified(productName, false)
      return { ...base, source: 'not-found' }
    }

    // Product is confirmed real — build result from web data and save to cache
    const webData: Partial<EolResult> = {
      vendor: webResult.vendor ?? undefined,
      status: webResult.status ?? 'unknown',
      eolDate: webResult.eolDate ?? null,
      eolDateConfidence: webResult.eolDateConfidence ?? 'unknown',
      eosupportDate: webResult.eosupportDate ?? null,
      eosaleDate: webResult.eosaleDate ?? null,
      notes: webResult.notes ?? '',
      source: 'web-search',
    }

    // If the endoflife.date fallback had useful data, merge it (web data takes priority)
    const merged = eolLookup ? { ...eolLookup.data, ...webData } : webData

    saveVerified(productName, true, merged)

    const replacement = await generateReplacementInfo(productName, merged)
    return { ...base, ...merged, ...replacement, productName, id: base.id }
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
