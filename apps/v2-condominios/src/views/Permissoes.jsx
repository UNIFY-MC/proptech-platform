import { useEffect, useState, useMemo, useCallback } from 'react'
import { v2Client, iamClient } from '../lib/clients.js'

// ADR-013: lê de schema iam (cross-vertical) em vez de v2_condominios.*
// As tabelas v2_condominios.permission_* foram migradas para iam.*
// Compatibilidade: v2_condominios.has_permission() etc. ainda funcionam
// como proxies (delegam para iam.*).

const TABS = [
  { id: 'utilizadores', label: 'Utilizadores' },
  { id: 'grupos',       label: 'Grupos & Permissões' },
  { id: 'logs',         label: 'Logs de Actividade' },
]

const ACTIONS = [
  { key: 'view',   col: 'can_view',   short: 'VER' },
  { key: 'edit',   col: 'can_edit',   short: 'EDT' },
  { key: 'create', col: 'can_create', short: 'NEW' },
  { key: 'delete', col: 'can_delete', short: 'DEL' },
]

function fdt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

function groupColorClass(color) {
  switch (color) {
    case 'green':  return 'b-green'
    case 'blue':   return 'b-blue'
    case 'gold':   return 'b-gold'
    case 'purple': return 'b-purple'
    case 'red':    return 'b-red'
    default:       return 'b'
  }
}

export default function Permissoes() {
  const [tab, setTab] = useState('utilizadores')

  return (
    <div>
      <h1>Permissões & Logs</h1>
      <p className="dim" style={{ fontSize: 13, marginBottom: 16 }}>
        Gestão de utilizadores (staff + condóminos), matriz de permissões por grupo e rasto de actividade.
      </p>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--bd)', marginBottom: 18 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--go)' : '2px solid transparent',
              color: tab === t.id ? 'var(--tx)' : 'var(--mu)',
              fontSize: 12,
              fontFamily: 'DM Mono, monospace',
              textTransform: 'uppercase',
              letterSpacing: 1,
              cursor: 'pointer',
              fontWeight: tab === t.id ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'utilizadores' && <TabUtilizadores />}
      {tab === 'grupos'       && <TabGrupos />}
      {tab === 'logs'         && <TabLogs />}
    </div>
  )
}

/* ─────────────── Tab 1: Utilizadores (lista unificada com filtro grupo + search) ─────────────── */

const GRUPOS_FILTER = [
  { value: '', label: 'Todos os grupos' },
  { value: 'condomino', label: 'Condóminos' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'developer', label: 'Developer' },
]

