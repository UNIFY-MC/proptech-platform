export default function KpiCard({ titulo, valor, unidade }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>
        {titulo}
      </span>
      <span style={{ fontSize: '32px', fontWeight: 700, color: '#111827' }}>
        {valor}
      </span>
      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
        {unidade}
      </span>
    </div>
  )
}
