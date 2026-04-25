import React, { useState, useEffect } from 'react'
import { supa } from './supa.js'
import { DEMO_PESSOA_ID, DEMO_ORGANIZATION_ID } from './lib/demo.js'
import { useImovelAtivo } from './lib/ImovelAtivoContext.jsx'
import { calcularCreditoMes } from './lib/subscription.js'
import { calcularNivel } from './lib/gamification.js'
import HeroHeader from './HeroHeader.jsx'
import { moradaCurta } from './lib/labels.js'

const NIVEL_ORDEM  = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
const NIVEL_LABELS = { bronze: 'Bronze', silver: 'Prata', gold: 'Ouro', platinum: 'Platina', diamond: 'Diamante' }
const NIVEL_THRESH = { bronze: 0, silver: 500, gold: 1500, platinum: 3500, diamond: 7500 }

const V = {
  green:    '#1B4332',
  greenMid: '#2D6A4F',
  greenLt:  '#52B788',
  greenXl:  '#D8F3DC',
  ink:      '#0f172a',
  slate:    '#64748b',
  border:   '#e2e8f0',
  bg:       '#f8fafc',
  white:    '#fff',
  gold:     '#D4A72C',
  goldLt:   '#FFF4D6',
  amber:    '#854F0B',
  coral:    '#E76F51',
  purple:   '#534AB7',
  purpleDk: '#26215C',
}

const PROMOS = [
  {
    tag: '🌸 RESET DE PRIMAVERA',
    titleBefore: 'Até ', titleHighlight: '50% OFF', titleAfter: ' em limpezas profundas',
    sub: 'Válido até 31 Maio · 8 serviços',
    bg: 'linear-gradient(135deg,#FCEBEB,#FDE4DC)',
    tagColor: V.coral, highlightColor: V.coral, btnBg: V.coral, deco: '🌸',
  },
  {
    tag: '❄️ PACK INVERNO',
    titleBefore: '', titleHighlight: '-19%', titleAfter: ' caldeira + caleiras + cobertura',
    sub: 'Pack completo · economize 44€',
    bg: 'linear-gradient(135deg,#E6F1FB,#EEF5FD)',
    tagColor: '#185FA5', highlightColor: '#185FA5', btnBg: '#185FA5', deco: '❄️',
  },
  {
    tag: '💧 URGÊNCIA HOJE',
    titleBefore: 'Canalização em ', titleHighlight: '2h', titleAfter: ' garantidas',
    sub: 'Disponível 24/7 · sem custo extra',
    bg: 'linear-gradient(135deg,#E0E8FA,#EDF1FC)',
    tagColor: V.purple, highlightColor: V.purple, btnBg: V.purple, deco: '💧',
  },
]

const SERVICOS_POP = [
  { ic: '✨', cat: 'Limpeza',     nome: 'Limpeza manutenção apartamento', preco: '42€' },
  { ic: '🔧', cat: 'Manutenção',  nome: 'Revisão anual caldeira',         preco: '75€' },
  { ic: '💧', cat: 'Canalização', nome: 'Desentupimento',                 preco: '65€' },
  { ic: '🖌️', cat: 'Pintura',     nome: 'Pintura sala 20m²',              preco: '180€' },
  { ic: '🌿', cat: 'Jardim',      nome: 'Manutenção jardim mensal',       preco: '35€' },
]

const EQUIPA = [
  { i: 'AF', n: 'António Ferreira', s: 'Canaliz · Elétrica', r: '4.9', v: 12 },
  { i: 'RG', n: 'Ricardo Gomes',    s: 'Manut · Pintura',    r: '5.0', v: 8  },
  { i: 'SM', n: 'Sandra Matos',     s: 'Limpeza · Obras',    r: '4.9', v: 15 },
]

function Skel({ h = 60, r = 12 }) {
  return <div style={{ height: h, borderRadius: r, background: 'rgba(27,67,50,0.08)', marginBottom: 6 }} />
}

/* SVG score circle — parâmetros exactos da referência (r=22 em 54×54) */
function ScoreCircle({ score }) {
  const r    = 22
  const circ = 138  // 2π×22 ≈ 138.2
  const off  = circ - (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
      <svg width="54" height="54" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="27" cy="27" r={r} stroke="rgba(255,255,255,0.15)" strokeWidth="4" fill="none"/>
        <circle cx="27" cy="27" r={r} stroke="#52B788" strokeWidth="4" fill="none"
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"/>
      </svg>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 54, height: 54,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>SCORE</div>
      </div>
    </div>
  )
}

