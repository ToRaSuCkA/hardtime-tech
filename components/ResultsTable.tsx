'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import type { EolResult } from '@/lib/types'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
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
}

const SOURCE_LABEL: Record<EolResult['source'], string> = {
  'endoflife.date': 'Confirmed',
  'ai-estimate':    'AI Estimate',
  'local-db':       'Local DB',
  'not-found':      'Not Found',
}

type SortKey = 'productName' | 'status' | 'eolDate' | 'eosupportDate'

export function ResultsTable({ results }: { results: EolResult[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('productName')
  const [sortAsc, setSortAsc] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

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
            <Th col="eolDate">EOL Date</Th>
            <Th col="eosupportDate">EoSupport</Th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-ht-muted uppercase tracking-wide whitespace-nowrap">Replacement</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-ht-muted uppercase tracking-wide whitespace-nowrap">Cost Est.</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-ht-muted uppercase tracking-wide whitespace-nowrap">Source</th>
            <th className="px-3 py-2.5 w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-ht-border/60">
          {sorted.map(r => {
            const eolTime = timeUntil(r.eolDate)
            const isExpanded = expanded === r.id
            return (
              <>
                <tr
                  key={r.id}
                  className="bg-ht-bg hover:bg-ht-card/40 transition cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : r.id)}
                >
                  <td className="px-3 py-3">
                    <div className="font-medium text-ht-text">{r.productName}</div>
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
                  <td className="px-3 py-3 text-ht-text max-w-[200px] truncate">{r.replacementProduct}</td>
                  <td className="px-3 py-3 text-ht-text whitespace-nowrap">{r.replacementCostEstimate}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SOURCE_BADGE[r.source]}`}>
                      {SOURCE_LABEL[r.source]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-ht-muted">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${r.id}-expanded`} className="bg-ht-card/30">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {r.vendor && (
                          <div>
                            <div className="text-ht-muted mb-0.5">Vendor</div>
                            <div className="text-ht-text">{r.vendor}</div>
                          </div>
                        )}
                        {r.latestVersion && (
                          <div>
                            <div className="text-ht-muted mb-0.5">Latest Version</div>
                            <div className="text-ht-text">{r.latestVersion}</div>
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
