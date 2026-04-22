import type { EolResult } from './types'

const HEADERS = [
  'Product Name',
  'Vendor',
  'Cycle',
  'Status',
  'EOL Date',
  'EOL Confidence',
  'End of Sale Date',
  'End of Support Date',
  'Latest Version',
  'Release Date',
  'Replacement Product',
  'Replacement Cost Estimate',
  'Notes',
  'Data Source',
]

function toRow(r: EolResult): string[] {
  return [
    r.productName,
    r.vendor ?? '',
    r.cycle ?? '',
    r.status,
    r.eolDate ?? '',
    r.eolDateConfidence,
    r.eosaleDate ?? '',
    r.eosupportDate ?? '',
    r.latestVersion ?? '',
    r.releaseDate ?? '',
    r.replacementProduct,
    r.replacementCostEstimate,
    r.notes,
    r.source,
  ]
}

function escapeCsv(v: string): string {
  return `"${v.replace(/"/g, '""')}"`
}

export function toCSV(results: EolResult[]): string {
  const rows = [HEADERS, ...results.map(toRow)]
  return rows.map(r => r.map(escapeCsv).join(',')).join('\n')
}

export function toJSON(results: EolResult[]): string {
  return JSON.stringify(results, null, 2)
}

export async function toExcel(results: EolResult[]): Promise<Blob> {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...results.map(toRow)])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'EoL Results')
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export async function toPDF(results: EolResult[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFillColor(13, 13, 20)
  doc.rect(0, 0, 297, 210, 'F')
  doc.setTextColor(230, 57, 70)
  doc.setFontSize(18)
  doc.text('HardTime — Lifecycle Report', 14, 16)
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(9)
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 22)

  autoTable(doc, {
    startY: 28,
    head: [['Product', 'Status', 'EOL Date', 'EoSupport', 'Replacement', 'Cost', 'Source']],
    body: results.map(r => [
      r.productName,
      r.status,
      r.eolDate ?? '—',
      r.eosupportDate ?? '—',
      r.replacementProduct,
      r.replacementCostEstimate,
      r.source,
    ]),
    styles: { fillColor: [26, 26, 46], textColor: [226, 232, 240], fontSize: 8 },
    headStyles: { fillColor: [230, 57, 70], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [19, 19, 31] },
    theme: 'grid',
  })

  return doc.output('blob')
}
