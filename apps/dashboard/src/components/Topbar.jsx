// Topbar — navegação global 2D do dashboard
// Esquerda: brand + tab Dashboard + dropdowns por vertical (V2/V3/V4/V5/V10)
// Direita: vertical filter + notif + theme + sync + profile placeholder
//
// Cada tab vertical é um dropdown que lista TODAS as surfaces dessa vertical
// (staff/cliente/prestador × desktop/mobile/tablet). Coming-soon items dim.

import { useState, useRef, useEffect } from 'react'
import * as Icons from 'lucide-react'
import { Bell, Search, Sun, Moon, User, ChevronDown, LayoutDashboard, Clock, Settings, LogOut } from 'lucide-react'
import { useApps, VERTICALS, appsByVertical, defaultSurfaceOf } from '../hooks/useApps.js'
import { useInboxItems } from '../hooks/useSupabase.js'
import { useInboxReads } from '../hooks/useInboxReads.js'
import { useAppShellStore, useVerticalStore } from '../store'
import { roleFor, surfaceFor } from '../lib/surfaces.js'

// Profile placeholder — virá do Supabase Auth quando wired
const PROFILE = {
  name: 'Mário Carvalho',
  email: 'mariocarvalho.biz@gmail.com',
  role: 'Owner · Property007',
}

function UserMenu({ theme, setTheme }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div ref={ref} className="topbar-user-wrap">
      <button
        className="topbar-icon-btn"
        title={PROFILE.name}
        onClick={() => setOpen(o => !o)}
      >
        <User size={15} />
      </button>
      {open && (
        <div className="topbar-user-menu">
          <div className="topbar-user-header">
            <div className="topbar-user-name">{PROFILE.name}</div>
            <div className="topbar-user-email">{PROFILE.email}</div>
            <div className="topbar-user-email" style={{ marginTop: 4 }}>{PROFILE.role}</div>
          </div>
          <button
            className="topbar-user-item"
            onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setOpen(false) }}
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            <span>{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
          </button>
          <a href="/settings" className="topbar-user-item" onClick={() => setOpen(false)}>
            <Settings size={13} />
            <span>Definições</span>
          </a>
          <div className="topbar-user-divider" />
          <button
            className="topbar-user-item"
            onClick={() => { setOpen(false); alert('Sign out — wire ao Supabase Auth quando IAM v1 estiver pronto.') }}
            style={{ color: 'var(--text-dim)' }}
          >
            <LogOut size={13} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  )
}

const FALLBACK_ICON = Icons.Square
function AppIcon({ name, size = 14, color }) {
  const Comp = (name && Icons[name]) || FALLBACK_ICON
  return <Comp size={size} style={{ flexShrink: 0, color }} />
}

// Tab simples para a app Dashboard (sem dropdown)
function DashboardTab({ isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={'topbar-tab' + (isActive ? ' active' : '')}
      title="Dashboard"
    >
      <LayoutDashboard size={14} />
      <span>Dashboard</span>
    </button>
  )
}

// Tab de vertical com dropdown de surfaces
function VerticalTab({ vertical, apps, activeSlug, onPickSlug }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const surfaces = appsByVertical(apps, vertical.id)
  const isActive = surfaces.some(s => s.slug === activeSlug)
  const activeSurface = surfaces.find(s => s.slug === activeSlug)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  if (surfaces.length === 0) return null

  function pickDefault() {
    const def = defaultSurfaceOf(apps, vertical.id)
    if (def) onPickSlug(def.slug)
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', height: '100%' }}>
      <button
        onClick={pickDefault}
        className={'topbar-tab' + (isActive ? ' active' : '')}
        title={vertical.label}
        style={{ paddingRight: 4 }}
      >
        <AppIcon name={vertical.icon} />
        <span>{vertical.label}</span>
        {isActive && activeSurface && (
          <span style={{
            fontSize: '0.6rem',
            color: 'var(--text-dim)',
            fontFamily: 'JetBrains Mono, monospace',
            marginLeft: 4,
          }}>
            · {roleFor(activeSurface.role)?.label || activeSurface.role}
          </span>
        )}
      </button>
      <button
        onClick={() => setOpen(o => !o)}
        className={'topbar-tab topbar-tab-caret' + (isActive ? ' active' : '') + (open ? ' open' : '')}
        title={`Surfaces de ${vertical.label}`}
        style={{ padding: '0 6px' }}
      >
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="topbar-dropdown">
          {surfaces.map(s => {
            const r = roleFor(s.role)
            const sf = surfaceFor(s.surface)
            return (
              <button
                key={s.slug}
                onClick={() => { onPickSlug(s.slug); setOpen(false) }}
                className={'topbar-dropdown-item' + (s.slug === activeSlug ? ' active' : '')}
                style={{ opacity: s.coming_soon ? 0.55 : 1 }}
              >
                <AppIcon name={s.icon} size={13} color={r?.color || 'var(--text-dim)'} />
                <span style={{ flex: 1, textAlign: 'left' }}>{s.label}</span>
                <span style={{
                  fontSize: '0.55rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--text-dim)',
                }}>{sf?.label || s.surface}</span>
                {s.coming_soon && (
                  <span style={{
                    fontSize: '0.55rem',
                    color: 'var(--warning)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2,
                  }}><Clock size={9} /> soon</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Topbar({ theme, setTheme, lastSync, loading, refresh }) {
  const { apps } = useApps()
  const { activeAppSlug, setActiveApp } = useAppShellStore()
  const { activeVertical } = useVerticalStore()
  const { items } = useInboxItems(activeVertical)
  const { readSet } = useInboxReads()
  const unread = items.filter(i => !readSet.has(i.id)).length

  const isDashboard = activeAppSlug === 'dashboard'

  return (
    <header className="app-topbar">
      <div className="topbar-brand">
        <span className="topbar-brand-title">PropTech</span>
      </div>
      <div className="topbar-divider" />

      <nav className="topbar-tabs">
        <DashboardTab
          isActive={activeAppSlug === 'dashboard'}
          onClick={() => setActiveApp('dashboard')}
        />
        {VERTICALS.map(v => (
          <VerticalTab
            key={v.id}
            vertical={v}
            apps={apps}
            activeSlug={activeAppSlug}
            onPickSlug={setActiveApp}
          />
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {isDashboard && (
        <>
          <button className="topbar-icon-btn" title="Pesquisar (em breve)">
            <Search size={15} />
          </button>

          <a href="/inbox" className="topbar-icon-btn" title={`${unread} não lidos`} style={{ position: 'relative' }}>
            <Bell size={15} />
            {unread > 0 && <span className="topbar-badge">{unread}</span>}
          </a>

          <button
            className="topbar-icon-btn"
            onClick={refresh}
            disabled={loading}
            title="Recarregar dados"
          >
            {loading ? '⏳' : '↻'}
          </button>

          {lastSync && (
            <span className="topbar-sync" title="Última sync">
              {String(lastSync).slice(11, 19)}
            </span>
          )}

          <UserMenu theme={theme} setTheme={setTheme} />
        </>
      )}
    </header>
  )
}
