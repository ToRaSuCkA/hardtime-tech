import { NextRequest, NextResponse } from 'next/server'
import { lookupProduct } from '@/lib/search'
import { appendQuery } from '@/lib/query-log'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const productName: string = body?.productName?.trim()

    if (!productName) {
      return NextResponse.json({ error: 'productName is required' }, { status: 400 })
    }

    const result = await lookupProduct(productName)

    appendQuery({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'search',
      query: productName,
      resultCount: 1,
      source: result.source,
      status: result.status,
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/search]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
