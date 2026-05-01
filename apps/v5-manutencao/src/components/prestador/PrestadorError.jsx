import React from 'react'

const F = '#0B3D2E'

const MESSAGES = {
  token_not_found: {
    icon: '🔗',
    title: 'Link não encontrado',
    body: 'Este link não existe ou foi removido. Verifica o URL ou pede ao proprietário um novo link.',
  },
  token_used: {
    icon: '🔒',
    title: 'Link já utilizado',
    body: 'Este link já foi usado por outro prestador. Pede um novo link ao proprietário.',
  },
  token_used_race: {
    icon: '🔒',
    title: 'Link já utilizado',
    body: 'Este link foi utilizado simultaneamente. Pede um novo link ao proprietário.',
  },
  token_expired: {
    icon: '⏰',
    title: 'Link expirado',
    body: 'Este link expirou (validade 48 horas). Pede um novo link ao proprietário.',
  },
  bad_nif_mod11: {
    icon: '⚠️',
    title: 'NIF inválido',
    body: 'O NIF introduzido é inválido. Verifica o dígito de controlo e tenta de novo.',
  },
  network: {
    icon: '📡',
    title: 'Erro de ligação',
    body: 'Não foi possível comunicar com o servidor. Verifica a tua ligação à internet e tenta de novo.',
  },
}

const DEFAULT_MSG = {
  icon: '❌',
  title: 'Algo correu mal',
  body: 'Ocorreu um erro inesperado. Tenta de novo ou contacta o proprietário que te enviou o link.',
}

export default function PrestadorError({ errorState }) {
  const code = errorState?.code || 'unknown'
  const { icon, title, body } = MESSAGES[code] || DEFAULT_MSG

  const handleClose = () => {
    try { window.close() } catch (_) {}
    window.location.href = '/'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF6', display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
      <div style={{ background: F, padding: '16px 20px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.6)' }}>
          prataowners.pt
        </div>
      </div>

      <div style={{ padding: '48px 24px', textAlign: 'center', flex: 1 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>{icon}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0A1620', marginBottom: 10, fontFamily: 'Fraunces, serif' }}>
          {title}
        </div>
        <div style={{ fontSize: 14, color: '#6B7685', lineHeight: 1.6, marginBottom: 32 }}>
          {body}
        </div>
        <button
          onClick={handleClose}
          style={{ background: F, color: '#fff', border: 'none', borderRadius: 10, padding: '13px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}
        >
          OK
        </button>
        {errorState?.message && (
          <div style={{ marginTop: 24, fontSize: 10, color: '#9CA3AF', fontFamily: "'JetBrains Mono', monospace" }}>
            Código: {code}
          </div>
        )}
      </div>
    </div>
  )
}
