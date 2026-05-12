// AppEmbed — main area que carrega uma app via iframe (Sprint App Shell)
// activeAppSlug + activePath vêm de useAppShellStore (persiste em localStorage)
// URL vem de useApps (system.apps via public.cookai_apps)

import { useEffect, useRef, useState } from 'react'
import { useAppShellStore } from '../store'
import { useApps } from '../hooks/useApps.js'

const HEALTH_TIMEOUT_MS = 4000

export default function AppEmbed() {
  const { activeAppSlug, activePath, setActiveApp } = useAppShellStore()
  const { apps, urlFor, loading } = useApps()
  const iframeRef = useRef(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [healthCheck, setHealthCheck] = useState({ checking: true, alive: null })

  const app = apps.find(a => a.slug === activeAppSlug)

  // Reset loading state quando muda app/path
  useEffect(() => { setIframeLoaded(false) }, [activeAppSlug, activePath])

  // Health check ao dev_url: HEAD request para detectar se o server está down.
  // Se 404 ou erro de rede, mostramos hint útil em vez de iframe com loop infinito.
  useEffect(() => {
    if (!app || !app.embed || !import.meta.env.DEV) {
      setHealthCheck({ checking: false, alive: true })
      return
    }
    let cancelled = false
    setHealthCheck({ checking: true, alive: null })
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS)

    // Tentar HEAD via dev_url directo (não via proxy — saber se o server real responde)
    const probeUrl = app.dev_url
    fetch(probeUrl, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal })
      .then(() => { if (!cancelled) setHealthCheck({ checking: false, alive: true }) })
      .catch(() => { if (!cancelled) setHealthCheck({ checking: false, alive: false }) })
      .finally(() => clearTimeout(timer))

    return () => { cancelled = true; ctrl.abort() }
  }, [app?.slug, app?.dev_url, app?.embed])

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--text-dim)' }}>A carregar manifest de apps…</div>
  }

  if (!app) {
    return (
      <div style={{ padding: 40, color: 'var(--text-dim)' }}>
        App <code style={{ fontFamily: 'monospace' }}>{activeAppSlug}</code> não encontrada em <code>system.apps</code>.
      </div>
    )
  }

  if (!app.embed) {
    return null // dashboard mode — App.jsx renderiza routes próprias
  }

  // Server da app não está a responder → mostra hint útil
  if (import.meta.env.DEV && healthCheck.alive === false) {
    return (
      <ServerDownHint app={app} onBackToDashboard={() => setActiveApp('dashboard')} />
    )
  }

  // Em dev, usar proxy Vite (/embed/<slug>) que reescreve para dev_url internamente.
  // Em prod, usar prod_url directo se existir.
  const base = import.meta.env.DEV
    ? `/embed/${app.slug}`
    : (app.prod_url || '')

  if (!base) {
    return (
      <div style={{ padding: 40 }}>
        <h2 style={{ margin: '0 0 12px' }}>{app.label}</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          App sem <code style={{ fontFamily: 'monospace' }}>prod_url</code> configurado em <code>system.apps</code>.
          Em produção precisa-se de uma URL pública para fazer iframe.
        </p>
      </div>
    )
  }

  // activePath pode ser '/' ou '/x' ou '/?tab=y'
  const cleanPath = activePath.startsWith('/') ? activePath : `/${activePath}`
  const src = `${base}${cleanPath === '/' ? '' : cleanPath}`

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh',
    }}>
      {/* Breadcrumb compacto */}
      <div style={{
        padding: '8px 16px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: '0.72rem',
        color: 'var(--text-dim)',
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{app.label}</span>
        <span>·</span>
        <code style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem',
          color: 'var(--info)',
        }}>{activePath}</code>
        <span style={{ marginLeft: 'auto', fontSize: '0.6rem' }}>
          {iframeLoaded ? '✓ pronto' : '⏳ a carregar…'}
        </span>
        <a
          href={(import.meta.env.DEV ? app.dev_url : app.prod_url) + (cleanPath === '/' ? '' : cleanPath)}
          target="_blank" rel="noreferrer"
          style={{ fontSize: '0.6rem', color: 'var(--info)', textDecoration: 'none' }}>
          Abrir em janela ↗
        </a>
      </div>

      {/* iframe */}
      <iframe
        ref={iframeRef}
        key={`${app.slug}::${activePath}`}
        src={src}
        title={app.label}
        onLoad={() => setIframeLoaded(true)}
        style={{
          flex: 1,
          width: '100%',
          border: 'none',
          background: 'var(--bg)',
        }}
      />
    </div>
  )
}

function ServerDownHint({ app, onBackToDashboard }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100vh', padding: 40, textAlign: 'center',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
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
          não respondeu nos últimos {HEALTH_TIMEOUT_MS / 1000}s.
        </p>
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 6, padding: 12, marginBottom: 16,
          fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem',
          textAlign: 'left', color: 'var(--text)',
        }}>
          <div style={{ color: 'var(--text-dim)', marginBottom: 6 }}># Na raiz do monorepo:</div>
          <div>pnpm dev:all</div>
          <div style={{ color: 'var(--text-dim)', margin: '8px 0 6px' }}># Ou só esta app:</div>
          <div>pnpm --filter {app.slug === 'v2' ? 'v2-condominios' : app.slug === 'v4' ? 'v4-energia' : app.slug === 'v5' ? 'v5-manutencao' : app.slug} dev</div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => window.location.reload()} style={{
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
