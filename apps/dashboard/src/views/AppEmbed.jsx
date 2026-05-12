// AppEmbed — main area que carrega a app via iframe full bleed.
// A 2ª coluna é a app inteira (com o seu próprio sidebar interno + routes).
// Não duplica o sidebar — só uma toolbar fina no topo (label + reload + open-in-window).

import { useEffect, useRef, useState } from 'react'
import { useAppShellStore } from '../store'
import { useApps } from '../hooks/useApps.js'

const HEALTH_TIMEOUT_MS = 4000

export default function AppEmbed() {
  const { activeAppSlug, setActiveApp } = useAppShellStore()
  const { apps, loading } = useApps()
  const iframeRef = useRef(null)
  const [healthCheck, setHealthCheck] = useState({ checking: true, alive: null })
  const [reloadKey, setReloadKey] = useState(0)

  const app = apps.find(a => a.slug === activeAppSlug)

  useEffect(() => {
    if (!app || !app.embed || !import.meta.env.DEV) {
      setHealthCheck({ checking: false, alive: true })
      return
    }
    let cancelled = false
    setHealthCheck({ checking: true, alive: null })
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS)
    fetch(app.dev_url, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal })
      .then(() => { if (!cancelled) setHealthCheck({ checking: false, alive: true }) })
      .catch(() => { if (!cancelled) setHealthCheck({ checking: false, alive: false }) })
      .finally(() => clearTimeout(timer))
    return () => { cancelled = true; ctrl.abort() }
  }, [app?.slug, app?.dev_url, app?.embed, reloadKey])

  if (loading) return <div style={{ padding: 40, color: 'var(--text-dim)' }}>A carregar…</div>
  if (!app) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', padding: 40, textAlign: 'center',
      }}>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 32, maxWidth: 480,
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🤷</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>App não encontrada</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: 16 }}>
            <code style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--info)' }}>{activeAppSlug}</code>{' '}
            não está em <code>system.apps</code>. Verifica o catálogo em <strong>/context</strong>.
          </p>
          <button onClick={() => setActiveApp('dashboard')} style={{
            padding: '7px 14px', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 5, fontSize: '0.78rem', fontWeight: 600,
            cursor: 'pointer',
          }}>Voltar ao Dashboard</button>
        </div>
      </div>
    )
  }
  if (!app.embed) return null

  if (import.meta.env.DEV && healthCheck.alive === false) {
    return <ServerDownHint app={app} onRetry={() => setReloadKey(k => k + 1)} onBackToDashboard={() => setActiveApp('dashboard')} />
  }

  // Em DEV: URL absoluta do dev server da app (evita recursão pelo proxy Vite
  // do dashboard que cai no SPA fallback). Em PROD: prod_url da BD.
  const base = import.meta.env.DEV
    ? (app.dev_url || `http://localhost:5175`)
    : (app.prod_url || '')
  if (!base) {
    return (
      <div style={{ padding: 40 }}>
        <h2>{app.label}</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          Sem <code>prod_url</code> em <code>system.apps</code>.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Toolbar fina no topo */}
      <div style={{
        padding: '6px 14px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: '0.7rem', color: 'var(--text-dim)',
        flexShrink: 0, height: 32, boxSizing: 'border-box',
      }}>
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{app.label}</span>
        <code style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem',
          color: 'var(--info)', opacity: 0.7,
        }}>{import.meta.env.DEV ? app.dev_url : app.prod_url}</code>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => setReloadKey(k => k + 1)} title="Recarregar iframe"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.9rem', padding: '0 4px' }}>↻</button>
          <a href={(import.meta.env.DEV ? app.dev_url : app.prod_url) + '/'}
             target="_blank" rel="noreferrer"
             style={{ fontSize: '0.65rem', color: 'var(--info)', textDecoration: 'none' }}
             title="Abrir em nova janela">Abrir em janela ↗</a>
        </div>
      </div>

      {/* iframe full bleed — é a app inteira, com o seu próprio sidebar interno */}
      <iframe
        ref={iframeRef}
        key={`${app.slug}::${reloadKey}`}
        src={`${base}/`}
        title={app.label}
        style={{ flex: 1, width: '100%', border: 'none', background: 'var(--bg)' }}
      />
    </div>
  )
}

function ServerDownHint({ app, onRetry, onBackToDashboard }) {
  const filterName = app.slug === 'v2' ? 'v2-condominios'
                   : app.slug === 'v4' ? 'v4-energia'
                   : app.slug === 'v5' ? 'v5-manutencao' : app.slug
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100vh', padding: 40, textAlign: 'center',
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 32, maxWidth: 520,
      }}>
        <div style={{ fontSize: '2.4rem', marginBottom: 12 }}>🛑</div>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>{app.label} não está a correr</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: 16 }}>
          O dev server em{' '}
          <code style={{
            fontFamily: 'JetBrains Mono, monospace', color: 'var(--info)',
            background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4,
          }}>{app.dev_url}</code>{' '}
          não respondeu em {HEALTH_TIMEOUT_MS / 1000}s.
        </p>
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 6, padding: 12, marginBottom: 16,
          fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem',
          textAlign: 'left', color: 'var(--text)',
        }}>
          <div style={{ color: 'var(--text-dim)', marginBottom: 6 }}># Arranca esta app:</div>
          <div>pnpm --filter {filterName} dev</div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={onRetry} style={{
            padding: '7px 14px', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 5, fontSize: '0.78rem', fontWeight: 600,
            cursor: 'pointer',
          }}>Re-tentar</button>
          <button onClick={onBackToDashboard} style={{
            padding: '7px 14px', background: 'transparent', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 5, fontSize: '0.78rem',
            cursor: 'pointer',
          }}>Voltar ao Dashboard</button>
        </div>
      </div>
    </div>
  )
}
