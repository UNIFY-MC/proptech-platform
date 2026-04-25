import React, { useState } from 'react'
import { supa } from '../supa.js'
import { DEMO_PESSOA_ID } from '../lib/demo.js'
import { useImovelAtivo } from '../lib/ImovelAtivoContext.jsx'
import { tipoImovelEmoji, tipoImovelLabel, formatarMorada } from '../lib/labels.js'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            line:'#E5E7EB', stone:'#6B7685', red:'#A32D2D', redSoft:'#FFEAEA', greenXl:'#D8F3DC' }

function scoreColor(s) {
  if (s >= 70) return { bg:'#D8F3DC', c:G }
  if (s >= 50) return { bg:'#FEF9C3', c:'#854F0B' }
  return { bg:'#FDE4DC', c:'#C0392B' }
}

export default function MoradasScreen({ onBack }) {
  const { imoveis, imovelAtivoId, setImovelAtivoId, refetch } = useImovelAtivo()
  const [saving, setSaving] = useState(false)

  const principal = imoveis.find(i => i.id === imovelAtivoId) || imoveis[0]

  async function tornarPrincipal(id) {
    setSaving(true)
    // Marca principal na localizacoes + persiste como activo
    await supa.from('localizacoes').update({ principal: false }).eq('pessoa_id', DEMO_PESSOA_ID)
    await supa.from('localizacoes').update({ principal: true  }).eq('id', id)
    await setImovelAtivoId(id)
    await refetch()
    setSaving(false)
  }

  async function apagarImovel(id) {
    if (!confirm('Apagar este imóvel permanentemente?')) return
    setSaving(true)
    await supa.from('localizacoes').update({ ativo: false }).eq('id', id)
    // Se era o activo, muda para o primeiro disponível
    if (id === imovelAtivoId) {
      const proximo = imoveis.find(i => i.id !== id)
      if (proximo) await setImovelAtivoId(proximo.id)
    }
    await refetch()
    setSaving(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>IMÓVEIS</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>Os meus imóveis</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', marginTop:4 }}>
          {imoveis.length} imóvel{imoveis.length !== 1 ? 'is' : ''} · 1 principal
        </div>
      </div>

      {/* Botão adicionar */}
      <div style={{ padding:'14px 16px 0' }}>
        <button
          onClick={() => alert('Adicionar imóvel — form completo disponível Fase 3.4.')}
          style={{
            width:'100%', padding:12, borderRadius:10,
            background:G, color:'#fff', border:'none',
            fontSize:14, fontWeight:700, cursor:'pointer',
          }}
        >+ Adicionar imóvel</button>
      </div>

      {/* Lista */}
      <div style={{ padding:'14px 16px 0', opacity: saving ? 0.6 : 1 }}>
        {imoveis.map(im => {
          const isPrincipal = im.id === imovelAtivoId
          const sc = scoreColor(im.home_score ?? 0)
          return (
            <div key={im.id} style={{
              background:C.white, border: isPrincipal ? `2px solid ${GL}` : `1px solid ${C.border}`,
              borderRadius:14, padding:'14px 16px', marginBottom:10,
              boxShadow: isPrincipal ? '0 2px 10px rgba(82,183,136,.15)' : '0 1px 3px rgba(0,0,0,.05)',
            }}>
              {/* Header card */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <span style={{ fontSize:28 }}>{tipoImovelEmoji(im.tipo)}</span>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:C.ink }}>{im.nome}</div>
                    {isPrincipal && (
                      <span style={{ fontSize:9, background:C.greenXl, color:G, padding:'1px 7px', borderRadius:4, fontWeight:700 }}>PRINCIPAL</span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize:12, fontWeight:700, padding:'4px 10px', borderRadius:8, background:sc.bg, color:sc.c }}>
                  Score {im.home_score ?? '—'}
                </span>
              </div>

              {/* Morada */}
              <div style={{ fontSize:13, color:C.slate, marginBottom:12 }}>{formatarMorada(im)}</div>

              {/* Info */}
              <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                <span style={{ fontSize:10, padding:'2px 8px', borderRadius:5, background:C.bg, color:C.slate, border:`1px solid ${C.border}` }}>
                  {tipoImovelLabel(im.tipo)}
                </span>
                {im.tipologia && (
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:5, background:C.bg, color:C.slate, border:`1px solid ${C.border}` }}>
                    {im.tipologia}
                  </span>
                )}
                {im.created_at && (
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:5, background:C.bg, color:C.slate, border:`1px solid ${C.border}` }}>
                    Desde {new Date(im.created_at).getFullYear()}
                  </span>
                )}
              </div>

              {/* Botões */}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => alert('Editar imóvel — form disponível Fase 3.4.')} style={{
                  flex:1, padding:'8px', borderRadius:8, background:C.bg,
                  border:`1px solid ${C.border}`, fontSize:12, fontWeight:600, color:C.slate, cursor:'pointer',
                }}>Editar</button>
                {!isPrincipal && (
                  <>
                    <button onClick={() => tornarPrincipal(im.id)} disabled={saving} style={{
                      flex:1, padding:'8px', borderRadius:8, background:C.greenXl,
                      border:`1px solid ${GL}`, fontSize:12, fontWeight:600, color:G, cursor:'pointer',
                    }}>Tornar principal</button>
                    <button onClick={() => apagarImovel(im.id)} disabled={saving} style={{
                      padding:'8px 12px', borderRadius:8, background:C.redSoft,
                      border:'none', fontSize:12, fontWeight:600, color:C.red, cursor:'pointer',
                    }}>🗑</button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
