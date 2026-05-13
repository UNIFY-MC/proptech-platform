// meta-leads-webhook — recebe Lead Ads do Meta (Facebook + Instagram) e
// cria rows em growth.leads automaticamente.
//
// Configuração no Meta:
//   1. Meta for Developers > App > Webhooks > Page subscription
//   2. Callback URL: https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/meta-leads-webhook
//   3. Verify Token: definir em secret META_VERIFY_TOKEN (qualquer string)
//   4. Subscribe to: leadgen
//
// Meta envia GET com hub.challenge para verificar.
// Depois envia POST com { entry: [{ changes: [{ value: { leadgen_id, ad_id, ... } }] }] }
// Para puxar dados completos do lead: GET https://graph.facebook.com/v18.0/{leadgen_id}?access_token={META_ACCESS_TOKEN}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const META_VERIFY     = Deno.env.get('META_VERIFY_TOKEN') ?? '';
const META_ACCESS     = Deno.env.get('META_ACCESS_TOKEN') ?? '';
const GRAPH_API       = 'https://graph.facebook.com/v18.0';

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization,x-client-info,apikey,content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const url = new URL(req.url);

  // ── 1. Webhook verification (GET) — Meta envia ?hub.mode=subscribe&hub.challenge=X&hub.verify_token=X
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === META_VERIFY && challenge) {
      return new Response(challenge, { status: 200, headers: cors });
    }
    return new Response('verify_failed', { status: 403, headers: cors });
  }

  // ── 2. Lead notification (POST)
  if (req.method !== 'POST') {
    return new Response('method_not_allowed', { status: 405, headers: cors });
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY).schema('growth');
    const body = await req.json();

    // Meta payload: { object: 'page', entry: [{ id, time, changes: [{ field: 'leadgen', value: { leadgen_id, ad_id, page_id, form_id, created_time } }] }] }
    const inserted: Array<{ leadgen_id: string; lead_id?: string; error?: string }> = [];

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen') continue;
        const v = change.value || {};
        const leadgen_id = v.leadgen_id;
        const ad_id      = v.ad_id;
        const form_id    = v.form_id;
        const created_at = v.created_time ? new Date(v.created_time * 1000) : new Date();

        if (!leadgen_id) {
          inserted.push({ leadgen_id: '?', error: 'missing_leadgen_id' });
          continue;
        }

        // Buscar campos completos do lead via Graph API
        let leadFields: Record<string, string> = {};
        let leadName: string | null = null;
        let leadEmail: string | null = null;
        let leadPhone: string | null = null;
        if (META_ACCESS) {
          try {
            const r = await fetch(`${GRAPH_API}/${leadgen_id}?access_token=${META_ACCESS}`);
            const d = await r.json();
            if (d.field_data) {
              for (const f of d.field_data) {
                leadFields[f.name] = Array.isArray(f.values) ? f.values[0] : f.values;
              }
              leadName  = leadFields.full_name || leadFields.name || null;
              leadEmail = leadFields.email || null;
              leadPhone = leadFields.phone_number || leadFields.phone || null;
            }
          } catch (e) {
            console.error('[meta-webhook] graph api fetch failed:', e);
          }
        }

        // Resolver ad_campaign_id local pelo external_id (ad_id do Meta)
        let ad_campaign_id: string | null = null;
        if (ad_id) {
          const { data: camp } = await createClient(SUPABASE_URL, SERVICE_KEY)
            .schema('growth')
            .from('ad_campaigns')
            .select('id')
            .eq('external_id', ad_id)
            .limit(1)
            .maybeSingle();
          ad_campaign_id = camp?.id ?? null;
        }

        // Inserir lead via RPC (auto-link a core.pessoas se email existe)
        const { data: leadId, error } = await createClient(SUPABASE_URL, SERVICE_KEY)
          .schema('growth')
          .rpc('criar_lead', {
            p_vertical:      'v4', // default — pode-se inferir de ad_campaigns.vertical_alvo
            p_nome:          leadName,
            p_email:         leadEmail,
            p_telefone:      leadPhone,
            p_utm_source:    'meta',
            p_utm_medium:    'paid_social',
            p_utm_campaign:  form_id ? `form_${form_id}` : null,
            p_utm_content:   leadgen_id,
            p_ad_source:     'meta',
            p_ad_campaign_id: ad_campaign_id,
            p_landing_page:  null,
            p_dados_extra:   { leadgen_id, ad_id, form_id, fields: leadFields, raw_created: v.created_time },
          });

        if (error) {
          inserted.push({ leadgen_id, error: error.message });
        } else {
          inserted.push({ leadgen_id, lead_id: leadId });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: inserted.length, inserted }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[meta-webhook]', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
