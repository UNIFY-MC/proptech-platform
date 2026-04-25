import React from 'react'
import { useImovelAtivo } from './lib/ImovelAtivoContext.jsx'
import { categoriaEmoji, moradaCurta } from './lib/labels.js'

/* HeroHeader — barra de topo partilhada por todos os ecrãs principais.
   Lê imovelAtivo / isGlobal / imoveis directamente do context.
   onImovelClick: abre ImovelSelectorSheet.
   hideTemp: IniciaScreen gere a temperatura na sua própria linha 2. */
export default function HeroHeader({
  onHamburguer, onAvatarClick, authUser, notifCount = 0,
  hideTemp = false, onNotifClick, onChatClick, onImovelClick,
}) {
  const { imovelAtivo, imoveis, isGlobal } = useImovelAtivo()

  const nome    = authUser?.nome || ''
  const iniciais = nome.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'MC'

  const semImoveis  = imoveis.length === 0
  const hora        = new Date().getHours()
  const saudacao    = hora < 12 ? 'Bom dia' : hora < 20 ? 'Boa tarde' : 'Boa noite'
  const primeiroNome = nome.split(' ')[0] || 'por aqui'

  const emoji     = isGlobal ? '🌐' : categoriaEmoji(imovelAtivo)
  const nomeLabel = isGlobal ? 'Todos os imóveis' : (imovelAtivo?.nome || 'A MINHA CASA')
  const subLabel  = isGlobal
    ? `${imoveis.length} imóvel${imoveis.length !== 1 ? 's' : ''}`
    : moradaCurta(imovelAtivo)
  const showChevron = imoveis.length > 1

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

      {/* Centro — sem imóveis: saudação · com imóvel: selector */}
      <div
        onClick={semImoveis ? undefined : onImovelClick}
        style={{ flex: 1, overflow: 'hidden', cursor: (!semImoveis && onImovelClick) ? 'pointer' : 'default' }}
      >
        {semImoveis ? (
          <>
            <div style={{
              fontSize: 14, fontWeight: 700, fontFamily: 'Georgia, serif',
              color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              Olá, {primeiroNome} 👋
            </div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
              {saudacao}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{emoji}</span>
              <span style={{
                fontSize: 14, fontWeight: 700, fontFamily: 'Georgia, serif',
                color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {nomeLabel}
              </span>
            </div>
            {subLabel && (
              <div style={{
                fontSize: 10.5, color: 'rgba(255,255,255,0.7)', marginTop: 1,
                display: 'flex', alignItems: 'center', gap: 3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {subLabel}
                </span>
                {showChevron && <span style={{ flexShrink: 0, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>▾</span>}
              </div>
            )}
          </>
        )}
      </div>

      {/* Cluster direito */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

        {/* Temperatura — ocultável via hideTemp */}
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

        {/* Avatar */}
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
