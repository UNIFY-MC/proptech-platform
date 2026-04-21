// src/components/DrawerMenu.jsx — v5-manutencao 2026.0420 2141
import { useEffect, useRef } from 'react'
import { C, NIVEIS } from '../constants'
import { Av, Stars } from './ui'

const MENU = [
  { id:'rating',          ic:'⭐', l:'Rating' },
  { id:'servicos_ativos', ic:'🔧', l:'Serviços ativos' },
  { id:'meus_servicos',   ic:'📅', l:'Os meus serviços' },
  { id:'pagamentos',      ic:'💳', l:'Pagamentos' },
  { id:'carteira',        ic:'💰', l:'A minha Carteira' },
  { id:'perfil',          ic:'👤', l:'Perfil' },
  { id:'estatisticas',    ic:'📊', l:'Estatísticas' },
  { id:'tarefas',         ic:'🛠️', l:'Tarefas' },
  { id:'disponibilidade', ic:'🕐', l:'A tua disponibilidade' },
  { id:'ajuda',           ic:'ℹ️', l:'Ajuda' },
  { id:'sair',            ic:'🚪', l:'Sair' },
]

export default function DrawerMenu({ open, onClose, onNavigate, user, activeItem }) {
  const ref = useRef(null)
  const nc = user?.nivel ? NIVEIS[user.nivel] : null

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onClose])

  // Bloqueia scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleItem = (id) => {
    if (id === 'sair') {
      if (window.confirm('Tens a certeza que queres sair?')) { onNavigate?.(id); onClose() }
      return
    }
    onNavigate?.(id)
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position:'fixed', inset:0, zIndex:40,
          background:'rgba(0,0,0,0.5)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition:'opacity 0.25s ease',
        }}
      />

      {/* Painel lateral */}
      <div
        ref={ref}
        style={{
          position:'fixed', top:0, left:0, bottom:0,
          width:290, zIndex:50,
          background:'#fff',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition:'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          display:'flex', flexDirection:'column',
          boxShadow:'4px 0 32px rgba(0,0,0,0.22)',
          overflowY:'auto',
        }}
      >
        {/* Cabeçalho — gradiente igual ao dashboard */}
        <div style={{
          background:`linear-gradient(145deg,${C.navy},${C.gd})`,
          padding:'52px 22px 24px',
          display:'flex', flexDirection:'column', alignItems:'center', gap:10,
          flexShrink:0,
        }}>
          {/* Avatar com foto ou iniciais */}
          <div style={{
            width:80, height:80, borderRadius:'50%',
            background: user?.foto
              ? `url(${user.foto}) center/cover no-repeat`
              : `linear-gradient(135deg,${C.g},${C.gm})`,
            border:'3px solid rgba(255,255,255,0.25)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:30, color:'#fff', fontWeight:800, flexShrink:0,
          }}>
            {!user?.foto && (user?.ini || '👤')}
          </div>

          <div style={{ textAlign:'center' }}>
            <div style={{ color:'#fff', fontSize:16, fontWeight:700, marginBottom:2 }}>
              {user?.n || 'Prestador'}
            </div>
            <div style={{ color:'#86efac', fontSize:11 }}>
              {user?.id_num || '—'}
            </div>
            {nc && (
              <div style={{
                marginTop:8, display:'inline-flex', alignItems:'center', gap:5,
                background:'rgba(255,255,255,0.1)', borderRadius:20,
                padding:'4px 12px', fontSize:11, color:'#bbf7d0', fontWeight:600,
              }}>
                {nc.ic} {nc.l} · {nc.taxa}%
              </div>
            )}
          </div>
        </div>

        {/* Itens de menu */}
        <nav style={{ flex:1, padding:'6px 0' }}>
          {MENU.map(item => {
            const isActive = activeItem === item.id
            const isDanger = item.id === 'sair'
            return (
              <button
                key={item.id}
                onClick={() => handleItem(item.id)}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:14,
                  padding:'13px 22px', border:'none', cursor:'pointer',
                  background: isActive ? '#f0fdf4' : 'transparent',
                  borderLeft: isActive ? `3px solid ${C.g}` : '3px solid transparent',
                  color: isDanger ? C.red : isActive ? C.g : '#1e293b',
                  fontSize:14, fontWeight: isActive ? 700 : 500, textAlign:'left',
                  transition:'background 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize:18, width:22, textAlign:'center', flexShrink:0 }}>
                  {item.ic}
                </span>
                <span>{item.l}</span>
              </button>
            )
          })}
        </nav>

        {/* Rodapé */}
        <div style={{
          padding:'12px 22px 24px',
          borderTop:`1px solid ${C.border}`,
          display:'flex', flexDirection:'column', gap:3,
        }}>
          <div style={{ fontSize:10, color:'#94a3b8' }}>v5-manutenção · PropTech Platform</div>
          <div style={{ fontSize:10, color:'#cbd5e1' }}>Legal · Privacidade</div>
        </div>
      </div>
    </>
  )
}
