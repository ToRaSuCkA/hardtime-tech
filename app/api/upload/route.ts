import { NextRequest, NextResponse } from 'next/server'
import { parseProductNames } from '@/lib/claude'
import { batchLookup } from '@/lib/search'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const name = file.name.toLowerCase()
    const buffer = await file.arrayBuffer()
    let rawText = ''

    if (name.endsWith('.csv') || name.endsWith('.txt')) {
      rawText = new TextDecoder().decode(buffer)
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(buffer, { type: 'array' })
      const lines: string[] = []
      wb.SheetNames.forEach(s => lines.push(XLSX.utils.sheet_to_csv(wb.Sheets[s])))
      rawText = lines.join('\n')
    } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
      const mammoth = await import('mammoth')
      const res = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
      rawText = res.value
    } else {
      rawText = new TextDecoder().decode(buffer)
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 })
    }

    const products = await parseProductNames(rawText)

    if (!products.length) {
      return NextResponse.json({ error: 'No hardware or software products found in the file' }, { status: 400 })
    }

    const productNames = products.map(p => `${p.name}${p.version ? ' ' + p.version : ''}`)
    const results = await batchLookup(productNames)

    return NextResponse.json({ products, results })
  } catch (err) {
    console.error('[/api/upload]', err)
    return NextResponse.json({ error: 'Upload processing failed' }, { status: 500 })
  }
}
