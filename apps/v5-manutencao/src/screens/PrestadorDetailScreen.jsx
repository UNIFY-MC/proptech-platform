import React, { useEffect, useState, useCallback } from 'react'
import { supa } from '../supa.js'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', greenXl:'#D8F3DC', gold:'#D4A72C' }

const SLOTS = ['Seg','Ter','Qua','Qui','Sex']

function Stars({ rating }) {
  const n = Math.round(rating || 0)
  return <span style={{ color:'#F59E0B', fontSize:14 }}>{'★'.repeat(n)}{'☆'.repeat(5-n)}</span>
}

export default function PrestadorDetailScreen({ prestador, onBack }) {
  const [avaliacoes, setAvaliacoes] = useState([])

  const p = prestador || { iniciais:'?', nome:'Técnico', categorias:[], rating:5.0, total_visitas:0 }

  const fetchAvaliacoes = useCallback(async () => {
    if (!p.id) return
    const { data } = await supa
      .from('avaliacoes')
      .select('id, rating, texto, criado_em')
      .eq('prestador_id', p.id)
      .order('criado_em', { ascending: false })
      .limit(5)
    setAvaliacoes(data || [])
  }, [p.id])

  useEffect(() => { fetchAvaliacoes() }, [fetchAvaliacoes])

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:110 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 28px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:16 }} onClick={onBack}>← Voltar</div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center' }}>
          <div style={{
            width:80, height:80, borderRadius:'50%', background:`rgba(255,255,255,.2)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:28, fontWeight:800, color:'#fff', marginBottom:12,
            border:'2px solid rgba(255,255,255,.4)',
          }}>{p.iniciais}</div>
          <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif', marginBottom:8 }}>{p.nome}</div>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap', justifyContent:'center', marginBottom:10 }}>
            {(p.categorias || []).map(cat => (
              <span key={cat} style={{ fontSize:10, padding:'2px 10px', borderRadius:14, background:'rgba(255,255,255,.15)', fontWeight:600 }}>{cat}</span>
            ))}
          </div>
          <div style={{ display:'flex', gap:16, fontSize:13 }}>
            <span>⭐ {(p.rating || 5.0).toFixed(1)}</span>
            <span style={{ color:'rgba(255,255,255,.7)' }}>·</span>
            <span>{p.total_visitas} visitas</span>
          </div>
        </div>
      </div>

      <div style={{ padding:'16px 16px 0' }}>
        <div style={{ background:C.greenXl, border:`1px solid ${GL}`, borderRadius:12, padding:'12px 14px', marginBottom:14, display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ fontSize:18 }}>✅</span>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:G }}>Técnico verificado</div>
            <div style={{ fontSize:11, color:GM, marginTop:2 }}>NIF validado · Seguro RC · Antecedentes limpos</div>
          </div>
        </div>

        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', marginBottom:8 }}>Sobre</div>
          <div style={{ fontSize:13, color:C.ink, lineHeight:1.6 }}>
            Técnico certificado com {p.total_visitas} visitas realizadas na plataforma.
            {(p.categorias || []).length > 0 && ` Especializado em ${p.categorias.join(' e ')} residencial e comercial.`}
          </div>
        </div>

        {/* Avaliações */}
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', marginBottom:10 }}>Avaliações recentes</div>
          {avaliacoes.length === 0 ? (
            <div style={{ fontSize:12, color:C.slate, textAlign:'center', padding:'8px 0' }}>Sem avaliações ainda</div>
          ) : avaliacoes.map((av, i) => (
            <div key={av.id} style={{ borderBottom: i < avaliacoes.length-1 ? `1px solid ${C.line}` : 'none', paddingBottom:10, marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, fontWeight:700, color:C.ink }}>Cliente</span>
                <span style={{ fontSize:11, color:C.slate }}>{new Date(av.criado_em).toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})}</span>
              </div>
              <div style={{ marginBottom:4 }}><Stars rating={av.rating}/></div>
              {av.texto && <div style={{ fontSize:12, color:C.slate, lineHeight:1.5 }}>"{av.texto}"</div>}
            </div>
          ))}
        </div>

        {/* Agenda */}
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', marginBottom:10 }}>Disponibilidade esta semana</div>
          <div style={{ display:'flex', gap:8 }}>
            {SLOTS.map((d, i) => (
              <div key={d} style={{ flex:1, textAlign:'center' }}>
                <div style={{ fontSize:10, color:C.slate, marginBottom:5 }}>{d}</div>
                <div style={{
                  height:32, borderRadius:8, background: i !== 2 ? C.greenXl : C.bg,
                  border:`1px solid ${i !== 2 ? GL : C.border}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {i !== 2
                    ? <span style={{ fontSize:10, color:G, fontWeight:700 }}>✓</span>
                    : <span style={{ fontSize:10, color:C.slate }}>—</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        position:'fixed', bottom:0, left:0, right:0, maxWidth:600, margin:'0 auto',
        padding:'12px 16px 24px', background:C.white, borderTop:`1px solid ${C.border}`,
        display:'flex', gap:8,
      }}>
        <button onClick={() => alert('Mensagem directa — usa o Chat no pedido activo')} style={{
          flex:1, padding:12, borderRadius:10, background:C.bg,
          border:`1px solid ${C.border}`, fontSize:13, fontWeight:700, color:C.ink, cursor:'pointer',
        }}>💬 Mensagem</button>
        <button onClick={() => alert('Pedido criado — vai a Serviços para escolher o serviço')} style={{
          flex:2, padding:12, borderRadius:10, background:G,
          border:'none', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer',
        }}>Pedir agora →</button>
      </div>
    </div>
  )
}
