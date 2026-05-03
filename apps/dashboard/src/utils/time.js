/**
 * Utilitários de tempo — PT-PT
 */

export function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (isNaN(seconds)) return '—'
  if (seconds < 60) return `há ${seconds}s`
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)}min`
  if (seconds < 86400) return `há ${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `há ${Math.floor(seconds / 86400)}d`
  return formatDate(dateStr)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export function isoDateLabel(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  return d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' })
}
