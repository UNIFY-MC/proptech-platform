import { NavLink } from 'react-router-dom'
import {
  Inbox, MessageSquare, Folder,
  Users, Building2, FolderKanban, CheckSquare,
  ChefHat, Sparkles, Plug, Library,
  LayoutDashboard, Map, Eye, Swords, Layers,
  Bot, PanelLeftClose, PanelLeft,
  TrendingUp, UserPlus, Target, Zap,
  Plug2, Settings as SettingsIcon, Briefcase,
  Megaphone, DollarSign, MessageCircle, Scale, Code, Settings,
  Monitor, Calendar, AtSign,
} from 'lucide-react'
import { useVerticalStore, useAppShellStore } from '../store'
import { useInboxItems } from '../hooks/useSupabase'
import { useInboxReads } from '../hooks/useInboxReads'
import { useData } from '../hooks/useData.js'
import SidebarGroup from './SidebarGroup.jsx'
import { DEPARTMENTS, countByDept } from '../lib/departments.js'

const DEPT_ICON_MAP = {
  Megaphone, TrendingUp, Settings, DollarSign, MessageCircle, Scale, Code, Users,
}

const IC = ({ icon: Icon }) => (
  <Icon size={15} style={{ color: 'var(--text-dim)', flexShrink: 0, marginRight: 8 }} />
)

function NavItem({ to, label, icon, badge, end, accent }) {
  const style = accent ? { '--dept-accent': accent } : undefined
  return (
    <NavLink
      to={to}
      end={end}
      style={style}
      className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
    >
      <span style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
        {accent && <span className="sidebar-dot" style={{ background: accent }} />}
        {icon && <IC icon={icon} />}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </span>
      {badge > 0 && <span className="sidebar-badge">{badge}</span>}
      {badge === 0 && (
        <span className="sidebar-badge sidebar-badge-dim">{badge}</span>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { activeVertical } = useVerticalStore()
  const { activeAppSlug, sidebarCollapsed, toggleSidebar } = useAppShellStore()
  const isDashboardMode = activeAppSlug === 'dashboard'
  const { items } = useInboxItems(activeVertical)
  const { readSet } = useInboxReads()
  const { data } = useData()

  // Em app embedded, esconde sidebar do dashboard
  if (!isDashboardMode) return null

  const unreadCount = items.filter(i => !readSet.has(i.id)).length
  const employees = data?.employees || []
  const deptCounts = countByDept(employees, activeVertical)
  const totalAgents = Object.values(deptCounts).reduce((a, b) => a + b, 0)

  return (
    <aside className={'app-sidebar' + (sidebarCollapsed ? ' collapsed' : '')}>
      <div className="sidebar-header" style={{
        padding: '6px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexShrink: 0,
        height: 32,
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
          {sidebarCollapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      <div className="sidebar-nav">
        <SidebarGroup id="daily" label="Daily" badge={unreadCount > 0 ? unreadCount : null}>
          <NavItem to="/inbox"       label="Inbox"       icon={Inbox} badge={unreadCount} />
          <NavItem to="/chat"        label="Chat"        icon={MessageSquare} />
          <NavItem to="/calendar"    label="Calendário"  icon={Calendar} />
          <NavItem to="/tasks"       label="Tasks"       icon={CheckSquare} />
          <NavItem to="/influencers" label="Influencers" icon={AtSign} />
          <NavItem to="/files"       label="Files"       icon={Folder} />
        </SidebarGroup>

        <SidebarGroup id="departments" label="Departments" badge={totalAgents}>
          <NavItem to="/departments" label="Visão geral" icon={Briefcase} end />
          {DEPARTMENTS.map(d => (
            <NavItem
              key={d.id}
              to={`/departments/${d.id}`}
              label={d.label}
              icon={DEPT_ICON_MAP[d.icon]}
              badge={deptCounts[d.id]}
              accent={d.color}
            />
          ))}
        </SidebarGroup>

        <SidebarGroup id="growth" label="Growth">
          <NavItem to="/growth/funnel"        label="Funil"          icon={TrendingUp} />
          <NavItem to="/growth/leads"         label="Leads"          icon={UserPlus} />
          <NavItem to="/growth/oportunidades" label="Oportunidades"  icon={Target} />
          <NavItem to="/growth/rules"         label="Regras"         icon={Zap} />
        </SidebarGroup>

        <SidebarGroup id="manage" label="Manage">
          <NavItem to="/employees" label="Employees" icon={Users} />
          <NavItem to="/clients"   label="Clients"   icon={Building2} />
          <NavItem to="/projects"  label="Projects"  icon={FolderKanban} />
          <NavItem to="/tasks"     label="Tasks"     icon={CheckSquare} />
        </SidebarGroup>

        <SidebarGroup id="build" label="Build">
          <NavItem to="/context"      label="Context"      icon={Library} />
          <NavItem to="/recipes"      label="Recipes"      icon={ChefHat} />
          <NavItem to="/skills"       label="Skills"       icon={Sparkles} />
          <NavItem to="/skills/review" label="Skills · review" icon={Sparkles} />
          <NavItem to="/integrations" label="Integrations" icon={Plug} />
          <NavItem to="/useful-tools" label="Useful Tools" icon={Sparkles} />
        </SidebarGroup>

        <SidebarGroup id="strategy" label="Strategy">
          <NavItem to="/"            label="Overview"        icon={LayoutDashboard} end />
          <NavItem to="/multiview"   label="Multi-Surface"   icon={Monitor} />
          <NavItem to="/roadmap"     label="Roadmap"         icon={Map} />
          <NavItem to="/watchers"    label="Watchers"        icon={Eye} />
          <NavItem to="/competitors" label="Competitors"     icon={Swords} />
          <NavItem to="/verticais"   label="Verticais"       icon={Layers} />
        </SidebarGroup>

        <SidebarGroup id="settings" label="Settings">
          <NavItem to="/connections"   label="Connections"   icon={Plug2} />
          <NavItem to="/apify-actors"  label="Apify actors"  icon={Sparkles} />
          <NavItem to="/company"       label="Company"       icon={SettingsIcon} />
        </SidebarGroup>

        <SidebarGroup id="dev" label="Dev">
          <NavItem to="/agentes" label="Agentes" icon={Bot} />
        </SidebarGroup>
      </div>
    </aside>
  )
}
