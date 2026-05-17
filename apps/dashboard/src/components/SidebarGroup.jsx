// SidebarGroup — grupo colapsável com label clicável + chevron + badge opcional
// Estado controlado via useSidebarGroups (persiste em localStorage)

import { ChevronRight, ChevronDown } from 'lucide-react'
import { useSidebarGroups } from '../hooks/useSidebarGroups.js'

export default function SidebarGroup({ id, label, badge, accent, children }) {
  const { isOpen, toggle } = useSidebarGroups()
  const open = isOpen(id)

  return (
    <div className="sidebar-group">
      <button
        type="button"
        onClick={() => toggle(id)}
        className="sidebar-group-header"
      >
        <span className="sidebar-group-chevron">
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </span>
        <span
          className="sidebar-group-label"
          style={accent ? { color: accent } : undefined}
        >
          {label}
        </span>
        {badge !== undefined && badge !== null && (
          <span className="sidebar-group-badge">{badge}</span>
        )}
      </button>
      {open && (
        <div className="sidebar-group-body">
          {children}
        </div>
      )}
    </div>
  )
}
