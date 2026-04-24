'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Info, Bookmark, BookmarkCheck, ArrowRight } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { saveToWatchlist, removeFromWatchlist, getWatchlist } from '@/lib/watchlist'
import type { EolResult } from '@/lib/types'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

type Priority = { label: string; color: string; bg: string }

function replacementPriority(status: EolResult['status'], eolDate: string | null): Priority {
  if (status === 'eol') return { label: 'Critical', color: 'text-red-300', bg: 'bg-red-900/50 border border-red-700/50' }
  if (!eolDate) {
    if (status === 'end-of-sale') return { label: 'High', color: 'text-orange-300', bg: 'bg-orange-900/40 border border-orange-700/40' }
    if (status === 'end-of-support') return { label: 'High', color: 'text-orange-300', bg: 'bg-orange-900/40 border border-orange-700/40' }
    return { label: '—', color: 'text-ht-muted', bg: '' }
  }
  const days = Math.ceil((new Date(eolDate).getTime() - Date.now()) / 86400000)
  if (days <= 0)   return { label: 'Critical', color: 'text-red-300',    bg: 'bg-red-900/50 border border-red-700/50' }
  if (days <= 180) return { label: 'High',     color: 'text-orange-300', bg: 'bg-orange-900/40 border border-orange-700/40' }
  if (days <= 365) return { label: 'Medium',   color: 'text-yellow-300', bg: 'bg-yellow-900/40 border border-yellow-700/40' }
  if (days <= 730) return { label: 'Low',      color: 'text-green-300',  bg: 'bg-green-900/30 border border-green-700/30' }
  return { label: 'Planned', color: 'text-teal-300', bg: 'bg-teal-900/30 border border-teal-700/30' }
}

function timeUntil(dateStr: string | null): { label: string; color: string } {
  if (!dateStr) return { label: '', color: '' }
  const diff = new Date(dateStr).getTime() - Date.now()
  const days = Math.ceil(diff / 86400000)
  if (days < 0) return { label: `${Math.abs(days)}d ago`, color: 'text-red-400' }
  if (days < 180) return { label: `${days}d left`, color: 'text-orange-400' }
  if (days < 365) return { label: `${Math.ceil(days / 30)}mo left`, color: 'text-yellow-400' }
  return { label: `${(days / 365).toFixed(1)}y left`, color: 'text-green-400' }
}

const SOURCE_BADGE: Record<EolResult['source'], string> = {
  'endoflife.date': 'bg-blue-900/40 text-blue-400 border border-blue-700/40',
  'ai-estimate':    'bg-purple-900/40 text-purple-400 border border-purple-700/40',
  'local-db':       'bg-teal-900/40 text-teal-400 border border-teal-700/40',
  'not-found':      'bg-gray-800/40 text-gray-400 border border-gray-600/40',
  'web-search':     'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40',
}

const SOURCE_LABEL: Record<EolResult['source'], string> = {
  'endoflife.date': 'Confirmed',
  'ai-estimate':    'AI Estimate',
  'local-db':       'Local DB',
  'not-found':      'Not Found',
  'web-search':     'Web Verified',
}

type SortKey = 'productName' | 'status' | 'eolDate' | 'eosupportDate'

