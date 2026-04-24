'use client'

import { useState, useEffect } from 'react'
import { Clock, Zap, FileSearch, TrendingDown, Bookmark } from 'lucide-react'
import { Header } from '@/components/Header'
import { SearchBar } from '@/components/SearchBar'
import { FileUpload } from '@/components/FileUpload'
import { ResultsTable } from '@/components/ResultsTable'
import { TimelineView } from '@/components/TimelineView'
import { QuarterView } from '@/components/QuarterView'
import { ExportButtons } from '@/components/ExportButtons'
import { getWatchlist } from '@/lib/watchlist'
import type { EolResult } from '@/lib/types'

type Tab = 'search' | 'upload'
type View = 'table' | 'timeline' | 'budget'

export default function Home() {
  const [tab, setTab] = useState<Tab>('search')
  const [view, setView] = useState<View>('table')
  const [results, setResults] = useState<EolResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState<string | null>(null)
  const [watchlistCount, setWatchlistCount] = useState(0)

  useEffect(() => {
    setWatchlistCount(getWatchlist().length)
  }, [])

  function addResult(r: unknown) {
    setError(null)
    const result = r as EolResult
    if (result.source === 'not-found') {
      setNotFound(result.productName)
      return
    }
    setNotFound(null)
    setResults(prev => {
      const filtered = prev.filter(p => p.productName !== result.productName)
      return [result, ...filtered]
    })
    setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function addResults(rs: unknown[]) {
    setError(null)
    setResults(prev => {
      const newResults = rs as EolResult[]
      const newNames = new Set(newResults.map(r => r.productName))
      return [...newResults, ...prev.filter(p => !newNames.has(p.productName))]
    })
    setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function handleError(msg: string) {
    setError(msg)
  }

  function loadWatchlist() {
    const list = getWatchlist()
    if (!list.length) return
    setResults(prev => {
      const savedNames = new Set(list.map(r => r.productName))
      return [...list, ...prev.filter(p => !savedNames.has(p.productName))]
    })
    setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-12 pb-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-ht-accent/10 border border-ht-accent/20 text-ht-accent text-xs font-medium px-3 py-1 rounded-full mb-4">
            <Zap className="w-3 h-3" />
            Powered by endoflife.date + Claude AI
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-ht-text mb-3">
            Know When Your Tech Dies
          </h1>
          <p className="text-ht-muted max-w-xl mx-auto text-sm sm:text-base">
            Search any hardware or software product to see its end-of-life status, replacement options, and cost estimates — in seconds.
          </p>
        </div>

        {/* Stat pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-10 text-xs text-ht-muted">
          {[
            { icon: Clock,        label: '400+ products tracked' },
            { icon: FileSearch,   label: 'CSV / Excel / Word import' },
            { icon: TrendingDown, label: 'AI estimates for unknowns' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 bg-ht-card border border-ht-border rounded-full px-3 py-1.5">
              <Icon className="w-3 h-3 text-ht-accent" />
              {label}
            </div>
          ))}
        </div>

        {/* Watchlist loader */}
        {watchlistCount > 0 && (
          <div className="flex justify-center mb-6">
            <button
              onClick={loadWatchlist}
              className="flex items-center gap-2 text-xs text-ht-muted hover:text-ht-accent border border-ht-border hover:border-ht-accent/40 bg-ht-card rounded-full px-4 py-2 transition"
            >
              <Bookmark className="w-3.5 h-3.5" />
              Load watchlist ({watchlistCount} saved)
            </button>
          </div>
        )}

        {/* Tab switcher */}
        <div className="max-w-2xl mx-auto">
          <div className="flex bg-ht-surface border border-ht-border rounded-xl p-1 mb-4">
            {(['search', 'upload'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition capitalize ${
                  tab === t
                    ? 'bg-ht-card text-ht-text shadow'
                    : 'text-ht-muted hover:text-ht-text'
                }`}
              >
                {t === 'search' ? '🔍 Single Search' : '📁 Bulk Upload'}
              </button>
            ))}
          </div>

          <div className="bg-ht-surface border border-ht-border rounded-xl p-4">
            {tab === 'search' ? (
              <SearchBar onResult={addResult} onError={handleError} />
            ) : (
              <FileUpload onResults={addResults} onError={handleError} />
            )}
          </div>

          {error && (
            <div className="mt-3 bg-red-900/30 border border-red-700/40 text-red-400 text-sm rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          {notFound && (
            <div className="mt-3 bg-yellow-900/30 border border-yellow-700/40 text-yellow-400 text-sm rounded-lg px-4 py-2.5">
              No data found for <strong>&ldquo;{notFound}&rdquo;</strong> — try a different product name or check spelling.
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      {results.length > 0 && (
        <section id="results" className="max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-ht-text">Results</h2>
              <p className="text-xs text-ht-muted mt-0.5">{results.length} product{results.length !== 1 ? 's' : ''} — click any row for details</p>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex bg-ht-surface border border-ht-border rounded-lg p-0.5">
                {(['table', 'timeline', 'budget'] as View[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1 text-xs font-medium rounded transition ${
                      view === v ? 'bg-ht-card text-ht-text shadow' : 'text-ht-muted hover:text-ht-text'
                    }`}
                  >
                    {v === 'table' ? 'Table' : v === 'timeline' ? 'Timeline' : 'Budget'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setResults([])}
                className="text-xs text-ht-muted hover:text-ht-text transition"
              >
                Clear all
              </button>
              <ExportButtons results={results} />
            </div>
          </div>

          {view === 'table'
            ? <ResultsTable results={results} />
            : view === 'timeline'
            ? <TimelineView results={results} />
            : <QuarterView results={results} />
          }
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-ht-border py-6 text-center text-xs text-ht-muted">
        <p>
          Data sourced from{' '}
          <a href="https://endoflife.date" target="_blank" rel="noopener" className="text-ht-accent hover:underline">
            endoflife.date
          </a>{' '}
          · AI estimates via Claude · For planning purposes only
        </p>
        <p className="mt-1">© {new Date().getFullYear()} HardTime</p>
      </footer>
    </div>
  )
}
