import React from 'react'

/* Componente de header partilhado para todos os ecrãs principais no hero verde.
   Linha 1 do hero: ≡ · morada · [temp(opcional) · 💬 · 🔔 · avatar]
   hideTemp=true: remove o bloco de temperatura (ex: IniciaScreen tem temp na linha do "Bom dia") */
export default function HeroHeader({ onHamburguer, onAvatarClick, locationLabel, onLocationClick, authUser, notifCount = 0, hideTemp = false, onNotifClick, onChatClick }) {
  const nome    = authUser?.nome || ''
  const iniciais = nome.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'MC'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      {/* Hambúrguer */}
      <button
        onClick={onHamburguer}
        aria-label="Abrir menu"
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          border: 'none', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: '#fff',
        }}
      >≡</button>

      {/* Morada / label — clicável se onLocationClick definido (switcher multi-casa) */}
      <div
        onClick={onLocationClick}
        style={{
          flex: 1, fontSize: 9, color: 'rgba(255,255,255,0.6)',
          fontWeight: 700, letterSpacing: 0.8,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          cursor: onLocationClick ? 'pointer' : 'default',
        }}
      >
        📍 {locationLabel || 'A MINHA CASA'}
      </div>

      {/* Cluster direito */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Temperatura — ocultável via hideTemp (IniciaScreen move temp para linha do "Bom dia") */}
        {!hideTemp && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>🌤️ 21°</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>céu limpo</div>
          </div>
        )}

        {/* Chat */}
        <button
          onClick={onChatClick}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: 'none', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#fff',
          }}
        >💬</button>

        {/* Sino */}
        <button
          onClick={onNotifClick}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: 'none', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#fff', position: 'relative',
          }}
        >
          🔔
          {notifCount > 0 && (
            <div style={{
              position: 'absolute', top: 5, right: 5,
              width: 7, height: 7, borderRadius: '50%', background: '#EF4444',
            }}/>
          )}
        </button>

        {/* Avatar — abre PerfilSheet */}
        <button
          onClick={onAvatarClick}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: '#52B788', color: '#fff',
            fontSize: 12, fontWeight: 700,
            border: '2px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, cursor: 'pointer',
          }}
        >{iniciais}</button>
      </div>
    </div>
  )
}
