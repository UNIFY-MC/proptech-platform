import { useEffect, useMemo, useState } from 'react'
import { v2Client } from '../lib/clients.js'

function fdt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

export default function PortalCondomino() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await v2Client
        .from('portal_tokens')
        .select(`
          token, fracao_id, condomino_id, email_legacy, nome_legacy,
          permission_group_code, active, last_used_at, created_at,
          fracoes:fracao_id(codigo, permilagem)
        `)
        .eq('active', true)
        .order('nome_legacy', { ascending: true, nullsFirst: false })
      if (!active) return
      if (error) setError(error.message)
      else setRows(data ?? [])
    }
    load()
    return () => { active = false }
  }, [])

  const visible = useMemo(() => {
    if (!rows) return null
    if (!search.trim()) return rows
    const s = search.trim().toLowerCase()
    return rows.filter(r =>
      (r.nome_legacy || '').toLowerCase().includes(s) ||
      (r.email_legacy || '').toLowerCase().includes(s) ||
      (r.fracoes?.codigo || '').toLowerCase().includes(s)
    )
  }, [rows, search])

  function abrirPreview(token) {
    // Marker localStorage para o portal carregar como condómino X.
    // Edge function ou rota dedicada pode usar token para validar.
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/?token=${token}`
      window.open(url, '_blank', 'noopener')
    }
  }

  async function copyLink(token) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    const url = `${window.location.origin}/?token=${token}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <h1>Abrir como Condómino</h1>
      <p className="dim" style={{ fontSize: 13, marginBottom: 16 }}>
        Modo impersonation — abrir o portal cliente como um condómino específico.
        Útil para suporte e validação UX. Cada acesso fica em <code className="mono">activity_logs</code>.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Procurar por nome, email ou fracção"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 280px',
            background: 'var(--sf)',
            border: '1px solid var(--bd)',
            color: 'var(--tx)',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 13,
            fontFamily: 'DM Sans, sans-serif',
          }}
        />
        <span className="dim mono" style={{ fontSize: 10 }}>
          {visible?.length ?? 0} de {rows?.length ?? 0} tokens
        </span>
      </div>

      {error && <div className="error-banner">Erro: {error}</div>}
      {rows === null && !error && <div className="dim">A carregar…</div>}
      {visible && visible.length === 0 && !error && (
        <div className="empty-state">Nenhum condómino corresponde à pesquisa.</div>
      )}
      {visible && visible.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Fracção</th>
              <th>Email</th>
              <th>Permilagem</th>
              <th>Último uso</th>
              <th style={{ width: 160 }}>Acções</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(r => (
              <tr key={r.token}>
                <td>{r.nome_legacy ?? <span className="dim">— (sem nome)</span>}</td>
                <td className="mono" style={{ fontSize: 11 }}>
                  {r.fracoes?.codigo ?? r.fracao_id?.slice(0, 8) ?? '—'}
                </td>
                <td className="mono" style={{ fontSize: 10 }}>{r.email_legacy ?? '—'}</td>
                <td className="mono" style={{ textAlign: 'right' }}>
                  {r.fracoes?.permilagem != null ? `${Number(r.fracoes.permilagem).toFixed(3)} ‰` : '—'}
                </td>
                <td className="mono" style={{ fontSize: 11 }}>{fdt(r.last_used_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => abrirPreview(r.token)} style={btnPrimary}>Abrir</button>
                    <button onClick={() => copyLink(r.token)} style={btnSecondary}>Copiar link</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const btnPrimary = {
  padding: '4px 10px',
  background: 'var(--go)',
  color: '#0d1117',
  border: 'none',
  borderRadius: 4,
  fontSize: 11,
  fontFamily: 'DM Mono, monospace',
  fontWeight: 600,
  cursor: 'pointer',
}

const btnSecondary = {
  padding: '4px 10px',
  background: 'transparent',
  color: 'var(--mu)',
  border: '1px solid var(--bd)',
  borderRadius: 4,
  fontSize: 11,
  fontFamily: 'DM Mono, monospace',
  cursor: 'pointer',
}
