import { NavLink } from 'react-router-dom'
import { useVerticalStore } from '../store'
import { useInboxItems, useApprovals } from '../hooks/useSupabase'

export default function Sidebar({ theme, setTheme, data }) {
  const { activeVertical, setVertical } = useVerticalStore()
  const { items } = useInboxItems(activeVertical)
  const { approvals } = useApprovals(activeVertical)

  const inboxCount = items.length
  const approvalsCount = approvals.length

  const meta = data?.meta

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-title">Agentic Ops</div>
        {meta?.branch && (
          <div className="sidebar-brand-sub">{meta.branch}</div>
        )}
      </div>

      {/* Vertical filter */}
      <div className="sidebar-vertical">
        <div className="sidebar-section-label">Vertical activa</div>
        <select
          className="sidebar-select"
          value={activeVertical}
          onChange={(e) => setVertical(e.target.value)}
        >
          <option value="v1">V1</option>
          <option value="v2">V2</option>
          <option value="v4">V4</option>
          <option value="v5">V5</option>
        </select>
      </div>

      {/* Live */}
      <div className="sidebar-section-label">Live</div>
      <nav>
        <NavLink to="/inbox" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
          <span>Inbox</span>
          {inboxCount > 0 && <span className="sidebar-badge">{inboxCount}</span>}
        </NavLink>
        <NavLink to="/approvals" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
          <span>Approvals</span>
          {approvalsCount > 0 && <span className="sidebar-badge">{approvalsCount}</span>}
        </NavLink>
      </nav>

      {/* Workspace */}
      <div className="sidebar-section-label">Workspace</div>
      <nav>
        <NavLink to="/overview" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
          Overview
        </NavLink>
        <NavLink to="/roadmap" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
          Roadmap
        </NavLink>
        <NavLink to="/watchers" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
          Watchers
        </NavLink>
        <NavLink to="/competitors" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
          Competitors
        </NavLink>
        <NavLink to="/activity" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
          Actividade
        </NavLink>
        <NavLink to="/agents" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
          Agentes
        </NavLink>
      </nav>

      {/* Equipa */}
      <div className="sidebar-section-label">Equipa</div>
      <nav>
        <NavLink to="/employees/bia" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
          Bia (V5)
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className="btn-theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {meta?.lastSync && (
          <div className="sidebar-sync">sync {meta.lastSync}</div>
        )}
      </div>
    </aside>
  )
}
