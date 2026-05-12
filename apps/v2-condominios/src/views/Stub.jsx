export default function Stub({ title, hint }) {
  return (
    <div>
      <h1>{title}</h1>
      <div style={{
        marginTop: 20,
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--text-dim)',
        background: 'var(--bg-card-soft)',
        border: '1px dashed var(--border)',
        borderRadius: 8,
      }}>
        <div style={{ fontSize: 14, marginBottom: 6 }}>Vista por construir</div>
        {hint && <div style={{ fontSize: 12 }}>{hint}</div>}
      </div>
    </div>
  )
}
