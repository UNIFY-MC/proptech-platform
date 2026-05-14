import { useEffect, useState } from 'react'
import { v2Client, coreClient } from '../lib/clients.js'

export default function Condominos() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      // Step 1: condominos + fracoes embed
      const { data: condRows, error: condErr } = await v2Client
        .from('condominos')
        .select('id, pessoa_id, tipo, activo, data_inicio, created_at, fracoes:fracao_id(codigo, permilagem)')
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .limit(200)
      if (!active) return
      if (condErr) { setError(condErr.message); return }

      // Step 2: lookup pessoas por pessoa_id em core schema
      const pessoaIds = [...new Set((condRows || []).map(c => c.pessoa_id).filter(Boolean))]
      let pessoasMap = {}
      if (pessoaIds.length > 0) {
        const { data: pessoas } = await coreClient
          .from('pessoas')
          .select('id, nome, email')
          .in('id', pessoaIds)
        for (const p of pessoas || []) pessoasMap[p.id] = p
      }

      if (!active) return
      setRows((condRows || []).map(c => ({ ...c, pessoa: pessoasMap[c.pessoa_id] })))
    }
    load()
    return () => { active = false }
  }, [])

  return (
    <div>
      <h1>Condóminos</h1>
      <p className="dim" style={{ fontSize: 13, marginBottom: 16 }}>
        Relação <code className="mono">core.pessoas</code> ↔ <code className="mono">fracoes</code>.
        Um condómino pode ter várias fracções.
      </p>

      {error && <div className="error-banner">Erro: {error}</div>}
      {rows === null && !error && <div className="dim">A carregar…</div>}
      {rows && rows.length === 0 && !error && (
        <div className="empty-state">
          <div style={{ fontSize: 14, marginBottom: 4 }}>Sem condóminos activos</div>
        </div>
      )}
      {rows && rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Fracção</th>
              <th>Nome</th>
              <th>Email</th>
              <th>Tipo</th>
              <th>Desde</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id}>
                <td className="mono">{c.fracoes?.codigo ?? '—'}</td>
                <td>{c.pessoa?.nome ?? <span className="dim">— (sem pessoa)</span>}</td>
                <td className="mono" style={{ fontSize: 11 }}>{c.pessoa?.email ?? '—'}</td>
                <td>{c.tipo ?? '—'}</td>
                <td className="mono">{(c.data_inicio ?? c.created_at)?.slice(0, 10) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
