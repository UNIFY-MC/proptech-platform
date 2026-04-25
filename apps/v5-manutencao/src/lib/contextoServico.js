import { supa } from '../supa.js'

// Perguntas contextuais por categoria — persistidas em contexto_servico
export const PERGUNTAS_POR_CATEGORIA = {
  limpeza: [
    { id: 'tipologia', label: 'Tipo de espaço', tipo: 'opcoes', opcoes: ['Apartamento', 'Moradia', 'Escritório', 'Outro'] },
    { id: 'area_m2',   label: 'Área aproximada (m²)', tipo: 'numero' },
    { id: 'animais',   label: 'Tens animais de estimação?', tipo: 'sim_nao' },
    { id: 'frequencia',label: 'Com que frequência limpas actualmente?', tipo: 'opcoes', opcoes: ['Semanalmente', 'Quinzenalmente', 'Mensalmente', 'Raramente'] },
  ],
  manutencao: [
    { id: 'tipo_caldeira', label: 'Tipo de aquecimento', tipo: 'opcoes', opcoes: ['Caldeira a gás', 'Bomba de calor', 'Elétrico', 'Sem aquecimento central'] },
    { id: 'ano_construcao', label: 'Ano de construção aproximado', tipo: 'opcoes', opcoes: ['Antes de 1990', '1990–2000', '2000–2010', 'Depois de 2010'] },
    { id: 'ultimo_servico', label: 'Último serviço de manutenção', tipo: 'opcoes', opcoes: ['Menos de 1 ano', '1–2 anos', 'Mais de 2 anos', 'Nunca'] },
  ],
  canalizacao: [
    { id: 'tipo_problema', label: 'Tipo de problema habitual', tipo: 'opcoes', opcoes: ['Entupimentos', 'Fugas', 'Pressão baixa', 'Sem problemas conhecidos'] },
    { id: 'idade_canaliz', label: 'Idade da canalização', tipo: 'opcoes', opcoes: ['Menos de 10 anos', '10–20 anos', 'Mais de 20 anos', 'Desconhecida'] },
  ],
  eletrica: [
    { id: 'quadro_diferenciais', label: 'O quadro eléctrico tem diferenciais?', tipo: 'sim_nao' },
    { id: 'pontos_carga', label: 'Tens pontos de carregamento EV?', tipo: 'sim_nao' },
    { id: 'ultimo_cert', label: 'Última certificação eléctrica', tipo: 'opcoes', opcoes: ['Menos de 5 anos', '5–10 anos', 'Mais de 10 anos', 'Nunca feita'] },
  ],
  pintura: [
    { id: 'tipo_superficie', label: 'Tipo de superfície principal', tipo: 'opcoes', opcoes: ['Paredes interiores', 'Tecto', 'Fachada', 'Madeiras/gradeamentos'] },
    { id: 'ultima_pintura', label: 'Última pintura', tipo: 'opcoes', opcoes: ['Menos de 3 anos', '3–7 anos', 'Mais de 7 anos', 'Desconhecido'] },
  ],
  jardim: [
    { id: 'area_jardim', label: 'Área do jardim (m²)', tipo: 'opcoes', opcoes: ['Menos de 50m²', '50–150m²', '150–500m²', 'Mais de 500m²'] },
    { id: 'sistema_rega', label: 'Tens sistema de rega automático?', tipo: 'sim_nao' },
    { id: 'tipo_relvado', label: 'Tipo de relvado', tipo: 'opcoes', opcoes: ['Natural', 'Sintético', 'Sem relvado'] },
  ],
  piscina: [
    { id: 'tipo_piscina', label: 'Tipo de piscina', tipo: 'opcoes', opcoes: ['Interior', 'Exterior', 'Plunge pool'] },
    { id: 'sistema_filtro', label: 'Sistema de filtragem', tipo: 'opcoes', opcoes: ['Areia', 'Diatomáceas', 'Sal', 'Desconhecido'] },
    { id: 'coberta', label: 'Tem cobertura?', tipo: 'sim_nao' },
  ],
  pos_obra: [
    { id: 'tipo_obra', label: 'Tipo de obra realizada', tipo: 'opcoes', opcoes: ['Remodelação completa', 'Cozinha/casa de banho', 'Paredes/pavimentos', 'Outro'] },
    { id: 'area_limpeza', label: 'Área a limpar (m²)', tipo: 'numero' },
  ],
}

export async function getContextoExistente(localizacaoId, categoriaSlug) {
  if (!localizacaoId || !categoriaSlug) return {}
  const { data } = await supa
    .from('contexto_servico')
    .select('perguntas_respostas')
    .eq('localizacao_id', localizacaoId)
    .eq('categoria_slug', categoriaSlug)
    .maybeSingle()
  return data?.perguntas_respostas || {}
}

export async function saveContexto(localizacaoId, categoriaSlug, perguntas_respostas) {
  if (!localizacaoId || !categoriaSlug) return
  await supa
    .from('contexto_servico')
    .upsert({
      localizacao_id:      localizacaoId,
      categoria_slug:      categoriaSlug,
      perguntas_respostas,
      ultima_atualizacao:  new Date().toISOString(),
    }, { onConflict: 'localizacao_id,categoria_slug' })
}
