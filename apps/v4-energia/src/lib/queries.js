import { supaV4, supaCore, sb } from '../supa.js';

// ─────────────────────────────────────────────────────────────────────────
//  fetchTarifasActivas — lê tarifas activas de v4_energia.tarifas
//  filtradas por potência kVA, tipo de energia e tensão.
//  Ordena por preco_kwh crescente.
// ─────────────────────────────────────────────────────────────────────────
export async function fetchTarifasActivas({ kva = 6.9, tipo_energia = 'electricidade', tensao = 'BTN' } = {}) {
  const { data, error } = await supaV4
    .from('tarifas')
    .select(`
      id, nome_plano, preco_kwh, comercializador_id, tipo_tarifa, tipo_oferta,
      tensao, periodo_horario, potencia_kva_min, potencia_kva_max, fonte_ingestao,
      data_inicio_validade, data_fim_validade,
      comercializadores ( id, nome, activo )
    `)
    .eq('ativo', true)
    .eq('tipo_energia', tipo_energia)
    .eq('tensao', tensao)
    .lte('potencia_kva_min', kva)
    .gte('potencia_kva_max', kva)
    .order('preco_kwh', { ascending: true });

  if (error) {
    console.error('[fetchTarifasActivas]', error);
    return [];
  }
  return data || [];
}

// ─────────────────────────────────────────────────────────────────────────
//  fetchOmieDam — lê preços OMIE DAM mais recentes
//  dias: janela de dias a incluir (default 1 = hoje)
//  zona: 'PT' ou 'ES' (default 'PT')
// ─────────────────────────────────────────────────────────────────────────
export async function fetchOmieDam({ dias = 1, zona = 'PT' } = {}) {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data, error } = await supaV4
    .from('omie_dam_horario')
    .select('data, hora, preco_eur_mwh')
    .eq('zona', zona)
    .gte('data', desde)
    .order('data', { ascending: false })
    .order('hora', { ascending: true });

  if (error) {
    console.error('[fetchOmieDam]', error);
    return [];
  }
  return data || [];
}

export async function getComercializadoras() {
  const { data, error } = await supaV4
    .from('acordos_comercializadoras')
    .select('*')
    .eq('ativa', true);
  if (error) throw new Error('Comercializadoras: ' + error.message);
  return data || [];
}

export async function getLeads() {
  const { data: contratos, error } = await supaV4
    .from('contratos_energia')
    .select('*')
    .order('data_pedido', { ascending: false });
  if (error) throw new Error('Leads: ' + error.message);

  const ids = [...new Set((contratos || []).map((c) => c.pessoa_id).filter(Boolean))];
  let pessoasMap = {};
  if (ids.length > 0) {
    const { data: pessoas, error: eP } = await supaCore
      .from('pessoas')
      .select('id,nome,email,telefone')
      .in('id', ids);
    if (eP) throw new Error('Pessoas: ' + eP.message);
    pessoasMap = Object.fromEntries((pessoas || []).map((p) => [p.id, p]));
  }

  return (contratos || []).map((c) => ({
    ...c,
    pessoa: pessoasMap[c.pessoa_id] || null,
    nome: pessoasMap[c.pessoa_id]?.nome || '(sem nome)',
  }));
}

export async function updateLeadEstado(id, novoEstado) {
  const { error } = await supaV4
    .from('contratos_energia')
    .update({ estado: novoEstado })
    .eq('id', id);
  if (error) throw new Error('Update estado: ' + error.message);
}

export async function criarLead({
  nome, email, telefone,
  segmento, cpe, kva, kwh,
  comercializadora_atual, valor_atual, valor_novo, comissao,
}) {
  let pessoaId = null;
  if (email) {
    const { data: existentes } = await supaCore
      .from('pessoas')
      .select('id')
      .eq('email', email)
      .limit(1);
    if (existentes && existentes.length) pessoaId = existentes[0].id;
  }
  if (!pessoaId) {
    const { data: nova, error: eP } = await supaCore
      .from('pessoas')
      .insert({ nome, email: email || null, telefone: telefone || null })
      .select('id')
      .single();
    if (eP) throw new Error('Criar pessoa: ' + eP.message);
    pessoaId = nova.id;
  }

  const { data: contrato, error: eC } = await supaV4
    .from('contratos_energia')
    .insert({
      pessoa_id: pessoaId,
      segmento,
      cpe,
      kva,
      kwh_mensal_estimado: kwh,
      comercializadora_atual,
      valor_atual,
      valor_novo,
      comissao,
      estado: 'novo',
      data_pedido: new Date().toISOString().split('T')[0],
    })
    .select('id')
    .single();
  if (eC) throw new Error('Criar contrato: ' + eC.message);
  return contrato;
}

