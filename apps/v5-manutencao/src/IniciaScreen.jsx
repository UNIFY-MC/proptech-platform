import React, { useState, useEffect } from 'react'
import { supa } from './supa.js'
import { DEMO_PESSOA_ID, DEMO_ORGANIZATION_ID, DEMO_LOCALIZACAO_ID } from './lib/demo.js'
import { calcularCreditoMes, planosDisponiveis } from './lib/subscription.js'
import { calcularNivel } from './lib/gamification.js'

const NIVEL_ORDEM = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
const NIVEL_LABELS = { bronze: 'Bronze', silver: 'Prata', gold: 'Ouro', platinum: 'Platina', diamond: 'Diamante' }
const NIVEL_EMOJIS = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎', diamond: '💠' }
const NIVEL_THRESHOLDS = { bronze: 0, silver: 500, gold: 1500, platinum: 3500, diamond: 7500 }

const ALERTA_SORT = { urgente: 0, atencao: 1, info: 2, boas_noticias: 3 }
const ALERTA_IC   = { urgente: '🚨', atencao: '⚠️', info: 'ℹ️', boas_noticias: '🎉' }
const ALERTA_STYLE = {
  urgente:       { bg: '#FFEBEE', col: '#B71C1C', border: '#FFCDD2' },
  atencao:       { bg: '#FFF3E0', col: '#E65100', border: '#FFE0B2' },
  info:          { bg: '#E3F2FD', col: '#0D47A1', border: '#BBDEFB' },
  boas_noticias: { bg: '#E8F5E9', col: '#1B5E20', border: '#C8E6C9' },
}

function Skel({ h = 60, r = 12 }) {
  return <div style={{ height: h, borderRadius: r, background: 'rgba(27,67,50,0.08)' }} />
}

function scoreCircleColor(s) {
  if (s <= 40) return '#D32F2F'
  if (s <= 60) return '#F57C00'
  if (s <= 80) return '#52B788'
  return '#1B4332'
}

