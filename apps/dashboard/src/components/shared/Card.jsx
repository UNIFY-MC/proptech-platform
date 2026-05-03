export function Card({ title, children, fullWidth, style }) {
  return (
    <div className={`card${fullWidth ? ' full-width' : ''}`} style={style}>
      {title && <div className="card-title">{title}</div>}
      {children}
    </div>
  )
}
