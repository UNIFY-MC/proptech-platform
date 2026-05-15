// SkillsMarketplacePage — /skills/marketplace · Sprint Q5
// Grid de skills visibility='team'|'public' com Install/Uninstall.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Download, Check, TrendingUp, Clock } from 'lucide-react'
import { useSkillMarketplace } from '../hooks/useSkillMarketplace.js'
import { useNotificationsStore } from '../store'

export default function SkillsMarketplacePage() {
  const { skills, installedIds, loading, staffId, installSkill, uninstallSkill } = useSkillMarketplace()
  const [filter, setFilter] = useState('all')  // all | top | recent | installed
  const addToast = useNotificationsStore(s => s.addToast)

  const filtered = skills.filter(s => {
    if (filter === 'installed') return installedIds.has(s.id)
    return true
  })

  // Top installed (sorted by install_count desc — já vem assim do view)
  const topInstalled = skills.slice(0, 5)
  // Recently published (sorted by created_at desc)
  const recentPublished = [...skills].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)

  async function handleInstall(s) {
    const ok = await installSkill(s.id)
    addToast({ type: ok ? 'success' : 'error', message: ok ? `✓ Instalada · ${s.name}` : 'Erro ao instalar' })
  }

  async function handleUninstall(s) {
    const ok = await uninstallSkill(s.id)
    addToast({ type: ok ? 'success' : 'error', message: ok ? `Desinstalada · ${s.name}` : 'Erro' })
  }

  return (
    <div style={{ padding: 20, maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>
          <Sparkles size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Skill Marketplace
        </h1>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
          A operar como: <strong style={{ color: 'var(--text)' }}>{staffId}</strong>
        </span>
      </div>
      <p style={{ marginTop: 4, fontSize: '0.82rem', color: 'var(--text-dim)' }}>
        Skills partilhadas pela equipa Property007. Instala as que precisas para o teu workflow.
      </p>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginTop: 16, marginBottom: 12 }}>
        {[
          { id: 'all', label: 'Todas' },
          { id: 'installed', label: `Instaladas (${installedIds.size})` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            style={{
              background: filter === t.id ? 'var(--text)' : 'var(--bg-elevated)',
              color: filter === t.id ? 'var(--bg)' : 'var(--text-dim)',
              border: '1px solid var(--border)',
              borderRadius: 5, padding: '6px 12px', cursor: 'pointer',
              fontSize: '0.74rem', fontWeight: 600,
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Top installed + Recently published sections (só na vista 'all') */}
      {filter === 'all' && skills.length > 0 && (
        <>
          <Section title="Top instaladas" icon={<TrendingUp size={13} />}>
            {topInstalled.map(s => (
              <SkillCard key={s.id} skill={s} installed={installedIds.has(s.id)} onInstall={() => handleInstall(s)} onUninstall={() => handleUninstall(s)} />
            ))}
          </Section>
          <Section title="Recentemente publicadas" icon={<Clock size={13} />}>
            {recentPublished.map(s => (
              <SkillCard key={s.id} skill={s} installed={installedIds.has(s.id)} onInstall={() => handleInstall(s)} onUninstall={() => handleUninstall(s)} />
            ))}
          </Section>
        </>
      )}

      {/* Lista completa */}
      <h2 style={{ marginTop: 20, fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {filter === 'installed' ? 'Minhas skills instaladas' : `Todas (${skills.length})`}
      </h2>
      {loading && <div style={{ marginTop: 10, color: 'var(--text-dim)' }}>A carregar…</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, marginTop: 10 }}>
        {filtered.map(s => (
          <SkillCard
            key={s.id}
            skill={s}
            installed={installedIds.has(s.id)}
            onInstall={() => handleInstall(s)}
            onUninstall={() => handleUninstall(s)}
          />
        ))}
      </div>
      {!loading && filtered.length === 0 && (
        <div style={{ marginTop: 16, padding: 30, textAlign: 'center', color: 'var(--text-dim)', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 8 }}>
          {filter === 'installed'
            ? <>Ainda não instalaste skills. Explora as <Link to="/skills/marketplace" onClick={() => setFilter('all')} style={{ color: 'var(--primary)' }}>publicadas pela equipa</Link>.</>
            : 'Sem skills publicadas (visibility=team).'}
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginTop: 16, marginBottom: 4 }}>
      <h3 style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
        {icon} {title}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
        {children}
      </div>
    </div>
  )
}

function SkillCard({ skill, installed, onInstall, onUninstall }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${installed ? 'var(--success)' : 'var(--border)'}`,
      borderRadius: 8, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <strong style={{ fontSize: '0.84rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {skill.name || skill.tag}
        </strong>
        {skill.install_count > 0 && (
          <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
            {skill.install_count} 📥
          </span>
        )}
      </div>
      <code style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
        {skill.tag}
      </code>
      {skill.description && (
        <p style={{ margin: '2px 0', fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.45,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {skill.description}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.6rem', color: 'var(--text-dim)' }}>
        {skill.category && <span style={{ background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 3 }}>{skill.category}</span>}
        {skill.owner_employee_id && <span>by <strong>{skill.owner_employee_id}</strong></span>}
      </div>
      <button
        onClick={installed ? onUninstall : onInstall}
        style={{
          marginTop: 6,
          background: installed ? 'var(--bg-elevated)' : 'var(--text)',
          color: installed ? 'var(--success)' : 'var(--bg)',
          border: installed ? '1px solid var(--success)' : 'none',
          borderRadius: 5, padding: '6px 10px', cursor: 'pointer',
          fontSize: '0.7rem', fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        }}
      >
        {installed ? <><Check size={11} /> Instalada</> : <><Download size={11} /> Install</>}
      </button>
    </div>
  )
}
