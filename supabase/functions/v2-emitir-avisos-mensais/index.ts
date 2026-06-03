// v2-emitir-avisos-mensais v2 — executor dos steps da recipe "Emissão de Avisos Mensais" (V2).
//   emitir aceita data_emissao (escolhida no gate); default dia 1 do mês.
// Passos (dispatch por step_name):
//   verificar-avisos-mes        — confere se o mês já foi emitido (idempotência)
//   conferir-orcamento-ano      — rubricas aprovadas do ano (orcamentos)
//   conferir-orcamento-fracao   — orçamento por fração + comparação com mês anterior + anomalias
//   emitir-avisos-mensais       — emite avisos (clone do mês anterior c/ valores do orçamento); idempotente
//   auditar-avisos-mensais      — confere o que ficou emitido
// V2 via service role. Estrutura espelha v2-quota-extra-step.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const V1_URL = Deno.env.get('SUPABASE_URL')!;
const V1_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const V2_URL = Deno.env.get('V2_SUPABASE_URL') ?? 'https://eozklslwfaqujaijvdnl.supabase.co';
const V2_KEY = Deno.env.get('V2_SERVICE_ROLE_KEY') ?? '';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Api-Key, x-client-info, apikey, prefer, x-supabase-api-version' };
const json = (d: any, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const err = (m: string, s = 400) => json({ error: m }, s);

async function rest(baseUrl: string, key: string, path: string, opts: RequestInit = {}, schema = 'public') {
  const headers: Record<string, string> = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Accept-Profile': schema, 'Content-Profile': schema, ...((opts.headers as any) || {}) };
  const res = await fetch(`${baseUrl}/rest/v1${path}`, { ...opts, headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`REST ${res.status} ${path}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}
async function updateStep(runId: string, n: number, patch: Record<string, any>) {
  await rest(V1_URL, V1_KEY, `/recipe_run_steps?recipe_run_id=eq.${runId}&step_number=eq.${n}`, { method: 'PATCH', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(patch) }, 'system');
}
async function updateRun(runId: string, patch: Record<string, any>) {
  await rest(V1_URL, V1_KEY, `/recipe_runs?id=eq.${runId}`, { method: 'PATCH', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(patch) }, 'system');
}
async function v2Select(path: string) { return await rest(V2_URL, V2_KEY, path, {}, 'public'); }
function eur(n: number) { return Math.round(Number(n) * 100) / 100; }
function periodoDe(ano: number, mes: number) { return `${MESES[mes - 1]} ${ano}`; }
function mesAnterior(ano: number, mes: number) { return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 }; }

// ── verificar-avisos-mes ──────────────────────────────────────────────────
async function handleVerificar(p: any) {
  const ano = Number(p.ano), mes = Number(p.mes);
  const periodo = periodoDe(ano, mes);
  const docs: any[] = await v2Select(`/documentos?tipo=eq.aviso&periodo_referencia=eq.${encodeURIComponent(periodo)}&select=numero,total`);
  const total = (docs ?? []).reduce((s, d) => s + Number(d.total || 0), 0);
  return { periodo, ja_emitido: (docs?.length ?? 0) > 0, n: docs?.length ?? 0, total: eur(total),
    resumo: (docs?.length ?? 0) > 0 ? `⚠️ ${periodo} JÁ tem ${docs.length} avisos (€${eur(total)}). Emissão será bloqueada.` : `✓ ${periodo} ainda não emitido. Pode prosseguir.` };
}

// ── conferir-orcamento-ano ────────────────────────────────────────────────
async function handleOrcamentoAno(p: any) {
  const ano = Number(p.ano);
  const rows: any[] = await v2Select(`/orcamentos?ano=eq.${ano}&select=codigo,rubrica,secao,valor_mensal,valor_total`);
  const receitas = (rows ?? []).filter(r => r.secao === 'RECEITAS');
  const despesas = (rows ?? []).filter(r => r.secao === 'DESPESAS');
  const sum = (a: any[], k: string) => eur(a.reduce((s, r) => s + Number(r[k] || 0), 0));
  return { ano,
    receitas_mensal: sum(receitas, 'valor_mensal'), receitas_anual: sum(receitas, 'valor_total'),
    despesas_mensal: sum(despesas, 'valor_mensal'), despesas_anual: sum(despesas, 'valor_total'),
    rubricas: (rows ?? []).map(r => ({ codigo: r.codigo, rubrica: r.rubrica, secao: r.secao, mensal: eur(r.valor_mensal), anual: eur(r.valor_total) })),
    resumo: `Orçamento ${ano}: receitas €${sum(receitas, 'valor_total')}/ano (€${sum(receitas, 'valor_mensal')}/mês) · despesas €${sum(despesas, 'valor_total')}/ano.` };
}

// ── conferir-orcamento-fracao ─────────────────────────────────────────────
async function handleOrcamentoFracao(p: any) {
  const ano = Number(p.ano), mes = Number(p.mes);
  const prev = mesAnterior(ano, mes);
  const orc: any[] = await v2Select(`/orcamento_por_fracao?ano=eq.${ano}&fracao_codigo=neq.Total&select=fracao_codigo,valor_mensal,valor_mensal_fcr,total_mensal&order=fracao_codigo`);
  const prevAvisos: any[] = await v2Select(`/documentos?tipo=eq.aviso&periodo_referencia=eq.${encodeURIComponent(periodoDe(prev.ano, prev.mes))}&select=fracao_codigo,total`);
  const prevByFrac: Record<string, number> = {}; for (const a of prevAvisos ?? []) prevByFrac[a.fracao_codigo] = Number(a.total);
  let total = 0, quota = 0, fcr = 0;
  const comparacao: any[] = []; const anomalias: any[] = [];
  for (const o of orc ?? []) {
    const novo = eur(o.total_mensal); const ant = prevByFrac[o.fracao_codigo] ?? null;
    total += novo; quota += Number(o.valor_mensal || 0); fcr += Number(o.valor_mensal_fcr || 0);
    const ratio = ant ? Math.round((novo / ant) * 100) / 100 : null;
    const linha = { fracao: o.fracao_codigo, anterior: ant, novo, delta: ant != null ? eur(novo - ant) : null, ratio };
    comparacao.push(linha);
    if (ratio != null && ratio > 1.10) anomalias.push(linha);
  }
  return { ano, periodo: periodoDe(ano, mes), mes_anterior: periodoDe(prev.ano, prev.mes),
    n_fracoes: comparacao.length, total: eur(total), quota: eur(quota), fcr: eur(fcr),
    anomalias, comparacao,
    resumo: `${comparacao.length} frações · total €${eur(total)} (quota €${eur(quota)} + FCR €${eur(fcr)}).` +
            (anomalias.length ? ` ⚠️ ${anomalias.length} com variação >10% vs ${periodoDe(prev.ano, prev.mes)}.` : ' Variações normais.') };
}

// ── emitir-avisos-mensais ─────────────────────────────────────────────────
async function handleEmitir(p: any) {
  const ano = Number(p.ano), mes = Number(p.mes);
  const periodo = periodoDe(ano, mes);
  const prev = mesAnterior(ano, mes);
  const periodoPrev = periodoDe(prev.ano, prev.mes);

  // Idempotência: nunca re-emitir um mês já emitido.
  const existentes: any[] = await v2Select(`/documentos?tipo=eq.aviso&periodo_referencia=eq.${encodeURIComponent(periodo)}&select=numero&limit=1`);
  if (existentes && existentes.length > 0) {
    throw new Error(`EMISSÃO BLOQUEADA: ${periodo} já tem avisos emitidos. Não re-emito (evita duplicados).`);
  }

  // Template = avisos do mês anterior (estrutura/proprietário/IBAN provados).
  const tmpl: any[] = await v2Select(`/documentos?tipo=eq.aviso&periodo_referencia=eq.${encodeURIComponent(periodoPrev)}&select=fracao_id,fracao_codigo,condomino_id,nome_condomino,email_condomino,telefone_condomino,iban,banco,titular_iban&order=numero`);
  if (!tmpl || tmpl.length === 0) throw new Error(`Sem template: ${periodoPrev} não tem avisos para clonar.`);

  // Orçamento do ano por fração.
  const orc: any[] = await v2Select(`/orcamento_por_fracao?ano=eq.${ano}&fracao_codigo=neq.Total&select=fracao_codigo,valor_mensal,valor_mensal_fcr,total_mensal`);
  const orcByFrac: Record<string, any> = {}; for (const o of orc ?? []) orcByFrac[o.fracao_codigo] = o;

  // Próximo número sequencial (max + 1) — sem colisão.
  const maxRows: any[] = await v2Select(`/documentos?numero=like.${ano}.*&select=numero&order=numero.desc&limit=1`);
  let next = 1;
  if (maxRows && maxRows[0]?.numero) {
    const suf = String(maxRows[0].numero).split('.')[1];
    next = parseInt(suf, 10) + 1;
  }

  const venc = new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10); // último dia do mês
  // data_emissao escolhida pelo Mário no gate; default = dia 1 do mês.
  const emissao = (typeof p.data_emissao === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.data_emissao))
    ? p.data_emissao : `${ano}-${String(mes).padStart(2, '0')}-01`;
  const payload: any[] = [];
  const semOrc: string[] = [];
  for (const t of tmpl) {
    const o = orcByFrac[t.fracao_codigo];
    if (!o) { semOrc.push(t.fracao_codigo); continue; }
    payload.push({
      numero: `${ano}.${String(next++).padStart(4, '0')}`,
      tipo: 'aviso', fracao_id: t.fracao_id, fracao_codigo: t.fracao_codigo,
      condomino_id: t.condomino_id, nome_condomino: t.nome_condomino,
      email_condomino: t.email_condomino, telefone_condomino: t.telefone_condomino,
      data_emissao: emissao, data_vencimento: venc, periodo_referencia: periodo,
      linhas: [
        { val: eur(o.valor_mensal), desc: `Quota Mensal — ${periodo}` },
        { val: eur(o.valor_mensal_fcr), desc: `Fundo Comum de Reserva (10%) — ${periodo}` },
      ],
      total: eur(o.total_mensal), estado: 'pendente',
      iban: t.iban, banco: t.banco, titular_iban: t.titular_iban,
    });
  }
  if (payload.length === 0) throw new Error(`Nenhuma fração com orçamento ${ano} para emitir.`);

  await rest(V2_URL, V2_KEY, `/documentos`, { method: 'POST', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(payload) });
  const total = eur(payload.reduce((s, d) => s + d.total, 0));
  return { periodo, emitidos: payload.length, total, numero_de: payload[0].numero, numero_ate: payload[payload.length - 1].numero,
    sem_orcamento: semOrc, data_emissao: emissao,
    resumo: `${payload.length} avisos emitidos para ${periodo} · €${total} · nº ${payload[0].numero}–${payload[payload.length - 1].numero}.` };
}

// ── auditar-avisos-mensais ────────────────────────────────────────────────
async function handleAuditar(p: any) {
  const ano = Number(p.ano), mes = Number(p.mes);
  const periodo = periodoDe(ano, mes);
  const docs: any[] = await v2Select(`/documentos?tipo=eq.aviso&periodo_referencia=eq.${encodeURIComponent(periodo)}&select=numero,total&order=total.desc`);
  const total = (docs ?? []).reduce((s, d) => s + Number(d.total || 0), 0);
  return { periodo, ok: (docs?.length ?? 0) > 0, n_avisos: docs?.length ?? 0, total: eur(total),
    resumo: `${docs?.length ?? 0} avisos confirmados em V2 para ${periodo}. Total €${eur(total)}.` };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return err('POST only', 405);
  if (!V2_KEY) return err('V2_SERVICE_ROLE_KEY em falta', 500);
  let body: any; try { body = await req.json(); } catch { return err('JSON inválido'); }
  const { step_name, recipe_run_id, step_number, params } = body ?? {};
  if (!step_name || !recipe_run_id || !step_number) return err('step_name, recipe_run_id, step_number obrigatorios');
  try { await updateStep(recipe_run_id, step_number, { status: 'running', started_at: new Date().toISOString() }); }
  catch (e: any) { return err(`updateStep falhou: ${e.message}`, 500); }
  const t0 = Date.now();
  let result: any;
  try {
    switch (step_name) {
      case 'verificar-avisos-mes':      result = await handleVerificar(params ?? {}); break;
      case 'conferir-orcamento-ano':    result = await handleOrcamentoAno(params ?? {}); break;
      case 'conferir-orcamento-fracao': result = await handleOrcamentoFracao(params ?? {}); break;
      case 'emitir-avisos-mensais':     result = await handleEmitir(params ?? {}); break;
      case 'auditar-avisos-mensais':    result = await handleAuditar(params ?? {}); break;
      default: throw new Error(`step_name desconhecido: ${step_name}`);
    }
  } catch (e: any) {
    await updateStep(recipe_run_id, step_number, { status: 'failed', completed_at: new Date().toISOString(), duration_ms: Date.now() - t0, output_jsonb: { error: e.message } });
    await updateRun(recipe_run_id, { status: 'failed', error_message: `Step ${step_number} (${step_name}): ${e.message}`, completed_at: new Date().toISOString() });
    return err(`handler ${step_name}: ${e.message}`, 500);
  }
  await updateStep(recipe_run_id, step_number, { status: 'completed', completed_at: new Date().toISOString(), duration_ms: Date.now() - t0, output_jsonb: result });
  return json({ ok: true, step_name, step_number, duration_ms: Date.now() - t0, output: result });
});
