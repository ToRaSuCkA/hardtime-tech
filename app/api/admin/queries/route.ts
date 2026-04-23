import { NextResponse } from 'next/server'
import { readQueries } from '@/lib/query-log'

export async function GET() {
  const entries = readQueries()
  return NextResponse.json(entries.slice().reverse()) // newest first
}
