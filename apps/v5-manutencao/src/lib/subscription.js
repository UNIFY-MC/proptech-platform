import { supa } from '../supa.js'

export const planosDisponiveis = [
  {
    id: 'gratis',
    nome: 'Grátis',
    preco: 0,
    percentCredito: 0,
    comissao: 20,
    descricao: 'Acesso básico à plataforma',
  },
  {
    id: 'home_plus',
    nome: 'Home+',
    preco: 6.90,
    percentCredito: 10,
    comissao: 15,
    descricao: '10% de crédito em cada serviço',
  },
  {
    id: 'home_pro',
    nome: 'Home Pro',
    preco: 12.90,
    percentCredito: 10,
    comissao: 10,
    descricao: '10% crédito + bónus exclusivos',
    bonus: true,
  },
]

// Devolve {gasto, credito, subscricaoPaga} para um dado pessoa_id, ano e mês.
// Retorna null se não houver subscrição activa.
export async function calcularCreditoMes(pessoaId, ano, mes) {
  const { data: subs, error: eS } = await supa
    .from('subscricoes')
    .select('id, plano, preco_mensal')
    .eq('pessoa_id', pessoaId)
    .eq('estado', 'ativo')
    .maybeSingle()

  if (eS || !subs) return null

  const { data: cm, error: eC } = await supa
    .from('creditos_mensais')
    .select('gasto_servicos, credito_ganho, subscricao_paga')
    .eq('subscricao_id', subs.id)
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle()

  if (eC) return null

  return {
    gasto: cm?.gasto_servicos ?? 0,
    credito: cm?.credito_ganho ?? 0,
    subscricaoPaga: cm?.subscricao_paga ?? subs.preco_mensal,
  }
}

// Quanto o utilizador paga pela subscrição neste mês (preço - crédito acumulado).
export async function subscricaoPagar(subscricaoId, mes) {
  const ano = new Date().getFullYear()

  const { data: sub, error: eS } = await supa
    .from('subscricoes')
    .select('preco_mensal')
    .eq('id', subscricaoId)
    .maybeSingle()

  if (eS || !sub) return null

  const { data: cm, error: eC } = await supa
    .from('creditos_mensais')
    .select('credito_ganho')
    .eq('subscricao_id', subscricaoId)
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle()

  if (eC) return null

  const credito = cm?.credito_ganho ?? 0
  return Math.max(0, sub.preco_mensal - credito)
}
