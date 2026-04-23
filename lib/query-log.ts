import fs from 'fs'
import path from 'path'

export interface QueryEntry {
  id: string
  timestamp: string
  type: 'search' | 'upload'
  query: string
  resultCount: number
  source: string
  status: string
}

// Use QUERY_LOG_PATH env var, or fall back to /tmp which is always writable
const LOG_PATH = process.env.QUERY_LOG_PATH ?? '/tmp/ht-queries.json'

function ensureLog() {
  const dir = path.dirname(LOG_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, '[]')
}

export function appendQuery(entry: QueryEntry) {
  try {
    ensureLog()
    const raw = fs.readFileSync(LOG_PATH, 'utf8')
    const entries: QueryEntry[] = JSON.parse(raw)
    entries.push(entry)
    if (entries.length > 10000) entries.splice(0, entries.length - 10000)
    fs.writeFileSync(LOG_PATH, JSON.stringify(entries, null, 2))
  } catch (err) {
    console.error('[query-log] Failed to write log:', err)
  }
}

export function readQueries(): QueryEntry[] {
  try {
    ensureLog()
    return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'))
  } catch (err) {
    console.error('[query-log] Failed to read log:', err)
    return []
  }
}
