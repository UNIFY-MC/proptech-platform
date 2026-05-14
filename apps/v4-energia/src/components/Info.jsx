// Componente de mensagem informativa / alerta.
// Tokens canónicos v1-core: blue, green, gold (era amber), red.
export default function Info({ color, children }) {
  const styles = {
    green: { bg: 'rgba(45,106,79,0.08)',  tc: 'var(--green)' },
    amber: { bg: 'rgba(140,101,8,0.08)', tc: 'var(--gold)'  },
    gold:  { bg: 'rgba(140,101,8,0.08)', tc: 'var(--gold)'  },
    red:   { bg: 'rgba(139,26,26,0.08)', tc: 'var(--red)'   },
    blue:  { bg: 'rgba(26,82,150,0.08)', tc: 'var(--blue)'  },
  };
  const { bg, tc } = styles[color] || styles.blue;
  return (
    <div style={{
      background: bg,
      borderRadius: 'var(--radius-sm)',
      padding: '10px 14px',
      marginBottom: 14,
      color: tc,
      fontSize: 12,
    }}>{children}</div>
  );
}
