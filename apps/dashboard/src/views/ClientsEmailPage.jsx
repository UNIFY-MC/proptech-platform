// ClientsEmailPage — /clients/email · AgentMail-style domains + mailboxes config

import { useState } from 'react'
import { Mail, Plus, Globe, ChevronDown } from 'lucide-react'
import { ClientsTabs } from './ClientsPage.jsx'

export default function ClientsEmailPage() {
  const [domain, setDomain] = useState('connect.youragency.com')
  const [domains] = useState([
    { name: 'mail.demo-parka.example', dns_records: 4, status: 'pending' },
  ])

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '4px 0 40px' }}>
      <ClientsTabs />

      <div style={{ padding: '0 8px', marginBottom: 18 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Email</h1>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '4px 0 0', fontFamily: 'JetBrains Mono, monospace' }}>
          AgentMail Domains and Mailboxes
        </p>
      </div>

      {/* No sender configured banner */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '14px 18px', margin: '0 8px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Mail size={20} color="var(--text-dim)" />
        <div>
          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>No sender configured yet</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
            Adiciona um domínio abaixo, depois cria uma mailbox.
          </div>
        </div>
      </div>

      {/* Domains */}
      <div style={{ padding: '0 8px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace' }}>Domains</span>
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'var(--bg-elevated)', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>{domains.length}</span>
        </div>

        {domains.map((d, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, marginBottom: 8,
          }}>
            <ChevronDown size={14} color="var(--text-dim)" />
            <Globe size={16} color="var(--text-dim)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{d.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{d.dns_records} DNS records</div>
            </div>
            <span style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 3,
              background: 'rgba(245,158,11,0.18)', color: '#f59e0b',
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.06em',
            }}>{d.status.toUpperCase()}</span>
            <button style={btnSecondary}>Verify</button>
            <button style={btnSecondary}><Plus size={11} /> Mailbox</button>
          </div>
        ))}

        {/* Add domain */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8,
        }}>
          <Globe size={16} color="var(--text-dim)" />
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="connect.youragency.com"
            style={{ ...input, flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
          />
          <button style={btnPrimary}>Add domain</button>
        </div>
      </div>

      {/* Mailboxes */}
      <div style={{ padding: '0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace' }}>Mailboxes</span>
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'var(--bg-elevated)', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>0</span>
        </div>
        <div style={{
          padding: 24, textAlign: 'center',
          background: 'var(--bg-card)', border: '1px dashed var(--border)',
          borderRadius: 8, color: 'var(--text-dim)', fontSize: 12,
        }}>
          No mailboxes yet. Cria uma a partir de um domínio verificado acima.
        </div>
      </div>

      {/* Help text */}
      <div style={{
        margin: '24px 8px 0', padding: 14, borderRadius: 6,
        background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)',
        fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6,
      }}>
        <strong style={{ color: '#60a5fa' }}>Como funciona:</strong> AgentMail permite que cada cliente receba/envie email do teu domínio
        (ex: <code style={{ background: 'var(--bg-elevated)', padding: '1px 4px', borderRadius: 3 }}>onboarding@prataowners.pt</code>) sem precisar de Google Workspace.
        Adiciona o domínio, configura DNS records (SPF/DKIM/DMARC), verifica, e cria mailboxes que os agents podem usar
        em recipes (skill <code>gmail-sender</code> automaticamente usa estas mailboxes).
      </div>
    </div>
  )
}

const input = {
  padding: '7px 10px', background: 'var(--bg-elevated)',
  border: '1px solid var(--border)', borderRadius: 5,
  color: 'var(--text)', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box',
}
const btnSecondary = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '6px 12px', borderRadius: 4,
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 12, cursor: 'pointer',
}
const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '7px 14px', borderRadius: 5,
  background: 'var(--primary)', border: 'none',
  color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
}
