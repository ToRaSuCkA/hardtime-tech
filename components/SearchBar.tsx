'use client'

import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'

interface Props {
  onResult: (result: unknown) => void
  onError: (msg: string) => void
}

export function SearchBar({ onResult, onError }: Props) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: query.trim() }),
      })
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      onResult(data)
    } catch {
      onError('Search failed. Please check your API key and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ht-muted pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="e.g. Windows Server 2012, Cisco ASA 5505, Ubuntu 18.04..."
          className="w-full bg-ht-card border border-ht-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-ht-text placeholder:text-ht-muted/60 focus:outline-none focus:border-ht-accent/60 focus:ring-1 focus:ring-ht-accent/30 transition"
        />
      </div>
      <button
        type="submit"
        disabled={!query.trim() || loading}
        className="flex items-center gap-2 bg-ht-accent hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        {loading ? 'Searching…' : 'Search'}
      </button>
    </form>
  )
}
