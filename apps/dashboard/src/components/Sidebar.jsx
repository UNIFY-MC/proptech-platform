import { NavLink } from 'react-router-dom'
import { useVerticalStore } from '../store'
import { useInboxItems, useApprovals } from '../hooks/useSupabase'
import { useInboxReads } from '../hooks/useInboxReads'

const DEPT_COLORS = {
  'Manutenção':  '#534AB7',
  'Condomínios': '#10b981',
  'Marketing':   '#3b82f6',
}

function NavItem({ to, label, badge, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
    >
      <span>{label}</span>
      {badge > 0 && <span className="sidebar-badge">{badge}</span>}
    </NavLink>
  )
}

export default function Sidebar({ theme, setTheme, data, lastSync, loading, refresh }) {
  const { activeVertical, setVertical } = useVerticalStore()
  const { items } = useInboxItems(activeVertical)
  const { approvals } = useApprovals(activeVertical)
  const { readSet } = useInboxReads()

  const unreadCount = items.filter(i => !readSet.has(i.id)).length
  const employees = data?.employees || []

  return (
    <aside className="app-sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-title">Agentic Ops</div>
        {data?.meta?.branch && (
          <div className="sidebar-brand-sub">{data.meta.branch}</div>
        )}
      </div>

      {/* Vertical filter */}
      <div className="sidebar-vertical">
        <select
          className="sidebar-select"
          value={activeVertical}
          onChange={(e) => setVertical(e.target.value)}
        >
          <option value="v1">V1 Core</option>
          <option value="v2">V2 Condomínios</option>
          <option value="v4">V4 Energia</option>
          <option value="v5">V5 Manutenção</option>
        </select>
      </div>

      {/* Nav sections */}
      <div className="sidebar-nav">
        <div className="sidebar-section-label">Daily</div>
        <NavItem to="/inbox" label="Inbox" badge={unreadCount} />
        <NavItem to="/chat" label="Chat" />
        <NavItem to="/files" label="Files" />

        <div className="sidebar-section-label">Manage</div>
        <NavItem to="/employees" label="Employees" />
        <NavItem to="/agentes" label="Agentes" />

        <div className="sidebar-section-label">Build</div>
        <NavItem to="/recipes" label="Recipes" />
        <NavItem to="/skills" label="Skills" />
        <NavItem to="/integrations" label="Integrations" />

        <div className="sidebar-section-label">Strategy</div>
        <NavItem to="/" label="Overview" end />
        <NavItem to="/roadmap" label="Roadmap" />
        <NavItem to="/watchers" label="Watchers" />
        <NavItem to="/competitors" label="Competitors" />
        <NavItem to="/verticais" label="Verticais" />
      </div>

      {/* TASKS · CHATS — 16 employees scrollable */}
      {employees.length > 0 && (
        <div className="sidebar-tasks">
          <div className="sidebar-section-label">Tasks · Chats</div>
          {employees.map(emp => (
            <NavLink
              key={emp.id}
              to={`/employees/${emp.id}`}
              className={({ isActive }) => 'sidebar-task-item' + (isActive ? ' active' : '')}
            >
              <div
                className="sidebar-avatar"
                style={{ borderColor: DEPT_COLORS[emp.department] || 'var(--border)' }}
              >
                {emp.avatarInitial || emp.name?.[0]?.toUpperCase() || '?'}
              </div>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {emp.name}
              </span>
              {emp.status === 'active' && (
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
              )}
            </NavLink>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className="btn-theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          className="btn-refresh"
          onClick={refresh}
          disabled={loading}
          style={{ padding: '4px 8px', fontSize: '0.65rem' }}
        >
          {loading ? '⏳' : '🔄'}
        </button>
        {lastSync && <div className="sidebar-sync">{lastSync}</div>}
      </div>
    </aside>
  )
}
