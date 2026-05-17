// CondominiosPage — /condominios · lista de condomínios geridos
// Click → /condominios/:codigo (editor)

import { useNavigate } from 'react-router-dom'
import { Building2, Plus, Mail, ExternalLink, Loader2 } from 'lucide-react'
import { useCondominios } from '../hooks/useCondominios.js'

export default function CondominiosPage() {
  const navigate = useNavigate()
  const { items, loading } = useCondominios()

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 16px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Building2 size={22} color="var(--primary)" />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Condomínios</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-dim)' }}>
            Multi-tenant V2 · cada condomínio tem assinatura, gmail OAuth e configurações próprias.
          </p>
        </div>
        <button
          onClick={() => alert('Cria via SQL com supabase/seed/v2_condominio_002_template.sql — UI de criação em breve.')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 6,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text)', cursor: 'pointer', fontSize: 12,
          }}
        >
          <Plus size={12} /> Novo condomínio
        </button>
      </div>

      {loading && <div style={{ color: 'var(--text-dim)', padding: 30, textAlign: 'center' }}><Loader2 size={16} className="spin" /> A carregar…</div>}

      {!loading && items.length === 0 && (
        <div style={{
          padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13,
          background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 8,
        }}>Sem condomínios. Cria o primeiro com o seed template.</div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
          {items.map(c => (
            <button
              key={c.id}
              onClick={() => navigate(`/condominios/${c.codigo}`)}
              style={{
                textAlign: 'left', cursor: 'pointer',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '14px 16px',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 10, padding: '2px 6px', borderRadius: 3,
                  background: 'var(--bg-elevated)', color: 'var(--text-dim)',
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                }}>#{c.codigo}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{c.nome}</span>
                {!c.ativo && <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 600 }}>INACTIVO</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                NIF {c.nif}
              </div>
              {c.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)' }}>
                  <Mail size={11} /> {c.email}
                </div>
              )}
              {c.gmail_staff_id && (
                <div style={{
                  fontSize: 10, color: 'var(--text-dim)',
                  fontFamily: 'JetBrains Mono, monospace',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  Gmail: {c.gmail_staff_id}
                </div>
              )}
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--primary)' }}>
                Abrir <ExternalLink size={11} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
