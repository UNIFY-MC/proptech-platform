import { supa } from '../supa.js'
import { DEMO_PESSOA_ID } from './demo.js'

export async function fetchPerfisFiscais(pessoaId = DEMO_PESSOA_ID) {
  const { data } = await supa
    .from('perfis_fiscais')
    .select('*')
    .eq('pessoa_id', pessoaId)
    .order('principal', { ascending: false })
  return data || []
}

export function getPerfilFiscalAplicavel({ localizacao, perfisFiscais }) {
  // 1. Localização tem perfil específico
  if (localizacao?.perfil_fiscal_id) {
    const perfil = perfisFiscais.find(p => p.id === localizacao.perfil_fiscal_id)
    if (perfil) return { ...perfil, fonte: 'imovel' }
  }
  // 2. Perfil principal da pessoa
  const principal = perfisFiscais.find(p => p.principal)
  if (principal) return { ...principal, fonte: 'pessoa' }
  // 3. Nenhum perfil encontrado
  return null
}

export function snapshotPerfil(perfil) {
  if (!perfil) return null
  return {
    nif:               perfil.nif,
    nome:              perfil.nome,
    nome_facturacao:   perfil.nome_facturacao,
    morada_facturacao: perfil.morada_facturacao,
    iban:              perfil.iban,
  }
}
