import React, { useState, useEffect } from 'react'
import { supa } from './supa.js'
import { DEMO_PESSOA_ID } from './lib/demo.js'
import { calcularCreditoMes } from './lib/subscription.js'

/* Paleta V5 — cópia local para isolar módulo do App.jsx */
const V5 = {
  green:    '#1B4332',
  greenMid: '#2D6A4F',
  greenLt:  '#52B788',
  greenXl:  '#D8F3DC',
  ink:      '#0f172a',
  slate:    '#64748b',
  border:   '#e2e8f0',
  bg:       '#f8fafc',
  white:    '#fff',
}

/* Mapeamento de estado → tab */
const EM_CURSO  = new Set(['em_curso','pendente','aguarda_validacao','proposta_hora','pendente_orcamento'])
const AGENDADOS = new Set(['agendado'])
const HISTORICO = new Set(['concluida','paga','faturada','cancelada','expirada'])

function tabParaOrdem(st) {
  if (!st || EM_CURSO.has(st))  return 'em_curso'
  if (AGENDADOS.has(st))        return 'agendados'
  if (HISTORICO.has(st))        return 'historico'
  // TODO(mario): estado inesperado tratado como Em curso: adicionar ao mapeamento quando surgir
  return 'em_curso'
}

/* ── Helpers (adapted from CPedidos) ──────────────────────────── */

const CAT_LABELS = {
  limpeza:'Limpeza', manutencao:'Manutenção', jardim:'Jardim',
  piscina:'Piscina', pintura:'Pintura', eletrica:'Eléctrica',
  canalizacao:'Canalização', pos_obra:'Pós-obra',
}
const CAT_ICONS = {
  limpeza:'🧹', manutencao:'🔧', jardim:'🌿', piscina:'🏊',
  pintura:'🎨', eletrica:'⚡', canalizacao:'🚿', pos_obra:'🏗️',
}

