export default function StubView({ title }) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🚧</div>
      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Em construção</div>
    </div>
  )
}
