import React from 'react'
import { MOCK, codigoReferral } from '../data/mock.js'

const G = '#1B4332'; const GM = '#2D6A4F'; const GL = '#52B788'
const C = { ink:'#0f172a', slate:'#64748b', border:'#e2e8f0', bg:'#f8fafc', white:'#fff',
            gold:'#D4A72C', goldLt:'#FFF4D6', line:'#E5E7EB', stone:'#6B7685',
            greenXl:'#D8F3DC', purple:'#534AB7', purpleDk:'#26215C', amber:'#854F0B', amberLt:'#FAEEDA' }

export default function ReferralScreen({ onBack }) {
  const p    = MOCK.pessoa
  const code = codigoReferral(p)
  const link = `https://oscar.app/r/${code}`
  const refs  = MOCK.referidos
  const creditoTotal = refs.filter(r => r.estado === 'completou').reduce((a, r) => a + r.credito, 0)

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:32 }}>
      <div style={{ background:`linear-gradient(145deg,${G},${GM})`, padding:'14px 16px 22px', color:'#fff' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Voltar</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, color:'rgba(255,255,255,.65)', marginBottom:4 }}>REWARDS</div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia,serif' }}>Convida os teus amigos</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', marginTop:4 }}>Ganha até 100€/mês em crédito</div>
      </div>

      {/* Card share roxo */}
      <div style={{ margin:'16px 16px 0', background:`linear-gradient(135deg,${C.purpleDk},${C.purple})`, borderRadius:16, padding:'18px 16px' }}>
        <div style={{ fontSize:9, color:'rgba(255,255,255,.7)', fontWeight:700, letterSpacing:.8, marginBottom:6 }}>O TEU LINK DE REFERÊNCIA</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.85)', marginBottom:14, fontFamily:'monospace', wordBreak:'break-all' }}>{link}</div>
        <div style={{ display:'flex', gap:8 }}>
          {[
            { label:'🟢 WhatsApp', bg:'#25D366', action:() => window.open(`https://wa.me/?text=Usa+o+meu+código+OSCAR+${code}`) },
            { label:'✉️ Email',     bg:'#3B82F6', action:() => window.open(`mailto:?subject=OSCAR&body=Usa+o+meu+código+${code}`) },
            { label:'⊕ Mais',       bg:'rgba(255,255,255,.2)', action:() => { if (navigator.share) navigator.share({ title:'OSCAR', url:link }); else alert('Copia o link: ' + link) } },
          ].map(b => (
            <button key={b.label} onClick={b.action} style={{
              flex:1, padding:'9px 6px', borderRadius:9, background:b.bg, color:'#fff',
              border:'none', fontSize:11, fontWeight:700, cursor:'pointer',
            }}>{b.label}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ margin:'12px 16px 0', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        {[
          { label:'Convidados', val:refs.length },
          { label:'Activos',    val:refs.filter(r=>r.estado==='completou').length },
          { label:'Crédito',    val:`${creditoTotal}€` },
        ].map(({ label, val }) => (
          <div key={label} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 10px', textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:700, color:G, marginBottom:3 }}>{val}</div>
            <div style={{ fontSize:10, color:C.slate }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Lista referidos */}
      <div style={{ margin:'14px 16px 0' }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:C.stone, textTransform:'uppercase', marginBottom:8 }}>Os teus referidos</div>
        {refs.length === 0 ? (
          <div style={{ background:C.white, border:`1px dashed ${C.border}`, borderRadius:12, padding:'28px 16px', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>👥</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.ink, marginBottom:6 }}>Convida o primeiro amigo</div>
            <div style={{ fontSize:12, color:C.slate }}>Partilha o teu link e ganha 25€ por cada amigo activo</div>
          </div>
        ) : refs.map(r => (
          <div key={r.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:'13px 14px', marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:'50%', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
              {r.nome.charAt(0)}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{r.nome}</div>
              <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>
                {new Date(r.data).toLocaleDateString('pt-PT', { day:'numeric', month:'short', year:'numeric' })}
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <span style={{
                fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:5,
                background: r.estado === 'completou' ? C.greenXl : C.amberLt,
                color: r.estado === 'completou' ? G : C.amber,
              }}>{r.estado === 'completou' ? '✓ Completou' : 'Pendente'}</span>
              {r.credito > 0 && (
                <div style={{ fontSize:12, fontWeight:700, color:G, marginTop:4 }}>+{r.credito}€</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
