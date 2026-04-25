import React, { useState } from 'react'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', greenXl:'#D8F3DC' }

const CATS = [
  { emoji:'📋', label:'Pedidos' },
  { emoji:'💳', label:'Pagamentos' },
  { emoji:'👤', label:'Conta' },
  { emoji:'💎', label:'Subscrição' },
]

// TODO(mario): migrar para tabela faq na BD — Fase 4
const FAQ = [
  { p:'Como cancelo um pedido?',        r:'Vai a Pedidos → toca no pedido → "Cancelar". Cancelamento gratuito até 24h antes.' },
  { p:'O que é o Home+?',               r:'Subscrição mensal de 6,90€ que dá 5% de desconto em todos os serviços + 10% em crédito.' },
  { p:'Como funciona o Owners Club?',   r:'Programa de fidelização que junta manutenção, energia e seguro. Poupas até 180€/ano.' },
  { p:'Quanto tempo demora um pedido?', r:'Serviços imediatos: 30-60 min. Serviços agendados: conforme disponibilidade do técnico.' },
  { p:'Os técnicos são verificados?',   r:'Sim, todos têm NIF validado, seguro de RC e avaliação mínima de 4.0 estrelas.' },
  { p:'Posso pagar com MB WAY?',        r:'Sim. Aceitamos MB WAY, cartão Visa/Mastercard e referência MB.' },
  { p:'O que é o Home Score?',          r:'Índice de 0-100 que mede a saúde da tua casa. Sobe com serviços concluídos e documentos subidos.' },
  { p:'Como ganho pontos?',             r:'Por cada serviço concluído, avaliação dada, missão cumprida e documento carregado.' },
]

function FaqItem({ p, r }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom:`1px solid ${C.line}` }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width:'100%', padding:'13px 16px', display:'flex', justifyContent:'space-between',
        alignItems:'center', background:'none', border:'none', cursor:'pointer', textAlign:'left', gap:12,
      }}>
        <span style={{ fontSize:13, fontWeight:600, color:C.ink, flex:1 }}>{p}</span>
        <span style={{ fontSize:16, color:C.slate, flexShrink:0, transform: open ? 'rotate(90deg)' : 'none', transition:'transform .2s' }}>›</span>
      </button>
      {open && (
        <div style={{ padding:'0 16px 14px', fontSize:13, color:C.slate, lineHeight:1.6 }}>{r}</div>
      )}
    </div>
  )
}

export default function AjudaScreen({ onBack }) {
  const [query, setQuery] = useState('')
  const faqFiltrado = FAQ.filter(f =>
    !query || f.p.toLowerCase().includes(query.toLowerCase()) || f.r.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>SUPORTE</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>Como te podemos ajudar?</div>
      </div>

      <div style={{ padding:'14px 16px 0' }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="🔍  Pesquisar ajuda..."
          style={{
            width:'100%', padding:'11px 14px', borderRadius:12, border:`1px solid ${C.border}`,
            fontSize:13, background:C.white, outline:'none', boxSizing:'border-box',
          }}
        />
      </div>

      {!query && (
        <>
          <div style={{ padding:'14px 16px 8px', fontSize:10, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase' }}>Categorias</div>
          <div style={{ margin:'0 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:4 }}>
            {CATS.map(cat => (
              <button key={cat.label} onClick={() => setQuery(cat.label)} style={{
                padding:'14px 10px', borderRadius:12, background:C.white, border:`1px solid ${C.border}`,
                display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                cursor:'pointer', fontSize:11, fontWeight:600, color:C.slate,
              }}>
                <span style={{ fontSize:24 }}>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{ margin:'14px 16px 0', background:C.white, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', fontSize:9, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', background:C.bg, borderBottom:`1px solid ${C.border}` }}>PERGUNTAS FREQUENTES</div>
        {faqFiltrado.length === 0 ? (
          <div style={{ padding:'24px 16px', textAlign:'center', color:C.slate, fontSize:13 }}>Sem resultados para "{query}"</div>
        ) : faqFiltrado.map((f, i) => <FaqItem key={i} p={f.p} r={f.r}/>)}
      </div>

      <div style={{ margin:'14px 16px 0' }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', marginBottom:8 }}>Contacto directo</div>
        <div style={{ display:'flex', gap:8 }}>
          {[
            { label:'📧 Email',    action:() => window.open('mailto:suporte@oscar.app') },
            { label:'💬 Chat',     action:() => alert('Chat ao vivo — disponível Fase 3.5') },
            { label:'📞 Telefone', action:() => window.open('tel:+351220000000') },
          ].map(b => (
            <button key={b.label} onClick={b.action} style={{
              flex:1, padding:'11px 6px', borderRadius:10, background:C.white,
              border:`1px solid ${C.border}`, fontSize:12, fontWeight:600, color:C.slate, cursor:'pointer',
            }}>{b.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
