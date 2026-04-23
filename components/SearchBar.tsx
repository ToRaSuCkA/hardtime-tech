'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { PRODUCTS } from '@/lib/products-db'

interface Props {
  onResult: (result: unknown) => void
  onError: (msg: string) => void
}

const MAX_SUGGESTIONS = 8

export function SearchBar({ onResult, onError }: Props) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function updateQuery(value: string) {
    setQuery(value)
    setActiveIndex(-1)
    if (value.trim().length >= 2) {
      const q = value.toLowerCase()
      const filtered = PRODUCTS.filter(p => p.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS)
      setSuggestions(filtered)
      setShowDropdown(filtered.length > 0)
    } else {
      setSuggestions([])
      setShowDropdown(false)
    }
  }

  function selectSuggestion(product: string) {
    setQuery(product)
    setShowDropdown(false)
    setSuggestions([])
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setActiveIndex(-1)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() || loading) return
    setShowDropdown(false)
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
      <div className="relative flex-1" ref={containerRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ht-muted pointer-events-none z-10" />
        <input
          type="text"
          value={query}
          onChange={e => updateQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder="e.g. Windows Server 2012, Cisco ASA 5505, Ubuntu 18.04…"
          className="w-full bg-ht-card border border-ht-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-ht-text placeholder:text-ht-muted/60 focus:outline-none focus:border-ht-accent/60 focus:ring-1 focus:ring-ht-accent/30 transition"
          autoComplete="off"
        />
        {showDropdown && (
          <ul className="absolute z-50 w-full mt-1 bg-ht-card border border-ht-border rounded-lg shadow-xl overflow-hidden">
            {suggestions.map((product, i) => (
              <li
                key={product}
                onMouseDown={() => selectSuggestion(product)}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                  i === activeIndex
                    ? 'bg-ht-accent/20 text-ht-text'
                    : 'text-ht-text hover:bg-ht-border/60'
                }`}
              >
                {product}
              </li>
            ))}
          </ul>
        )}
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