export default function IniciaScreen({ authUser, onNavigateCasa, onHamburguer }) {
  const [subscricao, setSubscricao]   = useState(null)
  const [creditoMes, setCreditoMes]   = useState(undefined) // undefined = a carregar
  const [localizacao, setLocalizacao] = useState(null)
  const [missoes, setMissoes]         = useState(null)     // null = a carregar
  const [alertas, setAlertas]         = useState(null)
  const [dataLoaded, setDataLoaded]   = useState(false)

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 19 ? 'Boa tarde' : 'Boa noite'
  const primeiroNome = (authUser?.nome || 'Maria').split(' ')[0]

  useEffect(() => {
    let active = true
    const now = new Date()

    async function load() {
      // TODO(mario): substituir DEMO_PESSOA_ID por authUser.pessoa_id quando auth real implementada (Fase 4)
      const [subRes, locRes, misRes, alertRes] = await Promise.all([
        supa.from('subscricoes')
          .select('*')
          .eq('pessoa_id', DEMO_PESSOA_ID)
          .eq('estado', 'ativo')
          .maybeSingle(),
        supa.from('localizacoes')
          .select('nome, tipologia, localidade, home_score, assessment_completo, pontos_total')
          .eq('id', DEMO_LOCALIZACAO_ID)
          .maybeSingle(),
        supa.from('missoes_utilizador')
          .select('*')
          .eq('pessoa_id', DEMO_PESSOA_ID)
          .eq('estado', 'aberta')
          .order('urgente', { ascending: false })
          .order('pontos', { ascending: false })
          .limit(3),
        supa.from('alertas_inteligentes')
          .select('*')
          .eq('organization_id', DEMO_ORGANIZATION_ID)
          .eq('estado', 'ativo')
          .limit(3),
      ])

      if (!active) return

      setSubscricao(subRes.data || null)
      setLocalizacao(locRes.data || null)
      setMissoes(misRes.data || [])
      setAlertas(
        (alertRes.data || []).sort(
          (a, b) => (ALERTA_SORT[a.nivel] ?? 9) - (ALERTA_SORT[b.nivel] ?? 9)
        )
      )
      setDataLoaded(true)

      // Crédito do mês — query separada porque usa tabela creditos_mensais
      const cm = await calcularCreditoMes(DEMO_PESSOA_ID, now.getFullYear(), now.getMonth() + 1)
      if (active) setCreditoMes(cm) // null = sem dados este mês
    }

    load()
    return () => { active = false }
  }, [])

  // Cálculos derivados de subscrição
  const planoConfig = planosDisponiveis.find(p => p.id === subscricao?.plano)
  const pontosTotal = subscricao?.pontos_total ?? 0
  const nivel       = calcularNivel(pontosTotal)
  const nivelIdx    = NIVEL_ORDEM.indexOf(nivel)
  const nextNivel   = nivelIdx >= 0 && nivelIdx < 4 ? NIVEL_ORDEM[nivelIdx + 1] : null
  const pontosParaProximo = nextNivel
    ? Math.max(0, NIVEL_THRESHOLDS[nextNivel] - pontosTotal)
    : 0

  const homeScore  = localizacao?.home_score ?? 0
  const scoreColor = scoreCircleColor(homeScore)

  return (
    <div style={{ minHeight: '100vh', background: '#D8F3DC', paddingBottom: 100 }}>

      {/* HEADER */}
      <div style={{ background: '#1B4332', padding: '14px 16px 20px' }}>
        {/* Linha de controlo: hambúrguer ≡ esquerda, avatar direita (via App.jsx) */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <button
            onClick={onHamburguer}
            aria-label="Abrir menu"
            style={{
              width:32, height:32, borderRadius:'50%',
              background:'rgba(255,255,255,0.1)',
              border:'none', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:16, color:'#fff',
            }}
          >≡</button>
          <div style={{ width:32 }} />{/* espaço para o avatar fixo do App.jsx */}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
          {saudacao}, {primeiroNome} 👋
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
          {localizacao
            ? `${localizacao.tipologia} em ${localizacao.localidade || 'Lisboa'}`
            : ''}
          {subscricao ? ' · Home+ activa' : ''}
        </div>
      </div>

      <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* TEMPERATURA PLACEHOLDER */}
        {/* TODO(mario): integração IPMA real em 3.5 — substituir por fetchPrevisaoIPMA(localizacao.concelho) */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 1px 3px rgba(27,67,50,0.07)',
        }}>
          <span style={{ fontSize: 26 }}>🌤️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1B4332' }}>21°C · Céu limpo · Lisboa</div>
            <div style={{ fontSize: 11, color: '#6B7685', marginTop: 1 }}>Boa altura para chamar o jardineiro</div>
          </div>
        </div>

        {/* CARD SUBSCRIÇÃO */}
        {!dataLoaded ? (
          <Skel h={94} />
        ) : subscricao ? (
          <div style={{
            background: '#fff', borderRadius: 14, padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(27,67,50,0.07)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#52B788', letterSpacing: 1, textTransform: 'uppercase' }}>
                  Subscrição activa
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1B4332', marginTop: 2 }}>
                  {planoConfig?.nome || subscricao.plano}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1B4332' }}>
                  {Number(subscricao.preco_mensal).toFixed(2).replace('.', ',')}€
                </div>
                <div style={{ fontSize: 10, color: '#6B7685' }}>por mês</div>
              </div>
            </div>
            <div style={{
              padding: '8px 10px', background: '#D8F3DC', borderRadius: 8,
              fontSize: 11.5, color: '#2D6A4F', lineHeight: 1.5,
            }}>
              {creditoMes === undefined ? (
                <span style={{ color: '#6B7685' }}>A verificar crédito…</span>
              ) : creditoMes ? (
                <span>
                  Gastos: <b>{creditoMes.gasto.toFixed(2).replace('.', ',')}€</b>
                  {' · '}Crédito ganho: <b style={{ color: '#1B4332' }}>{creditoMes.credito.toFixed(2).replace('.', ',')}€</b>
                  {' · '}Pagas: <b>{Number(creditoMes.subscricaoPaga).toFixed(2).replace('.', ',')}€</b>
                </span>
              ) : (
                <span>
                  Sem gastos este mês · <b>0€</b> de crédito ganho · Pagas <b>{Number(subscricao.preco_mensal).toFixed(2).replace('.', ',')}€</b>
                </span>
              )}
            </div>
          </div>
        ) : dataLoaded ? (
          <div style={{
            background: '#fff', borderRadius: 14, padding: '14px 16px',
            textAlign: 'center', fontSize: 12, color: '#6B7685',
            boxShadow: '0 1px 3px rgba(27,67,50,0.07)',
          }}>
            Sem subscrição activa.{' '}
            <button
              onClick={() => alert('Subscrições em 3.2C')}
              style={{ background: 'none', border: 'none', color: '#52B788', fontWeight: 700, cursor: 'pointer' }}
            >
              Activar →
            </button>
          </div>
        ) : null}

        {/* CARD HOME SCORE COMPACT */}
        {!dataLoaded ? (
          <Skel h={102} />
        ) : localizacao ? (
          <button
            onClick={onNavigateCasa}
            style={{
              background: '#fff', borderRadius: 14, padding: '14px 16px',
              width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: '0 1px 3px rgba(27,67,50,0.07)',
            }}
          >
            {/* Mini círculo score */}
            <div style={{
              width: 68, height: 68, borderRadius: '50%', background: scoreColor,
              flexShrink: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px ${scoreColor}44`,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{homeScore}</div>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.75)', marginTop: 1, letterSpacing: 0.5 }}>SCORE</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#6B7685', marginBottom: 3 }}>
                {localizacao.nome} · Home Score
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1B4332' }}>
                {NIVEL_EMOJIS[nivel]} {NIVEL_LABELS[nivel]}
              </div>
              {pontosParaProximo > 0 && nextNivel ? (
                <div style={{ fontSize: 11, color: '#D4A72C', marginTop: 3, fontWeight: 600 }}>
                  +{pontosParaProximo} pts para {NIVEL_LABELS[nextNivel]}
                </div>
              ) : nivel === 'diamond' ? (
                <div style={{ fontSize: 11, color: '#52B788', marginTop: 3 }}>Nível máximo 💠</div>
              ) : null}
            </div>
            <div style={{ fontSize: 11, color: '#52B788', fontWeight: 600, flexShrink: 0 }}>Ver casa →</div>
          </button>
        ) : null}

        {/* CARD MISSÕES */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(27,67,50,0.07)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1B4332', marginBottom: 10 }}>🎯 Missões abertas</div>
          {missoes === null ? (
            <>
              <Skel h={44} r={8} />
              <div style={{ marginTop: 6 }}><Skel h={44} r={8} /></div>
            </>
          ) : missoes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: '#6B7685' }}>
              Sem missões abertas 🎉
            </div>
          ) : missoes.map((m, i) => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 0',
              borderBottom: i < missoes.length - 1 ? '1px solid #E8F3EB' : 'none',
            }}>
              <span style={{ fontSize: 18 }}>{m.urgente ? '🚨' : '🎯'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1B4332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.titulo}
                </div>
                <div style={{ fontSize: 10, color: '#6B7685', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.descricao}
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#D4A72C', flexShrink: 0 }}>+{m.pontos} pts</div>
            </div>
          ))}
        </div>

        {/* CARD ALERTAS */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(27,67,50,0.07)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1B4332', marginBottom: 10 }}>🔔 Alertas activos</div>
          {alertas === null ? (
            <Skel h={56} r={8} />
          ) : alertas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: '#6B7685' }}>
              Sem alertas activos 🎉
            </div>
          ) : alertas.map((a, i) => {
            const st = ALERTA_STYLE[a.nivel] || ALERTA_STYLE.info
            return (
              <div key={a.id} style={{
                background: st.bg, border: `1px solid ${st.border}`,
                borderRadius: 10, padding: '10px 12px',
                marginBottom: i < alertas.length - 1 ? 6 : 0,
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{ALERTA_IC[a.nivel] || 'ℹ️'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: st.col }}>{a.titulo}</div>
                  <div style={{ fontSize: 11, color: st.col, opacity: 0.85, marginTop: 2, lineHeight: 1.4 }}>
                    {a.descricao}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* CROSS-SELL BANNER — Orçamentos à medida (roxo #534AB7) */}
        {/* TODO(mario): esconder se cliente tiver pedidos_orcamento nos últimos 7 dias (tabela criada em 3.6) */}
        <button
          onClick={() => alert('Orçamentos à medida em 3.6')}
          style={{
            background: '#534AB7', borderRadius: 14, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left',
            boxShadow: '0 4px 12px rgba(83,74,183,0.28)',
          }}
        >
          <span style={{ fontSize: 28 }}>🏗️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
              Precisas de uma obra?
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
              Orçamentos à medida de vários prestadores →
            </div>
          </div>
        </button>

      </div>
    </div>
  )
}
