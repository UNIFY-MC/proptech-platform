/* v2-recibo-pdf v1 — gera PDF nativo de um recibo V2
 *
 * POST { recebimento_id }
 * Devolve { ok, pdf_b64, filename, size_bytes }
 *
 * Usa pdf-lib (zero-dep server-side) para gerar PDF A4 com:
 * - header "PROPERTY007 — Recibo de Condomínio"
 * - secções Condómino, Fracção, Detalhe
 * - box destacada com valor pago
 * - footer com info da empresa
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

function fmtEUR(n: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n)
}
function fmtDate(iso?: string): string {
  if (!iso) return "-"
  return new Date(iso).toLocaleDateString("pt-PT")
}

async function generatePdf(rec: any, fracao: any, pessoa: any, condomino: any): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842]) // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  let y = 800
  const line = (text: string, size = 11, bold = false, color = rgb(0, 0, 0)) => {
    page.drawText(text, { x: 50, y, size, font: bold ? fontBold : font, color })
    y -= size + 6
  }

  line("PROPERTY007 — Recibo de Condomínio", 16, true, rgb(0.10, 0.32, 0.59))
  y -= 6
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) })
  y -= 16

  line(`Referência: ${rec.referencia_mb || rec.id?.slice(0, 8) || "—"}`, 10, false, rgb(0.4, 0.4, 0.4))
  line(`Data de emissão: ${fmtDate(rec.data_pagamento || rec.periodo)}`, 10, false, rgb(0.4, 0.4, 0.4))
  y -= 10

  line("Condómino", 11, true)
  line(pessoa?.nome || "—")
  if (pessoa?.nif) line(`NIF: ${pessoa.nif}`)
  if (pessoa?.morada) line(pessoa.morada)
  y -= 10

  line("Fracção", 11, true)
  line(`${fracao?.codigo || "—"} · Permilagem ${fracao?.permilagem || "—"}‰`)
  if (fracao?.descricao) line(fracao.descricao)
  y -= 10

  line("Detalhe", 11, true)
  line(`Período: ${rec.periodo}`)
  line(`Estado: ${rec.estado}`)
  if (rec.data_pagamento) line(`Pago em: ${fmtDate(rec.data_pagamento)}`)
  y -= 6

  page.drawRectangle({ x: 50, y: y - 38, width: 495, height: 38, color: rgb(0.96, 0.97, 0.98), borderColor: rgb(0.85, 0.88, 0.92), borderWidth: 0.5 })
  page.drawText("Valor pago", { x: 64, y: y - 16, size: 11, font, color: rgb(0.35, 0.35, 0.40) })
  page.drawText(fmtEUR(Number(rec.valor_pago || 0)), { x: 64, y: y - 30, size: 14, font: fontBold, color: rgb(0.10, 0.32, 0.59) })
  y -= 60

  line("", 8)
  line("Este documento serve como recibo do pagamento de quota de condomínio.", 9, false, rgb(0.5, 0.5, 0.5))
  line("Property 007, Lda. · Lisboa, Portugal", 9, false, rgb(0.5, 0.5, 0.5))
  line("Documento gerado automaticamente pelo sistema de gestão.", 9, false, rgb(0.5, 0.5, 0.5))

  return await pdf.save()
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors })

  try {
    const { recebimento_id } = await req.json()
    if (!recebimento_id) return new Response(JSON.stringify({ error: "recebimento_id obrigatório" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } })

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: rec, error } = await sb.schema("v2_condominios").from("recebimentos").select("*").eq("id", recebimento_id).maybeSingle()
    if (error || !rec) return new Response(JSON.stringify({ error: "recebimento_not_found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } })

    const { data: fracao } = await sb.schema("v2_condominios").from("fracoes").select("*").eq("id", rec.fracao_id).maybeSingle()
    const { data: cond } = await sb.schema("v2_condominios").from("condominos").select("*").eq("id", rec.condomino_id).maybeSingle()
    const { data: pessoa } = cond?.pessoa_id
      ? await sb.schema("core").from("pessoas").select("nome, nif, morada").eq("id", cond.pessoa_id).maybeSingle()
      : { data: null }

    const pdfBytes = await generatePdf(rec, fracao, pessoa, cond)
    const b64 = btoa(String.fromCharCode(...pdfBytes))
    const filename = `recibo-${fracao?.codigo || "fracao"}-${rec.periodo}.pdf`

    return new Response(JSON.stringify({ ok: true, pdf_b64: b64, filename, size_bytes: pdfBytes.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } })
  }
})
