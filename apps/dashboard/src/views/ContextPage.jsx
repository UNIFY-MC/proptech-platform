// ContextPage — /context (Sprint B Fase B2)
// 4 colunas: Skills · Recipes · Integrations · Documents
// CRUD via useCookai hooks → views public.cookai_* → system.*

import { useState, useMemo } from 'react'
import { useCookaiSkills, useCookaiRecipes, useCookaiIntegrations, useCookaiContextDocs } from '../hooks/useCookai.js'
import CrudDrawer from '../components/context/CrudDrawer.jsx'

const COL_META = {
  skills:       { label: 'Skills',       accent: 'var(--info)',    icon: '✨' },
  recipes:      { label: 'Recipes',      accent: 'var(--warning)', icon: '🍳' },
  integrations: { label: 'Integrations', accent: 'var(--success)', icon: '🔌' },
  docs:         { label: 'Documents',    accent: 'var(--purple)',  icon: '📄' },
}

const SCHEMAS = {
  skills: {
    label: 'Skill',
    defaults: { status: 'draft', category: 'core' },
    fields: [
      { key: 'name',        label: 'Name',        type: 'text',     required: true, placeholder: 'classify-problem-pt' },
      { key: 'slug',        label: 'Slug',        type: 'text',     required: true, hint: 'kebab-case, único' },
      { key: 'description', label: 'Descrição',   type: 'textarea', rows: 3 },
      { key: 'category',    label: 'Categoria',   type: 'select',
        options: ['core','classification','matching','triage','scoring','compose','extract','escalate','vision','simulation','manage','monitor','alert','audit','publish','analysis','generate','import','sync','compliance','routing'] },
      { key: 'code_ref',    label: 'Code ref',    type: 'text',     hint: 'path do executor (opcional)' },
      { key: 'status',      label: 'Status',      type: 'select', options: ['draft','active','deprecated'] },
    ],
  },
  recipes: {
    label: 'Recipe',
    defaults: { status: 'draft', trigger: 'manual', active: false, payload_schema: {} },
    fields: [
      { key: 'name',          label: 'Name',           type: 'text',     required: true },
      { key: 'slug',          label: 'Slug',           type: 'text',     required: true },
      { key: 'employee_id',   label: 'Employee ID',    type: 'text',     required: true, hint: 'ex: v5.bia' },
      { key: 'trigger',       label: 'Trigger',        type: 'select', options: ['manual','cron','event'] },
      { key: 'cron_expr',     label: 'Cron expression', type: 'text',    hint: 'só se trigger=cron · ex: "30 6 * * *"' },
      { key: 'event_pattern', label: 'Event pattern',  type: 'text',     hint: 'só se trigger=event' },
      { key: 'payload_schema',label: 'Payload schema', type: 'json',     hint: 'JSON Schema (opcional)' },
      { key: 'active',        label: 'Activo',         type: 'bool',     boolLabel: 'Recipe activa em runtime' },
      { key: 'status',        label: 'Status',         type: 'select', options: ['draft','active','deprecated'] },
    ],
  },
  integrations: {
    label: 'Integration',
    defaults: { status: 'draft', type: 'api', enabled: false, config: {} },
    fields: [
      { key: 'name',     label: 'Name',     type: 'text',     required: true },
      { key: 'slug',     label: 'Slug',     type: 'text',     required: true },
      { key: 'type',     label: 'Tipo',     type: 'select', options: ['mcp','api','webhook','cli'] },
      { key: 'enabled',  label: 'Enabled',  type: 'bool',     boolLabel: 'Activa para os employees' },
      { key: 'config',   label: 'Config',   type: 'json',     hint: 'JSON · NUNCA secrets aqui (usar Vault)' },
      { key: 'status',   label: 'Status',   type: 'select', options: ['draft','active','deprecated'] },
    ],
  },
  docs: {
    label: 'Context doc',
    defaults: { type: 'sop', tags: [] },
    fields: [
      { key: 'title',       label: 'Título',     type: 'text',     required: true },
      { key: 'employee_id', label: 'Employee ID', type: 'text',    hint: 'vazio = doc global · ex: v5.bia' },
      { key: 'type',        label: 'Tipo',       type: 'select', options: ['sop','icp','call_recap','adr','never_rule'] },
      { key: 'source_url',  label: 'Source URL', type: 'text' },
      { key: 'content',     label: 'Conteúdo',   type: 'textarea', rows: 12 },
    ],
  },
}

