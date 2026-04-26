import React, { useState, useEffect } from 'react'
import { supa, supaCore } from '../supa.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { nivelLabel } from '../lib/labels.js'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            gold:'#D4A72C', goldLt:'#FFF4D6', line:'#E5E7EB', stone:'#6B7685' }

const NIVEL_EMOJI = { bronze:'🥉', silver:'🥈', gold:'🥇', platinum:'💎', diamond:'💠',
                      Bronze:'🥉', Prata:'🥈', Ouro:'🥇', Platina:'💎', Diamante:'💠' }

export default function SobreMimScreen({ onBack, onNavigate }) {
  const { pessoa_id } = useAuth()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    let active = true
    async function fetch() {
      try {
        const [pessoaRes, subRes, ordensRes] = await Promise.all([
          supaCore.from('pessoas').select('nome, email, foto_url, created_at').eq('id', pessoa_id).maybeSingle(),
          supa.from('subscricoes').select('pontos_total, nivel, streak_dias, streak_recorde').eq('pessoa_id', pessoa_id).eq('estado', 'ativo').maybeSingle(),
          supa.from('ordens').select('id', { count: 'exact', head: true }).eq('cliente_id', pessoa_id),
        ])
        if (!active) return
        if (pessoaRes.error) throw pessoaRes.error
        setDados({
          pessoa:      pessoaRes.data,
          sub:         subRes.data || {},
          totalOrdens: ordensRes.count ?? 0,
        })
      } catch (e) {
        if (active) setErro(e.message || 'Erro a carregar')
      } finally {
        if (active) setLoading(false)
      }
    }
    fetch()
    return () => { active = false }
  }, [])

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:C.slate, fontSize:13 }}>A carregar...</div>
    </div>
  )

  if (erro || !dados) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
      <div style={{ color:'#A32D2D', fontSize:13 }}>{erro || 'Sem dados'}</div>
      <button onClick={() => { setErro(null); setLoading(true) }} style={{ padding:'8px 16px', borderRadius:8, background:G, color:'#fff', border:'none', fontSize:12, cursor:'pointer' }}>Tentar novamente</button>
    </div>
  )

  const { pessoa, sub, totalOrdens } = dados
  const nome       = pessoa.nome || 'Utilizador'
  const ini        = nome.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const pontosTotal = sub.pontos_total ?? 0
  const nivelKey   = sub.nivel || 'bronze'
  const streakDias = sub.streak_dias ?? 0
  const emoji      = NIVEL_EMOJI[nivelKey] || '🥉'
  const { nivel, proximo, falta, max } = nivelLabel(pontosTotal, nivelKey)
  const min        = { bronze:0, silver:500, gold:1500, platinum:3500, diamond:7500 }[nivelKey] ?? 0
  const pctProximo = proximo ? Math.min(100, Math.round(((pontosTotal - min) / (max - min)) * 100)) : 100
  const membroDesde = pessoa.created_at
    ? new Date(pessoa.created_at).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
    : '—'

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Início</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>PERFIL</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>Sobre mim</div>
      </div>

      {/* Avatar hero */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 20px 16px', background:C.white, borderBottom:`1px solid ${C.border}` }}>
        {pessoa.foto_url
          ? <img src={pessoa.foto_url} alt="" style={{ width:80, height:80, borderRadius:'50%', objectFit:'cover', marginBottom:12, boxShadow:'0 4px 16px rgba(27,67,50,.25)' }}/>
          : <div style={{ width:80, height:80, borderRadius:'50%', background:`linear-gradient(135deg,${G},${GL})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:800, color:'#fff', boxShadow:'0 4px 16px rgba(27,67,50,.25)', marginBottom:12 }}>{ini}</div>
        }
        <div style={{ fontSize:20, fontWeight:700, fontFamily:'Georgia,serif', color:C.ink, marginBottom:6 }}>{nome}</div>
        <span style={{ background:C.goldLt, color:C.gold, fontWeight:800, fontSize:12, padding:'3px 12px', borderRadius:20, border:`1px solid ${C.gold}44` }}>
          {emoji} {nivel} · {pontosTotal.toLocaleString('pt-PT')} pts
        </span>
      </div>

      {/* Stats grid */}
      <div style={{ margin:'12px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[
          { label:'Membro desde',  val: membroDesde },
          { label:'Total pedidos', val: totalOrdens },
          { label:'Pontos totais', val: pontosTotal.toLocaleString('pt-PT') },
          { label:'Streak actual', val: `🔥 ${streakDias} dias` },
        ].map(({ label, val }) => (
          <div key={label} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontSize:10, color:C.slate, fontWeight:600, marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:15, fontWeight:700, color:C.ink }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Progresso nível */}
      <div style={{ margin:'0 16px 12px', background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 16px' }}>
        {proximo ? <>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:8 }}>
            <span style={{ fontWeight:700, color:C.ink }}>{emoji} {nivel} → {proximo}</span>
            <span style={{ color:C.slate }}>{pontosTotal.toLocaleString('pt-PT')} / {max.toLocaleString('pt-PT')} pts</span>
          </div>
          <div style={{ height:7, background:C.border, borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:4, width:`${pctProximo}%`, background:`linear-gradient(90deg,${GL},${G})`, transition:'width .4s ease' }}/>
          </div>
          <div style={{ fontSize:10, color:C.slate, marginTop:6 }}>{falta.toLocaleString('pt-PT')} pts para {proximo}</div>
        </> : (
          <div style={{ textAlign:'center', fontSize:13, fontWeight:700, color:C.gold }}>💠 Nível Diamante atingido!</div>
        )}
      </div>

      {/* Sugestões */}
      <div style={{ margin:'0 16px 12px' }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', marginBottom:8 }}>Como melhorar o teu perfil</div>
        {[
          { emoji:'🏠', titulo:'Completa o Home Assessment', sub:'Responde 12 perguntas · ganha 300 pts', btn:'Fazer →', id:'home_assessment' },
          { emoji:'👤', titulo:'Adiciona a tua foto',        sub:'Personaliza o teu perfil',               btn:'Editar →', id:'dados_pessoais' },
        ].map(s => (
          <div key={s.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px', marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:24 }}>{s.emoji}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{s.titulo}</div>
              <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>{s.sub}</div>
            </div>
            <button onClick={() => onNavigate?.(s.id)} style={{ background:G, color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontSize:11, fontWeight:700, cursor:'pointer', flexShrink:0 }}>{s.btn}</button>
          </div>
        ))}
      </div>

      <div style={{ margin:'0 16px' }}>
        <button onClick={() => onNavigate?.('dados_pessoais')} style={{ width:'100%', padding:13, borderRadius:10, background:G, color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          Editar dados pessoais →
        </button>
      </div>
    </div>
  )
}
