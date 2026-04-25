import React from 'react'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', greenXl:'#D8F3DC' }

const SERVICO_FALLBACK = {
  emoji:'✨', nome:'Limpeza manutenção apartamento T2', categoria:'Limpeza',
  duracao:'3h', rating:4.8, garantia:'7 dias', preco:'42€',
  descricao:'Serviço de limpeza profissional para manutenção regular do apartamento. Inclui todas as divisões e é realizado por técnicos certificados OSCAR.',
  inclui:['Todas as divisões (sala, quartos, cozinha, casas de banho)','Aspiração e lavagem de pavimentos','Limpeza de janelas interiores','Electrodomésticos superfície','Desinfeção de sanitas e lavatórios'],
  avaliacoes:[
    { cliente:'Joana M.', rating:5, texto:'Excelente serviço, casa ficou impecável', data:'2026-04-15' },
    { cliente:'Ricardo S.', rating:5, texto:'Técnica muito cuidadosa e profissional', data:'2026-04-08' },
  ],
}

function Stars({ rating }) {
  return <span style={{ color:'#F59E0B', fontSize:13 }}>{'★'.repeat(Math.round(rating))}{'☆'.repeat(5-Math.round(rating))}</span>
}

export default function ServicoDetailScreen({ servico, onBack, onPedir, onAdicionarLista }) {
  const s = servico || SERVICO_FALLBACK

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:110 }}>
      {/* Hero */}
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 28px', color:'#fff', textAlign:'center' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:16, textAlign:'left' }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:48, marginBottom:10 }}>{s.emoji}</div>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:6 }}>{(s.categoria||'SERVIÇO').toUpperCase()}</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif', lineHeight:1.25, marginBottom:12 }}>{s.nome}</div>
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          {[`⏱ ${s.duracao}`, `⭐ ${s.rating}`, `🛡 ${s.garantia}`].map(chip => (
            <span key={chip} style={{ fontSize:11, padding:'4px 12px', borderRadius:20, background:'rgba(255,255,255,.15)', fontWeight:600 }}>{chip}</span>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 16px 0' }}>
        {/* Descrição */}
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', marginBottom:8 }}>Descrição</div>
          <div style={{ fontSize:13, color:C.ink, lineHeight:1.6 }}>{s.descricao}</div>
        </div>

        {/* Inclui */}
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', marginBottom:10 }}>O que está incluído</div>
          {(s.inclui || []).map((item, i) => (
            <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:7 }}>
              <span style={{ color:GL, fontWeight:700, flexShrink:0, marginTop:1 }}>✓</span>
              <span style={{ fontSize:13, color:C.ink, lineHeight:1.4 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Avaliações */}
        {(s.avaliacoes || []).length > 0 && (
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', marginBottom:10 }}>Avaliações</div>
            {s.avaliacoes.map((av, i) => (
              <div key={i} style={{ borderBottom: i < s.avaliacoes.length-1 ? `1px solid ${C.line}` : 'none', paddingBottom:10, marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:C.ink }}>{av.cliente}</span>
                  <span style={{ fontSize:11, color:C.slate }}>{new Date(av.data).toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})}</span>
                </div>
                <div style={{ marginBottom:4 }}><Stars rating={av.rating}/></div>
                <div style={{ fontSize:12, color:C.slate }}>{av.texto}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA fixo */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, maxWidth:600, margin:'0 auto',
        padding:'12px 16px 24px', background:C.white, borderTop:`1px solid ${C.border}`,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div>
            <span style={{ fontSize:24, fontWeight:800, color:G }}>{s.preco}</span>
            <span style={{ fontSize:12, color:C.slate }}> + IVA</span>
          </div>
          <span style={{ fontSize:11, color:C.slate }}>⏱ {s.duracao}</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => onAdicionarLista?.(s) || alert('Adicionado à tua lista!')} style={{
            flex:1, padding:12, borderRadius:10, background:C.bg,
            border:`1px solid ${C.border}`, fontSize:13, fontWeight:600, color:C.slate, cursor:'pointer',
          }}>Adicionar à lista</button>
          <button onClick={() => onPedir?.(s) || alert('A redirigir para o pedido...')} style={{
            flex:2, padding:12, borderRadius:10, background:G,
            border:'none', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer',
          }}>Pedir agora →</button>
        </div>
      </div>
    </div>
  )
}