export function ResultsTable({ results }: { results: EolResult[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('productName')
  const [sortAsc, setSortAsc] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())

  useEffect(() => {
    setSaved(new Set(getWatchlist().map(r => r.productName)))
  }, [])

  function toggleSave(e: React.MouseEvent, result: EolResult) {
    e.stopPropagation()
    if (saved.has(result.productName)) {
      removeFromWatchlist(result.productName)
      setSaved(prev => { const s = new Set(prev); s.delete(result.productName); return s })
    } else {
      saveToWatchlist(result)
      setSaved(prev => new Set([...prev, result.productName]))
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  const sorted = [...results].sort((a, b) => {
    let va = a[sortKey] ?? ''
    let vb = b[sortKey] ?? ''
    if (sortKey === 'eolDate' || sortKey === 'eosupportDate') {
      va = va ? new Date(va as string).getTime().toString() : '0'
      vb = vb ? new Date(vb as string).getTime().toString() : '0'
    }
    return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
  })

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronDown className="w-3 h-3 opacity-30" />
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  function Th({ col, children }: { col: SortKey; children: React.ReactNode }) {
    return (
      <th
        onClick={() => toggleSort(col)}
        className="px-3 py-2.5 text-left text-xs font-medium text-ht-muted uppercase tracking-wide cursor-pointer hover:text-ht-text select-none whitespace-nowrap"
      >
        <span className="flex items-center gap-1">
          {children}
          <SortIcon col={col} />
        </span>
      </th>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-ht-border">
      <table className="w-full text-sm">
        <thead className="bg-ht-surface border-b border-ht-border">
          <tr>
            <Th col="productName">Product</Th>
            <Th col="status">Status</Th>
            <Th col="eolDate">Sec. Patch End</Th>
            <Th col="eosupportDate">Support End</Th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-ht-muted uppercase tracking-wide whitespace-nowrap">Priority</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-ht-muted uppercase tracking-wide whitespace-nowrap">Source</th>
            <th className="px-3 py-2.5 w-16" />
          </tr>
        </thead>
        <tbody className="divide-y divide-ht-border/60">
          {sorted.map(r => {
            const eolTime = timeUntil(r.eolDate)
            const priority = replacementPriority(r.status, r.eolDate)
            const isExpanded = expanded === r.id
            const isSaved = saved.has(r.productName)
            const isEol = r.status === 'eol' || r.status === 'end-of-sale'
            const hasReplacement = r.replacementProduct && r.replacementProduct !== 'Contact vendor'

            return (
              <>
                <tr
                  key={r.id}
                  className="bg-ht-bg hover:bg-ht-card/40 transition cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : r.id)}
                >
                  <td className="px-3 py-3">
                    <div className="font-medium text-ht-text">{r.productName}</div>
                    {r.vendor && <div className="text-xs text-ht-muted mt-0.5">{r.vendor}</div>}
                    {r.cycle && <div className="text-xs text-ht-muted mt-0.5">Cycle: {r.cycle}</div>}
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-3">
                    <div className="text-ht-text">{formatDate(r.eolDate)}</div>
                    {eolTime.label && (
                      <div className={`text-xs mt-0.5 ${eolTime.color}`}>{eolTime.label}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-ht-text">{formatDate(r.eosupportDate)}</td>
                  <td className="px-3 py-3">
                    {priority.label === '—'
                      ? <span className="text-ht-muted text-sm">—</span>
                      : <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${priority.bg} ${priority.color}`}>{priority.label}</span>
                    }
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SOURCE_BADGE[r.source]}`}>
                      {SOURCE_LABEL[r.source]}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={e => toggleSave(e, r)}
                        title={isSaved ? 'Remove from watchlist' : 'Save to watchlist'}
                        className="text-ht-muted hover:text-ht-accent transition"
                      >
                        {isSaved
                          ? <BookmarkCheck className="w-4 h-4 text-ht-accent" />
                          : <Bookmark className="w-4 h-4" />
                        }
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-ht-muted" /> : <ChevronDown className="w-4 h-4 text-ht-muted" />}
                    </div>
                  </td>
                </tr>

                {isExpanded && (
                  <tr key={`${r.id}-expanded`} className="bg-ht-card/30">
                    <td colSpan={7} className="px-4 py-3">
                      {isEol && hasReplacement && (
                        <div className="mb-3 flex items-start gap-3 bg-ht-accent/10 border border-ht-accent/25 rounded-lg px-3 py-2.5">
                          <ArrowRight className="w-4 h-4 text-ht-accent shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-semibold text-ht-accent mb-0.5">Recommended Upgrade</div>
                            <div className="text-sm text-ht-text">{r.replacementProduct}</div>
                            <div className="text-xs text-ht-muted mt-0.5">Estimated cost: {r.replacementCostEstimate}</div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {r.vendor && (
                          <div>
                            <div className="text-ht-muted mb-0.5">Vendor</div>
                            <div className="text-ht-text">{r.vendor}</div>
                          </div>
                        )}
                        {r.replacementCostSame && r.status !== 'eol' && r.status !== 'end-of-sale' && (
                          <div>
                            <div className="text-ht-muted mb-0.5">Replacement Cost (Same)</div>
                            <div className="text-ht-text">{r.replacementCostSame}</div>
                          </div>
                        )}
                        {r.releaseDate && (
                          <div>
                            <div className="text-ht-muted mb-0.5">Release Date</div>
                            <div className="text-ht-text">{formatDate(r.releaseDate)}</div>
                          </div>
                        )}
                        {r.eosaleDate && (
                          <div>
                            <div className="text-ht-muted mb-0.5">End of Sale</div>
                            <div className="text-ht-text">{formatDate(r.eosaleDate)}</div>
                          </div>
                        )}
                        {r.eolDateConfidence !== 'unknown' && (
                          <div>
                            <div className="text-ht-muted mb-0.5">Date Confidence</div>
                            <div className="text-ht-text capitalize">{r.eolDateConfidence}</div>
                          </div>
                        )}
                        {r.notes && (
                          <div className="col-span-2 sm:col-span-4">
                            <div className="flex items-center gap-1 text-ht-muted mb-0.5">
                              <Info className="w-3 h-3" /> Notes
                            </div>
                            <div className="text-ht-text">{r.notes}</div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
