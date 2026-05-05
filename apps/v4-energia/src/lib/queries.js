import { supaV4, supaCore } from '../supa.js';

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
