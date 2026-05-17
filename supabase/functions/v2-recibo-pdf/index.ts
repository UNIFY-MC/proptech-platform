/* v2-recibo-pdf v2 — PDF estilo Prata Owners (em nome do CONDOMÍNIO)
 *
 * Header com nome do condomínio (não Property007).
 * Layout: Bloco condomínio + bloco condómino + valor recebido + tabela.
 * Vai buscar logo/cores/morada à v2_condominios.condominio.
 *
 * POST { recebimento_id } ou { recebimento_ids: [...] }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

const LABEL_GRAY = rgb(0.45, 0.45, 0.48)
const BORDER     = rgb(0.86, 0.88, 0.91)
const HIGHLIGHT  = rgb(0.96, 0.97, 0.98)
const TEXT       = rgb(0.10, 0.10, 0.12)
const BRAND      = rgb(0.16, 0.20, 0.34)

function fmtEUR(n: number): string { return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n) }
function fmtDate(iso?: string): string { if (!iso) return "-"; return new Date(iso).toLocaleDateString("pt-PT") }
function fmtPeriodo(iso?: string): string {
  if (!iso) return "-"
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
  const d = new Date(iso); return `${meses[d.getMonth()]}/${d.getFullYear()}`
}

async function generatePdf(recs: any[], fracoesMap: Map<string, any>, pessoa: any, condominio: any): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  let y = 805
  const left = 45
  const right = 550
  const W = right - left

  const nomeCurto = condominio?.nome || "Condomínio"
  page.drawText(nomeCurto.toUpperCase(), { x: left, y, size: 18, font: fontBold, color: BRAND })
  page.drawText("OWNERS", { x: left, y: y - 14, size: 9, font, color: LABEL_GRAY })
  page.drawText("Comprovativo de Pagamento", { x: right - 200, y, size: 14, font: fontBold, color: TEXT })
  y -= 26
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: BORDER })
  y -= 18

  const colW = (W - 14) / 2
  const blockTop = y
  const drawBlock = (x: number, title: string, lines: { label: string, value: string, bold?: boolean }[]) => {
    let by = blockTop
    page.drawRectangle({ x, y: by - 95, width: colW, height: 110, borderColor: BORDER, borderWidth: 0.5 })
    page.drawText(title, { x: x + 10, y: by - 4, size: 10, font: fontBold, color: TEXT })
    by -= 18
    for (const ln of lines) {
      page.drawText(ln.label, { x: x + 10, y: by, size: 8, font, color: LABEL_GRAY })
      page.drawText(ln.value, { x: x + 70, y: by, size: 9, font: ln.bold ? fontBold : font, color: TEXT })
      by -= 12
    }
  }

  const condFracoes = Array.from(fracoesMap.values()).map((f: any) => `${f.codigo}${f.descricao ? " - " + f.descricao.slice(0,3) : ""}`).join(", ")

  drawBlock(left, "Condomínio", [
    { label: "", value: condominio?.nome_completo || condominio?.nome || "-", bold: true },
    { label: "NIPC:", value: condominio?.nif || "-" },
    { label: "Morada:", value: (condominio?.morada || "").slice(0, 36) },
    { label: "", value: (`${condominio?.codpostal || ""} ${condominio?.localidade || ""}`).trim() },
  ])

  const refLabel = recs.length > 0 ? recs[0].referencia_mb || recs[0].id?.slice(0, 8) : "-"
  drawBlock(left + colW + 14, "Condómino", [
    { label: "Nome:", value: pessoa?.nome || "-", bold: true },
    { label: "NIF:", value: pessoa?.nif || "-" },
    { label: "Morada:", value: (pessoa?.morada || "-").slice(0, 36) },
    { label: "Fracções:", value: condFracoes.slice(0, 40) },
  ])

  y = blockTop - 110

  const totalPago = recs.reduce((s, r) => s + Number(r.valor_pago || 0), 0)
  page.drawRectangle({ x: left, y: y - 50, width: W, height: 50, color: HIGHLIGHT, borderColor: BORDER, borderWidth: 0.5 })
  page.drawText("Valor recebido", { x: left + 14, y: y - 18, size: 10, font, color: LABEL_GRAY })
  page.drawText(fmtEUR(totalPago), { x: left + 14, y: y - 36, size: 22, font: fontBold, color: TEXT })

  const firstPagamento = recs.find(r => r.data_pagamento) || recs[0]
  page.drawText("Data de pagamento", { x: left + 220, y: y - 18, size: 8, font, color: LABEL_GRAY })
  page.drawText(fmtDate(firstPagamento?.data_pagamento), { x: left + 220, y: y - 32, size: 10, font, color: TEXT })
  page.drawText("Referência bancária", { x: left + 380, y: y - 18, size: 8, font, color: LABEL_GRAY })
  page.drawText(refLabel, { x: left + 380, y: y - 32, size: 10, font, color: TEXT })
  y -= 64

  page.drawText("Quota", { x: left, y, size: 12, font: fontBold, color: rgb(0.18, 0.45, 0.30) })
  y -= 14
  page.drawRectangle({ x: left, y: y - 14, width: W, height: 16, color: rgb(0.97,0.98,0.99) })
  page.drawText("Nº Documento", { x: left + 6, y: y - 9, size: 7.5, font: fontBold, color: LABEL_GRAY })
  page.drawText("Emissão",       { x: left + 100, y: y - 9, size: 7.5, font: fontBold, color: LABEL_GRAY })
  page.drawText("Vencimento",    { x: left + 175, y: y - 9, size: 7.5, font: fontBold, color: LABEL_GRAY })
  page.drawText("Valor doc.",    { x: left + 260, y: y - 9, size: 7.5, font: fontBold, color: LABEL_GRAY })
  page.drawText("Valor pago",    { x: left + 340, y: y - 9, size: 7.5, font: fontBold, color: LABEL_GRAY })
  page.drawText("Observações",   { x: left + 415, y: y - 9, size: 7.5, font: fontBold, color: LABEL_GRAY })
  y -= 22

  for (const r of recs) {
    if (y < 90) break
    page.drawText(`2026.${String(r.id || "").slice(0,4) || "-"}`, { x: left + 6, y, size: 8, font, color: TEXT })
    page.drawText(fmtDate(r.periodo),                  { x: left + 100, y, size: 8, font, color: TEXT })
    page.drawText(fmtDate(r.data_pagamento),           { x: left + 175, y, size: 8, font, color: TEXT })
    page.drawText(fmtEUR(Number(r.valor_emitido || 0)),{ x: left + 260, y, size: 8, font, color: TEXT })
    page.drawText(fmtEUR(Number(r.valor_pago || 0)),   { x: left + 340, y, size: 8, font, color: TEXT })
    const fracCod = fracoesMap.get(r.fracao_id)?.codigo || ""
    page.drawText(`Quota ${fmtPeriodo(r.periodo)} — ${fracCod}`, { x: left + 415, y, size: 8, font, color: TEXT })
    y -= 14
  }
  y -= 6

  page.drawRectangle({ x: left, y: y - 32, width: W, height: 32, color: rgb(1, 0.98, 0.92), borderColor: rgb(0.95, 0.87, 0.65), borderWidth: 0.3 })
  page.drawText("Nota: Este pagamento foi lançado na conta corrente do condómino, referente às fracções indicadas.", { x: left + 10, y: y - 12, size: 8, font, color: LABEL_GRAY })
  page.drawText("O saldo actualizado está disponível no Portal do Condómino.", { x: left + 10, y: y - 23, size: 8, font, color: LABEL_GRAY })

  y = 40
  page.drawText(condominio?.nome || "", { x: left, y, size: 7, font, color: LABEL_GRAY })
  page.drawText(condominio?.email || "", { x: left + 200, y, size: 7, font, color: LABEL_GRAY })
  page.drawText("Comprovativo gerado automaticamente.", { x: right - 160, y, size: 7, font, color: LABEL_GRAY })

  return await pdf.save()
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors })

  try {
    const { recebimento_id, recebimento_ids } = await req.json()
    const ids: string[] = recebimento_ids || (recebimento_id ? [recebimento_id] : [])
    if (ids.length === 0) return new Response(JSON.stringify({ error: "recebimento_id(s) obrigatório(s)" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } })

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: recs, error } = await sb.schema("v2_condominios").from("recebimentos").select("*").in("id", ids).order("periodo")
    if (error || !recs || recs.length === 0) return new Response(JSON.stringify({ error: "recebimento_not_found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } })

    const fracaoIds = Array.from(new Set(recs.map((r: any) => r.fracao_id).filter(Boolean)))
    const condIds   = Array.from(new Set(recs.map((r: any) => r.condomino_id).filter(Boolean)))

    const { data: fracoes } = await sb.schema("v2_condominios").from("fracoes").select("id, codigo, descricao, condominio_id").in("id", fracaoIds)
    const fracoesMap = new Map((fracoes || []).map((f: any) => [f.id, f]))

    const { data: condRows } = await sb.schema("v2_condominios").from("condominos").select("id, pessoa_id").in("id", condIds)
    const pessoaId = condRows?.[0]?.pessoa_id
    const { data: pessoa } = pessoaId
      ? await sb.schema("core").from("pessoas").select("nome, nif, morada").eq("id", pessoaId).maybeSingle()
      : { data: null }

    const condId = (fracoes || []).find((f: any) => f.condominio_id)?.condominio_id
    const { data: condominio } = condId
      ? await sb.schema("v2_condominios").from("condominio").select("id, codigo, nome, nome_completo, nif, morada, codpostal, localidade, email, email_logo_url").eq("id", condId).maybeSingle()
      : { data: null }

    const pdfBytes = await generatePdf(recs, fracoesMap, pessoa, condominio)
    const b64 = btoa(String.fromCharCode(...pdfBytes))
    const filename = recs.length === 1
      ? `recibo-${fracaoIds.length > 0 ? (fracoesMap.get(fracaoIds[0])?.codigo || "fracao") : "fracao"}-${recs[0].periodo}.pdf`
      : `comprovativo-${pessoa?.nome?.split(" ")[0] || "condomino"}-${recs[0].periodo?.slice(0, 7) || "data"}.pdf`

    return new Response(JSON.stringify({ ok: true, pdf_b64: b64, filename, size_bytes: pdfBytes.length, recebimentos: recs.length, condominio: condominio?.nome }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } })
  }
})