// ─────────────────────────────────────────────────────────────────────────
//  uploadFaturaERunOcr — faz upload para v4-facturas, cria row em
//  facturas_uploaded, invoca a Edge Function v4-ocr-fatura.
//  onProgress({ stage, pct }) é chamado em cada etapa.
// ─────────────────────────────────────────────────────────────────────────
export async function uploadFaturaERunOcr({
  file,
  pessoa_id = null,
  contrato_energia_id = null,
  onProgress = () => {},
}) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const ext = file.name.split('.').pop().toLowerCase();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `${user.id}/${fileName}`;

  onProgress({ stage: 'uploading', pct: 10 });

  const { error: upErr } = await sb.storage
    .from('v4-facturas')
    .upload(filePath, file, { contentType: file.type, upsert: false });
  if (upErr) throw new Error('Upload falhou: ' + upErr.message);

  onProgress({ stage: 'inserting_row', pct: 40 });

  const { data: row, error: rowErr } = await supaV4
    .from('facturas_uploaded')
    .insert({
      pessoa_id,
      contrato_energia_id,
      uploaded_by: user.id,
      file_path: filePath,
      file_size_original_bytes: file.size,
      mime_type: file.type,
      ocr_status: 'pending',
    })
    .select('id')
    .single();
  if (rowErr) throw new Error('Registo fatura falhou: ' + rowErr.message);

  onProgress({ stage: 'ocr_running', pct: 60 });

  const { data: ocrResponse, error: fnErr } = await sb.functions.invoke('v4-ocr-fatura', {
    body: { file_path: filePath, pessoa_id, contrato_energia_id, factura_id: row.id },
  });
  if (fnErr) throw new Error('OCR falhou: ' + fnErr.message);

  onProgress({ stage: 'done', pct: 100 });
  return { factura_id: row.id, ...ocrResponse };
}

// ─────────────────────────────────────────────────────────────────────────
//  getFatura — busca uma fatura por id + cria signed URL para preview
// ─────────────────────────────────────────────────────────────────────────
export async function getFatura(factura_id) {
  const { data, error } = await supaV4
    .from('facturas_uploaded')
    .select('*')
    .eq('id', factura_id)
    .is('apagado_em', null)
    .single();
  if (error) throw new Error('Fatura: ' + error.message);

  const { data: signed } = await sb.storage
    .from('v4-facturas')
    .createSignedUrl(data.file_path, 3600);

  return { ...data, signed_url: signed?.signedUrl };
}

// ─────────────────────────────────────────────────────────────────────────
//  getFacturasPorPessoa — lista facturas activas de uma pessoa
//  inclui signed URL para preview de cada uma
// ─────────────────────────────────────────────────────────────────────────
export async function getFacturasPorPessoa(pessoa_id) {
  const { data, error } = await supaV4
    .from('facturas_uploaded')
    .select('id, file_path, mime_type, ocr_status, ocr_data, ocr_confidence, created_at, ocr_completed_at')
    .eq('pessoa_id', pessoa_id)
    .is('apagado_em', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error('Facturas: ' + error.message);

  // Criar signed URLs para cada fatura (expira em 1h)
  const comUrls = await Promise.all(
    (data || []).map(async (f) => {
      const { data: signed } = await sb.storage
        .from('v4-facturas')
        .createSignedUrl(f.file_path, 3600);
      return { ...f, signed_url: signed?.signedUrl };
    })
  );
  return comUrls;
}

// ─────────────────────────────────────────────────────────────────────────
//  apagarFactura — soft-delete via RPC v4_energia.apagar_factura(UUID)
// ─────────────────────────────────────────────────────────────────────────
export async function apagarFactura(factura_id) {
  const { error } = await supaV4.rpc('apagar_factura', { p_id: factura_id });
  if (error) throw new Error('Apagar fatura: ' + error.message);
}
