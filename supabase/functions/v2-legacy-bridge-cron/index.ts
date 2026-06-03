// ============================================================================
// Edge Function: v2-legacy-bridge-cron
// Projecto: V1 Core Hub (hkmvszkpxjbxmnixzqbl)
// Versão remota (deployed): v10
// verify_jwt: False
// Última actualização remota: 2026-05-24 11:06 UTC
// Propósito: Bridge V2 produção → V1 espelho — 6 domínios (condominos, utilizadores_portal,
//            extrato_bancario, pagamentos, orcamento_por_fracao, configuracoes)
// ----------------------------------------------------------------------------
// Política: alterações futuras devem editar ESTE ficheiro primeiro, depois
//   `supabase functions deploy v2-legacy-bridge-cron`. NÃO editar Dashboard remoto.
//
// Smoke test v10 (2026-05-24 11:06): 2028 rows fetched, 2028 upserted, 0 errors, 5.3s
//   - condominos:           65 fetched, 65 upserted (waterfall dedup → core.pessoas)
//   - utilizadores_portal:  64 (NEW)
//   - extrato_bancario:   1000 (limit, V2 tem 1056)
//   - pagamentos:          593 (NEW tabela limpa, não mistura com recebimentos poluída)
//   - orcamento_por_fracao: 294
//   - configuracoes:        12
//
// Fixes v9→v10:
//   - Extended de 1 domínio (só condominos) para 6 domínios
//   - safeLog() wrapper para evitar .insert().catch() bug (PostgrestBuilder ≠ Promise)
//   - V2 produção usa schema `public` (não `v2_condominios`)
//   - V2 condominos.codpostal (sem _) remapeado para V1 codigo_postal
// ============================================================================

