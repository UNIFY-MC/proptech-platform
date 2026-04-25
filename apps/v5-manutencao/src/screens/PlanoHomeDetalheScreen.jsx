import React, { useState, useEffect } from 'react'
import { supa } from '../supa.js'
import { DEMO_PESSOA_ID } from '../lib/demo.js'
import { planosDisponiveis } from '../lib/subscription.js'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            greenXl:'#D8F3DC', line:'#E5E7EB', stone:'#6B7685' }

const plano = planosDisponiveis.find(p => p.id === 'home_plus') || {
  nome: 'Home+', preco: 6.90, percentCredito: 10,
  descricao: '10% de crédito em cada serviço',
}

const BENEFICIOS = [
  `${plano.percentCredito}% de crédito em cada serviço`,
  'Resposta urgente prioritária',
  'Sem custos de chamada de urgência',
  'Alertas de manutenção preventiva automáticos',
  'Acesso prioritário a técnicos certificados',
  'Pontos duplos em todos os serviços',
]

const FAQ = [
  { p:'Posso cancelar quando quiser?', r:'Sim, sem período mínimo de fidelização. Cancelas na tua área de conta a qualquer momento.' },
  { p:'Como funciona o crédito de serviço?', r:`${plano.percentCredito}% do valor de cada serviço é creditado automaticamente na tua conta para usar no próximo pedido.` },
  { p:'Quando é aplicado o benefício?', r:'Automaticamente ao confirmar cada serviço. O crédito acumula e podes usar a qualquer momento.' },
]

