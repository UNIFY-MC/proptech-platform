// OportunidadesKanban — placeholder Kanban para Sprint C1
// Kanban completo (drag entre colunas, cards com prob_bar, etc) fica para Sprint C3.2

const STAGES = [
  { id: 'novo_lead',        label: 'Novo lead',          color: 'var(--blue)' },
  { id: 'qualificado',      label: 'Qualificado',         color: 'var(--purple)' },
  { id: 'proposta_enviada', label: 'Proposta enviada',   color: 'var(--gold)' },
  { id: 'negociacao',       label: 'Negociação',          color: 'var(--orange, #f59e0b)' },
  { id: 'contrato',         label: 'Contrato assinado',  color: 'var(--green)' },
  { id: 'perdido',          label: 'Perdido',             color: 'var(--red)' },
  { id: 'ganho',            label: 'Ganho',               color: 'var(--green)' },
]

export default function OportunidadesKanban() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🎯</span>
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Oportunidades</h1>
        </div>
        <button style={{
          background: 'var(--purple)', color: '#000',
          border: 'none', borderRadius: 5, padding: '5px 12px',
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}>
          + Nova oportunidade
        </button>
      </div>

      {/* Kanban columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${STAGES.length}, minmax(160px, 1fr))`,
        gap: 8, padding: 16,
        flex: 1, overflowX: 'auto',
      }}>
        {STAGES.map(stage => (
          <div key={stage.id} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Coluna header */}
            <div style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{
                fontSize: 10, textTransform: 'uppercase',
                color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
              }}>
                {stage.label}
              </span>
              <span style={{
                fontSize: 9, color: 'var(--text-dim)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>0</span>
            </div>

            {/* Cards placeholder */}
            <div style={{ padding: 8, flex: 1 }}>
              <div style={{
                textAlign: 'center', padding: '20px 8px',
                color: 'var(--text-dim)', fontSize: 10,
              }}>
                Kanban completo em Sprint C3.2
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