/**
 * v2-legacy-bridge-cron — v10
 *
 * Replicação ALARGADA V2 produção (eozklslwfaqujaijvdnl) → V1 Core Hub
 * (hkmvszkpxjbxmnixzqbl) cobrindo 6 domínios críticos para emissão de avisos
 * de mora e cálculo de prestação de contas em V1 React (apps/v2-condominios).
 *
 * Princípio canónico (memory project-v2-migration-canonical):
 *   - replicar TUDO V2 → V1 (sem importações ad-hoc paralelas)
 *   - extrato_bancario é source-of-truth
 *   - V2 produção INTOCAVEL (só SELECT)
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface V2Condomino {
  id: string; nome: string | null; email: string | null; telefone: string | null;
  nif: string | null; morada: string | null; codpostal: string | null; localidade: string | null;
}

interface DomainResult {
  domain: string;
  fetched: number;
  upserted: number;
  errors: string[];
  duration_ms: number;
}

function normalizeNIF(nif: string | null): string | null {
  if (!nif) return null;
  const clean = nif.replace(/\s/g, '').trim();
  return clean.length >= 9 ? clean : null;
}
function normalizeEmail(email: string | null): string | null {
  if (!email) return null;
  return email.toLowerCase().trim().replace(/\+[^@]*@/, '@');
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

async function safeLog(v1: SupabaseClient, payload: Record<string, unknown>): Promise<void> {
  try {
    await v1.schema('system').from('v2_bridge_log').insert(payload);
  } catch (e) { console.warn('safeLog failed:', e); }
}

// ============================================================================
// DOMAIN 1: condominos → core.pessoas (waterfall dedup) — mantido de v9
// ============================================================================
async function syncCondominos(v1: SupabaseClient, v2: SupabaseClient, workspaceId: string): Promise<DomainResult> {
  const start = Date.now();
  const r: DomainResult = { domain: 'condominos', fetched: 0, upserted: 0, errors: [], duration_ms: 0 };

  const { data: rows, error } = await v2.from('condominos')
    .select('id, nome, email, telefone, nif, morada, codpostal, localidade').order('nome');

  if (error) { r.errors.push(`fetch: ${error.message}`); r.duration_ms = Date.now()-start; return r; }
  r.fetched = rows?.length ?? 0;

  for (const c of (rows ?? []) as V2Condomino[]) {
    try {
      const outcome = await resolveOrCreatePessoa(v1, c, workspaceId);
      if (outcome !== 'noop') r.upserted++;
    } catch (e) {
      r.errors.push(`${c.nome ?? c.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  r.duration_ms = Date.now() - start;
  return r;
}

async function resolveOrCreatePessoa(v1: SupabaseClient, c: V2Condomino, workspaceId: string):
  Promise<'inserted' | 'updated' | 'ambiguous' | 'noop'> {
  const nif = normalizeNIF(c.nif);
  const email = normalizeEmail(c.email);
  const tel = normalizeTelefone(c.telefone);
  const nome = c.nome?.trim() ?? null;
  const codigoPostal = c.codpostal;

  if (nif) {
    const { data } = await v1.schema('core').from('pessoas').select('id').eq('nif', nif).limit(2);
    if (data && data.length === 1) {
      await v1.schema('core').from('pessoas').update({
        nome, email: email ?? undefined, telemovel: tel ?? undefined,
        morada: c.morada ?? undefined, codigo_postal: codigoPostal ?? undefined,
        localidade: c.localidade ?? undefined, updated_at: new Date().toISOString(),
      }).eq('id', data[0].id);
      return 'updated';
    }
    if (data && data.length > 1) {
      await insertDedupCandidate(v1, c, data[0].id, 'nif', null, workspaceId);
      return 'ambiguous';
    }
  }
  if (email) {
    const { data } = await v1.schema('core').from('pessoas').select('id').ilike('email', email).limit(2);
    if (data && data.length === 1) {
      await v1.schema('core').from('pessoas').update({
        nome, nif: nif ?? undefined, telemovel: tel ?? undefined,
        morada: c.morada ?? undefined, updated_at: new Date().toISOString(),
      }).eq('id', data[0].id);
      return 'updated';
    }
    if (data && data.length > 1) {
      await insertDedupCandidate(v1, c, data[0].id, 'email', null, workspaceId);
      return 'ambiguous';
    }
  }
  if (tel) {
    const { data } = await v1.schema('core').from('pessoas').select('id').eq('telemovel', tel).limit(2);
    if (data && data.length === 1) {
      await v1.schema('core').from('pessoas').update({
        nome, nif: nif ?? undefined, email: email ?? undefined, updated_at: new Date().toISOString(),
      }).eq('id', data[0].id);
      return 'updated';
    }
    if (data && data.length > 1) {
      await insertDedupCandidate(v1, c, data[0].id, 'telefone', null, workspaceId);
      return 'ambiguous';
    }
  }
  if (nome && c.morada) {
    try {
      const { data: fuzzy } = await v1.rpc('core_dedup_fuzzy_search', { p_nome: nome, p_morada: c.morada }).limit(2);
      if (fuzzy && fuzzy.length >= 1) {
        await insertDedupCandidate(v1, c, fuzzy[0].id, 'fuzzy_nome_morada', fuzzy.length === 1 ? 0.82 : 0.75, workspaceId);
        return 'ambiguous';
      }
    } catch (e) { console.warn('fuzzy rpc skip:', e instanceof Error ? e.message : e); }
  }

  const { error } = await v1.schema('core').from('pessoas').insert({
    nome, email, telemovel: tel, nif, morada: c.morada,
    codigo_postal: codigoPostal, localidade: c.localidade,
    source: 'v2_condominios', workspace_id: workspaceId,
  });
  if (error) throw new Error(`INSERT pessoa: ${error.message}`);
  return 'inserted';
}

async function insertDedupCandidate(v1: SupabaseClient, c: V2Condomino, candidateAId: string,
  matchMethod: string, matchScore: number | null, workspaceId: string): Promise<void> {
  await v1.schema('core').from('dedup_candidates').upsert({
    workspace_id: workspaceId, record_type: 'pessoa', candidate_a_id: candidateAId,
    candidate_b_source: 'v2_condominios', candidate_b_data: c as unknown as Record<string, unknown>,
    match_method: matchMethod, match_score: matchScore, status: 'pending',
  }, { onConflict: 'candidate_a_id,candidate_b_source,match_method', ignoreDuplicates: true });
}

// ============================================================================
// DOMAIN 2: utilizadores_portal → v2_condominios.utilizadores_portal (UPSERT by id)
// ============================================================================
async function syncUtilizadoresPortal(v1: SupabaseClient, v2: SupabaseClient): Promise<DomainResult> {
  const start = Date.now();
  const r: DomainResult = { domain: 'utilizadores_portal', fetched: 0, upserted: 0, errors: [], duration_ms: 0 };

  const { data: rows, error } = await v2.from('utilizadores_portal')
    .select('id, email, nome, role, ativo, permissoes, criado_por, criado_em, ultimo_login, fracao, updated_at, password_hash, username');

  if (error) { r.errors.push(`fetch: ${error.message}`); r.duration_ms = Date.now()-start; return r; }
  r.fetched = rows?.length ?? 0;
  if (!rows || rows.length === 0) { r.duration_ms = Date.now()-start; return r; }

  const enriched = rows.map(u => ({ ...u, imported_at: new Date().toISOString(), source: 'v2_legacy_bridge' }));
  const { error: upErr, count } = await v1.schema('v2_condominios').from('utilizadores_portal')
    .upsert(enriched, { onConflict: 'id', count: 'exact' });

  if (upErr) r.errors.push(`upsert: ${upErr.message}`);
  else r.upserted = count ?? enriched.length;
  r.duration_ms = Date.now() - start;
  return r;
}

// ============================================================================
// DOMAIN 3: extrato_bancario → v2_condominios.extrato_bancario (UPSERT by id)
// ============================================================================
async function syncExtratoBancario(v1: SupabaseClient, v2: SupabaseClient): Promise<DomainResult> {
  const start = Date.now();
  const r: DomainResult = { domain: 'extrato_bancario', fetched: 0, upserted: 0, errors: [], duration_ms: 0 };

  const { data: rows, error } = await v2.from('extrato_bancario')
    .select('id, numero_doc, ano, mes, data, descricao, codigo, forn, debito, credito, saldo, criado_em, drive_file_id, drive_url, sem_fatura, sem_fatura_nota, alocacao, is_devolucao')
    .order('data', { ascending: false, nullsFirst: false })
    .limit(2000);

  if (error) { r.errors.push(`fetch: ${error.message}`); r.duration_ms = Date.now()-start; return r; }
  r.fetched = rows?.length ?? 0;
  if (!rows || rows.length === 0) { r.duration_ms = Date.now()-start; return r; }

  // Map V2 schema → V1 schema (V1 tem cols extras edificio_id, fracao_id, recebimento_id, reconciliado
  // que ficam NULL no bridge — podem ser preenchidas por lógica derivada depois)
  const enriched = rows.map(e => ({
    id: e.id,
    numero_doc: e.numero_doc,
    ano: e.ano,
    mes: e.mes,
    data_movimento: e.data,                    // V1 col name (data → data_movimento)
    descricao: e.descricao,
    codigo: e.codigo,
    forn: e.forn,
    debito: e.debito,
    credito: e.credito,
    saldo_apos: e.saldo,                       // V1 col name (saldo → saldo_apos)
    valor: (e.credito ?? 0) - (e.debito ?? 0), // V1 col valor = credito - debito
    drive_file_id: e.drive_file_id,
    drive_url: e.drive_url,
    sem_fatura: e.sem_fatura,
    sem_fatura_nota: e.sem_fatura_nota,
    alocacao: e.alocacao,
    is_devolucao: e.is_devolucao,
    source: 'v2_legacy_bridge',
    imported_at: new Date().toISOString(),
  }));

  const { error: upErr, count } = await v1.schema('v2_condominios').from('extrato_bancario')
    .upsert(enriched, { onConflict: 'id', count: 'exact' });

  if (upErr) r.errors.push(`upsert: ${upErr.message}`);
  else r.upserted = count ?? enriched.length;
  r.duration_ms = Date.now() - start;
  return r;
}

// ============================================================================
// DOMAIN 4: V2.recebimentos → V1.v2_condominios.pagamentos (UPSERT by id)
//   NOTA: NUNCA escrever em v2_condominios.recebimentos (está poluida com
//   1254 rows mixed-semantic dos imports ad-hoc de 2026-05-16)
// ============================================================================
async function syncPagamentos(v1: SupabaseClient, v2: SupabaseClient): Promise<DomainResult> {
  const start = Date.now();
  const r: DomainResult = { domain: 'pagamentos', fetched: 0, upserted: 0, errors: [], duration_ms: 0 };

  const { data: rows, error } = await v2.from('recebimentos')
    .select('id, fracao_id, fracao_codigo, condomino_id, nome_condomino, valor, data_pagamento, metodo, referencia_banco, descricao_banco, periodo, aviso_id, recibo_id, recibo_gerado, recibo_enviado, notas, criado_em, atualizado_em, grupo_ref, condomino_ref')
    .order('data_pagamento', { ascending: false, nullsFirst: false });

  if (error) { r.errors.push(`fetch: ${error.message}`); r.duration_ms = Date.now()-start; return r; }
  r.fetched = rows?.length ?? 0;
  if (!rows || rows.length === 0) { r.duration_ms = Date.now()-start; return r; }

  const enriched = rows.map(p => ({
    ...p,
    metodo: p.metodo ? String(p.metodo) : null,
    source: 'v2_legacy_bridge',
    imported_at: new Date().toISOString(),
  }));

  const { error: upErr, count } = await v1.schema('v2_condominios').from('pagamentos')
    .upsert(enriched, { onConflict: 'id', count: 'exact' });

  if (upErr) r.errors.push(`upsert: ${upErr.message}`);
  else r.upserted = count ?? enriched.length;
  r.duration_ms = Date.now() - start;
  return r;
}

// ============================================================================
// DOMAIN 5: orcamento_por_fracao (UPSERT by ano+fracao_codigo)
// ============================================================================
async function syncOrcamentoPorFracao(v1: SupabaseClient, v2: SupabaseClient): Promise<DomainResult> {
  const start = Date.now();
  const r: DomainResult = { domain: 'orcamento_por_fracao', fetched: 0, upserted: 0, errors: [], duration_ms: 0 };

  const { data: rows, error } = await v2.from('orcamento_por_fracao')
    .select('id, ano, fracao_id, fracao_codigo, permilagem, valor_mensal, valor_mensal_fcr, total_mensal');

  if (error) { r.errors.push(`fetch: ${error.message}`); r.duration_ms = Date.now()-start; return r; }
  r.fetched = rows?.length ?? 0;
  if (!rows || rows.length === 0) { r.duration_ms = Date.now()-start; return r; }

  const enriched = rows.map(o => ({
    ...o,
    source: 'v2_legacy_bridge',
    imported_at: new Date().toISOString(),
  }));

  const { error: upErr, count } = await v1.schema('v2_condominios').from('orcamento_por_fracao')
    .upsert(enriched, { onConflict: 'ano,fracao_codigo', count: 'exact' });

  if (upErr) r.errors.push(`upsert: ${upErr.message}`);
  else r.upserted = count ?? enriched.length;
  r.duration_ms = Date.now() - start;
  return r;
}

// ============================================================================
// DOMAIN 6: configuracoes (UPSERT by chave)
// ============================================================================
async function syncConfiguracoes(v1: SupabaseClient, v2: SupabaseClient): Promise<DomainResult> {
  const start = Date.now();
  const r: DomainResult = { domain: 'configuracoes', fetched: 0, upserted: 0, errors: [], duration_ms: 0 };

  const { data: rows, error } = await v2.from('configuracoes').select('chave, valor, descricao');
  if (error) { r.errors.push(`fetch: ${error.message}`); r.duration_ms = Date.now()-start; return r; }
  r.fetched = rows?.length ?? 0;
  if (!rows || rows.length === 0) { r.duration_ms = Date.now()-start; return r; }

  const { error: upErr, count } = await v1.schema('v2_condominios').from('configuracoes')
    .upsert(rows, { onConflict: 'chave', count: 'exact' });

  if (upErr) r.errors.push(`upsert: ${upErr.message}`);
  else r.upserted = count ?? rows.length;
  r.duration_ms = Date.now() - start;
  return r;
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================
Deno.serve(async (req: Request): Promise<Response> => {
  const startMs = Date.now();

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const onlyDomain = body?.only_domain as string | undefined;  // p/ debug: "pagamentos" etc

    const V1_URL          = Deno.env.get('SUPABASE_URL');
    const V1_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const V2_URL          = 'https://eozklslwfaqujaijvdnl.supabase.co';
    const V2_SERVICE_KEY  = Deno.env.get('V2_LEGACY_SERVICE_ROLE_KEY');

    if (!V1_URL || !V1_SERVICE_KEY) return Response.json({ ok: false, error: 'V1 env missing' }, { status: 500 });

    const v1 = createClient(V1_URL, V1_SERVICE_KEY, { auth: { persistSession: false } });

    if (!V2_SERVICE_KEY) {
      const msg = 'V2_LEGACY_SERVICE_ROLE_KEY secret not configured.';
      await safeLog(v1, { status: 'skipped', error_msg: msg, duration_ms: Date.now() - startMs });
      return Response.json({ ok: false, error: msg }, { status: 503 });
    }
    const v2 = createClient(V2_URL, V2_SERVICE_KEY, { auth: { persistSession: false } });

    const workspaceId = '00000000-0000-0000-0000-000000000001';
    const results: DomainResult[] = [];

    const allDomains: Array<{ name: string; fn: () => Promise<DomainResult> }> = [
      { name: 'condominos',           fn: () => syncCondominos(v1, v2, workspaceId) },
      { name: 'utilizadores_portal',  fn: () => syncUtilizadoresPortal(v1, v2) },
      { name: 'extrato_bancario',     fn: () => syncExtratoBancario(v1, v2) },
      { name: 'pagamentos',           fn: () => syncPagamentos(v1, v2) },
      { name: 'orcamento_por_fracao', fn: () => syncOrcamentoPorFracao(v1, v2) },
      { name: 'configuracoes',        fn: () => syncConfiguracoes(v1, v2) },
    ];

    const domainsToRun = onlyDomain
      ? allDomains.filter(d => d.name === onlyDomain)
      : allDomains;

    for (const d of domainsToRun) {
      try {
        results.push(await d.fn());
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ domain: d.name, fetched: 0, upserted: 0, errors: [`fatal: ${msg}`], duration_ms: 0 });
        console.error(`[bridge] ${d.name} fatal:`, msg);
      }
    }

    const totalFetched = results.reduce((a, r) => a + r.fetched, 0);
    const totalUpserted = results.reduce((a, r) => a + r.upserted, 0);
    const totalErrors = results.reduce((a, r) => a + r.errors.length, 0);
    const durationMs = Date.now() - startMs;

    await safeLog(v1, {
      total_fetched: totalFetched,
      total_inserted: 0,
      total_updated: totalUpserted,
      total_ambiguous: 0,
      status: totalErrors > 0 ? 'partial' : 'ok',
      error_msg: totalErrors > 0
        ? results.filter(r => r.errors.length > 0).map(r => `${r.domain}: ${r.errors.slice(0,2).join('; ')}`).join(' | ').slice(0, 500)
        : null,
      duration_ms: durationMs,
    });

    return Response.json({
      ok: true,
      data: {
        total_fetched: totalFetched,
        total_upserted: totalUpserted,
        total_errors: totalErrors,
        duration_ms: durationMs,
        domains: results,
      },
    });

  } catch (outerErr) {
    const msg = outerErr instanceof Error ? outerErr.message : String(outerErr);
    console.error('[v2-legacy-bridge-cron] outer fatal:', msg);
    return Response.json({ ok: false, error: 'outer_fatal', detail: msg }, { status: 500 });
  }
});
