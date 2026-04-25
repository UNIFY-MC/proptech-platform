import React, { useState, useEffect } from 'react'
import { PERGUNTAS_POR_CATEGORIA, getContextoExistente, saveContexto } from '../lib/contextoServico.js'

const G = '#1B4332'; const GL = '#52B788'
const V = {
  ink:    '#0f172a',
  stone:  '#6B7685',
  border: '#e2e8f0',
  line:   '#E5E7EB',
  white:  '#fff',
  bg:     '#f8fafc',
  greenXl:'#D8F3DC',
}

export default function SmartPromptsSheet({ open, onClose, onConfirmar, localizacaoId, categoriaSlug, categoriaNome }) {
  const perguntas = PERGUNTAS_POR_CATEGORIA[categoriaSlug] || []
  const [respostas, setRespostas] = useState({})
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open || !localizacaoId || !categoriaSlug) return
    getContextoExistente(localizacaoId, categoriaSlug).then(prev => {
      if (Object.keys(prev).length > 0) setRespostas(prev)
    })
  }, [open, localizacaoId, categoriaSlug])

  if (!open || perguntas.length === 0) return null

  function setResp(id, val) {
    setRespostas(r => ({ ...r, [id]: val }))
  }

  async function handleConfirmar() {
    setSalvando(true)
    await saveContexto(localizacaoId, categoriaSlug, respostas)
    setSalvando(false)
    onConfirmar(respostas)
  }

  const respondidas = perguntas.filter(p => respostas[p.id] != null && respostas[p.id] !== '').length

  return (
    <>
      <style>{`@keyframes slideUpSP{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:310, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)' }} />
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:311,
        maxWidth:600, margin:'0 auto',
        background:V.white, borderRadius:'20px 20px 0 0',
        boxShadow:'0 -4px 32px rgba(0,0,0,0.18)',
        animation:'slideUpSP 300ms ease-out',
        maxHeight:'85vh', display:'flex', flexDirection:'column',
      }}>
        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:12, marginBottom:4 }}>
          <div style={{ width:40, height:4, borderRadius:2, background:V.line }} />
        </div>

        {/* Header */}
        <div style={{ padding:'4px 20px 14px', borderBottom:`1px solid ${V.line}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:'Georgia,serif', color:V.ink }}>
              ✨ Contexto inteligente
            </div>
            <div style={{ fontSize:11, color:V.stone, marginTop:2 }}>
              {categoriaNome} · {respondidas}/{perguntas.length} respondidas
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:V.stone, padding:'0 4px' }}>✕</button>
        </div>

        <div style={{ fontSize:11, color:V.stone, padding:'10px 20px 6px', lineHeight:1.4 }}>
          Estas respostas ficam guardadas para o teu imóvel e melhoram a precisão dos orçamentos.
        </div>

        {/* Perguntas */}
        <div style={{ overflowY:'auto', flex:1, padding:'8px 20px 4px' }}>
          {perguntas.map(p => (
            <div key={p.id} style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:V.ink, marginBottom:7 }}>{p.label}</div>

              {p.tipo === 'opcoes' && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                  {p.opcoes.map(op => {
                    const sel = respostas[p.id] === op
                    return (
                      <button key={op} onClick={() => setResp(p.id, op)} style={{
                        padding:'6px 13px', borderRadius:20,
                        border:`${sel ? 2 : 1}px solid ${sel ? G : V.border}`,
                        background: sel ? V.greenXl : V.white,
                        color: sel ? G : V.stone,
                        fontSize:11, fontWeight: sel ? 700 : 500,
                        cursor:'pointer',
                      }}>{op}</button>
                    )
                  })}
                </div>
              )}

              {p.tipo === 'sim_nao' && (
                <div style={{ display:'flex', gap:9 }}>
                  {['Sim', 'Não'].map(op => {
                    const sel = respostas[p.id] === op
                    return (
                      <button key={op} onClick={() => setResp(p.id, op)} style={{
                        flex:1, padding:'9px', borderRadius:10,
                        border:`${sel ? 2 : 1}px solid ${sel ? G : V.border}`,
                        background: sel ? V.greenXl : V.white,
                        color: sel ? G : V.stone,
                        fontSize:12, fontWeight: sel ? 700 : 500,
                        cursor:'pointer',
                      }}>{op}</button>
                    )
                  })}
                </div>
              )}

              {p.tipo === 'numero' && (
                <input
                  type="number"
                  value={respostas[p.id] || ''}
                  onChange={e => setResp(p.id, e.target.value)}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1px solid ${V.border}`, fontSize:12, outline:'none', boxSizing:'border-box' }}
                  placeholder="Introduz um valor"
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px 28px', borderTop:`1px solid ${V.line}` }}>
          <button onClick={handleConfirmar} disabled={salvando} style={{
            width:'100%', padding:13, borderRadius:10,
            background: salvando ? '#9FC5B4' : G,
            color:'#fff', border:'none',
            fontSize:14, fontWeight:700,
            cursor: salvando ? 'not-allowed' : 'pointer',
          }}>
            {salvando ? 'A guardar…' : `Guardar e continuar →`}
          </button>
          <button onClick={() => onConfirmar({})} style={{
            width:'100%', marginTop:8, padding:'10px', borderRadius:10,
            background:'none', border:'none',
            fontSize:12, color:V.stone, cursor:'pointer',
          }}>
            Saltar por agora
          </button>
        </div>
      </div>
    </>
  )
}
