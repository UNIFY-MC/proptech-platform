export default function Info({ color, children }) {
  const bg = color === 'green' ? 'var(--teal-light)' : color === 'amber' ? 'var(--amber-light)' : 'var(--blue-light)';
  const tc = color === 'green' ? 'var(--teal-dark)' : color === 'amber' ? 'var(--amber-dark)' : 'var(--blue-dark)';
  return (
    <div style={{
      background: bg, borderRadius: 'var(--radius-sm)',
      padding: '10px 14px', marginBottom: 14, color: tc,
    }}>{children}</div>
  );
}
