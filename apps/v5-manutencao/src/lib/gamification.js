import { supa } from '../supa.js'

// Bronze < 500 · Silver 500-1499 · Gold 1500-3499 · Platinum 3500-7499 · Diamond 7500+
export function calcularNivel(pontosTotal) {
  if (pontosTotal >= 7500) return 'diamond'
  if (pontosTotal >= 3500) return 'platinum'
  if (pontosTotal >= 1500) return 'gold'
  if (pontosTotal >= 500)  return 'silver'
  return 'bronze'
}

// Regista pontos e actualiza pontos_total + nivel em subscricoes.
export async function ganharPontos(pessoaId, pontos, motivo, refTipo = null, refId = null) {
  try {
    const { error: eI } = await supa.from('pontos_historico').insert({
      pessoa_id: pessoaId,
      pontos,
      motivo,
      ref_tipo: refTipo,
      ref_id:   refId,
    })
    if (eI) throw eI
  } catch (e) {
    // TODO(mario): verificar que tabela pontos_historico existe no schema v5_manutencao
    console.warn('[gamification] pontos_historico insert falhou:', e)
    return false
  }

  try {
    const { data: sub } = await supa
      .from('subscricoes')
      .select('id, pontos_total')
      .eq('pessoa_id', pessoaId)
      .eq('estado', 'ativo')
      .maybeSingle()

    if (sub) {
      const novoTotal = (sub.pontos_total ?? 0) + pontos
      const novoNivel = calcularNivel(novoTotal)
      await supa
        .from('subscricoes')
        .update({ pontos_total: novoTotal, nivel: novoNivel })
        .eq('id', sub.id)
    }
  } catch (e) {
    // TODO(mario): UPDATE subscricoes falhou — pontos registados mas total não actualizado
    console.warn('[gamification] subscricoes update falhou:', e)
  }

  return true
}

// Calcula streak actual (dias consecutivos com pontos) e actualiza subscricoes se mudou.
export async function verificarStreak(pessoaId) {
  try {
    const { data: rows, error } = await supa
      .from('pontos_historico')
      .select('data')
      .eq('pessoa_id', pessoaId)
      .order('data', { ascending: false })
      .limit(365)

    if (error || !rows?.length) return 0

    // Datas únicas truncadas a dia (YYYY-MM-DD)
    const dias = [...new Set(rows.map(r => r.data.slice(0, 10)))].sort().reverse()

    let streak = 1
    for (let i = 1; i < dias.length; i++) {
      const prev = new Date(dias[i - 1])
      const curr = new Date(dias[i])
      const diff = Math.round((prev - curr) / 86400000)
      if (diff === 1) streak++
      else break
    }

    // Actualiza subscricoes se streak mudou
    const { data: sub } = await supa
      .from('subscricoes')
      .select('id, streak_dias, streak_recorde')
      .eq('pessoa_id', pessoaId)
      .eq('estado', 'ativo')
      .maybeSingle()

    if (sub && sub.streak_dias !== streak) {
      const novoRecorde = Math.max(sub.streak_recorde ?? 0, streak)
      await supa
        .from('subscricoes')
        .update({ streak_dias: streak, streak_recorde: novoRecorde })
        .eq('id', sub.id)
    }

    return streak
  } catch (e) {
    // TODO(mario): verificarStreak falhou — retorna 0 defensivamente
    console.warn('[gamification] verificarStreak falhou:', e)
    return 0
  }
}

// Cria uma nova missão para o utilizador.
export async function atribuirMissao(pessoaId, titulo, descricao, pontos, urgente = false, dataLimite = null) {
  try {
    const { error } = await supa.from('missoes_utilizador').insert({
      pessoa_id:   pessoaId,
      titulo,
      descricao,
      pontos,
      urgente,
      data_limite: dataLimite,
      gerada_por:  'app',
    })
    if (error) throw error
    return true
  } catch (e) {
    // TODO(mario): atribuirMissao falhou — tabela missoes_utilizador pode não existir ainda
    console.warn('[gamification] atribuirMissao falhou:', e)
    return false
  }
}

// Marca missão como concluída e atribui os pontos.
export async function concluirMissao(missaoId) {
  try {
    const { data: missao, error: eS } = await supa
      .from('missoes_utilizador')
      .select('pessoa_id, pontos, titulo')
      .eq('id', missaoId)
      .maybeSingle()

    if (eS || !missao) throw eS || new Error('missão não encontrada')

    const { error: eU } = await supa
      .from('missoes_utilizador')
      .update({ estado: 'concluida' })
      .eq('id', missaoId)

    if (eU) throw eU

    await ganharPontos(missao.pessoa_id, missao.pontos, `Missão: ${missao.titulo}`, 'missao', missaoId)
    return true
  } catch (e) {
    // TODO(mario): concluirMissao falhou
    console.warn('[gamification] concluirMissao falhou:', e)
    return false
  }
}
