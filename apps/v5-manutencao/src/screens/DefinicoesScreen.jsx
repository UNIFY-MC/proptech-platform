import React, { useState, useEffect, useCallback } from 'react'
import { supaCore } from '../supa.js'
import { useAuth } from '../lib/AuthContext.jsx'

const G = '#1B4332'; const GM = '#2D6A4F'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', red:'#A32D2D', redSoft:'#FFEAEA' }

function Section({ label, children }) {
  return (
    <div style={{ margin:'0 16px 14px', background:C.white, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'10px 16px', fontSize:9, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', background:C.bg, borderBottom:`1px solid ${C.border}` }}>{label}</div>
      <div style={{ padding:'4px 0' }}>{children}</div>
    </div>
  )
}

function Toggle({ label, sub, value, onChange }) {
  return (
    <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12, borderBottom:`1px solid ${C.line}` }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.ink }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>{sub}</div>}
      </div>
      <div onClick={() => onChange(!value)} style={{
        width:44, height:24, borderRadius:12, cursor:'pointer', flexShrink:0,
        background: value ? G : C.border, position:'relative', transition:'background .2s',
      }}>
        <div style={{
          position:'absolute', top:2, left: value ? 22 : 2, width:20, height:20,
          borderRadius:'50%', background:'#fff', transition:'left .2s',
          boxShadow:'0 1px 4px rgba(0,0,0,.2)',
        }}/>
      </div>
    </div>
  )
}

function SelectRow({ label, value, onChange, options }) {
  return (
    <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12, borderBottom:`1px solid ${C.line}` }}>
      <div style={{ flex:1, fontSize:13, fontWeight:600, color:C.ink }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        padding:'6px 10px', borderRadius:8, border:`1px solid ${C.border}`,
        fontSize:12, background:C.white, color:C.ink, cursor:'pointer',
      }}>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  )
}

function ActionRow({ label, danger, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between',
      borderBottom:`1px solid ${C.line}`, cursor:'pointer',
    }}>
      <span style={{ fontSize:13, fontWeight:600, color: danger ? C.red : C.ink }}>{label}</span>
      <span style={{ fontSize:14, color: danger ? C.red : C.slate }}>›</span>
    </div>
  )
}

export default function DefinicoesScreen({ onBack }) {
  const { pessoa_id } = useAuth()
  const [loading,  setLoading]  = useState(true)
  const [tema,     setTemaS]    = useState('auto')
  const [idioma,   setIdiomaS]  = useState('pt-PT')
  const [analytics,setAnaS]    = useState(true)
  const [aiPers,   setAiPersS] = useState(true)
  const [meta,     setMeta]     = useState({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supaCore.from('pessoas').select('idioma, metadata').eq('id', pessoa_id).maybeSingle()
    if (data) {
      setIdiomaS(data.idioma || 'pt-PT')
      const m = data.metadata || {}
      setMeta(m)
      setTemaS(m.tema || 'auto')
      setAnaS(m.analytics !== false)
      setAiPersS(m.personalizacao_ia !== false)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function saveIdioma(val) {
    setIdiomaS(val)
    await supaCore.from('pessoas').update({ idioma: val }).eq('id', pessoa_id)
  }

  async function saveMeta(patch) {
    const novoMeta = { ...meta, ...patch }
    setMeta(novoMeta)
    await supaCore.from('pessoas').update({ metadata: novoMeta }).eq('id', pessoa_id)
  }

  function setTema(val)    { setTemaS(val);    saveMeta({ tema: val }) }
  function setAna(val)     { setAnaS(val);     saveMeta({ analytics: val }) }
  function setAiPers(val)  { setAiPersS(val);  saveMeta({ personalizacao_ia: val }) }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:C.slate, fontSize:13 }}>A carregar...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>APP</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>Definições</div>
      </div>
      <div style={{ height:16 }}/>

      <Section label="Aparência">
        <SelectRow label="Tema" value={tema} onChange={setTema}
          options={[{v:'auto',l:'Automático'},{v:'claro',l:'Claro'},{v:'escuro',l:'Escuro'}]} />
        <SelectRow label="Idioma" value={idioma} onChange={saveIdioma}
          options={[{v:'pt-PT',l:'Português (PT)'},{v:'en-EN',l:'English'},{v:'es-ES',l:'Español'}]} />
      </Section>

      <Section label="Privacidade">
        <Toggle label="Permitir analytics" sub="Ajuda-nos a melhorar a app" value={analytics} onChange={setAna} />
        <Toggle label="Personalização IA" sub="Sugestões baseadas nos teus dados" value={aiPers} onChange={setAiPers} />
        <ActionRow label="Política de privacidade →" onClick={() => alert('Abre política de privacidade')} />
      </Section>

      <Section label="Dados">
        <ActionRow label="Exportar os meus dados" onClick={() => alert('Download dos teus dados — disponível Fase 4')} />
        <ActionRow label="Apagar histórico" onClick={() => alert('Apagar histórico — disponível Fase 4')} />
      </Section>

      <Section label="Conta">
        <ActionRow label="Eliminar conta permanentemente" danger onClick={() => alert('Para eliminar a tua conta contacta suporte@exemplo.pt.\n// TODO(mario): email real Fase 4')} />
      </Section>

      <div style={{ textAlign:'center', padding:'8px 0', fontSize:11, color:C.slate }}>v0.5.3 · build dev</div>
    </div>
  )
}