export default function ContextPage() {
  const skillsHook = useCookaiSkills()
  const recipesHook = useCookaiRecipes()
  const integrationsHook = useCookaiIntegrations()
  const docsHook = useCookaiContextDocs()

  const [drawer, setDrawer] = useState({ open: false, col: null, item: null })
  const [search, setSearch] = useState('')

  function openDrawer(col, item = null) { setDrawer({ open: true, col, item }) }

  async function handleSave(form) {
    const hook = getHook(drawer.col)
    if (drawer.item?.id) {
      const { id, created_at, updated_at, ...patch } = form
      await hook.update(drawer.item.id, patch)
    } else {
      await hook.create(form)
    }
  }
  async function handleDelete(id) {
    const hook = getHook(drawer.col)
    await hook.remove(id)
  }
  function getHook(col) {
    return { skills: skillsHook, recipes: recipesHook, integrations: integrationsHook, docs: docsHook }[col]
  }

  const drawerSchema = drawer.col ? SCHEMAS[drawer.col] : null
  const totalLoading = skillsHook.loading || recipesHook.loading || integrationsHook.loading || docsHook.loading

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Context</h1>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Catálogo CookAI · Skills · Recipes · Integrations · Documents.
            Source: <code style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--info)' }}>system.*</code> via views <code>public.cookai_*</code>.
          </div>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrar…"
          style={{
            padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 5, fontSize: '0.78rem', minWidth: 200,
            color: 'var(--text)', outline: 'none',
          }} />
      </div>

      {totalLoading && <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>A carregar catálogo…</div>}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 14, alignItems: 'start',
      }}>
        <Column col="skills" meta={COL_META.skills} items={skillsHook.skills} search={search}
          onNew={() => openDrawer('skills')} onSelect={item => openDrawer('skills', item)}
          renderItem={s => <ItemRow primary={s.name} secondary={s.description} badge={s.category} dim={s.status !== 'active'} />} />

        <Column col="recipes" meta={COL_META.recipes} items={recipesHook.recipes} search={search}
          onNew={() => openDrawer('recipes')} onSelect={item => openDrawer('recipes', item)}
          renderItem={r => (
            <ItemRow primary={r.name}
              secondary={r.employee_id + (r.cron_expr ? ' · ' + r.cron_expr : (r.event_pattern ? ' · ' + r.event_pattern : ''))}
              badge={r.trigger.toUpperCase()} dim={!r.active} />
          )} />

        <Column col="integrations" meta={COL_META.integrations} items={integrationsHook.integrations} search={search}
          onNew={() => openDrawer('integrations')} onSelect={item => openDrawer('integrations', item)}
          renderItem={i => (
            <ItemRow primary={i.name} secondary={i.type.toUpperCase()}
              badge={i.enabled ? 'ON' : 'OFF'} badgeColor={i.enabled ? 'var(--success)' : 'var(--text-dim)'}
              dim={!i.enabled} />
          )} />

        <Column col="docs" meta={COL_META.docs} items={docsHook.docs} search={search}
          onNew={() => openDrawer('docs')} onSelect={item => openDrawer('docs', item)}
          renderItem={d => <ItemRow primary={d.title} secondary={d.employee_id ?? 'global'} badge={d.type.toUpperCase()} />} />
      </div>

      <CrudDrawer open={drawer.open} item={drawer.item}
        schema={drawerSchema || { label: '', fields: [] }}
        onSave={handleSave} onDelete={handleDelete}
        onClose={() => setDrawer({ open: false, col: null, item: null })} />
    </div>
  )
}

function Column({ col, meta, items, search, onNew, onSelect, renderItem }) {
  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter(i => JSON.stringify(i).toLowerCase().includes(q))
  }, [items, search])

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderTop: `3px solid ${meta.accent}`, borderRadius: 8,
      display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 180px)',
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.95rem' }}>{meta.icon}</span>
          <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{meta.label}</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>· {filtered.length}</span>
        </div>
        <button onClick={onNew} style={{
          padding: '3px 8px', borderRadius: 4,
          background: meta.accent, color: '#fff', border: 'none',
          fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
        }}>+ Novo</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 20, color: 'var(--text-dim)', fontSize: '0.72rem', fontStyle: 'italic' }}>
            {search ? 'Sem match.' : 'Vazio. Clica + Novo.'}
          </div>
        ) : filtered.map(item => (
          <div key={item.id} onClick={() => onSelect(item)}
            style={{
              padding: '8px 14px', borderBottom: '1px solid var(--border)',
              cursor: 'pointer', transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  )
}

function ItemRow({ primary, secondary, badge, badgeColor, dim }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, opacity: dim ? 0.55 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.76rem', fontWeight: 600, color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{primary}</div>
        {secondary && (
          <div style={{
            fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{secondary}</div>
        )}
      </div>
      {badge && (
        <span style={{
          fontSize: '0.52rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
          padding: '1px 6px', borderRadius: 3,
          background: 'var(--bg-elevated)',
          color: badgeColor || 'var(--text-dim)',
          textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
        }}>{badge}</span>
      )}
    </div>
  )
}
