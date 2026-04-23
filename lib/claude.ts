import Anthropic from '@anthropic-ai/sdk'
import type { EolResult, ParsedProduct } from './types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function mapToEolSlug(productName: string, slugs: string[]): Promise<string | null> {
  const slugList = slugs.slice(0, 400).join('\n')

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 64,
      messages: [
        {
          role: 'user',
          content: `Find the best matching slug for "${productName}" from this list of endoflife.date slugs.
Slugs represent product FAMILIES, not specific models. Examples:
  "Windows Server 2019" → "windowsserver"
  "Ubuntu 20.04 LTS"   → "ubuntu"
  "Cisco IOS XE 17"    → "ios-xe"
  "SQL Server 2019"    → "mssqlserver"
Return ONLY the exact slug string with no explanation.
If no slug closely matches the product family, return the word null.

Slugs:
${slugList}`,
        },
      ],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    if (!text || text === 'null' || !slugs.includes(text)) return null
    return text
  } catch (err) {
    console.error('[claude] mapToEolSlug failed:', err)
    return null
  }
}

export async function generateEolEstimate(
  productName: string,
  partial?: Partial<EolResult>
): Promise<Partial<EolResult>> {
  const today = new Date().toISOString().split('T')[0]

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are an IT lifecycle management expert with deep knowledge of official vendor EOL policies. Today is ${today}.

Product: "${productName}"
${partial ? `Partial data already known: ${JSON.stringify(partial)}` : ''}

Provide accurate end-of-life dates using official vendor support calendars:
- Microsoft: Mainstream Support end + Extended Support end (lifecycle.microsoft.com)
- Cisco: End-of-Sale and End-of-Support dates (cisco.com/c/en/us/products/eos-eol-listing.html)
- Dell: Hardware EOL / ProSupport end dates
- Red Hat: Full support → Maintenance → End of Life (access.redhat.com/support/policy/updates/errata)
- For LTSC/LTS products: use that specific variant's fixed support window, NOT the subscription lifecycle.

RULES:
- eolDate = the final date after which NO support is provided (Extended Support end for Microsoft)
- eosupportDate = end of primary/mainstream support (shorter window)
- If you know the date with confidence, set eolDateConfidence to "confirmed"
- If you are estimating, set it to "estimated"
- Never return null for eolDate or eosupportDate — use typical vendor windows as fallback
- Replacement cost range must be tight (within ~2x), e.g. "$4,000–$8,000 per unit"
- Base costs on realistic street pricing, not list price

Respond with ONLY a JSON object (no markdown, no extra text):
{
  "status": "active"|"eol"|"end-of-sale"|"end-of-support"|"unknown",
  "eolDate": "YYYY-MM-DD",
  "eolDateConfidence": "confirmed"|"estimated"|"unknown",
  "eosaleDate": "YYYY-MM-DD or null",
  "eosupportDate": "YYYY-MM-DD",
  "vendor": "string",
  "latestVersion": "string or null",
  "replacementProduct": "specific model/product name",
  "replacementCostEstimate": "tight range e.g. $4,000–$8,000 per unit",
  "notes": "1–2 sentences citing the specific policy or source and confidence level"
}`,
        },
      ],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}'
    const json = text.match(/\{[\s\S]*\}/)
    return json ? { ...JSON.parse(json[0]), source: 'ai-estimate' as const } : { source: 'ai-estimate' as const }
  } catch (err) {
    console.error('[claude] generateEolEstimate failed:', err)
    return { source: 'ai-estimate' as const, notes: 'AI estimate temporarily unavailable.' }
  }
}

export async function generateReplacementInfo(
  productName: string,
  eolData: Partial<EolResult>
): Promise<{ replacementProduct: string; replacementCostEstimate: string }> {
  const fallback = { replacementProduct: 'Contact vendor', replacementCostEstimate: 'Contact vendor' }

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Product: "${productName}" (status: ${eolData.status ?? 'unknown'}, EOL: ${eolData.eolDate ?? 'unknown'})
Suggest a specific like-for-like replacement and realistic cost to replace it.
Cost range must be tight (within ~2x, e.g. "$4,000–$8,000 per unit"). Use realistic street pricing.
Respond with ONLY JSON: {"replacementProduct":"...","replacementCostEstimate":"..."}`,
        },
      ],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}'
    const json = text.match(/\{[\s\S]*\}/)
    return json ? JSON.parse(json[0]) : fallback
  } catch (err) {
    console.error('[claude] generateReplacementInfo failed:', err)
    return fallback
  }
}

// Split large text into line-aligned chunks to avoid truncating products mid-list
export async function parseProductNames(rawText: string): Promise<ParsedProduct[]> {
  const CHUNK_CHARS = 5000
  const lines = rawText.split('\n')
  const chunks: string[] = []
  let current = ''

  for (const line of lines) {
    if (current.length + line.length + 1 > CHUNK_CHARS && current.length > 0) {
      chunks.push(current)
      current = line
    } else {
      current = current ? current + '\n' + line : line
    }
  }
  if (current.trim()) chunks.push(current)

  if (chunks.length === 0) return []

  const allProducts: ParsedProduct[] = []
  const seenNames = new Set<string>()

  for (const chunk of chunks) {
    try {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `Extract hardware and software product names from the text below.
Include specific model numbers and version numbers when present.
Return ONLY a JSON array: [{"name":"...","version":"...or null","vendor":"...or null"}]
Ignore column headers, generic descriptions, and non-product text.

Text:
${chunk}`,
          },
        ],
      })

      const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '[]'
      const json = text.match(/\[[\s\S]*\]/)
      if (json) {
        const products: ParsedProduct[] = JSON.parse(json[0])
        for (const p of products) {
          const key = p.name.toLowerCase().trim()
          if (key && !seenNames.has(key)) {
            seenNames.add(key)
            allProducts.push(p)
          }
        }
      }
    } catch (err) {
      console.error('[claude] parseProductNames chunk failed:', err)
      // continue processing other chunks
    }
  }

  return allProducts
}
