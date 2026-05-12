import { useEffect, useState } from 'react'
import { v2Client } from '../lib/clients.js'

export default function Fracoes() {
  const [fracoes, setFracoes] = useState(null)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await v2Client
        .from('fracoes')
        .select('*')
        .order('letra', { ascending: true })
        .limit(200)
      if (!active) return
      if (error) setError(error.message)
      else setFracoes(data ?? [])
    }
    load()
    return () => { active = false }
  }, [])

  return (
    <div>
      <h1>Frações</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -8, marginBottom: 20 }}>
        Lista de frações do condomínio activo. Dados em v2_condominios.fracoes (V1 Core Hub).
      </p>

      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(239,68,68,0.12)',
          color: 'var(--danger)',
          borderRadius: 6,
          fontSize: 13,
          marginBottom: 16,
        }}>
          Erro a carregar frações: {error}
        </div>
      )}

      {fracoes === null && !error && (
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>A carregar…</div>
      )}

      {fracoes && fracoes.length === 0 && !error && (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--text-dim)',
          background: 'var(--bg-card-soft)',
          border: '1px dashed var(--border)',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Sem frações ainda</div>
          <div style={{ fontSize: 12 }}>
            O schema v2_condominios está vazio. Importação de dados via <code className="mono">importador-v2</code> faz-se quando o cutover for aprovado.
          </div>
        </div>
      )}

      {fracoes && fracoes.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-dim)', fontSize: 8, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Letra</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Andar</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Tipologia</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Permilagem</th>
            </tr>
          </thead>
          <tbody>
            {fracoes.map(f => (
              <tr key={f.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace' }}>{f.letra ?? '—'}</td>
                <td style={{ padding: '8px 10px' }}>{f.andar ?? '—'}</td>
                <td style={{ padding: '8px 10px' }}>{f.tipologia ?? '—'}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}>
                  {f.permilagem != null ? Number(f.permilagem).toFixed(4) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
