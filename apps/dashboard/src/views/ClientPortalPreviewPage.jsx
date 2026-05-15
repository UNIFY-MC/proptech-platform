// ClientPortalPreviewPage — /clients/:slug/portal
// Preview do portal cliente como o próprio cliente verá (banner "Preview mode")

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, LayoutDashboard, Inbox, Plug, HelpCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useClientFlowSteps } from '../hooks/useClientFlowSteps.js'

export default function ClientPortalPreviewPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')

  useEffect(() => {
    if (!supabase) return setLoading(false)
    supabase.from('system_clients').select('*').eq('slug', slug).single()
      .then(({ data }) => { setClient(data); setLoading(false) })
  }, [slug])

  const { steps: flowSteps, progress: flowProgress } = useClientFlowSteps(client?.id)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}><Loader2 className="spin" size={18} /></div>
  if (!client) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>Cliente não encontrado</h2>
      <Link to="/clients" style={{ color: 'var(--primary)' }}>← Voltar a clients</Link>
    </div>
  )

  const branding = client.branding || {}
  const primaryColor = branding.primary_color || '#0066FF'

  return (
    <div style={{ position: 'fixed', inset: '50px 0 0 200px', background: branding.background_color || '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Preview mode banner */}
      <div style={{
        background: '#4f46e5', color: '#fff', padding: '8px 20px',
        textAlign: 'center', fontSize: 12, fontWeight: 500,
      }}>
        🎭 Preview mode — esta vista é o que o cliente <strong>{client.company_name}</strong> verá no portal.
        <button
          onClick={() => navigate('/clients')}
          style={{
            marginLeft: 12, padding: '3px 10px', borderRadius: 4,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff', fontSize: 11, cursor: 'pointer',
          }}
        >← Voltar admin</button>
      </div>

      {/* Portal layout */}
      <div style={{ display: 'flex', flex: 1, color: '#1f2937' }}>
        {/* Client sidebar */}
        <aside style={{
          width: 220, background: '#f9fafb', borderRight: '1px solid #e5e7eb',
          padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, padding: '0 8px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6, background: primaryColor,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14,
            }}>{client.company_name[0]}</div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{client.company_name}</span>
          </div>

          <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '8px 8px 4px', fontFamily: 'JetBrains Mono, monospace' }}>
            Navigation
          </div>

          {[
            { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
            { id: 'onboarding', label: 'Onboarding', icon: Inbox },
            { id: 'connections', label: 'Connections', icon: Plug },
          ].map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 5,
                  background: active ? primaryColor + '22' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: active ? primaryColor : '#374151',
                  fontSize: 13, textAlign: 'left',
                }}
              >
                <Icon size={14} /> {t.label}
              </button>
            )
          })}

          <div style={{ flex: 1 }} />
          <button style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 12px', borderRadius: 6,
            background: primaryColor, color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            <HelpCircle size={13} /> Help
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 8px 0', borderTop: '1px solid #e5e7eb', marginTop: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#10b981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
              {(client.contact_name || 'C')[0]}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{client.contact_name || client.company_name}</div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>{client.contact_email}</div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: 40, overflow: 'auto', background: '#fff' }}>
          {tab === 'dashboard' && (
            <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
              <LayoutDashboard size={48} color="#9ca3af" style={{ marginBottom: 16 }} />
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>
                No dashboards assigned yet
              </h1>
              <p style={{ fontSize: 13, color: '#6b7280', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
                Property007 ainda não partilhou um dashboard contigo. Vais ver performance reports
                aqui assim que estiverem configurados.
              </p>
            </div>
          )}

          {tab === 'onboarding' && (
            <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#111827' }}>Onboarding</h2>
                <Link
                  to={`/clients/${slug}/flow`}
                  style={{ fontSize: 11, color: primaryColor, textDecoration: 'none', fontWeight: 600 }}
                >
                  Editar flow →
                </Link>
              </div>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
                Status: {flowProgress}% · {flowSteps.length} steps
              </p>

              <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden', marginBottom: 32 }}>
                <div style={{ width: `${flowProgress}%`, height: '100%', background: primaryColor, transition: 'width 0.3s' }} />
              </div>

              {flowSteps.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#6b7280', background: '#f9fafb', border: '1px dashed #e5e7eb', borderRadius: 6 }}>
                  Sem flow configurado.<br />
                  <Link to={`/clients/${slug}/flow`} style={{ color: primaryColor }}>Aplica um template →</Link>
                </div>
              ) : flowSteps.map(s => {
                const done = s.status === 'done'
                return (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 6,
                    background: done ? '#f0fdf4' : '#f9fafb',
                    border: `1px solid ${done ? '#86efac' : '#e5e7eb'}`,
                    marginBottom: 8,
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: done ? '#10b981' : '#e5e7eb',
                      color: done ? '#fff' : '#6b7280',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>{done ? '✓' : s.step_index}</div>
                    <span style={{ fontSize: 13, color: '#111827', flex: 1 }}>{s.label}</span>
                    {!s.required && (
                      <span style={{ fontSize: 10, color: '#6b7280', padding: '1px 6px', background: '#fff', borderRadius: 3, border: '1px solid #e5e7eb' }}>opcional</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'connections' && (
            <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#111827' }}>Connected tools</h2>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
                {client.grants_connected || 0} grants connected.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {['Gmail', 'WhatsApp Business', 'Toconline', 'Banco BCP'].map((t, i) => (
                  <div key={t} style={{
                    padding: 16, borderRadius: 8,
                    background: '#fff', border: '1px solid #e5e7eb',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#111827' }}>{t}</div>
                    <div style={{ fontSize: 11, color: i < (client.grants_connected || 0) ? '#10b981' : '#6b7280' }}>
                      {i < (client.grants_connected || 0) ? '✓ Connected' : 'Not connected'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
