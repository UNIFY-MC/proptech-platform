// ClientFlowBuilderPage — /clients/:slug/flow · Sprint Q3
// Editor de onboarding flow por cliente.

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useClientFlowSteps } from '../hooks/useClientFlowSteps.js'
import { useFlowTemplates } from '../hooks/useFlowTemplates.js'
import OnboardingFlowBuilder from '../components/OnboardingFlowBuilder.jsx'
import { useNotificationsStore } from '../store'

export default function ClientFlowBuilderPage() {
  const { slug } = useParams()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const addToast = useNotificationsStore(s => s.addToast)

  useEffect(() => {
    if (!supabase || !slug) return
    supabase.from('system_clients').select('*').eq('slug', slug).single()
      .then(({ data }) => { setClient(data); setLoading(false) })
  }, [slug])

  const { steps, progress, createFromTemplate, updateStep, addStep, removeStep, reorderSteps } = useClientFlowSteps(client?.id)
  const { templates } = useFlowTemplates()

  if (loading) return <div style={{ padding: 30, color: 'var(--text-dim)' }}>A carregar…</div>
  if (!client) return (
    <div style={{ padding: 30 }}>
      <h2>Cliente não encontrado</h2>
      <Link to="/clients" style={{ color: 'var(--primary)' }}>← Voltar a clients</Link>
    </div>
  )

  async function applyTemplate(slug) {
    const count = await createFromTemplate(slug)
    addToast({ type: count > 0 ? 'success' : 'error', message: count > 0 ? `✓ ${count} steps criados` : 'Erro ao aplicar template' })
  }

  async function handleUpdate(id, patch) {
    await updateStep(id, patch)
  }

  return (
    <div style={{ padding: 20, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link to={`/clients`} style={{ color: 'var(--text-dim)' }}>
          <ArrowLeft size={16} />
        </Link>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>
          Onboarding Flow · <span style={{ color: 'var(--primary)' }}>{client.company_name}</span>
        </h1>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 4 }}>
          <span>Progresso</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{progress}% · {steps.length} steps</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), #8b5cf6)', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Templates row (se não há steps ainda) */}
      {steps.length === 0 && templates.length > 0 && (
        <div style={{
          marginBottom: 20, padding: 16,
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>
            <Layers size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Começa por aplicar um template
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t.slug)}
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 14px', cursor: 'pointer',
                  color: 'var(--text)', fontSize: '0.78rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                }}
              >
                <span style={{ fontWeight: 600 }}>{t.name}</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
                  {t.vertical && <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{t.vertical} · </span>}
                  {t.step_count} steps
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Re-apply template (se já tem steps) */}
      {steps.length > 0 && templates.length > 0 && (
        <details style={{ marginBottom: 16 }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Re-aplicar template (substitui todos os steps actuais)
          </summary>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => { if (confirm(`Substituir steps actuais por '${t.name}'?`)) applyTemplate(t.slug) }}
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, padding: '5px 10px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.7rem' }}
              >{t.name}</button>
            ))}
          </div>
        </details>
      )}

      {/* Builder */}
      <OnboardingFlowBuilder
        steps={steps}
        onUpdate={handleUpdate}
        onAdd={addStep}
        onRemove={removeStep}
        onReorder={reorderSteps}
      />

      <div style={{ marginTop: 20, fontSize: '0.7rem', color: 'var(--text-dim)' }}>
        Visualiza o portal do cliente com estes steps em <Link to={`/clients/${slug}/portal`} style={{ color: 'var(--primary)' }}>/clients/{slug}/portal</Link>
      </div>
    </div>
  )
}
