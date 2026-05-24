// ============================================================================
// Edge Function: swarm-worker-jina
// Projecto: V1 Core Hub (hkmvszkpxjbxmnixzqbl)
// Versão remota: v9 (DB-011 fix — JSON extract robusto, 2026-05-24)
// verify_jwt: False
// ----------------------------------------------------------------------------
// Snapshot v8 versionado em git por Story 019.12 (epic-019 Fase B, OPS-003).
// Fix v9 aplicado em 2026-05-24 (DB-011 Critical brownfield): substitui regex
// strip frágil (que deixava texto pós-fence) por extracção via group capture.
// Causa real: Haiku acrescenta "**Justificação:**" depois do ``` de fecho.
// Antigo: replace(/\s*```\s*$/) → JSON inválido com texto extra.
// Novo:   match(/```(?:json)?\s*([\s\S]*?)\s*```/i) → extrai só o JSON interno.
// Política: alterações futuras devem editar ESTE ficheiro primeiro, depois
//   `supabase functions deploy swarm-worker-jina` — NÃO editar no Dashboard remoto.
// ============================================================================

/**
 * swarm-worker-jina — Truth Engine NI Worker
 * ADR-V11-005 · Sprint B2.7 (v5 — fix 403 Google/Bing + schema columns corrected)
 *
 * Fix B2.7: Idealista/RNAAC/Imovirtual bloqueiam Jina com 403.
 * Solução: Google + Bing search URLs — Jina consegue scrape sem bloqueio.
 * Fix B2.7b: usar nomes de colunas correctos do schema (cost_eur numeric, error text).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.30.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

interface WorkerPayload { worker_id: string; niche_id: string; run_id: string; }
interface ExtractionItem {
  kind: "opportunity" | "competitor" | "hook" | "legal" | "pricing";
  title: string; summary: string; source_url?: string;
  significance: "low" | "medium" | "high" | "critical";
}
interface ExtractionOutput { items: ExtractionItem[]; cost_tokens?: number; }

const VALID_KINDS = ["opportunity", "competitor", "hook", "legal", "pricing"] as const;
const VALID_SIGNIFICANCE = ["low", "medium", "high", "critical"] as const;

function validateExtractionOutput(raw: unknown): ExtractionOutput {
  if (!raw || typeof raw !== "object") throw new Error("output_not_object");
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.items)) throw new Error("items_not_array");
  const items: ExtractionItem[] = [];
  for (const item of obj.items) {
    if (!item || typeof item !== "object") continue;
    const i = item as Record<string, unknown>;
    if (!VALID_KINDS.includes(i.kind as ExtractionItem["kind"])) continue;
    if (typeof i.title !== "string" || i.title.trim().length === 0) continue;
    if (typeof i.summary !== "string" || i.summary.trim().length === 0) continue;
    items.push({
      kind: i.kind as ExtractionItem["kind"],
      title: String(i.title).trim().slice(0, 120),
      summary: String(i.summary).trim().slice(0, 500),
      source_url: i.source_url ? String(i.source_url) : undefined,
      significance: VALID_SIGNIFICANCE.includes(i.significance as ExtractionItem["significance"])
        ? (i.significance as ExtractionItem["significance"]) : "low",
    });
  }
  return { items };
}

/**
 * buildScrapeUrls — B2.7 fix
 * Usa Google/Bing search em vez de sites directos com anti-bot (Idealista, RNAAC, etc)
 */
function buildScrapeUrls(niche: Record<string, unknown>): string[] {
  const vertical = String(niche.vertical ?? "").toUpperCase();
  const slug = String(niche.slug ?? "");
  const region = String(niche.geo ?? niche.region ?? "lisboa")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "");

  const queryMap: Record<string, string> = {
    V2: `administrador condominio ${region} precos servicos empresas`,
    V3: `mediador seguros ${region} condominio habitacao empresas`,
    V4: `comercializador energia eletricidade ${region} B2B tarifas`,
    V5: `manutencao predial ${region} empresas servicos precos`,
    V6: `reabilitacao urbana ${region} empresas obras`,
    V7: `imobiliaria ${region} venda casas apartamentos`,
    V8: `arrendamento alojamento local ${region} gestao`,
  };

  const query = queryMap[vertical] ?? slug.replace(/[-_]/g, " ");
  const encoded = encodeURIComponent(query);

  const googleUrl = `https://www.google.com/search?q=${encoded}&gl=pt&hl=pt-PT&num=10`;
  const bingUrl   = `https://www.bing.com/search?q=${encoded}&cc=PT&setlang=pt-PT`;

  const extraUrls: Record<string, string> = {
    V2: "https://www.apcondominos.pt/noticias/",
    V3: "https://www.asf.com.pt/NR/exeres/index.htm",
    V4: "https://www.erse.pt/consumidor/electricidade/tarifas-e-precos/",
    V7: "https://www.ci.pt/noticias/mercado-imobiliario",
    V8: "https://www.alojamentolocal.pt/noticias/",
  };

  const extra = extraUrls[vertical];
  return extra ? [googleUrl, bingUrl, extra] : [googleUrl, bingUrl];
}

