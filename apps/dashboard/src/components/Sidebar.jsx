import { NavLink } from 'react-router-dom'
import {
  Inbox, MessageSquare, Folder,
  Users, Building2, FolderKanban, CheckSquare,
  ChefHat, Sparkles, Plug, Library,
  LayoutDashboard, Map, Eye, Swords, Layers,
  Bot, PanelLeftClose, PanelLeft,
  TrendingUp, UserPlus, Target, Zap,
} from 'lucide-react'
import { useVerticalStore, useAppShellStore } from '../store'
import { useInboxItems, useApprovals } from '../hooks/useSupabase'
import { useInboxReads } from '../hooks/useInboxReads'
import AppSwitcher from './AppSwitcher.jsx'

const DEPT_COLORS = {
  'Manutenção':  '#534AB7',
  'Condomínios': '#10b981',
  'Marketing':   '#3b82f6',
}

function matchVertical(emp, activeV) {
  if (activeV === 'all') return true
  const v = activeV.toUpperCase()
  if ((emp.vertical || '').toUpperCase().startsWith(v)) return true
  return (emp.secondary_verticals || []).some(sv => sv.toUpperCase().startsWith(v))
}

const IC = ({ icon: Icon }) => (
  <Icon size={16} style={{ color: 'var(--text-dim)', flexShrink: 0, marginRight: 8 }} />
)

function NavItem({ to, label, icon, badge, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
    >
      <span style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
        {icon && <IC icon={icon} />}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </span>
      {badge > 0 && <span className="sidebar-badge">{badge}</span>}
    </NavLink>
  )
}

export default function Sidebar({ theme, setTheme, data, lastSync, loading, refresh }) {
  const { activeVertical, setVertical } = useVerticalStore()
  const { activeAppSlug, sidebarCollapsed, toggleSidebar } = useAppShellStore()
  const isDashboardMode = activeAppSlug === 'dashboard'
  const { items } = useInboxItems(activeVertical)
  const { approvals } = useApprovals(activeVertical)
  const { readSet } = useInboxReads()

  const unreadCount = items.filter(i => !readSet.has(i.id)).length
  const employees = (data?.employees || []).filter(e => matchVertical(e, activeVertical))

  return (
    <aside className={'app-sidebar' + (sidebarCollapsed ? ' collapsed' : '')}>
      {/* Brand — sempre visível + botão collapse */}
      <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {!sidebarCollapsed && (
          <div>
            <div className="sidebar-brand-title">Agentic Ops</div>
            {data?.meta?.branch && (
              <div className="sidebar-brand-sub">{data.meta.branch}</div>
            )}
          </div>
        )}
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-dim)', padding: 4,
            display: 'flex', alignItems: 'center',
          }}
        >
          {sidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Vertical filter (só no dashboard mode) */}
      {isDashboardMode && (
        <div className="sidebar-vertical">
          <select
            className="sidebar-select"
            value={activeVertical}
            onChange={(e) => setVertical(e.target.value)}
          >
            <option value="all">Todas as verticais</option>
            <option value="v1">V1 Core</option>
            <option value="v2">V2 Condomínios</option>
            <option value="v4">V4 Energia</option>
            <option value="v5">V5 Manutenção</option>
          </select>
        </div>
      )}

      {/* Nav sections */}
      <div className="sidebar-nav">
        {/* APPS sempre no topo (BD-driven via system.apps) */}
        <AppSwitcher />

        {/* Sidebar interno do dashboard só visível em dashboard mode.
            Quando uma app está activa, os items dela aparecem na 2ª coluna (AppSubSidebar). */}
        {isDashboardMode && (
          <>
            <div className="sidebar-section-label">Daily</div>
            <NavItem to="/inbox"  label="Inbox"  icon={Inbox}        badge={unreadCount} />
            <NavItem to="/chat"   label="Chat"   icon={MessageSquare} />
            <NavItem to="/files"  label="Files"  icon={Folder} />

            <div className="sidebar-section-label">Growth</div>
            <NavItem to="/growth/funnel"        label="Funil"          icon={TrendingUp} />
            <NavItem to="/growth/leads"         label="Leads"          icon={UserPlus} />
            <NavItem to="/growth/oportunidades" label="Oportunidades"  icon={Target} />
            <NavItem to="/growth/rules"         label="Regras"         icon={Zap} />

            <div className="sidebar-section-label">Manage</div>
            <NavItem to="/employees" label="Employees" icon={Users} />
            <NavItem to="/clients"   label="Clients"   icon={Building2} />
            <NavItem to="/projects"  label="Projects"  icon={FolderKanban} />
            <NavItem to="/tasks"     label="Tasks"     icon={CheckSquare} />

            <div className="sidebar-section-label">Build</div>
            <NavItem to="/context"      label="Context"      icon={Library} />
            <NavItem to="/recipes"      label="Recipes"      icon={ChefHat} />
            <NavItem to="/skills"       label="Skills"       icon={Sparkles} />
            <NavItem to="/integrations" label="Integrations" icon={Plug} />

            <div className="sidebar-section-label">Strategy</div>
            <NavItem to="/"           label="Overview"    icon={LayoutDashboard} end />
            <NavItem to="/roadmap"    label="Roadmap"     icon={Map} />
            <NavItem to="/watchers"   label="Watchers"    icon={Eye} />
            <NavItem to="/competitors" label="Competitors" icon={Swords} />
            <NavItem to="/verticais"  label="Verticais"   icon={Layers} />

            <div className="sidebar-section-label">Dev</div>
            <NavItem to="/agentes" label="Agentes" icon={Bot} />
          </>
        )}
      </div>

      {/* TASKS · CHATS — só no dashboard mode */}
      {isDashboardMode && employees.length > 0 && (
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
