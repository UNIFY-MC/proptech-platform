export function Badge({ level = 'idle', children }) {
  return <span className={`badge ${level.toLowerCase()}`}>{children}</span>
}
