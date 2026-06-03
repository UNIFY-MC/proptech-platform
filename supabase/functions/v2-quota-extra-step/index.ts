// v2-quota-extra-step v16 — ingest casa XLSX→V2 por fracao_letra (porta p/ EST PUB "?") e
//   escreve colunas REAIS da tabela (unit NOT NULL, bloco, fracao_codigo/letra, piso, porta).
//   NÃO existe fracao_id. Guard anti-duplicado + halt se 0 escritas.
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const V1_URL = Deno.env.get('SUPABASE_URL')!;
const V1_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const V2_URL = Deno.env.get('V2_SUPABASE_URL') ?? 'https://eozklslwfaqujaijvdnl.supabase.co';
const V2_KEY = Deno.env.get('V2_SERVICE_ROLE_KEY') ?? '';

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
async function getVaultSecret(name: string): Promise<string | null> {
  try {
    const data = await rest(V1_URL, V1_KEY, `/rpc/get_vault_secret`, { method: 'POST', body: JSON.stringify({ p_name: name }) }, 'system');
    return data || null;
  } catch { return null; }
}
async function getDiscordChannel(): Promise<string> {
  return (Deno.env.get('DISCORD_CHANNEL_CONDO') || (await getVaultSecret('DISCORD_CHANNEL_CONDO')) || '');
}
async function getV2Password(): Promise<string> {
  const data = await getVaultSecret('V2_PORTAL_PASSWORD_PRATA2A');
  if (!data) throw new Error('V2_PORTAL_PASSWORD_PRATA2A nao existe no Vault V1');
  return data;
}
async function v2Select(path: string) { return await rest(V2_URL, V2_KEY, path, {}, 'public'); }
async function v2Rpc(name: string, params: any) { return await rest(V2_URL, V2_KEY, `/rpc/${name}`, { method: 'POST', body: JSON.stringify(params) }, 'public'); }
async function notifyDiscord(content: string) {
  const channel = await getDiscordChannel();
  if (!channel) return { skipped: true };
  try {
    const res = await fetch(`${V1_URL}/functions/v1/discord-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${V1_KEY}` },
      body: JSON.stringify({ channel_id: channel, content }),
    });
    return { ok: res.ok, status: res.status };
  } catch (e: any) { return { ok: false, error: e.message }; }
}
function fmtDate(d: string) { const [y, m, day] = d.split('-'); return `${day}.${m}.${y}`; }
function eur(n: number) { return Math.round(n * 100) / 100; }
function excelSerialToISO(n: number): string {
  const ms = Math.round(n * 86400 * 1000);
  return new Date(Date.UTC(1899, 11, 30) + ms).toISOString().slice(0, 10);
}