function TabUtilizadores() {
  const [staff, setStaff] = useState(null)
  const [tokens, setTokens] = useState(null)
  const [error, setError] = useState(null)
  const [filterGrupo, setFilterGrupo] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const [sResp, tResp] = await Promise.all([
        iamClient.from('staff_login_aliases')
          .select('login, email, nome, permission_group_code, active, last_login_at, created_at')
          .eq('active', true).order('login'),
        iamClient.from('portal_tokens')
          .select('token, fracao_id, condomino_id, email_legacy, nome_legacy, permission_group_code, active, last_used_at, created_at')
          .eq('active', true).order('last_used_at', { ascending: false, nullsFirst: false }).limit(500),
      ])
      if (!active) return
      if (sResp.error) { setError(sResp.error.message); return }
      if (tResp.error) { setError(tResp.error.message); return }
      setStaff(sResp.data || [])
      setTokens(tResp.data || [])
    }
    load()
    return () => { active = false }
  }, [])

  // Lista unificada: staff + tokens condóminos
  const unified = useMemo(() => {
    if (!staff || !tokens) return null
    const rows = [
      ...staff.map(s => ({
        kind: 'staff',
        key: 'staff:' + s.login,
        login: s.login,
        nome: s.nome,
        email: s.email,
        grupo: s.permission_group_code,
        last_seen: s.last_login_at,
        created_at: s.created_at,
        fracao: null,
      })),
      ...tokens.map(t => ({
        kind: 'condomino',
        key: 'tok:' + t.token,
        login: t.token?.slice(0, 8),
        nome: t.nome_legacy,
        email: t.email_legacy,
        grupo: t.permission_group_code,
        last_seen: t.last_used_at,
        created_at: t.created_at,
        fracao: t.fracao_id?.slice(0, 8),
      })),
    ]
    let filtered = rows
    if (filterGrupo) filtered = filtered.filter(r => r.grupo === filterGrupo)
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      filtered = filtered.filter(r =>
        (r.nome || '').toLowerCase().includes(s) ||
        (r.email || '').toLowerCase().includes(s) ||
        (r.login || '').toLowerCase().includes(s) ||
        (r.fracao || '').toLowerCase().includes(s)
      )
    }
    return filtered.sort((a, b) => (b.last_seen || '').localeCompare(a.last_seen || ''))
  }, [staff, tokens, filterGrupo, search])

  if (error) return <div className="error-banner">Erro: {error}</div>

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={filterGrupo} onChange={e => setFilterGrupo(e.target.value)} style={selectStyle}>
          {GRUPOS_FILTER.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <input
          type="search"
          placeholder="Pesquisar nome, email ou login…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...selectStyle, minWidth: 320, textTransform: 'none', letterSpacing: 0, fontFamily: 'DM Sans, sans-serif' }}
        />
        <span className="dim mono" style={{ fontSize: 10, marginLeft: 'auto' }}>
          {unified === null ? '…' : `${unified.length} utilizador${unified.length === 1 ? '' : 'es'} (filtrado)`}
        </span>
      </div>

      {unified === null && <div className="dim">A carregar…</div>}
      {unified && unified.length === 0 && (
        <div className="empty-state">Sem utilizadores correspondentes aos filtros.</div>
      )}
      {unified && unified.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Login / Token</th>
              <th>Nome</th>
              <th>Email</th>
              <th>Fracção</th>
              <th>Grupo</th>
              <th>Último acesso</th>
              <th>Desde</th>
            </tr>
          </thead>
          <tbody>
            {unified.map(u => (
              <tr key={u.key}>
                <td>
                  {u.kind === 'staff'
                    ? <span className="b b-gold">staff</span>
                    : <span className="b b-green">condómino</span>}
                </td>
                <td className="mono" style={{ fontWeight: 600, fontSize: 11 }}>{u.login ?? '—'}</td>
                <td>{u.nome ?? <span className="dim">—</span>}</td>
                <td className="mono" style={{ fontSize: 10 }}>{u.email ?? '—'}</td>
                <td className="mono" style={{ fontSize: 10 }}>{u.fracao ?? '—'}</td>
                <td>
                  <span className={`b ${groupColorClass(grupoColor(u.grupo))}`}>{u.grupo}</span>
                </td>
                <td className="mono" style={{ fontSize: 11 }}>{fdt(u.last_seen)}</td>
                <td className="mono" style={{ fontSize: 10 }}>{u.created_at?.slice(0, 10) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function grupoColor(code) {
  switch (code) {
    case 'developer':     return 'purple'
    case 'administrador': return 'gold'
    case 'operacional':   return 'blue'
    case 'condomino':     return 'green'
    default:              return 'grey'
  }
}

/* ─────────────── Tab 2: Grupos & Permissões ─────────────── */

function TabGrupos() {
  const [groups, setGroups] = useState(null)
  const [sections, setSections] = useState(null)
  const [grants, setGrants] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const [g, s, p] = await Promise.all([
        iamClient.from('permission_groups').select('code, label, color, ordem').order('ordem'),
        iamClient.from('permission_sections').select('code, label, vertical, ordem').order('ordem'),
        iamClient.from('permission_grants').select('group_code, section_code, can_view, can_edit, can_create, can_delete'),
      ])
      if (!active) return
      if (g.error || s.error || p.error) {
        setError(g.error?.message || s.error?.message || p.error?.message)
        return
      }
      setGroups(g.data)
      setSections(s.data)
      setGrants(p.data)
    }
    load()
    return () => { active = false }
  }, [])

  const grantMap = useMemo(() => {
    const m = {}
    for (const g of grants || []) {
      m[`${g.group_code}:${g.section_code}`] = g
    }
    return m
  }, [grants])

  const toggle = useCallback(async (groupCode, sectionCode, action) => {
    const key = `${groupCode}:${sectionCode}:${action.key}`
    const current = grantMap[`${groupCode}:${sectionCode}`]?.[action.col] === true
    setSaving(key)
    const { error: rpcErr } = await iamClient.rpc('set_permission_grant', {
      p_group_code: groupCode,
      p_section_code: sectionCode,
      p_action: action.key,
      p_value: !current,
    })
    if (rpcErr) {
      setError(rpcErr.message)
      setSaving(null)
      return
    }
    setGrants(prev => {
      const idx = prev.findIndex(x => x.group_code === groupCode && x.section_code === sectionCode)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], [action.col]: !current }
        return next
      }
      const row = { group_code: groupCode, section_code: sectionCode, can_view: false, can_edit: false, can_create: false, can_delete: false }
      row[action.col] = !current
      return [...prev, row]
    })
    setSaving(null)
  }, [grantMap])

  // Filter sections by vertical (toolbar)
  const [filterVertical, setFilterVertical] = useState('')
  const visibleSections = useMemo(() => {
    if (!sections) return []
    if (!filterVertical) return sections
    return sections.filter(s => s.vertical === filterVertical)
  }, [sections, filterVertical])

  if (error) return <div className="error-banner">Erro: {error}</div>
  if (groups === null || sections === null || grants === null) return <div className="dim">A carregar matriz…</div>

  const verticais = [...new Set(sections.map(s => s.vertical))].sort()

  return (
    <div>
      <p className="dim" style={{ fontSize: 12, marginBottom: 14 }}>
        Clica numa célula para ligar/desligar permissão. Cada grupo combina secção × acção
        (<span className="mono">VER · EDT · NEW · DEL</span>). Alterações ficam em <code className="mono">iam.activity_logs</code>.
        <span style={{ marginLeft: 8 }}>Schema: <code className="mono">iam.permission_grants</code> (cross-vertical · ADR-013).</span>
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={filterVertical}
          onChange={e => setFilterVertical(e.target.value)}
          style={{
            background: 'var(--sf)', border: '1px solid var(--bd)', color: 'var(--tx)',
            padding: '5px 10px', borderRadius: 6, fontSize: 11,
            fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: 0.5,
          }}
        >
          <option value="">Todas as verticais ({sections.length} secções)</option>
          {verticais.map(v => (
            <option key={v} value={v}>{v} ({sections.filter(s => s.vertical === v).length})</option>
          ))}
        </select>
      </div>

      <div style={{ overflowX: 'auto', background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 8 }}>
        <table style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--sf2)', zIndex: 1 }}>Secção</th>
              {groups.map(g => (
                <th
                  key={g.code}
                  colSpan={ACTIONS.length}
                  style={{ textAlign: 'center', borderLeft: '1px solid var(--bd)' }}
                >
                  <div>
                    <span className={`b ${groupColorClass(g.color)}`}>{g.label}</span>
                  </div>
                  <div className="dim mono" style={{ fontSize: 9, fontWeight: 400, marginTop: 3 }}>
                    {g.code}
                  </div>
                </th>
              ))}
            </tr>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--sf2)', zIndex: 1 }}></th>
              {groups.flatMap(g => ACTIONS.map(a => (
                <th
                  key={`${g.code}-${a.key}`}
                  style={{ textAlign: 'center', fontSize: 8, padding: '4px 2px' }}
                >
                  {a.short}
                </th>
              )))}
            </tr>
          </thead>
          <tbody>
            {visibleSections.map(sec => (
              <tr key={sec.code}>
                <td style={{ position: 'sticky', left: 0, background: 'var(--sf)', fontWeight: 500, fontSize: 12 }}>
                  {sec.label}
                  <div className="dim mono" style={{ fontSize: 9 }}>{sec.code}</div>
                </td>
                {groups.flatMap(g => ACTIONS.map(a => {
                  const row = grantMap[`${g.code}:${sec.code}`]
                  const allowed = row?.[a.col] === true
                  const key = `${g.code}:${sec.code}:${a.key}`
                  const isSaving = saving === key
                  return (
                    <td
                      key={key}
                      style={{ textAlign: 'center', padding: '2px 2px', borderLeft: '1px solid var(--bd)' }}
                    >
                      <button
                        onClick={() => toggle(g.code, sec.code, a)}
                        disabled={isSaving}
                        style={{
                          width: 22, height: 22, borderRadius: 4,
                          border: '1px solid ' + (allowed ? 'var(--gr)' : 'var(--bd)'),
                          background: allowed ? 'rgba(63,185,80,0.15)' : 'transparent',
                          color: allowed ? 'var(--gr)' : 'var(--mu)',
                          cursor: isSaving ? 'wait' : 'pointer',
                          fontSize: 12,
                          fontWeight: 700,
                          opacity: isSaving ? 0.4 : 1,
                        }}
                        title={`${g.label} → ${sec.label} → ${a.key}`}
                      >
                        {allowed ? '✓' : ''}
                      </button>
                    </td>
                  )
                }))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────── Tab 3: Logs de Actividade ─────────────── */

function TabLogs() {
  const [logs, setLogs] = useState(null)
  const [error, setError] = useState(null)
  const [filterVertical, setFilterVertical] = useState('')
  const [filterOrigem, setFilterOrigem] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      // iam.activity_logs agora inclui coluna `vertical` para distinguir
      // logs V2 vs V5 vs V4 etc. (ADR-013)
      let q = iamClient
        .from('activity_logs')
        .select('id, ts, user_email, user_label, vertical, origem, tipo, detalhe, resultado, ip, user_agent')
        .order('ts', { ascending: false })
        .limit(300)
      if (filterVertical) q = q.eq('vertical', filterVertical)
      if (filterOrigem)   q = q.eq('origem', filterOrigem)
      if (filterTipo)     q = q.eq('tipo', filterTipo)
      const { data, error } = await q
      if (!active) return
      if (error) setError(error.message)
      else setLogs(data ?? [])
    }
    load()
    return () => { active = false }
  }, [filterVertical, filterOrigem, filterTipo])

  const visible = useMemo(() => {
    if (!logs) return null
    if (!search.trim()) return logs
    const s = search.trim().toLowerCase()
    return logs.filter(l =>
      (l.detalhe || '').toLowerCase().includes(s) ||
      (l.user_email || '').toLowerCase().includes(s) ||
      (l.user_label || '').toLowerCase().includes(s) ||
      (l.ip || '').toLowerCase().includes(s)
    )
  }, [logs, search])

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterVertical} onChange={e => setFilterVertical(e.target.value)} style={selectStyle}>
          <option value="">Todas as verticais</option>
          <option value="v2">V2 Condomínios</option>
          <option value="v3">V3 Seguros</option>
          <option value="v4">V4 Energia</option>
          <option value="v5">V5 Manutenção</option>
          <option value="marketing">Marketing</option>
          <option value="system">System</option>
          <option value="iam">IAM</option>
        </select>
        <select value={filterOrigem} onChange={e => setFilterOrigem(e.target.value)} style={selectStyle}>
          <option value="">Todas origens</option>
          <option value="staff">staff</option>
          <option value="portal">portal</option>
          <option value="agent">agent</option>
          <option value="system">system</option>
          <option value="api">api</option>
        </select>

        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={selectStyle}>
          <option value="">Todos tipos</option>
          <option value="login">login</option>
          <option value="logout">logout</option>
          <option value="view">view</option>
          <option value="edit">edit</option>
          <option value="create">create</option>
          <option value="delete">delete</option>
          <option value="approval">approval</option>
          <option value="permission_change">permission_change</option>
          <option value="error">error</option>
        </select>

        <input
          type="search"
          placeholder="Procurar (detalhe / utilizador / ip)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            ...selectStyle,
            minWidth: 280,
            fontFamily: 'DM Sans, sans-serif',
            textTransform: 'none',
            letterSpacing: 0,
          }}
        />

        <span className="dim mono" style={{ fontSize: 10, marginLeft: 'auto' }}>
          {visible?.length ?? 0} {visible?.length === 1 ? 'evento' : 'eventos'}
        </span>
      </div>

      {error && <div className="error-banner">Erro: {error}</div>}
      {logs === null && !error && <div className="dim">A carregar…</div>}
      {visible && visible.length === 0 && !error && (
        <div className="empty-state">Sem eventos correspondentes aos filtros.</div>
      )}
      {visible && visible.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Quando</th>
              <th>Vertical</th>
              <th>Origem</th>
              <th>Tipo</th>
              <th>Utilizador</th>
              <th>Detalhe</th>
              <th>IP</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(l => (
              <tr key={l.id}>
                <td className="mono" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{fdt(l.ts)}</td>
                <td><VerticalBadge value={l.vertical} /></td>
                <td><OrigemBadge value={l.origem} /></td>
                <td><span className="mono" style={{ fontSize: 10, color: 'var(--mu)' }}>{l.tipo}</span></td>
                <td className="mono" style={{ fontSize: 11 }}>{l.user_label ?? l.user_email ?? '—'}</td>
                <td style={{ fontSize: 12 }}>{l.detalhe ?? '—'}</td>
                <td className="mono" style={{ fontSize: 10, color: 'var(--mu)' }}>{l.ip ?? '—'}</td>
                <td><ResultBadge value={l.resultado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const selectStyle = {
  background: 'var(--sf)',
  border: '1px solid var(--bd)',
  color: 'var(--tx)',
  padding: '5px 10px',
  borderRadius: 6,
  fontSize: 11,
  fontFamily: 'DM Mono, monospace',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}

function OrigemBadge({ value }) {
  if (!value) return <span className="dim">—</span>
  const palette = {
    portal: 'b-blue',
    staff:  'b-gold',
    api:    'b-purple',
    agent:  'b-green',
    system: 'b',
  }
  return <span className={`b ${palette[value] || 'b'}`}>{value}</span>
}

function ResultBadge({ value }) {
  if (!value || value === 'ok') return <span className="mono" style={{ color: 'var(--gr)', fontSize: 11 }}>✓ ok</span>
  if (value === 'error' || value === 'denied' || value === 'erro') {
    return <span className="mono" style={{ color: 'var(--rd)', fontSize: 11 }}>✗ {value}</span>
  }
  return <span className="mono" style={{ fontSize: 11 }}>{value}</span>
}

function VerticalBadge({ value }) {
  if (!value) return <span className="dim">—</span>
  const palette = {
    v2:        'b-blue',
    v3:        'b-purple',
    v4:        'b-gold',
    v5:        'b-green',
    v10:       'b-purple',
    marketing: 'b-red',
    system:    'b',
    iam:       'b',
  }
  return <span className={`b ${palette[value] || 'b'}`} style={{ fontSize: 9 }}>{value}</span>
}
