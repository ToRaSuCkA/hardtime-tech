'use client'

import { useState } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { toCSV, toJSON, toExcel, toPDF } from '@/lib/export'
import type { EolResult } from '@/lib/types'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportButtons({ results }: { results: EolResult[] }) {
  const [open, setOpen] = useState(false)

  const stem = `hardtime-export-${new Date().toISOString().split('T')[0]}`

  async function exportCSV() {
    download(new Blob([toCSV(results)], { type: 'text/csv' }), `${stem}.csv`)
    setOpen(false)
  }

  async function exportJSON() {
    download(new Blob([toJSON(results)], { type: 'application/json' }), `${stem}.json`)
    setOpen(false)
  }

  async function exportExcel() {
    const blob = await toExcel(results)
    download(blob, `${stem}.xlsx`)
    setOpen(false)
  }

  async function exportPDF() {
    const blob = await toPDF(results)
    download(blob, `${stem}.pdf`)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 bg-ht-card hover:bg-ht-border border border-ht-border text-ht-text text-sm font-medium px-3 py-2 rounded-lg transition"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-40 bg-ht-surface border border-ht-border rounded-lg shadow-xl z-20 overflow-hidden">
            {[
              { label: 'CSV (.csv)',   action: exportCSV   },
              { label: 'Excel (.xlsx)', action: exportExcel },
              { label: 'JSON (.json)', action: exportJSON  },
              { label: 'PDF (.pdf)',   action: exportPDF   },
            ].map(({ label, action }) => (
              <button
                key={label}
                onClick={action}
                className="w-full text-left px-4 py-2.5 text-sm text-ht-text hover:bg-ht-card transition"
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
