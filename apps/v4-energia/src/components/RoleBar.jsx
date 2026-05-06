export default function RoleBar({ role, onChange }) {
  const opts = [
    { id: 'cliente', l: '👤 Cliente (simulador)' },
    { id: 'staff',   l: '💼 Staff (área profissional)' },
  ];
  return (
    <div style={{
      background: '#0f172a', padding: '8px 12px',
      display: 'flex', gap: 6,
      position: 'sticky', top: 0, zIndex: 60,
    }}>
      <span style={{
        fontSize: 9, color: '#475569', fontWeight: 700,
        alignSelf: 'center', whiteSpace: 'nowrap', marginRight: 2,
      }}>MODO DEV</span>
      {opts.map((r) => (
        <button key={r.id} onClick={() => onChange(r.id)} style={{
          flex: 1, padding: '7px 4px', borderRadius: 8,
          border: 'none', cursor: 'pointer',
          background: role === r.id ? '#EF9F27' : 'rgba(255,255,255,0.07)',
          color: role === r.id ? '#fff' : '#94a3b8',
          fontSize: 11, fontWeight: 700,
        }}>{r.l}</button>
      ))}
    </div>
  );
}
