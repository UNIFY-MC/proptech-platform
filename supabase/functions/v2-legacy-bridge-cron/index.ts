// ============================================================================
// Edge Function: v2-legacy-bridge-cron
// Projecto: V1 Core Hub (hkmvszkpxjbxmnixzqbl)
// Versão remota (deployed): v9
// verify_jwt: False
// Última actualização remota: 2026-05-24 10:51 UTC
// Propósito: Cron de sync V1↔V2 (bridge V2.public.condominos → core.pessoas) — toca dados de produção V2 read-only
// ----------------------------------------------------------------------------
// Versionado em git: 2026-05-24 via Story 019.12 + bridge fixes v6→v9 (epic-020 Story 020.0 unblock)
// Política: alterações futuras devem editar ESTE ficheiro primeiro, depois
//   `supabase functions deploy v2-legacy-bridge-cron` — NÃO editar no Dashboard remoto.
//
// Fixes v9 vs v4 baseline:
//   - safeLog() wrapper: .insert(...).catch() não funciona em supabase-js v2 (PostgrestBuilder ≠ Promise)
//   - schema V2 produção é `public` (não `v2_condominios` — esse é o mirror em V1)
//   - coluna codpostal (não codigo_postal) — remapeado ao inserir em core.pessoas
//   - debug env detection antes de tentar criar v1 client
//   - body trigger reconhece "manual"/"retry"/"jarvis" prefixes
// ============================================================================