function casaLabel(score) {
  if (score >= 70) return 'Casa Saudável 🌱'
  if (score >= 40) return 'Casa a Melhorar ⚠️'
  return 'Casa em Risco 🚨'
}

export default function IniciaScreen({ authUser, onNavigateCasa, onNavigateServicos, onHamburguer, onAvatarClick, onNavigateScore, onNavigateAlerta, onNavigateOwnersClub, onNavigateNotificacoes, onNavigateChatSuporte, notifCount = 0, onOpenImovelSelector, onNavigateImovelDetalhe }) {
  const { imovelAtivo, imoveis } = useImovelAtivo()
  const [subscricao,  setSubscricao]  = useState(null)
  const [creditoMes,  setCreditoMes]  = useState(undefined)
  const [missoes,     setMissoes]     = useState(null)
  const [dataLoaded,  setDataLoaded]  = useState(false)

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 19 ? 'Boa tarde' : 'Boa noite'
  const primeiroNome = (authUser?.nome || 'Mário').split(' ')[0]

  useEffect(() => {
    let active = true
    const now  = new Date()
    async function load() {
      const [subRes, misRes] = await Promise.all([
        supa.from('subscricoes').select('*').eq('pessoa_id', DEMO_PESSOA_ID).eq('estado', 'ativo').maybeSingle(),
        supa.from('missoes_utilizador').select('*').eq('pessoa_id', DEMO_PESSOA_ID).eq('estado', 'aberta')
          .order('urgente', { ascending: false }).order('pontos', { ascending: false }).limit(2),
      ])
      if (!active) return
      setSubscricao(subRes.data || null)
      setMissoes(misRes.data || [])
      setDataLoaded(true)
      const cm = await calcularCreditoMes(DEMO_PESSOA_ID, now.getFullYear(), now.getMonth() + 1)
      if (active) setCreditoMes(cm)
    }
    load()
    return () => { active = false }
  }, [])

  const pontosTotal = subscricao?.pontos_total ?? 0
  const nivel       = subscricao?.nivel || calcularNivel(pontosTotal)
  const nivelIdx    = NIVEL_ORDEM.indexOf(nivel)
  const nextNivel   = nivelIdx >= 0 && nivelIdx < 4 ? NIVEL_ORDEM[nivelIdx + 1] : null
  const pontosProx  = nextNivel ? Math.max(0, NIVEL_THRESH[nextNivel] - pontosTotal) : 0
  const streak      = subscricao?.streak_atual ?? subscricao?.streak_dias ?? 0

  const loc         = imovelAtivo
  const homeScore   = loc?.home_score ?? 0
  const localidade  = loc?.localidade || ''
  const nLocs       = imoveis.length

  const locationLbl = loc ? (moradaCurta(loc) || loc.nome) : 'A MINHA CASA'

  function handleLocationClick() {
    if (nLocs > 1) { onOpenImovelSelector?.(); return }
    if (loc) onNavigateImovelDetalhe?.(loc.id)
  }

  const preco  = Number(subscricao?.preco_mensal || 0)
  const ganho  = creditoMes?.credito ?? 0
  const falta  = Math.max(0, preco - ganho)
  const pctBar = preco > 0 ? Math.min(100, (ganho / preco) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: V.bg, paddingBottom: 100 }}>

      {/* ── HERO VERDE ────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(145deg,${V.green} 0%,${V.greenMid} 100%)`,
        padding: '14px 16px 20px', color: '#fff',
      }}>
        {/* Linha 1: ≡ | 📍 morada · localidade (clicável se multi-casa) | 💬 🔔 avatar */}
        <HeroHeader
          onHamburguer={onHamburguer}
          onAvatarClick={onAvatarClick}
          onImovelClick={handleLocationClick}
          authUser={authUser}
          hideTemp
          notifCount={notifCount}
          onNotifClick={onNavigateNotificacoes}
          onChatClick={onNavigateChatSuporte}
        />

        {/* Linha 2: saudação + nome | temperatura à direita (ref. linha 84-96) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 2 }}>{saudacao}</div>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1, fontFamily: 'Georgia,serif' }}>{primeiroNome} 👋</div>
          </div>
          {/* Temperatura — TODO(mario): IPMA real na Fase 3.5 */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 18 }}>🌤️</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>21°</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>
              céu limpo{localidade ? ' · ' + localidade : ''}
            </div>
          </div>
        </div>

        {/* Score card — dentro do hero, overlay escuro */}
        {!dataLoaded ? (
          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 14, padding: 16, height: 112, border: '1px solid rgba(255,255,255,0.1)' }}/>
        ) : (
          <button onClick={onNavigateScore || onNavigateCasa} style={{
            width: '100%', background: 'rgba(0,0,0,0.25)', borderRadius: 14,
            padding: '12px 14px', border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer', textAlign: 'left',
          }}>
            {/* Linha 1: círculo + texto + chevron */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ScoreCircle score={homeScore} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    {casaLabel(homeScore)}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                    {pontosProx > 0 && nextNivel
                      ? `faltam ${pontosProx} pts p/ nível ${NIVEL_LABELS[nextNivel]}`
                      : nivel === 'diamond' ? 'Diamond · nível máximo 💎' : `${pontosTotal} pts`}
                  </div>
                </div>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>›</span>
            </div>

            {/* Linha 2: stats */}
            <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 11 }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>
                ⭐ {pontosTotal.toLocaleString('pt-PT')}{' '}
                <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>pontos</span>
              </span>
              {streak > 0 && (
                <span style={{ color: '#fff', fontWeight: 600 }}>
                  🔥 {streak}{' '}
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>dias</span>
                </span>
              )}
              <span style={{ color: '#FFD166', fontWeight: 700 }}>
                🏆 {NIVEL_LABELS[nivel] || 'Bronze'}
              </span>
            </div>

            {/* Linha 3: barra crédito subscrição */}
            {subscricao && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
                  <span>Crédito ganho este mês</span>
                  <span style={{ fontWeight: 700, color: '#FFD166' }}>
                    {ganho.toFixed(2).replace('.', ',')}€ / {preco.toFixed(2).replace('.', ',')}€
                  </span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pctBar}%`, height: 5,
                    background: 'linear-gradient(90deg,#FFD166,#FFA94D)', borderRadius: 3,
                    transition: 'width 0.4s ease',
                  }}/>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 5 }}>
                  {falta === 0
                    ? <span>🎉 <b style={{ color: '#FFD166' }}>Subscrição grátis</b> este mês!</span>
                    : <span>Gasta +{falta.toFixed(2).replace('.', ',')}€ e <b style={{ color: '#FFD166' }}>este mês é grátis</b></span>
                  }
                </div>
              </div>
            )}
          </button>
        )}
      </div>

      {/* ── CORPO ─────────────────────────────────────────────────── */}
      <div style={{ paddingBottom: 28 }}>

        {/* Alerta meteo contextual */}
        <div
          onClick={() => onNavigateAlerta?.({ ic:'🌧️', titulo:'Chuva forte próximas 48h', descricao:'Acumulado esperado: 35–50mm · Vento 40 km/h', local:'COIMBRA' })}
          style={{
          margin: '10px 12px 0',
          background: 'linear-gradient(90deg,#E6F1FB,#F4F9FE)',
          border: '1px solid #85B7EB', borderRadius: 12,
          padding: '11px 13px', cursor: 'pointer',
          display: 'flex', gap: 11, alignItems: 'center',
        }}>
          <span style={{ fontSize: 26, flexShrink: 0 }}>🌧️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0C447C' }}>
              Chuva forte prevista — próximas 48h
            </div>
            <div style={{ fontSize: 10.5, color: V.slate, marginTop: 2, lineHeight: 1.4 }}>
              3 sugestões de manutenção preventiva · +200 pts se concluíres
            </div>
          </div>
          <div style={{ background: '#185FA5', color: '#fff', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700 }}>
            Ver
          </div>
        </div>

        {/* Promo carousel */}
        <div style={{
          padding: '12px 12px 0',
          display: 'flex', gap: 9,
          overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
        }}>
          {PROMOS.map((promo, i) => (
            <div key={i} style={{
              minWidth: '85%', borderRadius: 14, padding: '12px 14px',
              background: promo.bg, cursor: 'pointer', flexShrink: 0,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', right: -10, bottom: -10, fontSize: 90, opacity: 0.12, lineHeight: 1 }}>
                {promo.deco}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: promo.tagColor, marginBottom: 4 }}>
                {promo.tag}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: V.ink, lineHeight: 1.15, fontFamily: 'Georgia,serif', marginBottom: 3 }}>
                {promo.titleBefore}
                <span style={{ color: promo.highlightColor }}>{promo.titleHighlight}</span>
                {promo.titleAfter}
              </div>
              <div style={{ fontSize: 11, color: V.slate, marginTop: 3 }}>{promo.sub}</div>
              <button style={{
                background: promo.btnBg, color: '#fff', padding: '7px 13px',
                borderRadius: 9, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', marginTop: 10,
              }}>Explorar →</button>
            </div>
          ))}
        </div>

        {/* 🛠 Serviços populares */}
        <div style={{ padding: '16px 14px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: V.ink, fontFamily: 'Georgia,serif' }}>🛠 Serviços populares</div>
          <button onClick={onNavigateServicos} style={{ fontSize: 11, color: V.greenLt, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
            Ver tudo →
          </button>
        </div>
        <div style={{
          padding: '0 0 0 14px',
          display: 'flex', gap: 10,
          overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
        }}>
          {SERVICOS_POP.map((s, i) => (
            <div key={i} onClick={onNavigateServicos} style={{
              minWidth: 145, padding: '11px 12px',
              background: V.white, border: `1px solid ${V.border}`,
              borderRadius: 12, cursor: 'pointer', flexShrink: 0,
            }}>
              <div style={{ fontSize: 28 }}>{s.ic}</div>
              <div style={{ fontSize: 9, color: V.slate, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 }}>
                {s.cat}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: V.ink, lineHeight: 1.3, marginTop: 2 }}>{s.nome}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: V.green, marginTop: 6 }}>{s.preco}</div>
              <div style={{ fontSize: 9, color: V.greenLt, marginTop: 2 }}>ver detalhes →</div>
            </div>
          ))}
        </div>

        {/* 💰 Poupanças este ano */}
        <div style={{ padding: '16px 14px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: V.ink, fontFamily: 'Georgia,serif' }}>💰 Poupanças este ano</div>
          <span style={{ fontSize: 11, color: V.greenLt, fontWeight: 700, cursor: 'pointer' }}>Detalhe →</span>
        </div>
        <div style={{ margin: '0 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: V.greenXl, border: `1px solid ${V.greenLt}`, borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: V.greenMid || '#2D6A4F', fontWeight: 600 }}>Serviços</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: V.green, marginTop: 2 }}>147€</div>
            <div style={{ fontSize: 9, color: '#2D6A4F', marginTop: 2 }}>vs preços externos</div>
          </div>
          <div style={{ background: V.goldLt, border: `1px solid ${V.gold}`, borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: V.amber, fontWeight: 600 }}>Energia</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: V.amber, marginTop: 2 }}>82€</div>
            <div style={{ fontSize: 9, color: V.amber, marginTop: 2 }}>filtros AC + revisão</div>
          </div>
        </div>

        {/* Owners Club */}
        <div style={{ padding: '16px 14px 0' }}>
          <div onClick={onNavigateOwnersClub} style={{
            background: `linear-gradient(135deg,${V.purpleDk},${V.purple})`,
            borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
            color: '#fff', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: 0.8, marginBottom: 4 }}>
              🏡 OWNERS CLUB — PACK CASA
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, fontFamily: 'Georgia,serif' }}>
              Poupa até <span style={{ color: '#FFD166' }}>180€/ano</span> em casa
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 10, lineHeight: 1.5 }}>
              Manutenção + Energia + Seguro multirriscos integrados no mesmo painel
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['🔧 Manutenção','⚡ Energia','🛡️ Seguro'].map(tag => (
                <div key={tag} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 9px', fontSize: 10 }}>{tag}</div>
              ))}
            </div>
            <div style={{ background: '#fff', color: V.purpleDk, padding: '7px 13px', borderRadius: 8, fontSize: 11, fontWeight: 700, display: 'inline-block' }}>
              Simular agora →
            </div>
          </div>
        </div>

        {/* 💡 Dica IA da semana */}
        <div style={{ padding: '16px 14px 4px', fontSize: 16, fontWeight: 700, color: V.ink, fontFamily: 'Georgia,serif' }}>
          💡 Dica IA da semana
        </div>
        <div style={{ margin: '0 14px', background: V.goldLt, border: `1px solid ${V.gold}`, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 26, flexShrink: 0 }}>🌡️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: V.ink, marginBottom: 3 }}>
                Como reduzir 15% da fatura do AC este verão
              </div>
              <div style={{ fontSize: 11, color: V.slate, lineHeight: 1.5 }}>
                Limpa os filtros agora (demora 5 min), mantém a temperatura a 25°C e fecha as portas. A tua Daikin FTXC25 tem um modo "eco" que poucos conhecem.
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <span style={{ fontSize: 11, color: V.amber, fontWeight: 700, cursor: 'pointer' }}>Ler mais →</span>
                <span style={{ fontSize: 11, color: V.slate }}>·</span>
                <span style={{ fontSize: 11, color: V.amber, fontWeight: 700, cursor: 'pointer' }}>💬 Perguntar à IA</span>
              </div>
            </div>
          </div>
        </div>

        {/* 👷 A sua equipa */}
        <div style={{ padding: '16px 14px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: V.ink, fontFamily: 'Georgia,serif' }}>A sua equipa</div>
          <span style={{ fontSize: 11, color: V.greenLt, fontWeight: 700, cursor: 'pointer' }}>Ver todos →</span>
        </div>
        <div style={{ padding: '0 14px 4px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {EQUIPA.map(({ i, n, s, r, v }) => (
            <div key={n} style={{
              background: V.white, border: `1px solid ${V.border}`,
              borderRadius: 12, padding: '11px 6px', textAlign: 'center',
              cursor: 'pointer', position: 'relative',
            }}>
              {v === 15 && (
                <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 9, background: V.greenLt, color: '#fff', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>🏆</div>
              )}
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: V.greenLt, color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>{i}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: V.ink }}>{n.split(' ')[0]}</div>
              <div style={{ fontSize: 9, color: V.slate, margin: '2px 0 3px' }}>{s}</div>
              <div style={{ fontSize: 11, color: '#F59E0B' }}>{'★'.repeat(5)}</div>
              <div style={{ fontSize: 9, color: V.slate, marginTop: 2 }}>{r} · {v} visitas</div>
            </div>
          ))}
        </div>

        {/* 🎯 Missões da semana (max 2, compacto) */}
        <div style={{ padding: '16px 14px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: V.ink, fontFamily: 'Georgia,serif' }}>Missões da semana</div>
          {missoes && missoes.length > 0 && (
            <div style={{ fontSize: 11, color: V.greenLt, fontWeight: 700 }}>
              +{missoes.reduce((s, m) => s + (m.pontos || 0), 0)} pts disp.
            </div>
          )}
        </div>
        <div style={{ padding: '0 14px' }}>
          {missoes === null ? (
            <>
              <Skel h={52} r={10} />
              <Skel h={52} r={10} />
            </>
          ) : missoes.length === 0 ? (
            [
              { ic: '🌧️', titulo: 'Verificar caleiras', sub: 'Antes da chuva · +200 pts', pts: 200, urg: true },
              { ic: '🔥', titulo: 'Revisão anual caldeira', sub: 'Há 5 meses em atraso · +250 pts', pts: 250, urg: false },
            ].map((m, i) => (
              <div key={i} style={{
                background: V.white, border: `1px solid ${V.border}`,
                borderRadius: 12, padding: '10px 12px', marginBottom: 7,
                display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer',
              }}>
                <span style={{ fontSize: 20 }}>{m.ic}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: V.ink }}>{m.titulo}</span>
                    {m.urg && <span style={{ fontSize: 9, background: '#FCEBEB', color: V.coral, padding: '1px 6px', borderRadius: 5, fontWeight: 700, flexShrink: 0 }}>URG</span>}
                  </div>
                  <div style={{ fontSize: 10, color: V.slate, marginTop: 1 }}>{m.sub}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: V.gold, background: V.goldLt, padding: '4px 9px', borderRadius: 8, flexShrink: 0 }}>+{m.pts}</div>
              </div>
            ))
          ) : missoes.map((m) => (
            <div key={m.id} style={{
              background: V.white, border: `1px solid ${V.border}`,
              borderRadius: 12, padding: '10px 12px', marginBottom: 7,
              display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer',
            }}>
              <span style={{ fontSize: 20 }}>{m.urgente ? '🚨' : '🎯'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: V.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.titulo}</span>
                  {m.urgente && <span style={{ fontSize: 9, background: '#FCEBEB', color: V.coral, padding: '1px 6px', borderRadius: 5, fontWeight: 700, flexShrink: 0 }}>URG</span>}
                </div>
                <div style={{ fontSize: 10, color: V.slate, marginTop: 1 }}>{m.descricao}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: V.gold, background: V.goldLt, padding: '4px 9px', borderRadius: 8, flexShrink: 0 }}>+{m.pontos}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
