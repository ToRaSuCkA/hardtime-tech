'use client'

import { useRef } from 'react'
import { Download } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import type { EolResult } from '@/lib/types'

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function toPct(date: Date, minMs: number, rangeMs: number): number {
  if (rangeMs === 0) return 50
  return Math.min(100, Math.max(0, (date.getTime() - minMs) / rangeMs * 100))
}

function fmtDate(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

const DOT_COLOR: Record<string, string> = {
  eol:              'bg-red-500 ring-red-500/30',
  'end-of-sale':    'bg-orange-500 ring-orange-500/30',
  'end-of-support': 'bg-yellow-400 ring-yellow-400/30',
  active:           'bg-green-500 ring-green-500/30',
  unknown:          'bg-gray-500 ring-gray-500/30',
}

export function TimelineView({ results }: { results: EolResult[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const today = new Date()

  async function exportPNG() {
    if (!containerRef.current) return
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(containerRef.current, {
      backgroundColor: '#0d0d14',
      scale: 2,
      useCORS: true,
    })
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `hardtime-timeline-${new Date().toISOString().split('T')[0]}.png`
    a.click()
  }

  // Split: products with at least one plottable date vs those with none
  const withDates = results.filter(r => r.eolDate || r.eosupportDate || r.eosaleDate)
  const noDates   = results.filter(r => !r.eolDate && !r.eosupportDate && !r.eosaleDate)

  // Build date range from all available dates
  const allDates: Date[] = [today]
  for (const r of withDates) {
    const d1 = parseDate(r.eolDate)
    const d2 = parseDate(r.eosupportDate)
    const d3 = parseDate(r.eosaleDate)
    if (d1) allDates.push(d1)
    if (d2) allDates.push(d2)
    if (d3) allDates.push(d3)
  }

  // Sort timeline entries: EOL date first, fall back to eosaleDate, then eosupportDate
  const sorted = [...withDates].sort((a, b) => {
    const da = parseDate(a.eolDate ?? a.eosaleDate ?? a.eosupportDate)?.getTime() ?? 0
    const db = parseDate(b.eolDate ?? b.eosaleDate ?? b.eosupportDate)?.getTime() ?? 0
    return da - db
  })

  const showTimeline = allDates.length > 1

  let startMs = 0, endMs = 0, span = 0, todayPct = 0
  let years: { year: number; pct: number }[] = []

  if (showTimeline) {
    const minMs    = Math.min(...allDates.map(d => d.getTime()))
    const maxMs    = Math.max(...allDates.map(d => d.getTime()))
    const rawRange = maxMs - minMs
    const range    = Math.max(rawRange, 365 * 24 * 3600 * 1000)
    const pad      = Math.max(range * 0.05, 90 * 24 * 3600 * 1000)
    startMs  = minMs - pad
    endMs    = maxMs + pad
    span     = endMs - startMs
    todayPct = toPct(today, startMs, span)

    const startYear = new Date(startMs).getFullYear()
    const endYear   = new Date(endMs).getFullYear()
    const yearCount = endYear - startYear + 1
    const step = yearCount > 20 ? 5 : yearCount > 10 ? 2 : 1
    for (let y = startYear; y <= endYear; y++) {
      if ((y - startYear) % step === 0) {
        years.push({ year: y, pct: toPct(new Date(y, 0, 1), startMs, span) })
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={exportPNG}
          className="flex items-center gap-1.5 bg-ht-card hover:bg-ht-border border border-ht-border text-ht-text text-xs font-medium px-3 py-1.5 rounded-lg transition"
        >
          <Download className="w-3.5 h-3.5" />
          Save as PNG
        </button>
      </div>

      <div ref={containerRef} className="space-y-3 bg-ht-bg rounded-xl border border-ht-border p-4">

        {/* ── Timeline section ── */}
        {showTimeline && (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Year axis */}
              <div className="flex mb-2 pl-[200px] pr-[90px]">
                <div className="relative flex-1 h-5">
                  {years.map(({ year, pct }) => (
                    <div
                      key={year}
                      style={{ left: `${pct}%` }}
                      className="absolute -translate-x-1/2 text-[10px] text-ht-muted select-none"
                    >
                      {year}
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid + rows */}
              <div className="relative">
                <div className="absolute inset-0 pl-[200px] pr-[90px] pointer-events-none">
                  <div className="relative h-full">
                    {years.map(({ year, pct }) => (
                      <div key={year} style={{ left: `${pct}%` }} className="absolute top-0 bottom-0 w-px bg-ht-border/30" />
                    ))}
                    <div style={{ left: `${todayPct}%` }} className="absolute top-0 bottom-0 w-px bg-ht-accent/50 z-10" />
                  </div>
                </div>

                <div className="space-y-1">
                  {sorted.map(r => {
                    const eolDate   = parseDate(r.eolDate)
                    const eosDate   = parseDate(r.eosupportDate)
                    const eosalDate = parseDate(r.eosaleDate)
                    const dotColor  = DOT_COLOR[r.status] ?? DOT_COLOR.unknown

                    const eolPct   = eolDate   ? toPct(eolDate,   startMs, span) : null
                    const eosPct   = eosDate   ? toPct(eosDate,   startMs, span) : null
                    const esalPct  = eosalDate ? toPct(eosalDate, startMs, span) : null

                    // Primary label: prefer eolDate, fall back to eosaleDate, then eosupportDate
                    const labelDate = eolDate ?? eosalDate ?? eosDate

                    return (
                      <div key={r.id} className="flex items-center">
                        <div className="w-[200px] shrink-0 pr-3 text-right">
                          <div className="text-xs text-ht-text truncate">{r.productName}</div>
                          {r.vendor && <div className="text-[10px] text-ht-muted truncate">{r.vendor}</div>}
                        </div>

                        <div className="relative flex-1 h-8 flex items-center">
                          <div className="absolute inset-y-[13px] left-0 right-0 bg-ht-border/30 rounded-full" />

                          {/* End-of-Sale dot */}
                          {esalPct !== null && esalPct !== eolPct && (
                            <div
                              style={{ left: `${esalPct}%` }}
                              className="absolute w-2.5 h-2.5 rounded-full bg-amber-500/80 ring-2 ring-amber-500/20 -translate-x-1/2 z-20"
                              title={`End of Sale: ${r.eosaleDate}`}
                            />
                          )}

                          {/* End-of-Support dot */}
                          {eosPct !== null && eosPct !== eolPct && (
                            <div
                              style={{ left: `${eosPct}%` }}
                              className="absolute w-2 h-2 rounded-full bg-yellow-400/80 ring-2 ring-yellow-400/20 -translate-x-1/2 z-20"
                              title={`Support End: ${r.eosupportDate}`}
                            />
                          )}

                          {/* Security Patch End (EOL) dot — primary */}
                          {eolPct !== null && (
                            <div
                              style={{ left: `${eolPct}%` }}
                              className={`absolute w-3 h-3 rounded-full ring-4 -translate-x-1/2 z-30 ${dotColor}`}
                              title={`Sec. Patch End: ${r.eolDate}`}
                            />
                          )}
                        </div>

                        <div className="w-[90px] shrink-0 pl-3 text-[10px] text-ht-muted whitespace-nowrap">
                          {labelDate ? labelDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] text-ht-muted pl-[200px]">
                <span className="flex items-center gap-1"><span className="inline-block w-px h-3 bg-ht-accent/50" /> Today</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-500/30" /> Sec. Patch End</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500/80 ring-2 ring-amber-500/20" /> End of Sale</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-yellow-400/80 ring-2 ring-yellow-400/20" /> Support End</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-green-500 ring-2 ring-green-500/30" /> Active</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-orange-500 ring-2 ring-orange-500/30" /> End of Sale (status)</span>
              </div>
            </div>
          </div>
        )}

        {/* ── No-date products section ── */}
        {noDates.length > 0 && (
          <div className={showTimeline ? 'border-t border-ht-border pt-3 mt-3' : ''}>
            <div className="text-xs font-medium text-ht-muted mb-2">
              No date announced ({noDates.length} product{noDates.length !== 1 ? 's' : ''})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {noDates.map(r => (
                <div key={r.id} className="flex items-start gap-2 bg-ht-surface border border-ht-border rounded-lg px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-ht-text truncate">{r.productName}</div>
                    {r.vendor && <div className="text-[10px] text-ht-muted">{r.vendor}</div>}
                  </div>
                  <div className="shrink-0 mt-0.5">
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edge case: nothing at all */}
        {!showTimeline && noDates.length === 0 && (
          <div className="py-8 text-center text-sm text-ht-muted">
            No date information available to display a timeline.
          </div>
        )}

      </div>
    </div>
  )
}
