import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store'

export default function LoginView() {
  const { session } = useAuthStore()
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState('idle') // 'idle' | 'sending' | 'sent' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    if (!supabase) {
      setErrorMsg('Cliente Supabase não configurado.')
      setMode('error')
      return
    }
    setMode('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setErrorMsg(error.message)
      setMode('error')
    } else {
      setMode('sent')
    }
  }

  const buttonLabel = {
    idle: 'Enviar link',
    sending: 'A enviar…',
    sent: 'Link enviado ✓',
    error: 'Tentar novamente',
  }[mode]

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          padding: '32px',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          width: '360px',
          maxWidth: '90vw',
        }}
      >
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px', color: 'var(--text)' }}>
          Agentic Ops
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '24px' }}>
          Entrar para continuar
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="mario@exemplo.pt"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (mode === 'error') setMode('idle')
            }}
            required
            disabled={mode === 'sending' || mode === 'sent'}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text)',
              fontSize: '14px',
              marginBottom: '12px',
              outline: 'none',
            }}
          />

          <button
            type="submit"
            disabled={mode === 'sending' || mode === 'sent'}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: mode === 'sent' ? 'var(--success)' : 'var(--primary)',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: mode === 'idle' || mode === 'error' ? 'pointer' : 'not-allowed',
              opacity: mode === 'sending' ? 0.7 : 1,
            }}
          >
            {buttonLabel}
          </button>
        </form>

        {mode === 'sent' && (
          <p
            style={{
              marginTop: '16px',
              padding: '10px 12px',
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '4px',
              color: 'var(--success)',
              fontSize: '13px',
            }}
          >
            Verifica o teu email. O link expira em 1h.
          </p>
        )}

        {mode === 'error' && (
          <p
            style={{
              marginTop: '16px',
              padding: '10px 12px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '4px',
              color: 'var(--danger)',
              fontSize: '13px',
            }}
          >
            {errorMsg || 'Ocorreu um erro. Tenta novamente.'}
          </p>
        )}
      </div>
    </div>
  )
}