async function handleParseXlsx(params: any) {
  const { xlsx_url, xlsx_storage_path, xlsx_storage_bucket } = params;
  let url = xlsx_url;
  if (!url && xlsx_storage_path) {
    url = `${V1_URL}/storage/v1/object/${xlsx_storage_bucket || 'condo-uploads'}/${xlsx_storage_path}`;
  }
  if (!url) throw new Error('params obrigatorios: xlsx_url OU xlsx_storage_path');
  const dl = await fetch(url, { headers: { 'Authorization': `Bearer ${V1_KEY}`, 'apikey': V1_KEY } });
  if (!dl.ok) throw new Error(`Download XLSX falhou: ${dl.status}`);
  const buf = new Uint8Array(await dl.arrayBuffer());
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  const sha256 = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  const wb = XLSX.read(buf, { type: 'array', cellDates: false });
  let sheetName = wb.SheetNames.find(s => s.toLowerCase().includes('contagens')) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet não encontrada`);
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  let headerRow = -1;
  const kw = ['fracao', 'fração', 'unit', 'piso', 'porta'];
  for (let r = 0; r < Math.min(10, range.e.r); r++) {
    let m = 0;
    for (let c = 0; c < Math.min(15, range.e.c); c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell || cell.v == null) continue;
      const v = String(cell.v).toLowerCase();
      if (kw.some(k => v.includes(k))) m++;
    }
    if (m >= 2) { headerRow = r; break; }
  }
  if (headerRow < 0) throw new Error('Não detectei headers');
  const colMap: Record<string, number> = {};
  const dateCols: Record<string, number> = {};
  for (let c = 0; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c })];
    if (!cell || cell.v == null) continue;
    const v = cell.v;
    if (typeof v === 'number') dateCols[excelSerialToISO(v)] = c;
    else if (typeof v === 'string') {
      const lc = v.trim().toLowerCase();
      if (lc.includes('unit') || lc === 'u') colMap.unit = c;
      else if (lc.includes('fra')) colMap.fracao = c;
      else if (lc.includes('bloco')) colMap.bloco = c;
      else if (lc.includes('piso')) colMap.piso = c;
      else if (lc.includes('porta') || lc === 'por') colMap.porta = c;
      else if (lc.includes('quadro')) colMap.quadro = c;
      else if (/^\d{4}-\d{2}-\d{2}/.test(lc)) dateCols[lc.slice(0, 10)] = c;
    }
  }
  const datasLista = Object.keys(dateCols).sort();
  if (datasLista.length === 0) throw new Error('Sem colunas de datas detectadas');
  const rows: any[] = [];
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const fracaoCodigo = colMap.unit != null ? ws[XLSX.utils.encode_cell({ r, c: colMap.unit })]?.v : null;
    const fracaoLetra = colMap.fracao != null ? ws[XLSX.utils.encode_cell({ r, c: colMap.fracao })]?.v : null;
    const piso = colMap.piso != null ? ws[XLSX.utils.encode_cell({ r, c: colMap.piso })]?.v : null;
    const porta = colMap.porta != null ? ws[XLSX.utils.encode_cell({ r, c: colMap.porta })]?.v : null;
    if (!fracaoCodigo && !fracaoLetra) continue;
    for (const [isoDate, col] of Object.entries(dateCols)) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: col })];
      if (!cell || cell.v == null || cell.v === '') continue;
      const contagem = Number(cell.v);
      if (isNaN(contagem)) continue;
      rows.push({
        fracao_codigo: fracaoCodigo != null ? String(fracaoCodigo).trim() : null,
        fracao_letra: fracaoLetra != null ? String(fracaoLetra).trim() : null,
        piso: piso != null ? String(piso).trim() : null,
        porta: porta != null ? String(porta).trim() : null,
        data_leitura: isoDate, contagem,
      });
    }
  }
  return { xlsx_url: url, sheet: sheetName, sha256, header_row: headerRow + 1, column_mapping: colMap, n_datas: datasLista.length, datas_lista: datasLista, datas_range: { from: datasLista[0], to: datasLista[datasLista.length - 1] }, rows_total: rows.length, rows, sample_leituras: rows.slice(0, 5) };
}

async function handleDiff(params: any) {
  const { rows = [] } = params;
  const datasXlsx = Array.from(new Set(rows.map((r: any) => r.data_leitura))).sort() as string[];
  const v2L: any[] = await v2Select(`/carregadores_contagens?select=data_leitura&order=data_leitura.desc`);
  const datasV2 = Array.from(new Set(v2L.map((r: any) => r.data_leitura))).sort() as string[];
  const setV2 = new Set(datasV2);
  const datasNovas = datasXlsx.filter(d => !setV2.has(d));
  const ultDocs: any[] = await v2Select(`/documentos?tipo=eq.quota_extra&select=data_emissao&order=data_emissao.desc&limit=1`);
  return {
    diff: { n_datas_novas: datasNovas.length, datas_novas_xlsx: datasNovas, potencial_updates: datasXlsx.length - datasNovas.length, datas_em_ambos: datasXlsx.filter(d => setV2.has(d)), n_conflitos: 0 },
    v2_state: { n_datas: datasV2.length, max_data: datasV2[datasV2.length - 1] || null, datas_existentes: datasV2 },
    xlsx_state: { n_datas: datasXlsx.length, range: { from: datasXlsx[0] || null, to: datasXlsx[datasXlsx.length - 1] || null } },
    ultima_emitida_data: ultDocs?.[0]?.data_emissao ?? null,
    recomendacao_periodo_emissao: ultDocs?.[0]?.data_emissao && datasNovas[0] ? { data_anterior_sugerida: ultDocs[0].data_emissao, data_actual_sugerida: datasNovas[datasNovas.length - 1] } : null,
  };
}

async function handleCalcular(params: any) {
  const { data_anterior, data_actual, preco_kwh } = params;
  if (!data_anterior || !data_actual || preco_kwh == null) throw new Error('params: data_anterior, data_actual, preco_kwh');
  const rows: any[] = await v2Select(`/carregadores_contagens?data_leitura=in.(${data_anterior},${data_actual})&select=fracao_codigo,fracao_letra,piso,porta,data_leitura,contagem&order=fracao_codigo,porta`);
  const byPosto: Record<string, any> = {};
  for (const r of rows) {
    const k = `${r.fracao_codigo}|${r.porta ?? ''}`;
    if (!byPosto[k]) byPosto[k] = { codigo: r.fracao_codigo, letra: r.fracao_letra, ant: null, act: null };
    if (r.data_leitura === data_anterior) byPosto[k].ant = r.contagem;
    if (r.data_leitura === data_actual) byPosto[k].act = r.contagem;
  }
  const byFracao: Record<string, any> = {};
  for (const p of Object.values(byPosto) as any[]) {
    if (!byFracao[p.codigo]) byFracao[p.codigo] = { letra: p.letra, postos: [], total_kwh: 0 };
    const c = (p.ant != null && p.act != null) ? p.act - p.ant : null;
    byFracao[p.codigo].postos.push({ porta: p.porta, ant: p.ant, act: p.act, kwh: c ?? 0 });
    if (c != null) byFracao[p.codigo].total_kwh += c;
  }
  const codigos = Object.keys(byFracao);
  const hist: any[] = await v2Select(`/historico_proprietarios?data_inicio=lte.${data_actual}&or=(data_fim.is.null,data_fim.gte.${data_actual})&select=fracao_id,condomino_id`);
  const fracoesData: any[] = codigos.length ? await v2Select(`/fracoes?codigo=in.(${codigos.map(c=>encodeURIComponent(c)).join(',')})&select=id,codigo`) : [];
  const fIdByCod: Record<string,string> = {}; for (const f of fracoesData) fIdByCod[f.codigo] = f.id;
  const propByFrac: Record<string,string> = {}; for (const h of hist) propByFrac[h.fracao_id] = h.condomino_id;
  const condIds = [...new Set(Object.values(propByFrac))];
  const conds: any[] = condIds.length ? await v2Select(`/condominos?id=in.(${condIds.join(',')})&select=id,nome,email`) : [];
  const condById: Record<string,any> = {}; for (const c of conds) condById[c.id] = c;
  const preview: any[] = [];
  let total = 0, comC = 0, semC = 0;
  for (const [codigo, f] of Object.entries(byFracao) as any) {
    const fId = fIdByCod[codigo]; const condId = fId ? propByFrac[fId] : null; const cond = condId ? condById[condId] : null;
    const tk = f.total_kwh; const v = eur(tk * Number(preco_kwh));
    if (tk > 0 && v > 0) comC++; else semC++; total += v;
    const tAnt = f.postos.reduce((s:number,p:any)=>s+(p.ant??0),0);
    const tAct = f.postos.reduce((s:number,p:any)=>s+(p.act??0),0);
    preview.push({ fracao_codigo: codigo, fracao_letra: f.letra, condomino_id: condId, condomino_nome: cond?.nome ?? null, condomino_email: cond?.email ?? null, n_postos: f.postos.length, contagem_anterior: tAnt, contagem_actual: tAct, kwh_consumo: tk, valor_eur: v });
  }
  return { data_anterior, data_actual, preco_kwh: Number(preco_kwh), periodo_referencia: `Eletricidade Carregadores (${fmtDate(data_anterior)} → ${fmtDate(data_actual)})`, preview_avisos: preview.sort((a,b)=>a.fracao_codigo.localeCompare(b.fracao_codigo)), total_emitir: eur(total), n_fracoes_total: preview.length, n_fracoes_com_consumo: comC, n_fracoes_sem_consumo: semC };
}

async function handleValidar(params: any) {
  const { preview_avisos } = params;
  const fracoes: any[] = await v2Select(`/fracoes?ativa=eq.true&select=codigo,ativa`);
  const fp = new Set((preview_avisos ?? []).map((p: any) => p.fracao_codigo));
  const sem = fracoes.filter(f => !fp.has(f.codigo)).map(f => f.codigo);
  return { ok: sem.length === 0, total_fracoes_condominio: fracoes.length, fracoes_no_preview: fp.size, gaps: { sem_leitura: sem }, resumo: sem.length === 0 ? `Cobertura OK: ${fp.size}/${fracoes.length} fracoes` : `${sem.length} sem leitura` };
}

async function handleIngest(params: any) {
  // só_datas: se vier, ingere apenas linhas dessas datas (ex: as datas novas do diff).
  const { rows = [], so_datas = null } = params;
  const filtroDatas: Set<string> | null = Array.isArray(so_datas) && so_datas.length ? new Set(so_datas) : null;
  const alvo = rows.filter((r: any) => r.contagem != null && (!filtroDatas || filtroDatas.has(r.data_leitura)));

  // O XLSX traz códigos curtos ("A1A") + bloco separado; V2 usa "12-A1A". Em vez de
  // reconstruir o código, resolvemos contra os postos CANÓNICOS já existentes em V2:
  //   - fracao_letra (AG, BL, AB, Q…) é única e idêntica no XLSX e em V2 → chave primária
  //   - postos partilhados EST PUB têm letra "?" → casam por (piso, porta) (L29…L80, único)
  const postos: any[] = await v2Select(`/carregadores_contagens?select=unit,bloco,fracao_codigo,fracao_letra,piso,porta&limit=5000`);
  const byLetra: Record<string, any> = {}; const byPisoPorta: Record<string, any> = {};
  for (const p of postos) {
    if (p.fracao_letra && p.fracao_letra !== '?' && !byLetra[p.fracao_letra]) byLetra[p.fracao_letra] = p;
    const pk = `${p.piso ?? ''}|${p.porta ?? ''}`;
    if (!byPisoPorta[pk]) byPisoPorta[pk] = p;
  }
  const resolvePosto = (row: any) => {
    if (row.fracao_letra && row.fracao_letra !== '?' && byLetra[row.fracao_letra]) return byLetra[row.fracao_letra];
    return byPisoPorta[`${row.piso ?? ''}|${row.porta ?? ''}`] || null;
  };

  let inserted = 0, updated = 0; const errors: any[] = [];
  for (const row of alvo) {
    const posto = resolvePosto(row);
    if (!posto) { errors.push({ unit: row.fracao_codigo, letra: row.fracao_letra, piso: row.piso, porta: row.porta, error: 'posto sem correspondência em V2 (letra/porta)' }); continue; }
    const dataLeitura = row.data_leitura; // SEMPRE a data real da linha (nunca forçar)
    // Identidade canónica copiada do posto V2. `unit` é NOT NULL (era o que faltava).
    const existing: any[] = await v2Select(`/carregadores_contagens?unit=eq.${encodeURIComponent(posto.unit)}&porta=eq.${encodeURIComponent(posto.porta || '')}&data_leitura=eq.${dataLeitura}&select=id`);
    const payload = { unit: posto.unit, bloco: posto.bloco, fracao_codigo: posto.fracao_codigo, fracao_letra: posto.fracao_letra, piso: posto.piso, porta: posto.porta, data_leitura: dataLeitura, contagem: row.contagem, preco_kwh: 0.1861 };
    try {
      if (existing?.length > 0) {
        await rest(V2_URL, V2_KEY, `/carregadores_contagens?id=eq.${existing[0].id}`, { method: 'PATCH', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify({ contagem: row.contagem }) }); updated++;
      } else {
        await rest(V2_URL, V2_KEY, `/carregadores_contagens`, { method: 'POST', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(payload) }); inserted++;
      }
    } catch (e: any) { errors.push({ fracao: posto.fracao_codigo, porta: posto.porta, data: dataLeitura, error: e.message }); }
  }
  // GUARD: se havia linhas para escrever mas NADA foi escrito, a recipe TEM de parar
  // aqui — senão o cálculo/emissão correriam sobre leituras inexistentes.
  if (alvo.length > 0 && inserted + updated === 0) {
    throw new Error(`Ingest falhou: 0 leituras escritas em ${alvo.length} tentativas. Primeiro erro: ${errors[0]?.error || 'desconhecido'}`);
  }
  return { n_alvo: alvo.length, so_datas, inserted, updated, errors, skipped: alvo.length - inserted - updated - errors.length };
}

async function handleEmit(params: any) {
  const { data_anterior, data_actual, descricao = 'Eletricidade Carregadores', data_emissao, force = false } = params;
  if (!data_anterior || !data_actual) throw new Error('params: data_anterior, data_actual');

  // GUARD ANTI-DUPLICADOS: bloquear se já existirem avisos de carregadores para este período.
  // A RPC portal_admin_emitir_quota_extra NÃO é idempotente — re-emitir cria duplicados.
  if (!force) {
    const da = fmtDate(data_anterior), dac = fmtDate(data_actual);
    const ja: any[] = await v2Select(
      `/documentos?tipo=eq.quota_extra&periodo_referencia=ilike.*${encodeURIComponent(da)}*${encodeURIComponent(dac)}*&select=numero,data_emissao,periodo_referencia&limit=5`);
    if (ja && ja.length > 0) {
      throw new Error(
        `EMISSÃO BLOQUEADA (anti-duplicado): já existem ${ja.length}+ avisos de carregadores para o período ${da} → ${dac} ` +
        `(ex: ${ja[0].numero}, emitido ${ja[0].data_emissao}). Se queres mesmo re-emitir, passa force=true explicitamente.`);
    }
  }

  const password = await getV2Password();
  const data = await v2Rpc('portal_admin_emitir_quota_extra', { p_password: password, p_data_anterior: data_anterior, p_data_atual: data_actual, p_descricao: descricao, p_data_emissao: data_emissao || data_actual });
  if (data?.erro) throw new Error(`RPC: ${data.erro}`);
  return { data_anterior, data_actual, descricao, data_emissao: data_emissao || data_actual, rpc_result: data, n_documentos: data?.n_emitidos ?? null, numeros_emitidos: data?.numeros ?? [], periodo: data?.periodo ?? null, erros: data?.erros ?? [] };
}

async function handleAuditar(_params: any) {
  const today = new Date().toISOString().slice(0, 10);
  const docs: any[] = await v2Select(`/documentos?tipo=eq.quota_extra&data_emissao=gte.${today}&select=numero,fracao_codigo,total,data_emissao,nome_condomino&order=total.desc`);
  const total = docs.reduce((s, d) => s + Number(d.total || 0), 0);
  return { ok: docs.length > 0, n_emitidos: docs.length, n_emitidos_hoje: docs.length, total_emitido: Math.round(total * 100) / 100, data_emissao: today, top_avisos: docs.slice(0, 5), documentos: docs.slice(0, 50), resumo: `${docs.length} documentos confirmados em V2 conta_corrente_2026. Total: €${(Math.round(total * 100) / 100).toFixed(2)}.` };
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
      case 'parse-xlsx-carregadores': result = await handleParseXlsx(params ?? {}); break;
      case 'diff-leituras-carregadores': result = await handleDiff(params ?? {}); break;
      case 'calcular-quota-extra-carregadores': result = await handleCalcular(params ?? {}); break;
      case 'validar-cobertura-fracoes': result = await handleValidar(params ?? {}); break;
      case 'v2-ingest-carregadores': result = await handleIngest(params ?? {}); break;
      case 'emit-quota-extra': result = await handleEmit(params ?? {}); break;
      case 'auditar-conta-corrente-pos-emissao': result = await handleAuditar(params ?? {}); break;
      default: throw new Error(`step_name desconhecido: ${step_name}`);
    }
  } catch (e: any) {
    await updateStep(recipe_run_id, step_number, { status: 'failed', completed_at: new Date().toISOString(), duration_ms: Date.now() - t0, output_jsonb: { error: e.message } });
    await updateRun(recipe_run_id, { status: 'failed', error_message: `Step ${step_number} (${step_name}): ${e.message}`, completed_at: new Date().toISOString() });
    await notifyDiscord(`❌ Recipe falhou no Step ${step_number} (${step_name}): ${e.message}`);
    return err(`handler ${step_name}: ${e.message}`, 500);
  }
  await updateStep(recipe_run_id, step_number, { status: 'completed', completed_at: new Date().toISOString(), duration_ms: Date.now() - t0, output_jsonb: result });
  if (step_name === 'auditar-conta-corrente-pos-emissao' && result?.ok) {
    const top = (result.top_avisos || []).slice(0, 3).map((d: any) => `${d.fracao_codigo} €${Number(d.total).toFixed(2)}`).join(' · ');
    await notifyDiscord(`✅ **Quota extra emitida**\nData: ${result.data_emissao}\n${result.n_emitidos} avisos · €${result.total_emitido.toFixed(2)}\nMaiores: ${top}`);
  }
  return json({ ok: true, step_name, step_number, duration_ms: Date.now() - t0, output: result });
});
