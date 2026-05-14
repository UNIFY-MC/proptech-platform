// ClientsPage — /clients · overview cards + sub-routes Setup/Email/Reporting
//
// Replica trycook.ai/clients:
// - Header "Clients in your business" + stats (Total/Active/Pending/Grants)
// - Grid cards de clientes com flow %, grants connected, owner
// - Buttons: Open Portal · Bulk Invite · Invite Client
// - Sub-routes: /clients/setup · /clients/email · /clients/reporting

import { useState, useMemo, useEffect } from 'react'
import { Link, useLocation, Outlet, useSearchParams, useNavigate } from 'react-router-dom'
import { ExternalLink, Users, Plus, Upload, X, Loader2 } from 'lucide-react'
import { useClients } from '../hooks/useClients.js'

const STATUS_COLORS = {
  active:  { color: '#10b981', label: 'ACTIVE' },
  pending: { color: '#f59e0b', label: 'PENDING' },
  paused:  { color: '#9ca3af', label: 'PAUSED' },
  churned: { color: '#ef4444', label: 'CHURNED' },
}

function timeAgo(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-PT', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ClientCard({ client, onClick }) {
  const status = STATUS_COLORS[client.status] || STATUS_COLORS.pending
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderLeft: `3px solid ${status.color}`,
        borderRadius: 8, padding: 16, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 8,
        transition: 'border-color 0.12s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{client.company_name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{client.contact_email}</div>
        </div>
        <span style={{
          fontSize: 9, padding: '2px 6px', borderRadius: 3,
          background: `${status.color}22`, color: status.color,
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
          letterSpacing: '0.06em',
        }}>{status.label}</span>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>
          <span>Onboarding flow</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{client.flow_progress || 0}%</span>
        </div>
        <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${client.flow_progress || 0}%`, height: '100%',
            background: client.flow_progress > 50 ? '#10b981' : '#3b82f6',
            transition: 'width 0.3s',
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-dim)' }}>
        <span>{client.grants_connected || 0} grants connected</span>
        <span>{timeAgo(client.invited_at || client.created_at)}</span>
      </div>

      {client.owner_staff && (
        <button style={{
          marginTop: 4, padding: '6px 10px', borderRadius: 5,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          color: 'var(--text)', fontSize: 11, cursor: 'pointer',
        }}>{client.owner_staff}</button>
      )}
    </div>
  )
}

function InviteModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ company_name: '', contact_email: '', contact_name: '', niche: '', vertical: '' })
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.company_name || !form.contact_email) return
    setBusy(true)
    await onSubmit({ ...form, vertical: form.vertical || null })
    setBusy(false)
    onClose()
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 24, width: 500, maxWidth: '100%',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Invite client</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Empresa *">
            <input required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} style={input} />
          </Field>
          <Field label="Email *">
            <input required type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} style={input} />
          </Field>
          <Field label="Nome contacto">
            <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} style={input} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Niche">
              <input value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} placeholder="ex: HVAC Lisboa" style={input} />
            </Field>
            <Field label="Vertical">
              <select value={form.vertical} onChange={(e) => setForm({ ...form, vertical: e.target.value })} style={input}>
                <option value="">—</option>
                <option value="v2">V2 Condomínios</option>
                <option value="v3">V3 Seguros</option>
                <option value="v4">V4 Energia</option>
                <option value="v5">V5 Manutenção</option>
                <option value="v7">V7 Real Estate</option>
                <option value="v8">V8 Rentals</option>
              </select>
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} style={btnCancel}>Cancelar</button>
            <button type="submit" disabled={busy} style={btnSubmit}>
              {busy && <Loader2 size={12} className="spin" />} Enviar invite
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      {children}
    </label>
  )
}

const input = {
  padding: '7px 10px', background: 'var(--bg-elevated)',
  border: '1px solid var(--border)', borderRadius: 5,
  color: 'var(--text)', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box',
}
const btnCancel = {
  padding: '8px 14px', borderRadius: 6, background: 'transparent',
  border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13,
}
const btnSubmit = {
  padding: '8px 14px', borderRadius: 6, background: 'var(--primary)',
  border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13,
  display: 'inline-flex', alignItems: 'center', gap: 6,
}

// ─── Tabs sub-route ─────────────────────────────────────────────────────
function ClientsTabs() {
  const location = useLocation()
  const tabs = [
    { to: '/clients',           label: 'Clients' },
    { to: '/clients/setup',     label: 'Setup' },
    { to: '/clients/email',     label: 'Email' },
    { to: '/clients/reporting', label: 'Reporting' },
  ]
  return (
    <div style={{
      display: 'flex', gap: 4, borderBottom: '1px solid var(--border)',
      marginBottom: 20, padding: '0 8px',
    }}>
      {tabs.map(t => {
        const active = location.pathname === t.to
        return (
          <Link
            key={t.to}
            to={t.to}
            style={{
              padding: '8px 14px',
              borderBottom: `2px solid ${active ? 'var(--primary)' : 'transparent'}`,
              color: active ? 'var(--text)' : 'var(--text-dim)',
              fontSize: 13, fontWeight: 500,
              textDecoration: 'none',
              marginBottom: -1,
            }}
          >{t.label}</Link>
        )
      })}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const navigate = useNavigate()
  const { items, loading, create } = useClients()
  const [searchParams, setSearchParams] = useSearchParams()
  const [inviteOpen, setInviteOpen] = useState(false)

  // Read ?invite=true from URL (Sprint P: wire from EmployeesPage)
  useEffect(() => {
    if (searchParams.get('invite') === 'true') {
      setInviteOpen(true)
      setSearchParams({})  // limpa query param
    }
  }, [searchParams, setSearchParams])

  const stats = useMemo(() => ({
    total:   items.length,
    active:  items.filter(c => c.status === 'active').length,
    pending: items.filter(c => c.status === 'pending').length,
    grants:  items.reduce((s, c) => s + (c.grants_connected || 0), 0),
  }), [items])

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}><Loader2 className="spin" size={18} /></div>
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '4px 0 40px' }}>
      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} onSubmit={create} />}

      <ClientsTabs />

      {/* Header com action buttons topo direito */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, padding: '0 8px',
      }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Clients</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnSecondary}>
            <ExternalLink size={13} /> Open Portal
          </button>
          <button style={btnSecondary}>
            <Upload size={13} /> Bulk Invite
          </button>
          <button onClick={() => setInviteOpen(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 6,
            background: 'var(--primary)', color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={13} /> Invite Client
          </button>
        </div>
      </div>

      {/* Heading central */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
          Clients in your business
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
          Convida clientes para um portal privado onde podem acompanhar onboarding,<br />
          gerir acessos e conectar as ferramentas deles.
        </p>
      </div>

      {/* Stats cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 10, marginBottom: 24, padding: '0 8px',
      }}>
        <StatCard label="Total Clients" value={stats.total} delta="+5" color="var(--text)" />
        <StatCard label="Active"        value={stats.active} delta="+0" color="#10b981" />
        <StatCard label="Pending"       value={stats.pending} delta="+0" color="#f59e0b" />
        <StatCard label="Grants Connected" value={stats.grants} delta="+0" color="#3b82f6" />
      </div>

      {/* Grid de clientes */}
      {items.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center',
          background: 'var(--bg-card)', border: '1px dashed var(--border)',
          borderRadius: 8, color: 'var(--text-dim)',
        }}>
          <Users size={28} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 13 }}>Sem clientes ainda. Click "Invite Client" para começar.</div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12, padding: '0 8px',
        }}>
          {items.map(c => <ClientCard key={c.id} client={c} onClick={() => navigate(`/clients/${c.slug}/portal`)} />)}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, delta, color }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '14px 16px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    }}>
      <div>
        <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace' }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color, marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
      </div>
      <span style={{ fontSize: 11, color: '#10b981', fontFamily: 'JetBrains Mono, monospace' }}>{delta}</span>
    </div>
  )
}

const btnSecondary = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 12px', borderRadius: 6,
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer',
}

// Export tabs também para usar nas sub-pages
export { ClientsTabs }
