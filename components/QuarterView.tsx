'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, DollarSign } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import type { EolResult } from '@/lib/types'

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function getRelevantDate(r: EolResult): { date: Date; label: string } | null {
  const eol = parseDate(r.eolDate)
  if (eol) return { date: eol, label: 'Sec. Patch End' }
  const eos = parseDate(r.eosupportDate)
  if (eos) return { date: eos, label: 'Support End' }
  const eosa = parseDate(r.eosaleDate)
  if (eosa) return { date: eosa, label: 'End of Sale' }
  return null
}

function quarterKey(date: Date): string {
  const q = Math.floor(date.getMonth() / 3) + 1
  return `Q${q} ${date.getFullYear()}`
}

function quarterSort(key: string): number {
  const [q, y] = key.split(' ')
  return parseInt(y) * 10 + parseInt(q.slice(1))
}

function parseCostNumber(costStr: string | null): number | null {
  if (!costStr) return null
  const match = costStr.match(/\$[\d,]+/)
  if (!match) return null
  return parseFloat(match[0].replace(/[\$,]/g, ''))
}

function fmtCost(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface QuarterGroup {
  key: string
  items: EolResult[]
  totalCost: number | null
}

export function QuarterView({ results }: { results: EolResult[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const groups = new Map<string, EolResult[]>()
  const undated: EolResult[] = []

  for (const r of results) {
    const d = getRelevantDate(r)
    if (!d) {
      undated.push(r)
    } else {
      const key = quarterKey(d.date)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(r)
    }
  }

  const quarters: QuarterGroup[] = Array.from(groups.entries())
    .sort((a, b) => quarterSort(a[0]) - quarterSort(b[0]))
    .map(([key, items]) => {
      const costs = items.map(r => parseCostNumber(r.replacementCostEstimate)).filter((n): n is number => n !== null)
      return {
        key,
        items,
        totalCost: costs.length > 0 ? costs.reduce((a, b) => a + b, 0) : null,
      }
    })

  function toggle(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const grandTotal = quarters
    .flatMap(g => g.items)
    .map(r => parseCostNumber(r.replacementCostEstimate))
    .filter((n): n is number => n !== null)
    .reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-3">
      {/* Grand total banner */}
      {grandTotal > 0 && (
        <div className="flex items-center gap-2 bg-ht-accent/10 border border-ht-accent/25 rounded-xl px-4 py-3">
          <DollarSign className="w-4 h-4 text-ht-accent shrink-0" />
          <span className="text-sm text-ht-muted">Total estimated replacement cost across all quarters:</span>
          <span className="ml-auto text-base font-semibold text-ht-accent">{fmtCost(grandTotal)}</span>
        </div>
      )}

      {/* Quarter groups */}
      {quarters.map(({ key, items, totalCost }) => {
        const isOpen = !collapsed.has(key)
        return (
          <div key={key} className="rounded-xl border border-ht-border overflow-hidden">
            {/* Quarter header */}
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-ht-surface hover:bg-ht-card/60 transition text-left"
            >
              <span className="text-sm font-semibold text-ht-text">{key}</span>
              <span className="text-xs text-ht-muted">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
              {totalCost !== null && (
                <span className="ml-auto mr-2 text-xs font-medium text-ht-accent bg-ht-accent/10 border border-ht-accent/20 rounded-full px-2.5 py-0.5">
                  Est. {fmtCost(totalCost)}
                </span>
              )}
              {isOpen
                ? <ChevronUp className="w-4 h-4 text-ht-muted shrink-0" />
                : <ChevronDown className="w-4 h-4 text-ht-muted shrink-0" />
              }
            </button>

            {/* Quarter table */}
            {isOpen && (
              <table className="w-full text-sm">
                <thead className="bg-ht-surface/60 border-t border-ht-border">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ht-muted uppercase tracking-wide">Item</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ht-muted uppercase tracking-wide whitespace-nowrap">Date Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ht-muted uppercase tracking-wide whitespace-nowrap">Projected EoL / EoS</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ht-muted uppercase tracking-wide whitespace-nowrap">Status</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-ht-muted uppercase tracking-wide whitespace-nowrap">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ht-border/50">
                  {items.map(r => {
                    const dateInfo = getRelevantDate(r)
                    const cost = parseCostNumber(r.replacementCostEstimate)
                    return (
                      <tr key={r.id} className="bg-ht-bg hover:bg-ht-card/30 transition">
                        <td className="px-4 py-3">
                          <div className="font-medium text-ht-text">{r.productName}</div>
                          {r.vendor && <div className="text-xs text-ht-muted mt-0.5">{r.vendor}</div>}
                          {r.cycle && <div className="text-xs text-ht-muted">Cycle: {r.cycle}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-ht-muted whitespace-nowrap">
                          {dateInfo?.label ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-ht-text whitespace-nowrap">
                          {dateInfo
                            ? dateInfo.date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
                            : '—'
                          }
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {cost !== null
                            ? <span className="text-ht-text font-medium">{fmtCost(cost)}</span>
                            : <span className="text-ht-muted text-xs">{r.replacementCostEstimate || '—'}</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {/* Quarter total footer */}
                {totalCost !== null && (
                  <tfoot>
                    <tr className="bg-ht-surface/60 border-t border-ht-border">
                      <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-ht-muted uppercase tracking-wide">
                        {key} Total
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm font-semibold text-ht-accent">
                        {fmtCost(totalCost)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        )
      })}

      {/* Undated items */}
      {undated.length > 0 && (
        <div className="rounded-xl border border-ht-border overflow-hidden">
          <button
            onClick={() => toggle('__undated')}
            className="w-full flex items-center gap-3 px-4 py-3 bg-ht-surface hover:bg-ht-card/60 transition text-left"
          >
            <span className="text-sm font-semibold text-ht-muted">No Date Available</span>
            <span className="text-xs text-ht-muted">{undated.length} item{undated.length !== 1 ? 's' : ''}</span>
            {collapsed.has('__undated')
              ? <ChevronDown className="w-4 h-4 text-ht-muted shrink-0 ml-auto" />
              : <ChevronUp className="w-4 h-4 text-ht-muted shrink-0 ml-auto" />
            }
          </button>
          {!collapsed.has('__undated') && (
            <table className="w-full text-sm">
              <thead className="bg-ht-surface/60 border-t border-ht-border">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ht-muted uppercase tracking-wide">Item</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ht-muted uppercase tracking-wide">Date Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ht-muted uppercase tracking-wide">Projected EoL / EoS</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ht-muted uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-ht-muted uppercase tracking-wide whitespace-nowrap">Est. Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ht-border/50">
                {undated.map(r => {
                  const cost = parseCostNumber(r.replacementCostEstimate)
                  return (
                    <tr key={r.id} className="bg-ht-bg hover:bg-ht-card/30 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ht-text">{r.productName}</div>
                        {r.vendor && <div className="text-xs text-ht-muted mt-0.5">{r.vendor}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-ht-muted">—</td>
                      <td className="px-4 py-3 text-ht-muted">—</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {cost !== null
                          ? <span className="text-ht-text font-medium">{fmtCost(cost)}</span>
                          : <span className="text-ht-muted text-xs">{r.replacementCostEstimate || '—'}</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
