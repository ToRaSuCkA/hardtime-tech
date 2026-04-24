export type EolStatus = 'active' | 'eol' | 'end-of-sale' | 'end-of-support' | 'unknown'
export type DataSource = 'endoflife.date' | 'ai-estimate' | 'local-db' | 'not-found' | 'web-search'
export type Confidence = 'confirmed' | 'estimated' | 'unknown'

export interface EolResult {
  id: string
  productName: string
  vendor?: string
  cycle?: string
  status: EolStatus
  eolDate: string | null
  eolDateConfidence: Confidence
  eosaleDate: string | null
  eosupportDate: string | null
  releaseDate?: string
  latestVersion?: string
  replacementCostSame: string | null
  replacementProduct: string
  replacementCostEstimate: string
  notes: string
  source: DataSource
}

export interface ParsedProduct {
  name: string
  version?: string | null
  vendor?: string | null
}