async function scrapeWithJina(url: string): Promise<string> {
  const r = await fetch(`https://r.jina.ai/${url}`, {
    headers: { "Accept": "text/plain", "X-Return-Format": "markdown", "X-Timeout": "15" },
    signal: AbortSignal.timeout(25_000),
  });
  if (!r.ok) throw new Error(`jina_${r.status}: ${url}`);
  return (await r.text()).slice(0, 8000);
}

/**
 * extractJsonFromHaikuResponse — DB-011 fix v9 (2026-05-24)
 *
 * Bug v8: regex `replace(/\s*```\s*$/)` removia o ``` de fecho mas deixava
 * texto pós-fence que Haiku acrescentava (ex: "**Justificação:** O conteúdo...").
 * Resultado: JSON com texto extra à direita → JSON.parse() lança SyntaxError.
 *
 * Fix v9: extrair conteúdo de DENTRO das fences via group capture (non-greedy).
 * Defesa em profundidade com 3 estratégias por ordem:
 *   1. Group capture entre ```json ... ``` (ignora tudo antes/depois)
 *   2. Primeiro objecto {...} balanceado (fallback se Haiku omitir fences)
 *   3. Primeiro array [...] balanceado (caso edge)
 */
function extractJsonFromHaikuResponse(rawText: string): string {
  const trimmed = rawText.trim();

  // Estratégia 1: extrair conteúdo entre ``` fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }

  // Estratégia 2: primeiro {...} balanceado
  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) {
    return objMatch[0].trim();
  }

  // Estratégia 3: primeiro [...] balanceado
  const arrMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    return arrMatch[0].trim();
  }

  throw new Error(`no_json_pattern_found: ${trimmed.slice(0, 200)}`);
}

