import { supabase } from './supabase'

const db = () => supabase.schema('v5_manutencao')

// Map DB estados → CalendarView status keys
const ESTADO_MAP = {
  agendada:  'agendado',
  em_curso:  'agendado',
  concluida: 'concluido',
  cancelada: 'bloqueado',
  pendente:  'pendente',
}

export function mapEstado(estado) {
  return ESTADO_MAP[estado] ?? 'bloqueado'
}

// ── Prestador ──────────────────────────────────────────────────────────────

export async function getPrestador(userId) {
  const { data, error } = await db()
    .from('prestadores')
    .select('id, nome, nif, iban, localidade, nivel, taxa_plataforma, estado')
    .eq('pessoa_id', userId)
    .single()
  if (error) console.error('getPrestador', error)
  return data ?? null
}

export async function getOrdensPrestador(prestadorId) {
  const { data, error } = await db()
    .from('servicos_mant')
    .select('id, tipo, ordens_trabalho(id, data_agendada, data_execucao, estado, avaliacao)')
    .eq('prestador_id', prestadorId)
  if (error) { console.error('getOrdensPrestador', error); return [] }

  // Flatten: [{titulo, data_inicio, status}]
  return (data ?? []).flatMap(s =>
    (s.ordens_trabalho ?? []).map(o => ({
      id:          o.id,
      titulo:      s.tipo,
      data_inicio: o.data_agendada,
      status:      mapEstado(o.estado),
      estado:      o.estado,
      avaliacao:   o.avaliacao,
    }))
  )
}

export async function getCarteira(prestadorId) {
  const { data, error } = await db()
    .from('carteira_prestador')
    .select('saldo_disponivel, saldo_pendente, total_ganho, total_levantado')
    .eq('prestador_id', prestadorId)
    .single()
  if (error) console.error('getCarteira', error)
  return data ?? { saldo_disponivel: 0, saldo_pendente: 0 }
}

// ── Cliente ────────────────────────────────────────────────────────────────

export async function getServicosCliente(pessoaId) {
  const { data, error } = await db()
    .from('servicos_mant')
    .select('id, tipo, periodicidade, valor, estado, ordens_trabalho(id, data_agendada, estado)')
    .eq('pessoa_id', pessoaId)
  if (error) { console.error('getServicosCliente', error); return [] }
  return data ?? []
}

// ── Gestor ─────────────────────────────────────────────────────────────────

export async function getStatsGestor() {
  const [ordens, prestadores, receita] = await Promise.all([
    db()
      .from('ordens_trabalho')
      .select('id, estado', { count: 'exact' })
      .in('estado', ['agendada', 'em_curso']),
    db()
      .from('prestadores')
      .select('id', { count: 'exact' })
      .eq('estado', 'activo'),
    db()
      .from('movimentos_carteira')
      .select('valor')
      .eq('tipo', 'credito_servico')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  const receitaMes = (receita.data ?? []).reduce((sum, m) => sum + Number(m.valor), 0)

  return {
    ordensPendentes:    ordens.count ?? 0,
    prestadoresActivos: prestadores.count ?? 0,
    receitaMes,
    servicosActivos:    0,
  }
}