function haMin(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0 || Number.isNaN(ms)) return ''
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'há instantes'
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)} dias`
}

function quandoLabel(o) {
  if (o.schedule_mode === 'imediato') return 'Imediato · 30-40 min'
  if (o.data_agendada && o.hora_agendada) {
    try {
      const d = new Date(o.data_agendada + 'T00:00:00')
      return `${d.toLocaleDateString('pt-PT', { weekday:'short', day:'numeric', month:'short' })} · ${o.hora_agendada}`
    } catch {}
  }
  return o.data || ''
}

function nomeServico(o) {
  if (o.servico_nome)    return o.servico_nome
  if (o.nome)            return o.nome
  if (o.is_personalizado) return 'Serviço personalizado'
  return 'Serviço'
}

function icServico(o) {
  if (o.categoria_id && CAT_ICONS[o.categoria_id]) return CAT_ICONS[o.categoria_id]
  return '🔧'
}

function eurFmt(v) {
  if (v == null) return null
  return `€${Number(v).toFixed(2).replace('.', ',')}`
}

/* ── Componentes de UI ─────────────────────────────────────────── */

function Skel({ h = 80 }) {
  return (
    <div style={{
      height: h, borderRadius: 14, marginBottom: 8,
      background: 'linear-gradient(90deg,rgba(27,67,50,0.06) 25%,rgba(27,67,50,0.12) 50%,rgba(27,67,50,0.06) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skel-sweep 1.4s ease-in-out infinite',
    }} />
  )
}

function EstBadge({ st }) {
  const map = {
    em_curso:           { l:'Em curso',            bg:'#dcfce7', c:'#14532d' },
    pendente:           { l:'Pendente',             bg:'#fef3c7', c:'#92400e' },
    aguarda_validacao:  { l:'A validar',            bg:'#eff6ff', c:'#1d4ed8' },
    proposta_hora:      { l:'Nova hora proposta',   bg:'#faf5ff', c:'#6d28d9' },
    pendente_orcamento: { l:'A aguardar orçamento', bg:'#fef9c3', c:'#854d0e' },
    agendado:           { l:'Agendado',             bg:'#e0f2fe', c:'#0369a1' },
    concluida:          { l:'Concluída',            bg:'#f8fafc', c:'#64748b' },
    paga:               { l:'Paga',                 bg:'#f0fdf4', c:'#15803d' },
    faturada:           { l:'Faturada',             bg:'#f0fdf4', c:'#15803d' },
    cancelada:          { l:'Cancelada',            bg:'#fef2f2', c:'#b91c1c' },
    expirada:           { l:'Expirada',             bg:'#f8fafc', c:'#94a3b8' },
  }
  const s = map[st] || { l: st || '—', bg: '#f8fafc', c: '#64748b' }
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, background: s.bg, color: s.c,
      padding: '3px 9px', borderRadius: 20, flexShrink: 0,
    }}>{s.l}</span>
  )
}

function EmptyState({ ic, title, sub }) {
  return (
    <div style={{
      padding: '40px 24px 32px', textAlign: 'center',
      background: V5.white, borderRadius: 14,
      border: `1px dashed ${V5.border}`, margin: '4px 0',
    }}>
      <div style={{
        width: 64, height: 64, margin: '0 auto 14px', borderRadius: 999,
        background: V5.greenXl, display: 'grid', placeItems: 'center', fontSize: 30,
      }}>{ic}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: V5.ink, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: V5.slate, lineHeight: 1.5, maxWidth: 260, margin: '0 auto' }}>{sub}</div>
    </div>
  )
}

function OrdemCard({ o, onOrdem }) {
  const nome  = nomeServico(o)
  const ic    = icServico(o)
  const catNome = o.categoria_id ? CAT_LABELS[o.categoria_id] : null
  const valor   = eurFmt(o.valor_cobrado ?? o.val)
  const quando  = quandoLabel(o)
  const pedidoLabel = haMin(o.dt_pedido_iso || o.created_at)

  return (
    <div onClick={() => onOrdem(o)} style={{
      background: V5.white, borderRadius: 14,
      border: `1px solid ${V5.border}`,
      padding: '13px 14px', marginBottom: 8,
      cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{ic}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: V5.slate,
              fontFamily: 'ui-monospace,monospace', letterSpacing: 0.3,
            }}>
              {o.numero_sequencial || 'Pedido recente'}
            </span>
            <EstBadge st={o.st} />
          </div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: V5.ink,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{nome}</div>
          {(catNome || valor) && (
            <div style={{ fontSize: 11, color: V5.slate, marginTop: 2 }}>
              {catNome && <span>{catNome}</span>}
              {catNome && valor && <span> · </span>}
              {valor && <span style={{ fontWeight: 700, color: V5.ink }}>{valor}</span>}
            </div>
          )}
          {quando && <div style={{ fontSize: 11, color: V5.slate, marginTop: 2 }}>{quando}</div>}
          {pedidoLabel && <div style={{ fontSize: 10, color: V5.slate, marginTop: 2 }}>{pedidoLabel}</div>}
        </div>
      </div>
    </div>
  )
}

/* ── Footer de subscrição ────────────────────────────────────── */
function SubscricaoFooter({ ordens }) {
  const [sub, setSub]         = useState(undefined) // undefined = a carregar, null = sem sub
  const [credito, setCredito] = useState(0)

  useEffect(() => {
    let active = true
    const now = new Date()
    const ano = now.getFullYear()
    const mes = now.getMonth() + 1

    async function load() {
      // TODO(mario): substituir DEMO_PESSOA_ID por authUser.pessoa_id quando auth real implementada (Fase 4)
      const [subRes, creditoRes] = await Promise.all([
        supa.from('subscricoes')
          .select('id,plano,preco_mensal,estado')
          .eq('pessoa_id', DEMO_PESSOA_ID)
          .eq('estado', 'ativo')
          .maybeSingle(),
        calcularCreditoMes(DEMO_PESSOA_ID, ano, mes),
      ])

      if (!active) return

      const subRow = subRes?.data || null
      setSub(subRow)

      if (creditoRes) {
        setCredito(creditoRes.credito ?? 0)
      } else {
        // Fallback: 10% das ordens concluídas este mês
        // TODO(mario): substituir fallback por trigger Postgres em Fase 5 (Stripe webhook → update creditos_mensais)
        const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1)
        const concluidas = (ordens || []).filter(o =>
          ['concluida', 'paga', 'faturada'].includes(o.st) &&
          o.dt_pedido_iso && new Date(o.dt_pedido_iso) >= inicioMes
        )
        const total = concluidas.reduce((acc, o) => acc + (Number(o.valor_cobrado ?? o.val) || 0), 0)
        setCredito(total * 0.10)
      }
    }
    load()
    return () => { active = false }
  }, [ordens])

  if (sub === undefined) return <Skel h={68} />
  if (!sub) return null

  const preco  = Number(sub.preco_mensal || 0)
  const falta  = Math.max(0, preco - credito)
  const pct    = preco > 0 ? Math.min(100, (credito / preco) * 100) : 0
  const gratis = falta === 0

  return (
    <div style={{
      background: gratis ? V5.greenXl : V5.white,
      border: `1px solid ${gratis ? V5.greenLt : V5.border}`,
      borderRadius: 14, padding: '13px 14px', marginTop: 8,
    }}>
      {gratis ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🎉</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: V5.green }}>
              A tua subscrição é grátis este mês!
            </div>
            <div style={{ fontSize: 11, color: V5.greenMid, marginTop: 2 }}>
              Crédito acumulado cobre os €{preco.toFixed(2).replace('.', ',')} do plano.
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>💚</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: V5.ink }}>
              Faltam €{falta.toFixed(2).replace('.', ',')} para subscrição grátis
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: V5.border, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: `linear-gradient(90deg,${V5.greenLt},${V5.green})`,
              width: `${pct}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ fontSize: 11, color: V5.slate, marginTop: 4 }}>
            €{credito.toFixed(2).replace('.', ',')} de €{preco.toFixed(2).replace('.', ',')} acumulados este mês
          </div>
        </>
      )}
    </div>
  )
}

