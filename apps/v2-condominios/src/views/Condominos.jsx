// Condóminos — cópia literal do layout legacy de prataowners.pt
// Source: docs/v2-migration/legacy-source/condominos/ (HTML+CSS extraídos via Playwright)
//
// Tabela:
//   Ref. | Nome / Fracções (nome em destaque + fracções por baixo) | Email | Telefone | NIF | Morada | Observações | Portal
//   + Sort: clicar qualquer header alterna asc/desc (sort indicator ▲▼)
import { useEffect, useMemo, useState } from 'react'
import { v2Client, coreClient } from '../lib/clients.js'

export default function Condominos() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [sort, setSort] = useState({ col: 'ref', dir: 'asc' })
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      // 1. Buscar relações condominos↔fracções activas
      const { data: condRows, error: condErr } = await v2Client
        .from('condominos')
        .select('id, pessoa_id, tipo, activo, data_inicio, created_at, fracoes:fracao_id(id, codigo, permilagem)')
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .limit(500)
      if (!active) return
      if (condErr) { setError(condErr.message); return }

      // 2. Lookup pessoas
      const pessoaIds = [...new Set((condRows || []).map(c => c.pessoa_id).filter(Boolean))]
      let pessoasMap = {}
      if (pessoaIds.length > 0) {
        const { data: pessoas } = await coreClient
          .from('pessoas')
          .select('id, nome, email, telemovel, telefone, nif, morada, codigo_postal, localidade, observacoes')
          .in('id', pessoaIds)
        for (const p of pessoas || []) pessoasMap[p.id] = p
      }

      // 3. Agrupar por pessoa (1 row por pessoa, com várias fracções)
      const byPessoa = new Map()
      for (const c of (condRows || [])) {
        if (!c.pessoa_id) continue
        const key = c.pessoa_id
        if (!byPessoa.has(key)) {
          const p = pessoasMap[c.pessoa_id]
          byPessoa.set(key, {
            id: c.pessoa_id,
            nome: p?.nome ?? '—',
            email: p?.email ?? null,
            telefone: p?.telemovel ?? p?.telefone ?? null,
            nif: p?.nif ?? null,
            morada: [p?.morada, p?.codigo_postal, p?.localidade].filter(Boolean).join(', ') || null,
            observacoes: p?.observacoes ?? null,
            fracoes: [],
            primeira_data: c.data_inicio ?? c.created_at,
          })
        }
        const entry = byPessoa.get(key)
        if (c.fracoes?.codigo) entry.fracoes.push(c.fracoes.codigo)
      }

      if (!active) return
      // Atribuir ref (1, 2, 3...) por ordem alfabética nome
      const list = Array.from(byPessoa.values()).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
      list.forEach((r, i) => { r.ref = i + 1 })
      setRows(list)
    }
    load()
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return null
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(r =>
      (r.nome || '').toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q) ||
      (r.nif || '').toLowerCase().includes(q) ||
      (r.fracoes || []).some(f => f.toLowerCase().includes(q))
    )
  }, [rows, search])

  const sorted = useMemo(() => {
    if (!filtered) return null
    const copy = [...filtered]
    copy.sort((a, b) => {
      const va = sortValue(a, sort.col)
      const vb = sortValue(b, sort.col)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'pt')
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [filtered, sort])

  function toggleSort(col) {
    setSort(s => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }))
  }

  return (
    <div>
      <h1>Condóminos</h1>
      <p className="dim" style={{ fontSize: 13, marginBottom: 16 }}>
        Relação <code className="mono">core.pessoas</code> ↔ <code className="mono">fracoes</code>.
        Um condómino pode ter várias fracções.
      </p>

      {/* Toolbar: search + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div className="mono dim" style={{ fontSize: 11 }}>
          {sorted ? `${sorted.length} condóminos` : 'A carregar…'}
        </div>
        <input
          type="search"
          placeholder="Pesquisar nome, email, NIF, fracção…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, maxWidth: 320,
            padding: '6px 12px',
            background: 'var(--sf)', border: '1px solid var(--bd)', color: 'var(--tx)',
            borderRadius: 6, fontSize: 12, fontFamily: 'DM Sans, sans-serif',
            outline: 'none',
          }}
        />
      </div>

      {error && <div className="error-banner">Erro: {error}</div>}
      {sorted === null && !error && <div className="dim">A carregar…</div>}
      {sorted && sorted.length === 0 && !error && (
        <div className="empty-state">
          <div style={{ fontSize: 14, marginBottom: 4 }}>Sem condóminos activos</div>
        </div>
      )}

      {sorted && sorted.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <SortableTh sort={sort} col="ref" onClick={toggleSort} style={{ width: 40, textAlign: 'center' }}>Ref.</SortableTh>
                <SortableTh sort={sort} col="nome"     onClick={toggleSort} style={{ minWidth: 220 }}>Nome / Fracções</SortableTh>
                <SortableTh sort={sort} col="email"    onClick={toggleSort}>Email</SortableTh>
                <SortableTh sort={sort} col="telefone" onClick={toggleSort}>Telefone</SortableTh>
                <SortableTh sort={sort} col="nif"      onClick={toggleSort}>NIF</SortableTh>
                <SortableTh sort={sort} col="morada"   onClick={toggleSort}>Morada</SortableTh>
                <SortableTh sort={sort} col="observacoes" onClick={toggleSort}>Observações</SortableTh>
                <th style={thStyle}>🟢 Portal</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => (
                <tr key={c.id}>
                  <td style={tdRef}>{c.ref}</td>
                  <td style={tdName}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--tx)', lineHeight: 1.3 }}>
                      {c.nome}
                    </div>
                    {c.fracoes.length > 0 && (
                      <div style={{ marginTop: 2 }}>
                        {c.fracoes.map((f, i) => (
                          <span key={i} className="mono" style={{
                            fontSize: 10, color: 'var(--bl)',
                            textDecoration: 'underline dotted',
                            marginRight: 6,
                          }}>{f}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="mono" style={tdCell}>{c.email || <span className="dim">—</span>}</td>
                  <td className="mono" style={tdCell}>{c.telefone || <span className="dim">—</span>}</td>
                  <td className="mono" style={tdCell}>{c.nif || <span className="dim">—</span>}</td>
                  <td style={{ ...tdCell, fontSize: 11 }}>{c.morada || <span className="dim">—</span>}</td>
                  <td style={{ ...tdCell, fontSize: 11 }}>{c.observacoes || <span className="dim">—</span>}</td>
                  <td style={{ ...tdCell, textAlign: 'center' }}>
                    <span className="dim" style={{ fontSize: 11 }}>—</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* Header com sort indicator (▲ asc, ▼ desc, ↕ inactive) */
function SortableTh({ sort, col, onClick, children, style }) {
  const active = sort.col === col
  const arrow = active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'
  return (
    <th
      onClick={() => onClick(col)}
      style={{ ...thStyle, ...style, cursor: 'pointer', userSelect: 'none' }}
      title="Ordenar"
    >
      {children}
      <span className="mono" style={{
        marginLeft: 6, fontSize: 9,
        opacity: active ? 1 : 0.35,
        color: active ? 'var(--go)' : 'var(--mu)',
      }}>{arrow}</span>
    </th>
  )
}

function sortValue(row, col) {
  if (col === 'ref') return row.ref
  if (col === 'nome') return row.nome
  if (col === 'email') return row.email
  if (col === 'telefone') return row.telefone
  if (col === 'nif') return row.nif
  if (col === 'morada') return row.morada
  if (col === 'observacoes') return row.observacoes
  return null
}

const thStyle = {
  padding: '10px 8px',
  fontSize: 10,
  fontFamily: 'DM Mono, monospace',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  color: 'var(--mu)',
  textAlign: 'left',
  background: 'var(--sf2)',
  borderBottom: '2px solid var(--bd)',
}

const tdCell = {
  padding: '8px',
  fontSize: 12,
  color: 'var(--tx)',
  borderBottom: '1px solid var(--bd)',
  verticalAlign: 'top',
}

const tdRef = {
  ...tdCell,
  textAlign: 'center',
  color: 'var(--mu)',
  fontSize: 11,
  fontFamily: 'DM Mono, monospace',
  width: 40,
}

const tdName = {
  ...tdCell,
  minWidth: 220,
}