async function extractWithHaiku(
  anthropic: Anthropic, nicheLabel: string, icpMd: string, content: string, sourceUrl: string,
): Promise<ExtractionOutput> {
  // v9: prompt reforçado contra texto pós-JSON ("**Justificação:**" do Haiku)
  const prompt = `Analisa o seguinte conteúdo web (resultados de pesquisa Google/Bing) para o nicho PT: "${nicheLabel}".

ICP Card:
${icpMd.slice(0, 1500)}

Conteúdo scraped de ${sourceUrl}:
${content}

Extrai descobertas de inteligência competitiva (concorrentes, preços, oportunidades, hooks, alertas legais).

REGRAS RÍGIDAS DE OUTPUT (CRÍTICO):
- Responde APENAS com JSON válido — NADA antes, NADA depois
- SEM markdown fences (sem \`\`\`json e sem \`\`\`)
- SEM "Justificação:", SEM explicações, SEM comentários extra
- A tua resposta TEM de começar com { e terminar com }
- Se nada relevante: responde literalmente {"items":[]} (sem mais texto)

Schema obrigatório:
{"items":[{"kind":"competitor|opportunity|hook|legal|pricing","title":"PT-PT max 100 chars","summary":"1-3 frases PT","source_url":"${sourceUrl}","significance":"low|medium|high|critical"}]}

Limites: max 5 items, NUNCA inventes dados, usa PT-PT (não PT-BR).`;

  const resp = await anthropic.messages.create({
    model: "claude-haiku-4-5", max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  const rawText = resp.content[0]?.type === "text" ? resp.content[0].text : "";

  // v9 fix: extracção robusta em vez de regex strip frágil
  const cleaned = extractJsonFromHaikuResponse(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    const sample = cleaned.slice(0, 300);
    const detail = parseErr instanceof Error ? parseErr.message : String(parseErr);
    throw new Error(`haiku_json_parse_failed: ${detail} | cleaned_sample: ${sample}`);
  }
  const validated = validateExtractionOutput(parsed);
  validated.cost_tokens = resp.usage?.output_tokens ?? 0;
  return validated;
}

Deno.serve(async (req) => {
  let workerId = "unknown"; let runId = "unknown";
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false }, db: { schema: "system" } });

  try {
    const body = await req.json() as WorkerPayload;
    workerId = body.worker_id; const nicheId = body.niche_id; runId = body.run_id;
    if (!workerId || !nicheId || !runId)
      return Response.json({ ok: false, error: "missing_required_fields" }, { status: 400 });

    await supabase.from("swarm_workers")
      .update({ last_heartbeat: new Date().toISOString(), current_tool: "init" })
      .eq("id", workerId);

    const { data: niche, error: nicheErr } = await supabase
      .from("swarm_niches").select("*").eq("id", nicheId).single();
    if (nicheErr || !niche) throw new Error(`niche_not_found: ${nicheErr?.message}`);

    const { data: icpCard } = await supabase.from("niche_icp_cards").select("icp_md")
      .eq("niche_id", nicheId).order("version", { ascending: false }).limit(1).single();
    const icpMd = icpCard?.icp_md ?? `Nicho: ${niche.label}. Vertical: ${niche.vertical}.`;

    // v9: Google/Bing URLs + extracção JSON robusta
    const scrapeUrls = buildScrapeUrls(niche as Record<string, unknown>);
    console.log(`[${workerId}] v9 URLs:`, scrapeUrls);

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    let totalDiscoveries = 0, totalListings = 0, totalCostEur = 0;
    const runLog: string[] = [`# Run ${runId} — ${niche.slug}\nv9 JSON extract fix (DB-011)\n`];
    let lastError: string | null = null;

    for (const url of scrapeUrls) {
      try {
        await supabase.from("swarm_workers").update({
          last_heartbeat: new Date().toISOString(), current_tool: "jina",
          current_action: url.slice(0, 100), current_niche_slug: niche.slug,
        }).eq("id", workerId);

        runLog.push(`\n## ${url}`);
        let content: string;
        try { content = await scrapeWithJina(url); totalListings++; runLog.push(`OK: ${content.length}c`); }
        catch (e) { lastError = e instanceof Error ? e.message : String(e); runLog.push(`FAIL: ${lastError}`); continue; }

        await supabase.from("swarm_workers").update({
          last_heartbeat: new Date().toISOString(), current_tool: "haiku",
          current_action: "extracting",
        }).eq("id", workerId);

        let extraction: ExtractionOutput;
        try { extraction = await extractWithHaiku(anthropic, niche.label, icpMd, content, url); runLog.push(`Items: ${extraction.items.length}`); }
        catch (e) { lastError = e instanceof Error ? e.message : String(e); runLog.push(`EXTRACT FAIL: ${lastError}`); continue; }

        // Custo estimado ~0.001 EUR por Haiku call
        totalCostEur += 0.001;

        if (extraction.items.length === 0) { runLog.push(`No items.`); continue; }

        const toInsert = extraction.items.map(item => ({
          niche_id: nicheId, run_id: runId, workspace_id: niche.workspace_id,
          kind: item.kind, title: item.title, summary: item.summary,
          source_url: item.source_url ?? url, significance: item.significance, processed: false,
        }));

        const { error: insErr } = await supabase.from("swarm_discoveries").insert(toInsert);
        if (insErr) { runLog.push(`INSERT FAIL: ${insErr.message}`); lastError = insErr.message; }
        else { totalDiscoveries += toInsert.length; runLog.push(`Inserted: ${toInsert.length}`); }
      } catch (urlErr) {
        lastError = urlErr instanceof Error ? urlErr.message : String(urlErr);
        runLog.push(`Loop error: ${lastError}`);
      }
    }

    runLog.push(`\n## Summary: listings=${totalListings} disc=${totalDiscoveries} cost=€${totalCostEur.toFixed(4)}`);

    // Actualizar run — usar colunas existentes no schema
    await supabase.from("swarm_runs").update({
      status: totalDiscoveries > 0 ? "done" : "done_empty",
      ended_at: new Date().toISOString(),
      listings_count: totalListings,
      discoveries_count: totalDiscoveries,
      cost_eur: totalCostEur,          // coluna existente: cost_eur numeric
      cost_eur_cents: Math.round(totalCostEur * 100), // nova coluna B2
      error: lastError,                // coluna existente: error text
      error_message: lastError,        // nova coluna B2
      niche_slug: niche.slug,          // nova coluna B2
      log_md: runLog.join("\n"),
    }).eq("id", runId);

    // Libertar niche
    await supabase.from("swarm_niches").update({
      locked_by_worker: null, locked_at: null, last_run_at: new Date().toISOString(),
    }).eq("id", nicheId);

    // Actualizar worker
    const { data: wc } = await supabase.from("swarm_workers")
      .select("cost_today_eur, cost_total_eur, run_count").eq("id", workerId).single();
    await supabase.from("swarm_workers").update({
      status: "idle", current_niche_id: null, current_run_id: null,
      current_tool: null, current_action: null, current_turn: 0,
      current_niche_slug: null,
      last_heartbeat: new Date().toISOString(),
      cost_today_eur: (wc?.cost_today_eur ?? 0) + totalCostEur,
      cost_total_eur: (wc?.cost_total_eur ?? 0) + totalCostEur,
      run_count: (wc?.run_count ?? 0) + 1,
    }).eq("id", workerId);

    return Response.json({ ok: true, data: {
      worker_id: workerId, niche: niche.slug, run_id: runId,
      urls: scrapeUrls, listings: totalListings, discoveries: totalDiscoveries,
      cost_eur: totalCostEur, last_error: lastError,
    }});

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`swarm-worker-jina [${workerId}] fatal:`, msg);
    try {
      await supabase.from("swarm_workers").update({
        status: "idle", current_niche_id: null, current_run_id: null,
        current_tool: null, current_action: null, last_heartbeat: new Date().toISOString(),
      }).eq("id", workerId);
      if (runId !== "unknown")
        await supabase.from("swarm_runs").update({
          status: "failed", ended_at: new Date().toISOString(),
          error: msg, error_message: msg,
        }).eq("id", runId);
    } catch (ce) { console.error("cleanup:", ce); }
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
});
