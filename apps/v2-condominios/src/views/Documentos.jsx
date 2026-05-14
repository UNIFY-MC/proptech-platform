import { useEffect, useState } from 'react'
import { v2Client } from '../lib/clients.js'

export default function Documentos() {
  const [docs, setDocs] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await v2Client
        .from('documentos')
        .select('id, titulo, filename_original, tipo, estado_ocr, confianca_ocr, created_at, documentos_drive(drive_url, drive_file_id), faturas_ocr(valor_total, conf_valor)')
        .order('created_at', { ascending: false })
        .limit(200)
      if (!active) return
      if (error) setError(error.message)
      else setDocs(data ?? [])
    }
    load()
    return () => { active = false }
  }, [])

  return (
    <div>
      <h1>Documentos</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Registo central. Apenas <code className="mono">docs-condo</code> (Dora) escreve. Links Google Drive em <code className="mono">documentos_drive</code>, dados OCR em <code className="mono">faturas_ocr</code>.
      </p>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
          Erro: {error}
        </div>
      )}

      {docs === null && !error && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>A carregar…</div>}

      {docs && docs.length === 0 && !error && (
        <div style={{
          padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)',
          background: 'var(--bg-card-soft)', border: '1px dashed var(--border)', borderRadius: 8,
        }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Sem documentos</div>
          <div style={{ fontSize: 12 }}>
            Quando chegarem PDFs/imagens, Dora classifica e arquiva. Vista lista os mais recentes primeiro.
          </div>
        </div>
      )}

      {docs && docs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {docs.map(d => (
            <div key={d.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.titulo ?? d.filename_original ?? '(sem título)'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 6 }}>
                {d.tipo ?? 'genérico'} · {d.created_at?.slice(0, 10) ?? '—'}
              </div>
              {d.faturas_ocr?.length > 0 && (
                <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--mu)' }}>
                  OCR: {Number(d.faturas_ocr[0].valor_total ?? 0).toFixed(2)} €
                  {d.faturas_ocr[0].conf_valor != null && ` · conf ${Math.round(d.faturas_ocr[0].conf_valor * 100)}%`}
                </div>
              )}
              {d.documentos_drive?.length > 0 && (
                <a href={d.documentos_drive[0].drive_url} target="_blank" rel="noreferrer" style={{
                  fontSize: 11, color: 'var(--bl)', textDecoration: 'none', marginTop: 6, display: 'inline-block',
                }}>↗ Abrir documento</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
