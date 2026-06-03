// v2-avisos-mensais-cron v1 — condutor AUTÓNOMO da recipe "Emissão de Avisos Mensais".
// Disparado por pg_cron (dia 1 de cada mês). Corre os passos server-side (sem browser),
// AUTO-APROVA o gate (emissão automática) e emite o mês corrente. Idempotente.
// Cria um recipe_run + steps em V1 (visível no dashboard) com os outputs de cada passo.
// Body opcional: { ano, mes } para forçar um período (testes); senão usa o mês corrente.
const V1_URL = Deno.env.get('SUPABASE_URL')!;
const V1_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DISCORD_CHANNEL_CONDO = Deno.env.get('DISCORD_CHANNEL_CONDO') ?? '';
const RECIPE_SLUG = 'emissao-avisos-mensais';
const EMIT_FN = 'v2-emitir-avisos-mensais';
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-client-info, apikey' };
const json = (d: any, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function rest(path: string, opts: RequestInit = {}, schema = 'system') {
  const headers: Record<string, string> = { 'apikey': V1_KEY, 'Authorization': `Bearer ${V1_KEY}`, 'Content-Type': 'application/json', 'Accept-Profile': schema, 'Content-Profile': schema, ...((opts.headers as any) || {}) };
  const res = await fetch(`${V1_URL}/rest/v1${path}`, { ...opts, headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`REST ${res.status} ${path}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}
// invoca o executor dos steps (verify_jwt=true → service role como Bearer)
async function invokeStep(skill: string, runId: string, stepNumber: number, params: any) {
  const res = await fetch(`${V1_URL}/functions/v1/${EMIT_FN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${V1_KEY}` },
    body: JSON.stringify({ step_name: skill, recipe_run_id: runId, step_number: stepNumber, params }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) throw new Error(`${skill}: ${data?.error || res.status}`);
  return data.output;
}
async function setStep(runId: string, n: number, patch: any) {
  await rest(`/recipe_run_steps?recipe_run_id=eq.${runId}&step_number=eq.${n}`, { method: 'PATCH', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(patch) });
}
async function setRun(runId: string, patch: any) {
  await rest(`/recipe_runs?id=eq.${runId}`, { method: 'PATCH', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(patch) });
}
async function notifyDiscord(content: string) {
  if (!DISCORD_CHANNEL_CONDO) return;
  try {
    await fetch(`${V1_URL}/functions/v1/discord-send`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${V1_KEY}` }, body: JSON.stringify({ channel_id: DISCORD_CHANNEL_CONDO, content }) });
  } catch { /* não crítico */ }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  let body: any = {}; try { body = await req.json(); } catch {}
  const now = new Date();
  const ano = Number(body.ano) || now.getUTCFullYear();
  const mes = Number(body.mes) || (now.getUTCMonth() + 1);
  const periodo = `${MESES[mes - 1]} ${ano}`;
  const dataEmissao = body.data_emissao || `${ano}-${String(mes).padStart(2, '0')}-01`;

  // Recipe + steps
  const recipes: any[] = await rest(`/recipes?slug=eq.${RECIPE_SLUG}&select=id,slug,steps,employee_id`);
  const recipe = recipes?.[0];
  if (!recipe) return json({ ok: false, error: `Recipe ${RECIPE_SLUG} não encontrada` }, 404);

  // Idempotência: já há run a correr/aguardar para esta recipe?
  const inflight: any[] = await rest(`/recipe_runs?recipe_slug=eq.${RECIPE_SLUG}&status=in.(running,awaiting_approval)&select=id&limit=1`);
  if (inflight?.length > 0) return json({ ok: true, action: 'skipped_inflight', run_id: inflight[0].id });

  const inputs = { ano, mes, data_emissao: dataEmissao, auto_triggered: true, triggered_by: body.triggered_by || 'pg_cron' };
  const created = await rest(`/recipe_runs`, { method: 'POST', headers: { 'Prefer': 'return=representation' }, body: JSON.stringify({
    recipe_id: recipe.id, recipe_slug: recipe.slug, status: 'running', inputs_jsonb: inputs, triggered_by: inputs.triggered_by, current_step: 1,
  }) });
  const run = Array.isArray(created) ? created[0] : created;

  const steps = recipe.steps || [];
  const stepRows = steps.map((s: any, i: number) => ({
    recipe_run_id: run.id, step_number: i + 1, step_name: s.name, step_type: s.type || 'agent',
    agent: s.employee_id || recipe.employee_id || null, skills: Array.isArray(s.skills) ? s.skills : [],
    status: 'pending', started_at: null,
  }));
  await rest(`/recipe_run_steps`, { method: 'POST', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(stepRows) });

  // Conduzir os passos em sequência. Gate humano = auto-aprovado (emissão automática).
  try {
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i]; const n = i + 1;
      await setRun(run.id, { current_step: n });
      if ((s.type || 'agent') === 'human') {
        await setStep(run.id, n, { status: 'completed', approved_by: 'cron-auto', approved_at: new Date().toISOString(), completed_at: new Date().toISOString(), output_jsonb: { auto_aprovado: true, nota: 'Gate auto-aprovado (emissão automática por cron).' } });
        continue;
      }
      const skill = Array.isArray(s.skills) ? s.skills[0] : null;
      const params = skill === 'emitir-avisos-mensais' ? { ano, mes, data_emissao: dataEmissao } : { ano, mes };
      // verificar-avisos-mes: se já emitido, parar (idempotência) antes de tentar emitir
      const out = await invokeStep(skill, run.id, n, params);
      if (skill === 'verificar-avisos-mes' && out?.ja_emitido) {
        await setRun(run.id, { status: 'completed', completed_at: new Date().toISOString(), error_message: `${periodo} já emitido — nada a fazer.` });
        await notifyDiscord(`🧾 **Avisos ${periodo}** — já estavam emitidos. Cron não fez nada (idempotente).`);
        return json({ ok: true, action: 'already_emitted', run_id: run.id, periodo });
      }
    }
    await setRun(run.id, { status: 'completed', completed_at: new Date().toISOString() });
    // Resumo final via audit (último step output)
    const auditRows: any[] = await rest(`/recipe_run_steps?recipe_run_id=eq.${run.id}&skills=cs.{auditar-avisos-mensais}&select=output_jsonb&limit=1`);
    const a = auditRows?.[0]?.output_jsonb || {};
    await notifyDiscord(`✅ **Avisos ${periodo} emitidos automaticamente**\n${a.n_avisos ?? '?'} avisos · €${Number(a.total ?? 0).toFixed(2)} · emissão ${dataEmissao}`);
    return json({ ok: true, action: 'emitted', run_id: run.id, periodo, audit: a });
  } catch (e: any) {
    await setRun(run.id, { status: 'failed', completed_at: new Date().toISOString(), error_message: e.message });
    await notifyDiscord(`❌ **Avisos ${periodo}** — emissão automática FALHOU: ${e.message}`);
    return json({ ok: false, error: e.message, run_id: run.id }, 500);
  }
});
