/* Multi-vertical content analyser — Sprint η+1
 *
 * Dado um pedaço de conteúdo externo (tweet, post IG, news, snapshot site),
 * pede ao Claude Haiku para devolver "why it matters" CONTEXTUAL por vertical
 * da Property007 + uma suggestion mission accionável.
 *
 * Output structure:
 *   {
 *     why_it_matters: {
 *       global: "Perspectiva CEO cross-vertical (sempre presente)",
 *       v2:  "Implicação V2 Condomínios" (opcional),
 *       v3:  "Implicação V3 Seguros" (opcional),
 *       v4:  "Implicação V4 Energia" (opcional),
 *       v5:  "Implicação V5 Manutenção" (opcional),
 *       v7:  "Implicação V7 Real Estate" (opcional),
 *       v10: "Implicação V10 Owners Club" (opcional),
 *     },
 *     suggested_mission: "Acção concreta breve PT-PT",
 *     primary_vertical: "v2" | "v4" | etc | null  -- vertical mais relevante
 *     relevance: 1-10  -- score global de relevância
 *   }
 *
 * Reasoning: cada vertical tem perspectiva diferente. Um post sobre AI
 * infrastructure para V2 condo é diferente de V4 energia. O agente
 * destila por contexto de negócio. Substitui scroll passivo de redes
 * sociais por intelligence destilada.
 */

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || ""
const MODEL         = "claude-haiku-4-5-20251001"

const VERTICAL_CONTEXTS = `
Property007 — PropTech multi-vertical em Portugal:
- V2 Condomínios (PRODUÇÃO viva, prataowners.pt): admin condominial, quotas, faturas, assembleias, ~5000 linhas dados reais
- V3 Seguros (planeado): apólices condomínio + fracções, sinistros
- V4 Energia (em construção): simulador tarifas, switching comercializador, OCR faturas
- V5 Manutenção (produção parcial): catálogo serviços, ordens, prestadores, IA "Bia"
- V7 Real Estate (futuro): listings, market intelligence, brokerage
- V10 Owners Club (futuro): fidelidade cross-vertical, tiers Prata/Gold/Platinum

Operador: Mário Carvalho, solo founder, TOC. Cliente alvo: proprietários PT, gestores condomínio, condóminos.
`.trim()

export interface MultiVerticalInsight {
  why_it_matters: Record<string, string>  // chaves: global, v2, v3, v4, v5, v7, v10
  suggested_mission: string
  primary_vertical: string | null
  relevance: number  // 1-10
}

export async function analyseMultiVertical(
  content: string,
  sourceLabel: string,
  contentType: string = "post"
): Promise<MultiVerticalInsight | null> {
  if (!ANTHROPIC_KEY) return null

  const prompt = `${VERTICAL_CONTEXTS}

CONTEÚDO de "${sourceLabel}" (${contentType}):
"""
${content.slice(0, 1500)}
"""

Tu és o filtro inteligente do feed do Mário — o objectivo é POUPAR-LHE tempo de scroll passivo.
Destila este conteúdo do ponto de vista do negócio dele.

Para CADA vertical onde o conteúdo tenha implicação real, devolve uma frase contextual (max 200 chars PT-PT).
Omite verticais sem implicação. NÃO inventes ligações forçadas — se não é relevante para V5, não incluas.
"global" é sempre presente: perspectiva CEO cross-vertical (max 200 chars).
"primary_vertical" identifica a vertical MAIS relevante (ou null se for puramente macro/global).
"relevance" 1-10: 10 = acção urgente, 5 = vale ler, 1 = noise, ignorar.

Responde APENAS um JSON válido (sem markdown):
{
  "why_it_matters": {
    "global": "...",
    "v2": "..." (opcional),
    "v4": "..." (opcional),
    "v7": "..." (opcional)
  },
  "suggested_mission": "Acção concreta breve PT-PT (max 120 chars)",
  "primary_vertical": "v2" | "v3" | "v4" | "v5" | "v7" | "v10" | null,
  "relevance": 7
}`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    })
    if (!res.ok) {
      const txt = await res.text()
      console.warn(`[multi-vertical-analyser] HTTP ${res.status}: ${txt.slice(0, 200)}`)
      return null
    }
    const data = await res.json()
    const text = (data.content?.[0]?.text || "").trim()
    const clean = text.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "")
    const parsed = JSON.parse(clean) as MultiVerticalInsight

    // Sanity: garantir que why_it_matters é objeto e tem 'global'
    if (typeof parsed.why_it_matters === "string") {
      parsed.why_it_matters = { global: parsed.why_it_matters }
    }
    if (!parsed.why_it_matters?.global) {
      parsed.why_it_matters = { global: "Sem análise IA disponível.", ...parsed.why_it_matters }
    }
    if (typeof parsed.relevance !== "number") parsed.relevance = 5

    return parsed
  } catch (e) {
    console.warn("[multi-vertical-analyser] failed:", e)
    return null
  }
}
