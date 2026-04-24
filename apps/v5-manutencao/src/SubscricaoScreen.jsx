import React, { useState, useEffect } from 'react'
import { supa } from './supa.js'
import { DEMO_PESSOA_ID } from './lib/demo.js'
import { planosDisponiveis } from './lib/subscription.js'
import { calcularNivel } from './lib/gamification.js'

const V = {
  forest:     '#1B4332',
  forestDeep: '#072819',
  emerald:    '#52B788',
  emeraldDark:'#059669',
  pale:       '#D8F3DC',
  paleDeep:   '#ECFDF5',
  ink:        '#0A1620',
  stone:      '#6B7685',
  line:       '#E5E7EB',
  gold:       '#D4A72C',
  goldSoft:   '#FEF9C3',
  white:      '#FFFFFF',
  bg:         '#F9FAF8',
}

const PLANO_FEATURES = {
  gratis: [
    'Acesso ao catálogo completo',
    'Pedidos a técnicos certificados',
    '20% de comissão por serviço',
    'Chat com suporte',
  ],
  home_plus: [
    '10% de crédito em cada serviço',
    '15% de comissão (vs 20% no Grátis)',
    'Pontos duplos em serviços',
    'Acesso prioritário a técnicos',
    'Alertas de manutenção preventiva',
  ],
  home_pro: [
    '10% de crédito em cada serviço',
    '10% de comissão — o mais baixo',
    'Pontos triplos em serviços',
    'Técnico dedicado (quando disponível)',
    'Relatório anual da casa',
    'Acesso antecipado a novas funcionalidades',
  ],
}

