import { supa } from '../supa.js'
import { planosDisponiveis } from './subscription.js'

export async function getDescontoAplicavel(pessoaId, valorBase) {
  if (!pessoaId || !valorBase || valorBase <= 0) return null

  const { data: sub } = await supa
    .from('subscricoes')
    .select('plano, preco_mensal')
    .eq('pessoa_id', pessoaId)
    .eq('estado', 'ativo')
    .maybeSingle()

  if (!sub?.plano) return null

  const plano = planosDisponiveis.find(p => p.id === sub.plano)
  if (!plano || plano.percentCredito <= 0) return null

  const creditoEur = Math.round(valorBase * plano.percentCredito) / 100

  return {
    tipo:       'plano',
    label:      `${plano.nome} · ${plano.percentCredito}% crédito`,
    pct:        plano.percentCredito,
    credito_eur: creditoEur,
    // Crédito é cashback (não desconto imediato), mas mostramos como benefício
  }
}