/* ── Ecrã principal ──────────────────────────────────────────── */
const TABS = [
  { id: 'em_curso',  l: 'Em curso' },
  { id: 'agendados', l: 'Agendados' },
  { id: 'historico', l: 'Histórico' },
]

const EMPTY = {
  em_curso:  { ic:'⏳', title:'Sem pedidos em curso',   sub:'Os teus pedidos activos aparecem aqui. Toca no ✨ para criar um serviço.' },
  agendados: { ic:'📅', title:'Sem pedidos agendados',  sub:'Quando agendares um serviço ele aparece aqui.' },
  historico: { ic:'📋', title:'Sem histórico',          sub:'Os pedidos concluídos e cancelados ficam aqui para consulta.' },
}

export default function PedidosScreen({ ordens, authUser, onOrdem, onHamburguer }) {
  const [tabAtivo, setTabAtivo] = useState('em_curso')

  const ordensTab = (ordens || []).filter(o => tabParaOrdem(o.st) === tabAtivo)

  return (
    <div style={{ minHeight: '100vh', background: V5.bg, paddingBottom: 90 }}>
      {/* Header fixo com tabs */}
      <div style={{
        background: V5.white, padding: '14px 16px 0',
        borderBottom: `1px solid ${V5.border}`,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <button
            onClick={onHamburguer}
            aria-label="Abrir menu"
            style={{
              width:32, height:32, borderRadius:'50%',
              background:'rgba(27,67,50,0.08)',
              border:'none', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:16, color:'#1B4332', flexShrink:0,
            }}
          >≡</button>
          <h1 style={{ fontSize: 19, fontWeight: 800, color: V5.ink, margin: 0, flex:1 }}>
            Os meus pedidos
          </h1>
        </div>
        <div style={{ display: 'flex' }}>
          {TABS.map(t => {
            const active = tabAtivo === t.id
            return (
              <button key={t.id} onClick={() => setTabAtivo(t.id)} style={{
                flex: 1, padding: '9px 4px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? V5.green : V5.slate,
                borderBottom: active ? `2.5px solid ${V5.green}` : '2.5px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
              }}>
                {t.l}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '14px 14px 28px' }}>
        {/* Lista ou empty state */}
        {ordensTab.length === 0
          ? <EmptyState {...EMPTY[tabAtivo]} />
          : ordensTab.map(o => <OrdemCard key={o.id} o={o} onOrdem={onOrdem} />)
        }

        {/* Footer subscrição — visível em qualquer tab */}
        <SubscricaoFooter ordens={ordens} />
      </div>
    </div>
  )
}