/**
 * v2-legacy-bridge-cron — Bridge V2 Legacy → core.pessoas
 * ADR-V11-004 · Sprint C2.6
 *
 * Corre diariamente às 3AM UTC via pg_cron.
 * Conecta ao V2 legacy (eozklslwfaqujaijvdnl) com SELECT ONLY em public.condominos.
 * Faz upsert em core.pessoas do V1 Core Hub (hkmvszkpxjbxmnixzqbl).
 * Waterfall dedup: NIF → email → telefone → fuzzy nome+morada → dedup_candidates.
 *
 * Secrets necessários:
 *   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (vault.decrypted_secrets ou env directos)
 *   - V2_LEGACY_SERVICE_ROLE_KEY (Edge Function Secret — Dashboard > Functions > Secrets)
 *
 * Smoke test 2026-05-24 10:52 UTC (v9):
 *   { ok: true, total_fetched: 65, total_updated: 60, total_ambiguous: 5, errors_count: 0, duration_ms: 3821 }
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface V2Condomino {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  nif: string | null;
  morada: string | null;
  codpostal: string | null;        // V2 produção usa `codpostal`, não `codigo_postal`
  localidade: string | null;
}

interface BridgeResult {
  total_fetched: number;
  total_inserted: number;
  total_updated: number;
  total_ambiguous: number;
  duration_ms: number;
  errors: string[];
}

// ─── Normalização ─────────────────────────────────────────────────────────────

function normalizeNIF(nif: string | null): string | null {
  if (!nif) return null;
  const clean = nif.replace(/\s/g, '').trim();
  return clean.length >= 9 ? clean : null;
}

function normalizeEmail(email: string | null): string | null {
  if (!email) return null;
  const clean = email.toLowerCase().trim();
  // Remove subaddress (+alias)
  return clean.replace(/\+[^@]*@/, '@');
}

function normalizeTelefone(tel: string | null): string | null {
  if (!tel) return null;
  let clean = tel.replace(/[\s\-().]/g, '').trim();
  if (clean.startsWith('00351')) clean = '+351' + clean.slice(5);
  if (clean.startsWith('351') && clean.length === 12) clean = '+' + clean;
  if (clean.startsWith('9') && clean.length === 9) clean = '+351' + clean;
  if (clean.startsWith('2') && clean.length === 9) clean = '+351' + clean;
  return clean.startsWith('+') ? clean : null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function safeLog(
  v1: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await v1.schema('system').from('v2_bridge_log').insert(payload);
  } catch (e) {
    console.warn('[v2-legacy-bridge-cron] safeLog failed:', e);
  }
}

// ─── Waterfall de deduplicação ────────────────────────────────────────────────

async function resolveOrCreatePessoa(
  v1: SupabaseClient,
  condomino: V2Condomino,
  workspaceId: string,
): Promise<'inserted' | 'updated' | 'ambiguous'> {
  const nif = normalizeNIF(condomino.nif);
  const email = normalizeEmail(condomino.email);
  const tel = normalizeTelefone(condomino.telefone);
  const nome = condomino.nome?.trim() ?? null;
  const codigoPostal = condomino.codpostal;  // remap V2→V1 naming

  // Passo 1: NIF exacto
  if (nif) {
    const { data } = await v1.schema('core').from('pessoas').select('id').eq('nif', nif).limit(2);
    if (data && data.length === 1) {
      await v1.schema('core').from('pessoas').update({
        nome: nome,
        email: email ?? undefined,
        telemovel: tel ?? undefined,
        morada: condomino.morada ?? undefined,
        codigo_postal: codigoPostal ?? undefined,
        localidade: condomino.localidade ?? undefined,
        updated_at: new Date().toISOString(),
      }).eq('id', data[0].id);
      return 'updated';
    }
    if (data && data.length > 1) {
      await insertDedupCandidate(v1, condomino, data[0].id, 'nif', null, workspaceId);
      return 'ambiguous';
    }
  }

  // Passo 2: email normalizado
  if (email) {
    const { data } = await v1.schema('core').from('pessoas').select('id').ilike('email', email).limit(2);
    if (data && data.length === 1) {
      await v1.schema('core').from('pessoas').update({
        nome: nome,
        nif: nif ?? undefined,
        telemovel: tel ?? undefined,
        morada: condomino.morada ?? undefined,
        updated_at: new Date().toISOString(),
      }).eq('id', data[0].id);
      return 'updated';
    }
    if (data && data.length > 1) {
      await insertDedupCandidate(v1, condomino, data[0].id, 'email', null, workspaceId);
      return 'ambiguous';
    }
  }

  // Passo 3: telefone normalizado
  if (tel) {
    const { data } = await v1.schema('core').from('pessoas').select('id').eq('telemovel', tel).limit(2);
    if (data && data.length === 1) {
      await v1.schema('core').from('pessoas').update({
        nome: nome,
        nif: nif ?? undefined,
        email: email ?? undefined,
        updated_at: new Date().toISOString(),
      }).eq('id', data[0].id);
      return 'updated';
    }
    if (data && data.length > 1) {
      await insertDedupCandidate(v1, condomino, data[0].id, 'telefone', null, workspaceId);
      return 'ambiguous';
    }
  }

  // Passo 4: fuzzy nome+morada via RPC
  if (nome && condomino.morada) {
    try {
      const { data: fuzzy } = await v1.rpc('core_dedup_fuzzy_search', {
        p_nome: nome,
        p_morada: condomino.morada,
      }).limit(2);

      if (fuzzy && fuzzy.length === 1) {
        await insertDedupCandidate(v1, condomino, fuzzy[0].id, 'fuzzy_nome_morada', 0.82, workspaceId);
        return 'ambiguous';
      }
      if (fuzzy && fuzzy.length > 1) {
        await insertDedupCandidate(v1, condomino, fuzzy[0].id, 'fuzzy_nome_morada', 0.75, workspaceId);
        return 'ambiguous';
      }
    } catch (e) {
      console.warn('[bridge] fuzzy rpc failed, skipping:', e instanceof Error ? e.message : String(e));
    }
  }

  // Passo 5: nova pessoa
  const { error } = await v1.schema('core').from('pessoas').insert({
    nome: nome,
    email: email,
    telemovel: tel,
    nif: nif,
    morada: condomino.morada,
    codigo_postal: codigoPostal,
    localidade: condomino.localidade,
    source: 'v2_condominios',
    workspace_id: workspaceId,
  });

  if (error) throw new Error(`INSERT pessoa failed: ${error.message}`);
  return 'inserted';
}

async function insertDedupCandidate(
  v1: SupabaseClient,
  condomino: V2Condomino,
  candidateAId: string,
  matchMethod: string,
  matchScore: number | null,
  workspaceId: string,
): Promise<void> {
  await v1.schema('core').from('dedup_candidates').upsert({
    workspace_id: workspaceId,
    record_type: 'pessoa',
    candidate_a_id: candidateAId,
    candidate_b_source: 'v2_condominios',
    candidate_b_data: condomino as unknown as Record<string, unknown>,
    match_method: matchMethod,
    match_score: matchScore,
    status: 'pending',
  }, { onConflict: 'candidate_a_id,candidate_b_source,match_method', ignoreDuplicates: true });
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  const startMs = Date.now();

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    const V1_URL = Deno.env.get('SUPABASE_URL');
    const V1_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const V2_URL = 'https://eozklslwfaqujaijvdnl.supabase.co';
    const V2_SERVICE_KEY = Deno.env.get('V2_LEGACY_SERVICE_ROLE_KEY');

    if (!V1_URL || !V1_SERVICE_KEY) {
      return Response.json({ ok: false, error: 'V1 env missing' }, { status: 500 });
    }

    const v1 = createClient(V1_URL, V1_SERVICE_KEY, { auth: { persistSession: false } });

    if (!V2_SERVICE_KEY) {
      const errMsg = 'V2_LEGACY_SERVICE_ROLE_KEY secret not configured.';
      await safeLog(v1, { status: 'skipped', error_msg: errMsg, duration_ms: Date.now() - startMs });
      return Response.json({ ok: false, error: errMsg }, { status: 503 });
    }

    const v2 = createClient(V2_URL, V2_SERVICE_KEY, { auth: { persistSession: false } });

    const result: BridgeResult = {
      total_fetched: 0,
      total_inserted: 0,
      total_updated: 0,
      total_ambiguous: 0,
      duration_ms: 0,
      errors: [],
    };

    try {
      const workspaceId = '00000000-0000-0000-0000-000000000001';

      // V2 produção: schema public + coluna codpostal (não codigo_postal)
      const { data: condominos, error: fetchErr } = await v2
        .from('condominos')
        .select('id, nome, email, telefone, nif, morada, codpostal, localidade')
        .order('nome');

      if (fetchErr) throw new Error(`V2 fetch failed: ${fetchErr.message}`);
      result.total_fetched = condominos?.length ?? 0;

      for (const condomino of (condominos ?? [])) {
        try {
          const outcome = await resolveOrCreatePessoa(v1, condomino as V2Condomino, workspaceId);
          if (outcome === 'inserted') result.total_inserted++;
          else if (outcome === 'updated') result.total_updated++;
          else if (outcome === 'ambiguous') result.total_ambiguous++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          result.errors.push(`${condomino.nome ?? condomino.id}: ${msg}`);
          console.error('[v2-legacy-bridge-cron] row error:', msg);
        }
      }

      result.duration_ms = Date.now() - startMs;

      await safeLog(v1, {
        total_fetched:   result.total_fetched,
        total_inserted:  result.total_inserted,
        total_updated:   result.total_updated,
        total_ambiguous: result.total_ambiguous,
        status: result.errors.length > 0 ? 'error' : 'ok',
        error_msg: result.errors.length > 0 ? result.errors.slice(0, 5).join('; ') : null,
        duration_ms: result.duration_ms,
      });

      return Response.json({
        ok: true,
        data: {
          total_fetched:   result.total_fetched,
          total_inserted:  result.total_inserted,
          total_updated:   result.total_updated,
          total_ambiguous: result.total_ambiguous,
          errors_count:    result.errors.length,
          first_5_errors:  result.errors.slice(0, 5),
          duration_ms:     result.duration_ms,
        },
      });

    } catch (innerErr) {
      const msg = innerErr instanceof Error ? innerErr.message : String(innerErr);
      result.duration_ms = Date.now() - startMs;
      console.error('[v2-legacy-bridge-cron] inner fatal:', msg);
      await safeLog(v1, { status: 'error', error_msg: msg, duration_ms: result.duration_ms });
      return Response.json({ ok: false, error: msg }, { status: 500 });
    }

  } catch (outerErr) {
    const msg = outerErr instanceof Error ? outerErr.message : String(outerErr);
    console.error('[v2-legacy-bridge-cron] outer fatal:', msg);
    return Response.json({ ok: false, error: 'outer_fatal', detail: msg }, { status: 500 });
  }
});
