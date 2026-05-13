import { NavLink } from 'react-router-dom'
import {
  Inbox, MessageSquare, Folder,
  Users, Building2, FolderKanban, CheckSquare,
  ChefHat, Sparkles, Plug, Library,
  LayoutDashboard, Map, Eye, Swords, Layers,
  Bot, PanelLeftClose, PanelLeft,
  TrendingUp, UserPlus, Target, Zap,
  Plug2, Settings as SettingsIcon, Briefcase,
} from 'lucide-react'
import { useVerticalStore, useAppShellStore } from '../store'
import { useInboxItems } from '../hooks/useSupabase'
import { useInboxReads } from '../hooks/useInboxReads'

const IC = ({ icon: Icon }) => (
  <Icon size={15} style={{ color: 'var(--text-dim)', flexShrink: 0, marginRight: 8 }} />
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

export default function Sidebar() {
  const { activeVertical } = useVerticalStore()
  const { activeAppSlug, sidebarCollapsed, toggleSidebar } = useAppShellStore()
  const isDashboardMode = activeAppSlug === 'dashboard'
  const { items } = useInboxItems(activeVertical)
  const { readSet } = useInboxReads()

  // Em app embedded, não mostramos sidebar do dashboard — a app embedded tem o seu próprio
  if (!isDashboardMode) return null

  const unreadCount = items.filter(i => !readSet.has(i.id)).length

  return (
    <aside className={'app-sidebar' + (sidebarCollapsed ? ' collapsed' : '')}>
      {/* Header — apenas botão collapse (brand está no Topbar global) */}
      <div className="sidebar-header" style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexShrink: 0,
      }}>
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expandir' : 'Colapsar'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-dim)', padding: 4,
            display: 'flex', alignItems: 'center',
          }}
        >
          {sidebarCollapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section-label">Daily</div>
        <NavItem to="/inbox"  label="Inbox"  icon={Inbox}        badge={unreadCount} />
        <NavItem to="/chat"   label="Chat"   icon={MessageSquare} />
        <NavItem to="/files"  label="Files"  icon={Folder} />

        <div className="sidebar-section-label">Departments</div>
        <NavItem to="/departments" label="Visão geral" icon={Briefcase} end />

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

        <div className="sidebar-section-label">Settings</div>
        <NavItem to="/connections" label="Connections" icon={Plug2} />
        <NavItem to="/skills"      label="Skills"      icon={Sparkles} />
        <NavItem to="/company"     label="Company"     icon={SettingsIcon} />

        <div className="sidebar-section-label">Dev</div>
        <NavItem to="/agentes" label="Agentes" icon={Bot} />
      </div>
    </aside>
  )
}
