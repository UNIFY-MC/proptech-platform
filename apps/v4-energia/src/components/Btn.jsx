export default function Btn({ children, onClick, primary, danger, disabled, full, small, color, type }) {
  const bg = primary ? (color || 'var(--amber)') : danger ? 'var(--red)' : 'transparent';
  const bc = primary ? (color || 'var(--amber)') : danger ? 'var(--red)' : 'var(--border2)';
  const tc = primary || danger ? '#fff' : 'var(--text2)';
  return (
    <button type={type || 'button'} onClick={onClick} disabled={disabled} style={{
      padding: small ? '5px 10px' : '8px 18px',
      fontSize: small ? 11 : 13, fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      borderRadius: 'var(--radius-sm)',
      border: `0.5px solid ${bc}`,
      background: bg, color: tc,
      width: full ? '100%' : 'auto',
      opacity: disabled ? 0.45 : 1,
      transition: 'opacity 0.15s',
    }}>{children}</button>
  );
}
