// ClientsReportingPage — /clients/reporting · Dashboards partilhados c/ clientes

import { BarChart3, Plus, Layout, Eye } from 'lucide-react'
import { ClientsTabs } from './ClientsPage.jsx'

export default function ClientsReportingPage() {
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '4px 0 40px' }}>
      <ClientsTabs />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 8px', marginBottom: 18, flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Reporting</h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '4px 0 0', fontFamily: 'JetBrains Mono, monospace' }}>
            Dashboards partilhados com clientes
          </p>
        </div>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 6,
          background: 'var(--primary)', color: '#fff', border: 'none',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus size={14} /> New dashboard
        </button>
      </div>

      <div style={{
        margin: '0 8px', padding: 40, textAlign: 'center',
        background: 'var(--bg-card)', border: '1px dashed var(--border)',
        borderRadius: 8, color: 'var(--text-dim)',
      }}>
        <BarChart3 size={36} style={{ marginBottom: 12, opacity: 0.6 }} />
        <h3 style={{ fontSize: 16, color: 'var(--text)', margin: '0 0 8px' }}>Sem dashboards configurados</h3>
        <p style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 500, margin: '0 auto 16px' }}>
          Cria dashboards de performance para partilhares com clientes no portal deles —
          KPIs de leads, ad spend, conversions, status de onboarding, etc.
          Cada cliente vê apenas os dados dele.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button style={btnSecondary}><Layout size={11} /> Browse templates</button>
          <button style={btnSecondary}><Eye size={11} /> Preview client view</button>
        </div>
      </div>

      {/* Help text */}
      <div style={{
        margin: '24px 8px 0', padding: 14, borderRadius: 6,
        background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)',
        fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6,
      }}>
        <strong style={{ color: '#a78bfa' }}>Roadmap:</strong> dashboard builder com widgets (KPI card, line chart,
        funnel, leaderboard) lendo dados de <code>system.tasks</code>, <code>v4_energia.facturas</code>, etc.
        Cada widget pode ser scoped a um cliente específico via <code>client_id</code>.
        Implementação em sprint próprio — por agora, este é o placeholder visível para clientes.
      </div>
    </div>
  )
}

const btnSecondary = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '7px 12px', borderRadius: 5,
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 12, cursor: 'pointer',
}
