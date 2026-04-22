import { NextRequest, NextResponse } from 'next/server'
import { lookupProduct } from '@/lib/search'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const productName: string = body?.productName?.trim()

    if (!productName) {
      return NextResponse.json({ error: 'productName is required' }, { status: 400 })
    }

    const result = await lookupProduct(productName)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/search]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
