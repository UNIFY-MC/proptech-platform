// Catálogo canónico dos 8 departamentos horizontais do dashboard
// Dept = função organizacional transversal (Marketing, Finance, ...) que serve N verticais
// Cada agent vive em 1 dept e serve [1+] verticais via array `verticals[]`

export const DEPARTMENTS = [
  { id: 'marketing',   label: 'Marketing',   color: '#3b82f6', icon: 'Megaphone',     order: 1 },
  { id: 'sales',       label: 'Sales',       color: '#ec4899', icon: 'TrendingUp',    order: 2 },
  { id: 'operations',  label: 'Operations',  color: '#10b981', icon: 'Settings',      order: 3 },
  { id: 'finance',     label: 'Finance',     color: '#f59e0b', icon: 'DollarSign',    order: 4 },
  { id: 'support',     label: 'Support',     color: '#06b6d4', icon: 'MessageCircle', order: 5 },
  { id: 'legal',       label: 'Legal',       color: '#8b5cf6', icon: 'Scale',         order: 6 },
  { id: 'engineering', label: 'Engineering', color: '#6b7280', icon: 'Code',          order: 7 },
  { id: 'hr',          label: 'HR',          color: '#d946ef', icon: 'Users',         order: 8, planned: true },
]

const DEPT_BY_ID = Object.fromEntries(DEPARTMENTS.map(d => [d.id, d]))

// Mapping legacy → novo (durante migração os JSON antigos têm 'Marketing'/'Condomínios'/'Manutenção')
const LEGACY_DEPT_MAP = {
  'Marketing':   'marketing',
  'Condomínios': 'operations', // fallback genérico — agents reais re-classificados em .meta.json
  'Manutenção':  'operations',
}

// Normaliza string dept (suporta legacy + novo)
export function normalizeDept(raw) {
  if (!raw) return null
  if (DEPT_BY_ID[raw]) return raw
  return LEGACY_DEPT_MAP[raw] || null
}

export function deptFor(slug) {
  return DEPT_BY_ID[slug] || DEPT_BY_ID[normalizeDept(slug)] || null
}

// Verticais de um employee — aceita 'verticals' (array novo) ou 'vertical'+'secondary_verticals' (legacy)
function verticalsOf(emp) {
  if (Array.isArray(emp.verticals) && emp.verticals.length > 0) return emp.verticals
  const out = []
  if (emp.vertical) out.push(emp.vertical)
  if (Array.isArray(emp.secondary_verticals)) out.push(...emp.secondary_verticals)
  return out
}

// Match: o employee serve esta vertical?
function matchVertical(emp, activeV) {
  if (!activeV || activeV === 'all') return true
  const v = activeV.toUpperCase()
  return verticalsOf(emp).some(x => (x || '').toUpperCase().startsWith(v))
}

// Conta agents por departamento, filtrado opcionalmente pela vertical activa
// Retorna { marketing: 5, sales: 4, operations: 5, ... }
export function countByDept(employees = [], activeVertical = 'all') {
  const counts = {}
  for (const d of DEPARTMENTS) counts[d.id] = 0
  for (const emp of employees) {
    const dept = normalizeDept(emp.department)
    if (!dept) continue
    if (!matchVertical(emp, activeVertical)) continue
    counts[dept] = (counts[dept] || 0) + 1
  }
  return counts
}

// Filtra employees de um dept específico (com filtro vertical opcional)
export function employeesOfDept(employees = [], deptId, activeVertical = 'all') {
  return employees.filter(emp =>
    normalizeDept(emp.department) === deptId &&
    matchVertical(emp, activeVertical)
  )
}
