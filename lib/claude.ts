import Anthropic from '@anthropic-ai/sdk'
import type { EolResult, ParsedProduct } from './types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function mapToEolSlug(productName: string, slugs: string[]): Promise<string | null> {
  // Send up to 400 slugs — Haiku handles this cheaply
  const slugList = slugs.slice(0, 400).join('\n')

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 64,
    messages: [
      {
        role: 'user',
        content: `Find the best matching slug for "${productName}" from this list of endoflife.date slugs.
Return ONLY the exact slug string. If nothing matches well, return the word null.

${slugList}`,
      },
    ],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
  if (!text || text === 'null' || !slugs.includes(text)) return null
  return text
}

export async function generateEolEstimate(
  productName: string,
  partial?: Partial<EolResult>
): Promise<Partial<EolResult>> {
  const today = new Date().toISOString().split('T')[0]

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an IT lifecycle management expert. Today is ${today}.
Provide end-of-life lifecycle information for this product: "${productName}"
${partial ? `Known data: ${JSON.stringify(partial)}` : ''}

Respond with ONLY a JSON object (no markdown) using these exact fields:
{
  "status": "active"|"eol"|"end-of-sale"|"end-of-support"|"unknown",
  "eolDate": "YYYY-MM-DD or null",
  "eolDateConfidence": "confirmed"|"estimated"|"unknown",
  "eosaleDate": "YYYY-MM-DD or null",
  "eosupportDate": "YYYY-MM-DD or null",
  "vendor": "string",
  "latestVersion": "string or null",
  "replacementProduct": "specific model/product name",
  "replacementCostEstimate": "e.g. $500–$2,000 per unit",
  "notes": "1–2 sentence explanation of confidence and sources"
}`,
      },
    ],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}'
  try {
    const json = text.match(/\{[\s\S]*\}/)
    return json ? { ...JSON.parse(json[0]), source: 'ai-estimate' as const } : { source: 'ai-estimate' as const }
  } catch {
    return { source: 'ai-estimate' as const, notes: 'Could not parse AI response.' }
  }
}

export async function generateReplacementInfo(
  productName: string,
  eolData: Partial<EolResult>
): Promise<{ replacementProduct: string; replacementCostEstimate: string }> {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Product: "${productName}" (status: ${eolData.status ?? 'unknown'}, EOL: ${eolData.eolDate ?? 'unknown'})
Suggest a specific like-for-like replacement and rough cost to replace it.
Respond with ONLY JSON: {"replacementProduct":"...","replacementCostEstimate":"..."}`,
      },
    ],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}'
  try {
    const json = text.match(/\{[\s\S]*\}/)
    return json
      ? JSON.parse(json[0])
      : { replacementProduct: 'Contact vendor', replacementCostEstimate: 'Contact vendor' }
  } catch {
    return { replacementProduct: 'Contact vendor', replacementCostEstimate: 'Contact vendor' }
  }
}

export async function parseProductNames(rawText: string): Promise<ParsedProduct[]> {
  const truncated = rawText.substring(0, 8000)

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Extract hardware and software product names from the text below.
Return ONLY a JSON array: [{"name":"...","version":"...or null","vendor":"...or null"}]
Ignore column headers, descriptions, and non-product text.

Text:
${truncated}`,
      },
    ],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '[]'
  try {
    const json = text.match(/\[[\s\S]*\]/)
    return json ? JSON.parse(json[0]) : []
  } catch {
    return []
  }
}
