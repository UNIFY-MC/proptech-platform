// Barra de progresso por passos — tokens canónicos v1-core.
// Concluído: green · Activo: blue · Pendente: surface2.
export default function StepBar({ step, steps }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
      {steps.map((s, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center',
          flex: i < steps.length - 1 ? 1 : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 600, flexShrink: 0,
              fontFamily: 'var(--mono)',
              background:
                i < step - 1 ? 'var(--green)' :
                i === step - 1 ? 'var(--blue)' : 'var(--surface2)',
              color: i <= step - 1 ? '#fff' : 'var(--muted)',
              border: `0.5px solid ${
                i < step - 1 ? 'var(--green)' :
                i === step - 1 ? 'var(--blue)' : 'var(--border)'
              }`,
            }}>{i < step - 1 ? '✓' : i + 1}</div>
            <span style={{
              fontSize: 12,
              color: i === step - 1 ? 'var(--text)' : 'var(--muted)',
              fontWeight: i === step - 1 ? 500 : 400,
              whiteSpace: 'nowrap',
            }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: '0.5px', background: 'var(--border)', margin: '0 10px' }} />
          )}
        </div>
      ))}
    </div>
  );
}
