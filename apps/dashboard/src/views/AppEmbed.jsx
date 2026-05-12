// AppEmbed — main area que carrega uma app via iframe (Sprint App Shell)
// activeAppSlug + activePath vêm de useAppShellStore (persiste em localStorage)
// URL vem de useApps (system.apps via public.cookai_apps)

import { useEffect, useRef, useState } from 'react'
import { useAppShellStore } from '../store'
import { useApps } from '../hooks/useApps.js'

export default function AppEmbed() {
  const { activeAppSlug, activePath } = useAppShellStore()
  const { apps, urlFor, loading } = useApps()
  const iframeRef = useRef(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  const app = apps.find(a => a.slug === activeAppSlug)

  // Reset loading state quando muda app/path
  useEffect(() => { setIframeLoaded(false) }, [activeAppSlug, activePath])

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

  const base = urlFor(app)
  // activePath pode ser '/' ou '/x' ou '/?tab=y'
  // Concatenar com base limpando dupla barra
  const cleanPath = activePath.startsWith('/') ? activePath : `/${activePath}`
  const src = `${base}${cleanPath === '/' ? '' : cleanPath}`

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 24px)',
    }}>
      {/* Breadcrumb compacto */}
      <div style={{
        padding: '6px 14px',
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
        {!import.meta.env.DEV && app.prod_url && (
          <a
            href={`${app.prod_url}${cleanPath === '/' ? '' : cleanPath}`}
            target="_blank" rel="noreferrer"
            style={{ fontSize: '0.6rem', color: 'var(--info)', textDecoration: 'none' }}>
            Abrir em janela →
          </a>
        )}
      </div>

      {/* iframe */}
      <iframe
        ref={iframeRef}
        key={`${app.slug}::${activePath}`} // forçar reload em mudança de path
        src={src}
        title={app.label}
        onLoad={() => setIframeLoaded(true)}
        style={{
          flex: 1,
          width: '100%',
          border: 'none',
          background: 'var(--bg)',
        }}
        // sandbox flags omitidos — apps precisam de auth (cookies same-origin)
        // e localStorage. Se precisares de sandbox, adiciona attrs aqui.
      />
    </div>
  )
}
