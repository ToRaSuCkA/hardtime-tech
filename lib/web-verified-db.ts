import fs from 'fs'
import path from 'path'
import type { EolResult } from './types'

const DB_PATH = path.join(process.cwd(), 'lib/data/web-verified.json')

export interface VerifiedEntry {
  isReal: boolean
  savedAt: string
  data?: Partial<EolResult>
}

type Cache = Record<string, VerifiedEntry>

function readCache(): Cache {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) as Cache
  } catch {
    return {}
  }
}

function writeCache(cache: Cache): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2), 'utf8')
  } catch (err) {
    console.error('[web-verified-db] write failed:', err)
  }
}

function normalise(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

export function lookupVerified(productName: string): VerifiedEntry | null {
  return readCache()[normalise(productName)] ?? null
}

export function saveVerified(productName: string, isReal: boolean, data?: Partial<EolResult>): void {
  const cache = readCache()
  cache[normalise(productName)] = {
    isReal,
    savedAt: new Date().toISOString(),
    ...(data ? { data } : {}),
  }
  writeCache(cache)
}
