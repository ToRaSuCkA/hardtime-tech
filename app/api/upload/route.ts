import { NextRequest, NextResponse } from 'next/server'
import { parseProductNames } from '@/lib/claude'
import { batchLookup } from '@/lib/search'
import { appendQuery } from '@/lib/query-log'
import { v4 as uuidv4 } from 'uuid'

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

    // Prepend vendor to lookup name when known and not already included — improves local DB matching
    const productNames = products.map(p => {
      let base = p.name
      if (p.vendor && !base.toLowerCase().includes(p.vendor.toLowerCase())) {
        base = `${p.vendor} ${base}`
      }
      return p.version ? `${base} ${p.version}` : base
    })
    const results = await batchLookup(productNames)

    // Merge parsed vendor into any result that didn't get one from the lookup
    const enrichedResults = results.map((result, i) => {
      if (!result.vendor && products[i]?.vendor) {
        return { ...result, vendor: products[i].vendor! }
      }
      return result
    })

    appendQuery({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'upload',
      query: file.name,
      resultCount: enrichedResults.length,
      source: 'batch',
      status: 'completed',
    })

    return NextResponse.json({ products, results: enrichedResults })
  } catch (err) {
    console.error('[/api/upload]', err)
    return NextResponse.json({ error: 'Upload processing failed' }, { status: 500 })
  }
}
