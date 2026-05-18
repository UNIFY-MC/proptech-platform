// ListsPage — gestão de listas CRM (/crm/listas)
// Sprint C1: estrutura visual com listas pré-seeded; filtros e criação ficam para Sprint C3

const SEED_LISTS = [
  { nome: 'Condomínios em mora',       icon: '⚠️', count: null, query_desc: 'quotas em falta > 30d' },
  { nome: 'Renovações Seguros 60d',    icon: '🛡️', count: null, query_desc: 'apólices a expirar em 60 dias' },
  { nome: 'Leads Truth Engine',        icon: '🔍', count: null, query_desc: 'discoveries com score >= medium' },
  { nome: 'Cross-sell V3 candidatos',  icon: '🎯', count: null, query_desc: 'clientes V2 sem seguro activo' },
  { nome: 'Imóveis Idealista <90d',    icon: '🏠', count: null, query_desc: 'listagens activas < 90 dias' },
]

export default function ListsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📋</span>
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Listas</h1>
          <span style={{
            background: 'var(--surface2)', padding: '1px 8px', borderRadius: 10,
            fontSize: 11, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace",
          }}>
            {SEED_LISTS.length}
          </span>
        </div>
        <button style={{
          background: 'var(--purple)', color: '#000',
          border: 'none', borderRadius: 5, padding: '5px 12px',
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}>
          + Nova lista
        </button>
      </div>

      {/* Lista de listas */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {SEED_LISTS.map((l, i) => (
          <div key={i} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6, padding: 12, marginBottom: 8,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.1s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--purple)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{l.icon}</span>
              <div>
                <div style={{ fontWeight: 500, fontSize: 12, color: 'var(--text)' }}>{l.nome}</div>
                <div style={{
                  color: 'var(--text-dim)', fontSize: 10, marginTop: 2,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {l.query_desc}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: 'var(--text-dim)', fontSize: 11 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                {l.count !== null ? l.count : '—'}
              </span>
              <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>Actualizada agora</span>
            </div>
          </div>
        ))}

        {/* Placeholder para builder visual */}
        <div style={{
          marginTop: 24, padding: 20,
          background: 'var(--surface)', border: '1px dashed var(--border)',
          borderRadius: 6, textAlign: 'center',
          color: 'var(--text-dim)', fontSize: 12,
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🔧</div>
          <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Builder visual de listas</div>
          <div style={{ fontSize: 11 }}>
            Editor drag-and-drop de filtros (tipo Folk) — Sprint C3.4
          </div>
        </div>
      </div>
    </div>
  )
}