export default function PlanoHomeDetalheScreen({ onBack }) {
  const [subscricao,    setSubscricao]    = useState(null)
  const [loadingSubs,   setLoadingSubs]   = useState(true)

  useEffect(() => {
    supa.from('subscricoes')
      .select('id, plano, estado, data_inicio, pontos_total')
      .eq('pessoa_id', DEMO_PESSOA_ID)
      .eq('estado', 'ativo')
      .maybeSingle()
      .then(({ data }) => { setSubscricao(data); setLoadingSubs(false) })
  }, [])

  const isMembro = subscricao?.plano === 'home_plus'
  const dataInicio = subscricao?.data_inicio
    ? new Date(subscricao.data_inicio).toLocaleDateString('pt-PT', { day:'numeric', month:'long', year:'numeric' })
    : null

  const [faqOpen, setFaqOpen] = useState({})

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:100 }}>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:20, background:C.white, borderBottom:`1px solid ${C.border}`, padding:'12px 16px', display:'flex', alignItems:'center' }}>
        <div onClick={onBack} style={{ fontSize:13, fontWeight:600, color:C.slate, cursor:'pointer' }}>← Voltar</div>
      </div>

      {/* Hero */}
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'28px 18px 32px', color:'#fff' }}>
        <div style={{ fontSize:9, fontWeight:800, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:8 }}>🏠 PLANO HOME+</div>
        <div style={{ fontSize:26, fontWeight:800, fontFamily:'Georgia,serif', lineHeight:1.2, marginBottom:8 }}>
          Cuida da tua casa<br />por {plano.preco.toFixed(2).replace('.',',')}€/mês
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.8)', lineHeight:1.5 }}>
          {plano.percentCredito}% de crédito em tudo · acesso prioritário · sem surpresas
        </div>
        {isMembro && (
          <div style={{ marginTop:14, display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,.15)', borderRadius:20, padding:'5px 12px' }}>
            <span style={{ fontSize:12 }}>✓</span>
            <span style={{ fontSize:11, fontWeight:700 }}>Membro activo {dataInicio ? `desde ${dataInicio}` : ''}</span>
          </div>
        )}
      </div>

      <div style={{ padding:'14px 14px 0' }}>

        {/* Benefícios */}
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 16px', marginBottom:12 }}>
          <div style={{ fontSize:9, fontWeight:800, letterSpacing:.7, color:C.stone, textTransform:'uppercase', marginBottom:12 }}>Benefícios incluídos</div>
          {BENEFICIOS.map((b, i) => (
            <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'6px 0', borderBottom: i < BENEFICIOS.length-1 ? `1px solid ${C.greenXl}` : 'none' }}>
              <span style={{ color:GL, fontWeight:700, fontSize:14, flexShrink:0, marginTop:1 }}>✓</span>
              <span style={{ fontSize:12.5, color:C.ink, lineHeight:1.5 }}>{b}</span>
            </div>
          ))}
        </div>

        {/* Poupança acumulada (se membro) */}
        {isMembro && (
          <div style={{ background:C.greenXl, border:`1px solid ${GL}44`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:.7, color:GM, textTransform:'uppercase', marginBottom:8 }}>A poupar com Home+</div>
            <div style={{ display:'flex', gap:14, alignItems:'center' }}>
              <span style={{ fontSize:32 }}>🏡</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:G }}>Membro activo · crédito a acumular</div>
                <div style={{ fontSize:11, color:GM, marginTop:3, lineHeight:1.5 }}>
                  {plano.percentCredito}% de cada serviço volta como crédito.
                  {dataInicio && ` Membro desde ${dataInicio}.`}
                </div>
                {/* TODO(mario Fase 5): query real ordens + crédito acumulado */}
              </div>
            </div>
          </div>
        )}

        {/* Preço */}
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 16px', marginBottom:12 }}>
          <div style={{ fontSize:9, fontWeight:800, letterSpacing:.7, color:C.stone, textTransform:'uppercase', marginBottom:12 }}>O teu plano</div>
          <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
            <span style={{ fontSize:32, fontWeight:800, color:G }}>{plano.preco.toFixed(2).replace('.',',')}€</span>
            <span style={{ fontSize:13, color:C.slate }}>/mês</span>
          </div>
          <div style={{ fontSize:11, color:C.stone, marginTop:4 }}>Sem compromisso · cancela a qualquer momento</div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:9, fontWeight:800, letterSpacing:.7, color:C.stone, textTransform:'uppercase', marginBottom:10 }}>❓ Perguntas frequentes</div>
          {FAQ.map((q, i) => (
            <div key={i} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, marginBottom:8, overflow:'hidden' }}>
              <div onClick={() => setFaqOpen(o => ({ ...o, [i]: !o[i] }))} style={{ padding:'13px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
                <span style={{ fontSize:13, fontWeight:600, color:C.ink, flex:1, paddingRight:10, lineHeight:1.4 }}>{q.p}</span>
                <span style={{ fontSize:18, color:C.slate, flexShrink:0, fontWeight:300 }}>{faqOpen[i] ? '−' : '+'}</span>
              </div>
              {faqOpen[i] && (
                <div style={{ padding:'0 14px 14px', fontSize:12.5, color:C.slate, lineHeight:1.65, borderTop:`1px solid ${C.line}` }}>
                  {q.r}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* CTA fixo */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, maxWidth:600, margin:'0 auto', padding:'12px 16px 24px', background:C.white, borderTop:`1px solid ${C.border}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.08)' }}>
        {loadingSubs ? (
          <div style={{ padding:'12px', textAlign:'center', color:C.slate, fontSize:13 }}>A verificar subscrição…</div>
        ) : isMembro ? (
          <button disabled style={{ width:'100%', padding:13, borderRadius:10, background:C.greenXl, border:`1.5px solid ${GL}`, fontSize:14, fontWeight:700, color:G, cursor:'default' }}>
            ✓ Já és membro Home+
          </button>
        ) : (
          <button disabled style={{ width:'100%', padding:13, borderRadius:10, background:'#f0f0f0', border:'none', fontSize:14, fontWeight:600, color:C.slate, cursor:'default' }}>
            Subscrever (em breve)
            {/* TODO(mario Fase 5): Stripe checkout */}
          </button>
        )}
      </div>

    </div>
  )
}
