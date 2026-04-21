// src/views/prestador/PrestadorDash.jsx — v5-manutencao 2026.0420 2141
import { useState } from 'react'
import { C, TECNICOS, NIVEIS, svcById, tecById } from '../../constants'
import { Av, Card, EstBadge } from '../../components/ui'
import DrawerMenu from '../../components/DrawerMenu'

// Ícone hamburguer ☰
function HamburgerBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ background:'none', border:'none', cursor:'pointer', padding:6, display:'flex', flexDirection:'column', gap:5 }}
      aria-label="Menu"
    >
      {[0,1,2].map(i => (
        <div key={i} style={{ width:22, height:2, background:'#fff', borderRadius:2 }}/>
      ))}
    </button>
  )
}

export default function PrestadorDash({ ordens, onOrdem, onCarteira, onChat, onNavMenu }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuActivo, setMenuActivo] = useState(null)

  const eu = TECNICOS[0]
  const nc = NIVEIS[eu.nivel]
  const minhas  = ordens.filter(o => o.tid === eu.id)
  const abertas = minhas.filter(o => o.st !== 'concluida')
  const feitas  = minhas.filter(o => o.st === 'concluida')

  const handleMenu = (id) => {
    setMenuActivo(id)
    // Ações locais
    if (id === 'carteira')      { onCarteira?.(); return }
    if (id === 'mensagens')     { onChat?.(); return }
    // Delega para o App gerir os ecrãs restantes
    onNavMenu?.(id)
  }

  return (
    <div style={{ minHeight:'100vh', background:C.mist }}>

      {/* DrawerMenu lateral */}
      <DrawerMenu
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={handleMenu}
        user={{ n:eu.n, ini:eu.ini, id_num:'301612811', nivel:eu.nivel }}
        activeItem={menuActivo}
      />

      {/* Header com hamburguer */}
      <div style={{
        background:`linear-gradient(145deg,${C.navy},${C.gd})`,
        padding:'18px 16px 16px',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <HamburgerBtn onClick={() => setDrawerOpen(true)}/>
            <div>
              <div style={{ color:'#94a3b8', fontSize:10, marginBottom:2 }}>Bem-vindo,</div>
              <h1 style={{ color:'#fff', fontSize:18, fontWeight:800, margin:'0 0 3px' }}>{eu.n}</h1>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:C.gm, display:'inline-block' }}/>
                <span style={{ color:'#86efac', fontSize:10, fontWeight:600 }}>Disponível</span>
              </div>
            </div>
          </div>
          <Av ini={eu.ini} size={50}/>
        </div>

        {/* Carteira em destaque */}
        <div
          onClick={onCarteira}
          style={{
            background:'rgba(255,255,255,0.09)', borderRadius:13,
            padding:'12px 14px', cursor:'pointer',
            border:'1px solid rgba(255,255,255,0.1)',
            display:'flex', alignItems:'center', gap:10, marginBottom:12,
          }}
        >
          <span style={{ fontSize:24 }}>💰</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, color:'#94a3b8', marginBottom:1 }}>A minha carteira</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#fff' }}>€105,00</div>
            <div style={{ fontSize:9, color:'#94a3b8' }}>+€57,00 pendente · toque para gerir</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:9, color:'#86efac', fontWeight:700, background:'rgba(34,197,94,0.15)', padding:'3px 7px', borderRadius:7 }}>
              {nc.ic} {nc.l}
            </div>
            <div style={{ fontSize:9, color:'#94a3b8', marginTop:3 }}>{nc.taxa}% taxa</div>
          </div>
        </div>

        {/* KPI cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:7 }}>
          {[['📋', abertas.length, 'Em aberto'], ['✅', feitas.length, 'Concluídas'], ['⭐', eu.r, 'Avaliação']].map(([ic,v,l]) => (
            <div key={l} style={{ background:'rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 7px', textAlign:'center' }}>
              <div style={{ fontSize:14 }}>{ic}</div>
              <div style={{ color:'#fff', fontSize:16, fontWeight:800 }}>{v}</div>
              <div style={{ color:'#94a3b8', fontSize:8 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de ordens */}
      <div style={{ padding:'14px 16px 20px' }}>
        <h2 style={{ fontSize:14, fontWeight:700, color:C.navy, margin:'0 0 10px' }}>Ordens atribuídas</h2>

        {abertas.length === 0 && (
          <div style={{ textAlign:'center', padding:24, color:C.slate, fontSize:13 }}>Sem ordens activas</div>
        )}

        {abertas.map(o => {
          const s = svcById(o.sid)
          return (
            <Card key={o.id} style={{ padding:13, marginBottom:7 }} onClick={() => onOrdem(o)}>
              <div style={{ display:'flex', gap:9, alignItems:'center' }}>
                <span style={{ fontSize:22 }}>{s?.ic || '🔧'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:C.navy }}>{s?.n}</span>
                    <EstBadge st={o.st}/>
                  </div>
                  <div style={{ fontSize:10, color:C.slate, marginTop:1 }}>📍 {o.morada}</div>
                  <div style={{ fontSize:10, color:C.g, fontWeight:600, marginTop:1 }}>🕐 {o.data}</div>
                </div>
              </div>
            </Card>
          )
        })}

        {/* Acções rápidas */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
          <button
            onClick={onCarteira}
            style={{ background:C.navy, color:'#fff', border:'none', borderRadius:11, padding:'12px', fontSize:12, fontWeight:700, cursor:'pointer' }}
          >
            💰 Carteira
          </button>
          <button
            onClick={onChat}
            style={{ background:C.white, color:C.navy, border:`1.5px solid ${C.border}`, borderRadius:11, padding:'12px', fontSize:12, fontWeight:700, cursor:'pointer' }}
          >
            💬 Mensagens
          </button>
        </div>
      </div>
    </div>
  )
}
