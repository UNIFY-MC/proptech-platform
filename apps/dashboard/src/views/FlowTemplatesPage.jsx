// FlowTemplatesPage — /flow-templates · Sprint Q3
// Lista de templates + número de steps + edição inline básica.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Layers, Plus } from 'lucide-react'
import { useFlowTemplates } from '../hooks/useFlowTemplates.js'

export default function FlowTemplatesPage() {
  const { templates, loading, save } = useFlowTemplates()
  const [creating, setCreating] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ slug: '', name: '', vertical: 'V2', description: '' })

  async function handleCreate() {
    if (!newTemplate.slug || !newTemplate.name) return
    const ok = await save({ ...newTemplate, default_steps: [] })
    if (ok) {
      setCreating(false)
      setNewTemplate({ slug: '', name: '', vertical: 'V2', description: '' })
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 920 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>
          <Layers size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Flow templates
        </h1>
        <button
          onClick={() => setCreating(true)}
          style={{
            background: 'var(--text)', color: 'var(--bg)', border: 'none',
            borderRadius: 5, padding: '6px 12px', cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}
        ><Plus size={13} /> Novo template</button>
      </div>
      <p style={{ marginTop: 4, fontSize: '0.82rem', color: 'var(--text-dim)' }}>
        Templates aplicáveis a novos clientes. Cada template tem N steps por defeito.
      </p>

      {loading && <div style={{ marginTop: 16, color: 'var(--text-dim)', fontSize: '0.78rem' }}>A carregar…</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 16 }}>
        {templates.map(t => (
          <div key={t.id} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 14,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <strong style={{ fontSize: '0.92rem', color: 'var(--text)' }}>{t.name}</strong>
              {t.vertical && (
                <span style={{
                  fontSize: '0.62rem', fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace',
                  background: 'var(--bg-elevated)', padding: '2px 7px', borderRadius: 99,
                  color: 'var(--primary)',
                }}>{t.vertical}</span>
              )}
            </div>
            <code style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>{t.slug}</code>
            {t.description && <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: 1.45 }}>{t.description}</div>}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              <span>{t.step_count} steps</span>
              <Link to={`/flow-templates/${t.slug}`} style={{ color: 'var(--primary)' }}>Ver →</Link>
            </div>
          </div>
        ))}
      </div>

      {creating && (
        <div onClick={() => setCreating(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 20, width: 440, maxWidth: '92vw',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Novo template</h3>
            <input placeholder="Slug (ex: prata_owners_intake)" value={newTemplate.slug} onChange={e => setNewTemplate({ ...newTemplate, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} style={modalInput} />
            <input placeholder="Nome" value={newTemplate.name} onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })} style={modalInput} />
            <select value={newTemplate.vertical} onChange={e => setNewTemplate({ ...newTemplate, vertical: e.target.value })} style={modalInput}>
              <option value="">Sem vertical</option>
              <option value="V2">V2 Condomínios</option>
              <option value="V3">V3 Seguros</option>
              <option value="V4">V4 Energia</option>
              <option value="V5">V5 Manutenção</option>
              <option value="V10">V10 Owners</option>
            </select>
            <textarea placeholder="Descrição (opcional)" value={newTemplate.description} onChange={e => setNewTemplate({ ...newTemplate, description: e.target.value })} rows={2} style={{ ...modalInput, resize: 'vertical' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 6 }}>
              <button onClick={() => setCreating(false)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 5, padding: '6px 12px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.78rem' }}>Cancelar</button>
              <button onClick={handleCreate} disabled={!newTemplate.slug || !newTemplate.name} style={{ background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 5, padding: '6px 16px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, opacity: (!newTemplate.slug || !newTemplate.name) ? 0.5 : 1 }}>Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const modalInput = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text)', padding: '7px 11px', borderRadius: 5,
  fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit',
}
