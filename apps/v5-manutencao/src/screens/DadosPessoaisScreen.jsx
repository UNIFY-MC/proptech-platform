import React, { useState } from 'react'
import { MOCK } from '../data/mock.js'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff', line:'#E5E7EB', stone:'#6B7685' }

function Field({ label, value, onChange, type='text', maxLength, readOnly }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:11, fontWeight:600, color:C.stone, marginBottom:5 }}>{label}</div>
      <input
        type={type} value={value} onChange={e => onChange?.(e.target.value)}
        maxLength={maxLength} readOnly={readOnly}
        style={{
          width:'100%', padding:'10px 12px', borderRadius:9, border:`1px solid ${C.border}`,
          fontSize:14, background: readOnly ? C.bg : C.white, color:C.ink,
          boxSizing:'border-box', outline:'none',
        }}
      />
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ margin:'0 16px 16px', background:C.white, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'10px 16px', fontSize:9, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', background:C.bg, borderBottom:`1px solid ${C.border}` }}>{label}</div>
      <div style={{ padding:'16px 16px 8px' }}>{children}</div>
    </div>
  )
}

export default function DadosPessoaisScreen({ onBack }) {
  const p = MOCK.pessoa
  const ini = p.nome.split(' ').filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase()
  const [nome,  setNome]  = useState(p.nome)
  const [nasc,  setNasc]  = useState(p.data_nascimento)
  const [tel,   setTel]   = useState(p.telefone)
  const [nif,   setNif]   = useState(p.nif)
  const [idioma,setIdioma]= useState(p.idioma)
  const [saved, setSaved] = useState(false)
  const [saving,setSaving]= useState(false)

  function guardar() {
    setSaving(true)
    // TODO(mario): guardar em BD quando auth real implementada (Fase 3.3.9)
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),2000) }, 800)
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:90 }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>PERFIL</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>Dados pessoais</div>
      </div>

      {/* Avatar */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 0 20px', background:C.white, borderBottom:`1px solid ${C.border}`, marginBottom:16 }}>
        <div style={{
          width:100, height:100, borderRadius:'50%',
          background:`linear-gradient(135deg,${G},${GL})`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:34, fontWeight:800, color:'#fff',
          boxShadow:'0 4px 16px rgba(27,67,50,0.25)', marginBottom:12,
        }}>{ini}</div>
        <button
          onClick={() => alert('Upload de foto disponível na Fase 3.3.9 com Supabase Storage.')}
          style={{
            background:C.bg, border:`1px solid ${C.border}`, borderRadius:8,
            padding:'7px 16px', fontSize:12, fontWeight:600, color:C.slate, cursor:'pointer',
          }}
        >📷 Mudar foto</button>
      </div>

      <Section label="Dados pessoais">
        <Field label="Nome completo"    value={nome}  onChange={setNome} />
        <Field label="Data de nascimento" value={nasc} onChange={setNasc} type="date" />
        <Field label="Telemóvel"        value={tel}   onChange={setTel}  type="tel" />
      </Section>

      <Section label="Facturação">
        <Field label="NIF" value={nif} onChange={setNif} maxLength={9} />
        <div style={{ fontSize:11, color:C.slate, marginBottom:8 }}>Usado para emissão de recibos e faturas</div>
      </Section>

      <Section label="Preferências">
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:600, color:C.stone, marginBottom:5 }}>Idioma</div>
          <select value={idioma} onChange={e => setIdioma(e.target.value)} style={{
            width:'100%', padding:'10px 12px', borderRadius:9, border:`1px solid ${C.border}`,
            fontSize:14, background:C.white, color:C.ink, boxSizing:'border-box',
          }}>
            <option value="pt-PT">Português (PT)</option>
            <option value="en-EN">English</option>
            <option value="es-ES">Español</option>
          </select>
        </div>
      </Section>

      {/* CTA fixo */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, maxWidth:600, margin:'0 auto',
        padding:'12px 16px 24px', background:C.white, borderTop:`1px solid ${C.border}`,
      }}>
        <button onClick={guardar} style={{
          width:'100%', padding:13, borderRadius:10,
          background: saved ? GL : G, color:'#fff',
          border:'none', fontSize:14, fontWeight:700, cursor:'pointer',
          transition:'background .2s',
        }}>
          {saving ? 'A guardar...' : saved ? '✓ Guardado!' : 'Guardar alterações'}
        </button>
      </div>
    </div>
  )
}
