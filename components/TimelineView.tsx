'use client'

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

const DOT_COLOR: Record<string, string> = {
  eol:              'bg-red-500 ring-red-500/30',
  'end-of-sale':    'bg-orange-500 ring-orange-500/30',
  'end-of-support': 'bg-orange-400 ring-orange-400/30',
  active:           'bg-green-500 ring-green-500/30',
  unknown:          'bg-gray-500 ring-gray-500/30',
}

export function TimelineView({ results }: { results: EolResult[] }) {
  const today = new Date()

  const allDates: Date[] = [today]
  for (const r of results) {
    const d1 = parseDate(r.eolDate)
    const d2 = parseDate(r.eosupportDate)
    const d3 = parseDate(r.releaseDate)
    if (d1) allDates.push(d1)
    if (d2) allDates.push(d2)
    if (d3) allDates.push(d3)
  }

  if (allDates.length <= 1) {
    return (
      <div className="rounded-xl border border-ht-border p-8 text-center text-sm text-ht-muted">
        No date information available to display a timeline.
      </div>
    )
  }

  const minMs  = Math.min(...allDates.map(d => d.getTime()))
  const maxMs  = Math.max(...allDates.map(d => d.getTime()))
  const rawRange = maxMs - minMs
  // Ensure at least a 1-year window and 5% padding each side
  const range  = Math.max(rawRange, 365 * 24 * 3600 * 1000)
  const pad    = Math.max(range * 0.05, 90 * 24 * 3600 * 1000)
  const startMs = minMs - pad
  const endMs   = maxMs + pad
  const span    = endMs - startMs

  const todayPct = toPct(today, startMs, span)

  // Year tick marks — limit density
  const startYear = new Date(startMs).getFullYear()
  const endYear   = new Date(endMs).getFullYear()
  const yearCount = endYear - startYear + 1
  const step = yearCount > 20 ? 5 : yearCount > 10 ? 2 : 1
  const years: { year: number; pct: number }[] = []
  for (let y = startYear; y <= endYear; y++) {
    if ((y - startYear) % step === 0) {
      years.push({ year: y, pct: toPct(new Date(y, 0, 1), startMs, span) })
    }
  }

  const sorted = [...results].sort((a, b) => {
    const da = parseDate(a.eolDate)?.getTime() ?? 0
    const db = parseDate(b.eolDate)?.getTime() ?? 0
    return da - db
  })

  return (
    <div className="overflow-x-auto rounded-xl border border-ht-border p-4 bg-ht-bg">
      <div className="min-w-[640px]">
        {/* Year axis */}
        <div className="flex mb-3 pl-[200px] pr-[90px]">
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

        {/* Grid lines aligned with years */}
        <div className="relative">
          {/* Vertical year lines drawn over the rows area */}
          <div className="absolute inset-0 pl-[200px] pr-[90px] pointer-events-none">
            <div className="relative h-full">
              {years.map(({ year, pct }) => (
                <div
                  key={year}
                  style={{ left: `${pct}%` }}
                  className="absolute top-0 bottom-0 w-px bg-ht-border/30"
                />
              ))}
              {/* Today line */}
              <div
                style={{ left: `${todayPct}%` }}
                className="absolute top-0 bottom-0 w-px bg-ht-accent/50 z-10"
              />
            </div>
          </div>

          {/* Product rows */}
          <div className="space-y-1">
            {sorted.map(r => {
              const eolDate = parseDate(r.eolDate)
              const eosDate = parseDate(r.eosupportDate)
              const dotColor = DOT_COLOR[r.status] ?? DOT_COLOR.unknown
              const eolPct = eolDate ? toPct(eolDate, startMs, span) : null
              const eosPct = eosDate ? toPct(eosDate, startMs, span) : null

              return (
                <div key={r.id} className="flex items-center">
                  {/* Name */}
                  <div className="w-[200px] shrink-0 pr-3 text-right">
                    <div className="text-xs text-ht-text truncate">{r.productName}</div>
                    {r.vendor && <div className="text-[10px] text-ht-muted truncate">{r.vendor}</div>}
                  </div>

                  {/* Track */}
                  <div className="relative flex-1 h-8 flex items-center">
                    <div className="absolute inset-y-[13px] left-0 right-0 bg-ht-border/30 rounded-full" />

                    {/* EoSupport dot (smaller) */}
                    {eosPct !== null && eosPct !== eolPct && (
                      <div
                        style={{ left: `${eosPct}%` }}
                        className="absolute w-2 h-2 rounded-full bg-orange-400/70 ring-2 ring-orange-400/20 -translate-x-1/2 z-20"
                        title={`End of Support: ${r.eosupportDate}`}
                      />
                    )}

                    {/* EOL dot */}
                    {eolPct !== null && (
                      <div
                        style={{ left: `${eolPct}%` }}
                        className={`absolute w-3 h-3 rounded-full ring-4 -translate-x-1/2 z-30 ${dotColor}`}
                        title={`EOL: ${r.eolDate}`}
                      />
                    )}
                  </div>

                  {/* Date label */}
                  <div className="w-[90px] shrink-0 pl-3 text-[10px] text-ht-muted whitespace-nowrap">
                    {eolDate
                      ? eolDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                      : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-5 flex flex-wrap items-center gap-4 text-[10px] text-ht-muted pl-[200px]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-px h-3 bg-ht-accent/50" /> Today
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 ring-2 ring-green-500/30" /> Active
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-500/30" /> EOL
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-orange-500 ring-2 ring-orange-500/30" /> End of Sale
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-orange-400/70 ring-2 ring-orange-400/20" /> End of Support
          </span>
        </div>
      </div>
    </div>
  )
}
