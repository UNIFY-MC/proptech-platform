import { useEffect, useState } from 'react'
import { v2Client } from '../lib/clients.js'

const CANAL_STYLE = {
  email:    { bg: 'rgba(59,130,246,0.15)', color: 'var(--info)' },
  sms:      { bg: 'rgba(16,185,129,0.15)', color: 'var(--success)' },
  whatsapp: { bg: 'rgba(16,185,129,0.15)', color: 'var(--success)' },
  carta:    { bg: 'rgba(245,158,11,0.15)', color: 'var(--warning)' },
}

export default function Comunicacao() {
  const [coms, setComs] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await v2Client
        .from('comunicacoes')
        .select('*')
        .order('enviado_em', { ascending: false, nullsFirst: false })
        .limit(100)
      if (!active) return
      if (error) setError(error.message)
      else setComs(data ?? [])
    }
    load()
    return () => { active = false }
  }, [])

  return (
    <div>
      <h1>Comunicação</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Registo imutável de comunicações enviadas. É prova legal de envio (aviso de mora, convocatória). <code className="mono">comunicacao-condo</code> (Coco) executa após aprovação em <code className="mono">approvals_queue</code>.
      </p>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
          Erro: {error}
        </div>
      )}

      {coms === null && !error && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>A carregar…</div>}

      {coms && coms.length === 0 && !error && (
        <div style={{
          padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)',
          background: 'var(--bg-card-soft)', border: '1px dashed var(--border)', borderRadius: 8,
        }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Sem comunicações</div>
          <div style={{ fontSize: 12 }}>
            Quando Mário aprovar uma comunicação em Approvals, Coco envia e regista aqui.
          </div>
        </div>
      )}

      {coms && coms.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {coms.map(c => {
            const cs = CANAL_STYLE[c.canal] ?? { bg: 'var(--bg-elevated)', color: 'var(--text-dim)' }
            return (
              <div key={c.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6,
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{
                  fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
                  textTransform: 'uppercase', padding: '1px 6px', borderRadius: 3,
                  background: cs.bg, color: cs.color, flexShrink: 0,
                }}>
                  {c.canal ?? '?'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.assunto ?? c.tipo ?? '(sem assunto)'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    Para: {c.destinatario ?? '—'}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', flexShrink: 0 }}>
                  {c.enviado_em?.slice(0, 16).replace('T', ' ') ?? '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
