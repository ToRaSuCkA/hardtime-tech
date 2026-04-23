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

FIELD DEFINITIONS — these are strict:
- eolDate     = the date security patches/advisories STOP. This is the last day you can receive a security fix.
                 • Microsoft: Extended Support end date (security patches continue through Extended Support)
                 • Cisco: End of Vulnerability/Security Support (EoVS) or Last Day of Support (LDoS)
                 • Red Hat: End of Maintenance Support (security patches stop)
                 • Dell hardware: End of Service Life (EOSL) — firmware/iDRAC security patches stop
                 • NEVER use End of Sale or End of Mainstream Support as eolDate
- eosupportDate = end of mainstream/general support (earlier than eolDate for most products).
                 Security patches may still be available after this date.
                 • Microsoft: Mainstream Support end
                 • Cisco: End of Software Maintenance (EoSWM)
                 • Red Hat: End of Full Support
- eosaleDate  = when the product was discontinued / last day to order new units
- status      = "eol" ONLY when past eolDate (security patches stopped). Use "end-of-support" if past
                 eosupportDate but eolDate is still in the future (still getting security patches).

Vendor reference sources:
- Microsoft: lifecycle.microsoft.com
- Cisco: cisco.com/c/en/us/products/eos-eol-listing.html
- Red Hat: access.redhat.com/support/policy/updates/errata
- Dell: dell.com/support/kbdoc/en-us/000137498

RULES:
- If the vendor has published an official EOL/EOSL date, set eolDateConfidence to "confirmed"
- If estimating, set to "estimated" — but ONLY estimate eolDate if the product is already known to be
  discontinued or EOL. Do NOT invent a future eolDate for products still actively sold and supported.
  For active products with no announced EOL, return eolDate as null and eolDateConfidence as "unknown".
- All cost ranges must be tight (within ~2x), e.g. "$4,000–$8,000 per unit". Use realistic street pricing, not list price.
- replacementCostSame: current market cost to procure the SAME item (new if still available, otherwise refurbished/used street price)
- replacementProduct: recommend the CURRENT-GENERATION equivalent in the same product family — not 2+ generations newer.
  Examples: Dell PowerEdge R450 (15th gen) → R470 (17th gen, current); R550 → R570; Cisco ISR 4331 → ISR 4331 (current IOS-XE).
  For Dell PowerEdge: generations follow the last digit before 0 (R4x0 where x=generation tier); current is gen 7 (R470, R670 etc).
  Pick the model that matches the same rack unit count, core count tier, and use case as the original.

Respond with ONLY a JSON object (no markdown, no extra text):
{
  "status": "active"|"eol"|"end-of-sale"|"end-of-support"|"unknown",
  "eolDate": "YYYY-MM-DD or null",
  "eolDateConfidence": "confirmed"|"estimated"|"unknown",
  "eosaleDate": "YYYY-MM-DD or null",
  "eosupportDate": "YYYY-MM-DD or null",
  "vendor": "string",
  "replacementCostSame": "tight range for same item e.g. $2,000–$4,000 per unit",
  "replacementProduct": "current-gen equivalent model name",
  "replacementCostEstimate": "tight range for recommended replacement e.g. $4,000–$8,000 per unit",
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
): Promise<{ replacementCostSame: string; replacementProduct: string; replacementCostEstimate: string }> {
  const fallback = { replacementCostSame: 'Contact vendor', replacementProduct: 'Contact vendor', replacementCostEstimate: 'Contact vendor' }

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Product: "${productName}" (status: ${eolData.status ?? 'unknown'}, security patch end: ${eolData.eolDate ?? 'unknown'})

Provide three things:
1. replacementCostSame: current street price to procure this SAME product today (new if available, else refurbished/used market price). Tight range within ~2x.
2. replacementProduct: the CURRENT-GENERATION equivalent in the same product family (not 2+ generations ahead).
   - Dell PowerEdge R4x0 family: R450 (15th gen) → R470 (17th gen, current). Same rack/core tier, just current gen.
   - Dell PowerEdge R6x0 family: R650 → R670. R7x0: R750 → R770. R5x0: R550 → R570. R8x0: R850 → R870.
   - For non-Dell: pick the current-generation equivalent at the same tier/class.
3. replacementCostEstimate: street price for that recommended replacement. Tight range within ~2x.

Respond with ONLY JSON: {"replacementCostSame":"...","replacementProduct":"...","replacementCostEstimate":"..."}`,
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