export default function SubscricaoScreen({ open, onClose, authUser }) {
  const [subscricao, setSubscricao] = useState(null)
  const [pontosmes,  setPontosmes]  = useState(0)
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const pid = DEMO_PESSOA_ID
    const agora = new Date()
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

    Promise.all([
      supa.from('subscricoes').select('id, plano, preco_mensal, estado, pontos_total, nivel, data_inicio, data_renovacao').eq('pessoa_id', pid).eq('estado', 'ativo').maybeSingle(),
      supa.from('pontos_historico').select('pontos').eq('pessoa_id', pid).gte('data', inicioMes),
    ]).then(([rS, rH]) => {
      setSubscricao(rS.data || null)
      const total = (rH.data || []).reduce((acc, r) => acc + (r.pontos || 0), 0)
      setPontosmes(total)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [open])

  if (!open) return null

  const planoActual = subscricao?.plano || 'gratis'
  const precoBase = subscricao?.preco_mensal ?? 0
  // TODO(mario): substituir cálculo dinâmico por leitura de creditos_mensais quando Fase 5 popular tabela
  const creditoGanho = 0
  const liquidoPago = Math.max(0, parseFloat(precoBase) - creditoGanho)
  const dataRenovacao = subscricao?.data_renovacao
    ? new Date(subscricao.data_renovacao).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 210,
      background: V.bg, overflowY: 'auto',
      animation: 'slideInSub 300ms ease-out',
    }}>
      <style>{`
        @keyframes slideInSub { from { transform:translateX(100%) } to { transform:translateX(0) } }
      `}</style>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: V.white, borderBottom: `1px solid ${V.line}`,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
      }}>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0', fontSize: 20, color: V.forest, lineHeight: 1 }}
          aria-label="Voltar"
        >‹</button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: V.ink }}>A minha subscrição</div>
          <div style={{ fontSize: 11, color: V.stone }}>Planos e benefícios</div>
        </div>
      </div>

      <div style={{ padding: '20px 16px 40px', maxWidth: 600, margin: '0 auto' }}>

        {loading ? (
          <LoadingSkel />
        ) : (
          <>
            {/* Card plano actual */}
            <div style={{
              background: V.forest, borderRadius: 16, padding: '20px',
              marginBottom: 16, color: V.white,
              boxShadow: '0 4px 20px rgba(27,67,50,0.25)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.pale, marginBottom: 4 }}>Plano actual</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{planNome(planoActual)}</div>
                </div>
                <div style={{
                  background: V.emerald + '33', border: `1px solid ${V.emerald}`,
                  borderRadius: 20, padding: '4px 12px',
                  fontSize: 12, fontWeight: 700, color: V.pale,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{ color: '#4ade80' }}>✓</span> Ativa
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, color: V.pale, marginBottom: 2 }}>Preço mensal</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{parseFloat(precoBase).toFixed(2).replace('.', ',')}€</div>
                </div>
                {dataRenovacao && (
                  <div>
                    <div style={{ fontSize: 11, color: V.pale, marginBottom: 2 }}>Próxima renovação</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{dataRenovacao}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Breakdown do mês */}
            <div style={{ background: V.white, borderRadius: 14, padding: '16px', marginBottom: 20, border: `1px solid ${V.line}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: V.stone, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Este mês</div>
              <BreakdownRow label="Subscrição base" value={`${parseFloat(precoBase).toFixed(2).replace('.', ',')}€`} />
              <BreakdownRow label="Crédito ganho em serviços" value={`−${creditoGanho.toFixed(2).replace('.', ',')}€`} muted={creditoGanho === 0} />
              <div style={{ height: 1, background: V.line, margin: '10px 0' }} />
              <BreakdownRow label="Líquido pago" value={`${liquidoPago.toFixed(2).replace('.', ',')}€`} bold />
              <BreakdownRow
                label="Pontos acumulados este mês"
                value={`+${pontosmes} pts`}
                accent={V.gold}
              />
            </div>

            {/* Comparação de planos */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: V.ink, marginBottom: 12 }}>Todos os planos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {planosDisponiveis.map(p => (
                  <PlanCard
                    key={p.id}
                    plano={p}
                    isActual={p.id === planoActual}
                    features={PLANO_FEATURES[p.id] || []}
                  />
                ))}
              </div>
            </div>

            {/* Footer links */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => alert('Cancelamento de subscrição disponível em fase 5 com Stripe.')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: V.stone, textDecoration: 'underline' }}
              >Cancelar subscrição</button>
              <button
                onClick={() => alert('Termos e condições em breve.')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: V.stone, textDecoration: 'underline' }}
              >Termos e condições</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PlanCard({ plano, isActual, features }) {
  const V2 = { forest: '#1B4332', emerald: '#52B788', pale: '#D8F3DC', paleDeep: '#ECFDF5', white: '#FFFFFF', line: '#E5E7EB', stone: '#6B7685', ink: '#0A1620' }
  return (
    <div style={{
      borderRadius: 14, padding: '16px',
      background: isActual ? V2.paleDeep : V2.white,
      border: isActual ? `2px solid ${V2.forest}` : `1px solid ${V2.line}`,
      position: 'relative',
    }}>
      {isActual && (
        <div style={{
          position: 'absolute', top: -1, right: 14,
          background: V2.forest, color: V2.white,
          fontSize: 10, fontWeight: 700, padding: '3px 10px',
          borderRadius: '0 0 8px 8px', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>Plano actual</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: V2.ink }}>{plano.nome}</div>
          <div style={{ fontSize: 11, color: V2.stone, marginTop: 2 }}>
            {plano.percentCredito > 0 ? `${plano.percentCredito}% crédito · ` : ''}{plano.comissao}% comissão
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {plano.preco === 0 ? (
            <div style={{ fontSize: 18, fontWeight: 800, color: V2.ink }}>Grátis</div>
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 800, color: V2.forest }}>{plano.preco.toFixed(2).replace('.', ',')}€</div>
              <div style={{ fontSize: 10, color: V2.stone }}>/mês</div>
            </>
          )}
        </div>
      </div>
      <ul style={{ margin: '0 0 14px', padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {features.map((f, i) => (
          <li key={i} style={{ fontSize: 12, color: V2.stone }}>{f}</li>
        ))}
      </ul>
      {isActual ? (
        <button disabled style={{
          width: '100%', padding: '10px', borderRadius: 8,
          background: V2.pale, border: `1px solid ${V2.forest}44`,
          color: V2.forest, fontSize: 13, fontWeight: 700, cursor: 'default',
        }}>Plano actual</button>
      ) : (
        <button
          onClick={() => alert(`Stripe checkout em fase 5.\nPlano seleccionado: ${plano.nome}`)}
          style={{
            width: '100%', padding: '10px', borderRadius: 8,
            background: V2.emerald, border: 'none',
            color: V2.white, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >Subscrever {plano.preco > 0 ? `— ${plano.preco.toFixed(2).replace('.', ',')}€/mês` : '(Grátis)'}</button>
      )}
    </div>
  )
}

function BreakdownRow({ label, value, bold, muted, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span style={{ fontSize: 13, color: muted ? '#A0ADB8' : '#4B5563' }}>{label}</span>
      <span style={{
        fontSize: 13,
        fontWeight: bold ? 700 : 500,
        color: accent || (bold ? '#0A1620' : (muted ? '#A0ADB8' : '#374151')),
      }}>{value}</span>
    </div>
  )
}

function LoadingSkel() {
  const b = { height: 120, borderRadius: 16, background: '#D8F3DC', marginBottom: 16 }
  return (
    <div>
      <div style={b} />
      <div style={{ ...b, height: 100 }} />
    </div>
  )
}

function planNome(planoId) {
  const m = { gratis: 'Grátis', home_plus: 'Home+', home_pro: 'Home Pro' }
  return m[planoId] || planoId
}
