export function Badge({ level = 'idle', children }) {
  return <span className={`badge ${(level || 'idle').toLowerCase()}`}>{children}</span>
}
