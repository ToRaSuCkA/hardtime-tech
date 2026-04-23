'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Search, Upload, RefreshCw } from 'lucide-react'
import type { QueryEntry } from '@/lib/query-log'

const SOURCE_LABEL: Record<string, string> = {
  'endoflife.date': 'Confirmed',
  'local-db':       'Local DB',
  'ai-estimate':    'AI Estimate',
  'not-found':      'Not Found',
  'batch':          'Batch Upload',
}

const STATUS_COLOR: Record<string, string> = {
  eol:              'text-red-400',
  'end-of-support': 'text-orange-400',
  active:           'text-green-400',
  unknown:          'text-gray-400',
  completed:        'text-blue-400',
}

export default function AdminPage() {
  const [entries, setEntries]   = useState<QueryEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('')
  const router = useRouter()

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/queries')
    if (res.status === 401 || res.status === 307) { router.push('/admin/login'); return }
    setEntries(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const filtered = entries.filter(e =>
    !filter || e.query.toLowerCase().includes(filter.toLowerCase())
  )

  const searches = entries.filter(e => e.type === 'search').length
  const uploads  = entries.filter(e => e.type === 'upload').length

  return (
    <div className="min-h-screen bg-ht-bg text-ht-text">
      <header className="border-b border-ht-border bg-ht-surface px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Query Log</h1>
          <p className="text-xs text-ht-muted mt-0.5">{entries.length} total · {searches} searches · {uploads} uploads</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="text-ht-muted hover:text-ht-text transition" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-ht-muted hover:text-red-400 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </header>

      <div className="px-6 py-4">
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by query…"
          className="w-full max-w-sm bg-ht-card border border-ht-border rounded-lg px-3 py-2 text-sm text-ht-text placeholder:text-ht-muted/60 focus:outline-none focus:border-ht-accent/60 transition"
        />
      </div>

      {loading ? (
        <div className="px-6 text-sm text-ht-muted">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="px-6 text-sm text-ht-muted">No queries yet.</div>
      ) : (
        <div className="overflow-x-auto px-6">
          <table className="w-full text-sm border border-ht-border rounded-xl overflow-hidden">
            <thead className="bg-ht-surface border-b border-ht-border">
              <tr>
                {['Time', 'Type', 'Query', 'Results', 'Source', 'Status'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-ht-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ht-border/60">
              {filtered.map(e => (
                <tr key={e.id} className="bg-ht-bg hover:bg-ht-card/40 transition">
                  <td className="px-3 py-2.5 text-ht-muted whitespace-nowrap text-xs">
                    {new Date(e.timestamp).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-3 py-2.5">
                    {e.type === 'search'
                      ? <span className="flex items-center gap-1 text-blue-400"><Search className="w-3 h-3" /> Search</span>
                      : <span className="flex items-center gap-1 text-purple-400"><Upload className="w-3 h-3" /> Upload</span>
                    }
                  </td>
                  <td className="px-3 py-2.5 font-medium max-w-xs truncate">{e.query}</td>
                  <td className="px-3 py-2.5 text-ht-muted text-center">{e.resultCount}</td>
                  <td className="px-3 py-2.5 text-ht-muted">{SOURCE_LABEL[e.source] ?? e.source}</td>
                  <td className={`px-3 py-2.5 capitalize ${STATUS_COLOR[e.status] ?? 'text-ht-muted'}`}>{e.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
