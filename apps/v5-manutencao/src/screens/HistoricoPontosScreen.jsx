import React, { useState, useEffect, useCallback } from 'react'
import { supa } from '../supa.js'
import { useAuth } from '../lib/AuthContext.jsx'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            gold:'#D4A72C', goldLt:'#FFF4D6', line:'#E5E7EB', stone:'#6B7685', greenXl:'#D8F3DC' }

const NIVEL_CONFIG = {
  bronze:   { label:'🥉 Bronze',  next:'Prata',    min:0,    max:499  },
  silver:   { label:'🥈 Prata',   next:'Ouro',     min:500,  max:1499 },
  gold:     { label:'🥇 Ouro',    next:'Platina',  min:1500, max:3499 },
  platinum: { label:'💿 Platina', next:'Diamante', min:3500, max:7499 },
  diamond:  { label:'💎 Diamante',next:'Máximo',   min:7500, max:9999 },
}

const TABS = [{ id:'todos', l:'Todos' }, { id:'semana', l:'Esta semana' }, { id:'mes', l:'Este mês' }]

function emojiMotivo(motivo) {
  const m = (motivo || '').toLowerCase()
  if (m.includes('subscri'))                              return '💎'
  if (m.includes('streak'))                               return '🔥'
  if (m.includes('avali'))                                return '⭐'
  if (m.includes('upload') || m.includes('garantia') || m.includes('document')) return '📄'
  if (m.includes('miss') || m.includes('verificar') || m.includes('caleira'))   return '🎯'
  if (m.includes('código') || m.includes('codigo'))       return '🎁'
  return '✅'
}

function filtrar(pontos, tab) {
  const agora = new Date()
  if (tab === 'todos') return pontos
  return pontos.filter(p => {
    const d = new Date(p.data)
    if (tab === 'mes')    return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear()
    if (tab === 'semana') return (agora - d) / 86400000 <= 7
    return true
  })
}

function agruparPorMes(pontos) {
  const grupos = {}
  pontos.forEach(p => {
    const d   = new Date(p.data)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const label = d.toLocaleDateString('pt-PT', { month:'long', year:'numeric' }).toUpperCase()
    if (!grupos[key]) grupos[key] = { label, items:[] }
    grupos[key].items.push(p)
  })
  return Object.values(grupos)
}

export default function HistoricoPontosScreen({ onBack }) {
  const { pessoa_id } = useAuth()
  const [subscricao, setSubscricao] = useState(null)
  const [historico,  setHistorico]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState('todos')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [subRes, histRes] = await Promise.all([
      supa.from('subscricoes').select('nivel, pontos_total').eq('pessoa_id', pessoa_id).maybeSingle(),
      supa.from('pontos_historico').select('id, pontos, motivo, data').eq('pessoa_id', pessoa_id).order('data', { ascending: false }),
    ])
    setSubscricao(subRes.data || null)
    setHistorico(histRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const nivel      = subscricao?.nivel || 'bronze'
  const pontos     = subscricao?.pontos_total || 0
  const cfg        = NIVEL_CONFIG[nivel] || NIVEL_CONFIG.bronze
  const pct        = nivel === 'diamond' ? 100 : Math.min(100, Math.round(((pontos - cfg.min) / (cfg.max - cfg.min + 1)) * 100))
  const falta      = nivel === 'diamond' ? 0 : Math.max(0, cfg.max + 1 - pontos)
  const filtrados  = filtrar(historico, tab)
  const grupos     = agruparPorMes(filtrados)

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:C.slate, fontSize:13 }}>A carregar...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>FIDELIZAÇÃO</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>Histórico de pontos</div>
        <div style={{ marginTop:14, background:'rgba(0,0,0,.2)', borderRadius:12, padding:'12px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:6 }}>
            <span style={{ fontWeight:700 }}>{cfg.label}</span>
            <span style={{ color:'rgba(255,255,255,.7)' }}>{pontos} pts</span>
          </div>
          <div style={{ height:6, background:'rgba(255,255,255,.2)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#FFD166,#FFA94D)', borderRadius:3, transition:'width .4s' }}/>
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.65)', marginTop:5 }}>
            {nivel === 'diamond' ? 'Nível máximo atingido!' : `${falta} pts para ${cfg.next}`}
          </div>
        </div>
      </div>

      <div style={{ background:C.white, borderBottom:`1px solid ${C.border}`, display:'flex', padding:'0 16px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'10px 4px', background:'none', border:'none', cursor:'pointer',
            fontSize:13, fontWeight: tab===t.id ? 700 : 500,
            color: tab===t.id ? G : C.slate,
            borderBottom: tab===t.id ? `2.5px solid ${G}` : '2.5px solid transparent',
          }}>{t.l}</button>
        ))}
      </div>

      <div style={{ padding:'14px 16px' }}>
        {grupos.length === 0 ? (
          <div style={{ background:C.white, border:`1px dashed ${C.border}`, borderRadius:12, padding:'32px 16px', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⭐</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>Sem pontos neste período</div>
            <div style={{ fontSize:12, color:C.slate, marginTop:4 }}>Completa serviços e missões para ganhar pontos</div>
          </div>
        ) : grupos.map(g => (
          <div key={g.label} style={{ marginBottom:16 }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', marginBottom:8 }}>{g.label}</div>
            {g.items.map(item => (
              <div key={item.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px', marginBottom:6, display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:22, flexShrink:0 }}>{emojiMotivo(item.motivo)}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.ink }}>{item.motivo}</div>
                  <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>
                    {new Date(item.data).toLocaleDateString('pt-PT', { day:'2-digit', month:'short' })}
                  </div>
                </div>
                <span style={{ fontSize:15, fontWeight:800, color:C.gold, flexShrink:0 }}>+{item.pontos}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
