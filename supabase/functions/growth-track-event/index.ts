/* growth-track-event v1 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405, headers: cors })
  }

  try {
    const body = await req.json()
    const vertical = body.vertical
    const tipo = body.tipo
    if (!vertical || !tipo) {
      return new Response(JSON.stringify({ error: "vertical e tipo obrigatorios" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)
    const ip = req.headers.get("x-forwarded-for") || null
    const ua = req.headers.get("user-agent") || null

    let leadId = body.lead_id || null
    let pessoaId = body.pessoa_id || null
    const email = body.email ? String(body.email).toLowerCase() : null

    if (!leadId && email) {
      const r = await sb.schema("growth").from("leads").select("id, pessoa_id").eq("email", email).limit(1).maybeSingle()
      if (r.data) { leadId = r.data.id; pessoaId = r.data.pessoa_id }
    }

    if (!leadId && email) {
      let adCampaignId = null
      if (body.utm_campaign) {
        const c = await sb.schema("growth").from("ad_campaigns").select("id").eq("nome", body.utm_campaign).limit(1).maybeSingle()
        adCampaignId = c.data ? c.data.id : null
      }
      const ins = await sb.schema("growth").rpc("criar_lead", {
        p_vertical: vertical,
        p_nome: body.nome || null,
        p_email: email,
        p_telefone: body.telefone || null,
        p_utm_source: body.utm_source || null,
        p_utm_medium: body.utm_medium || null,
        p_utm_campaign: body.utm_campaign || null,
        p_utm_content: body.utm_content || null,
        p_ad_source: body.utm_source || null,
        p_ad_campaign_id: adCampaignId,
        p_landing_page: body.landing_page || null,
        p_dados_extra: { ip, ua, referrer: body.referrer_url || null, ...body.dados },
      })
      if (ins.error) {
        return new Response(JSON.stringify({ error: "criar_lead: " + ins.error.message }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        })
      }
      leadId = ins.data
    }

    const i = await sb.schema("growth").from("interacoes").insert({
      lead_id: leadId,
      pessoa_id: pessoaId,
      vertical: vertical,
      tipo: tipo,
      canal: "web",
      url: body.url || body.landing_page || null,
      detalhe: body.detalhe || null,
      metadata: {
        utm_source: body.utm_source, utm_medium: body.utm_medium, utm_campaign: body.utm_campaign,
        utm_term: body.utm_term, utm_content: body.utm_content,
        referrer: body.referrer_url, ip: ip, ua: ua, dados: body.dados,
      },
    }).select("id").single()

    if (i.error) {
      return new Response(JSON.stringify({ error: "interacao: " + i.error.message }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({
      ok: true, lead_id: leadId, pessoa_id: pessoaId, interacao_id: i.data.id,
    }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
