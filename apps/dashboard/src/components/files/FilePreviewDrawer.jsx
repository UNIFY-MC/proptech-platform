// FilePreviewDrawer — drawer lateral para preview de um documento context_docs
// Suporta: inline markdown render · Supabase signed URL para PDFs/imagens/áudio

import { useEffect, useState } from 'react'
import { useContextDocOps } from '../../hooks/useContextDocs.js'

export default function FilePreviewDrawer({ doc, onClose, onDeleted }) {
  const [signedUrl, setSignedUrl] = useState(null)
  const ops = useContextDocOps()

  useEffect(() => {
    if (doc?.storage_provider === 'supabase') {
      ops.getSignedUrl(doc).then(setSignedUrl)
    } else {
      setSignedUrl(null)
    }
  }, [doc?.id, doc?.storage_provider])

  if (!doc) return null

  async function handleDelete() {
    if (!confirm(`Eliminar "${doc.title}"?`)) return
    const ok = await ops.deleteDoc(doc)
    if (ok) onDeleted?.()
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 'min(640px, 100vw)',
      background: 'var(--bg)', borderLeft: '1px solid var(--border)',
      boxShadow: '-8px 0 24px rgba(0,0,0,0.18)',
      display: 'flex', flexDirection: 'column', zIndex: 1000,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem',
            color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            {doc.type} · {doc.storage_provider} · {doc.mime_type ?? '?'}
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: 2 }}>{doc.title}</div>
          {doc.folder_path && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 2 }}>📁 {doc.folder_path}</div>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-dim)', fontSize: '1.4rem', padding: '0 4px',
        }}>×</button>
      </div>

      {/* Body — preview */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <Preview doc={doc} signedUrl={signedUrl} />

        {doc.ocr_text && (
          <details style={{ marginTop: 16 }}>
            <summary style={{
              fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              cursor: 'pointer', padding: '8px 0',
            }}>OCR Text · {doc.ocr_text.length} chars</summary>
            <pre style={{
              fontSize: '0.72rem', whiteSpace: 'pre-wrap',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 6, padding: 12, color: 'var(--text)',
              marginTop: 6,
            }}>{doc.ocr_text}</pre>
          </details>
        )}

        {/* Metadata */}
        <details style={{ marginTop: 16 }}>
          <summary style={{
            fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            cursor: 'pointer', padding: '8px 0',
          }}>Metadata</summary>
          <pre style={{
            fontSize: '0.7rem', whiteSpace: 'pre-wrap',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 6, padding: 12, color: 'var(--text-dim)',
            marginTop: 6,
          }}>{JSON.stringify({
            id: doc.id, organization_id: doc.organization_id, employee_id: doc.employee_id,
            type: doc.type, mime_type: doc.mime_type, size_bytes: doc.size_bytes,
            storage_provider: doc.storage_provider, storage_ref: doc.storage_ref,
            ocr_status: doc.ocr_status, tags: doc.tags,
            created_at: doc.created_at, updated_at: doc.updated_at,
          }, null, 2)}</pre>
        </details>
      </div>

      {/* Footer */}
      <div style={{
        padding: 14, borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8, justifyContent: 'space-between',
      }}>
        {signedUrl && (
          <a href={signedUrl} target="_blank" rel="noreferrer" style={{
            padding: '7px 14px', background: 'transparent', color: 'var(--info)',
            border: '1px solid var(--info)', borderRadius: 5, fontSize: '0.74rem',
            textDecoration: 'none', fontWeight: 600,
          }}>Abrir / Download ↗</a>
        )}
        <button onClick={handleDelete} style={{
          marginLeft: 'auto',
          padding: '7px 14px', background: 'transparent', color: 'var(--danger)',
          border: '1px solid var(--danger)', borderRadius: 5, fontSize: '0.74rem',
          fontWeight: 600, cursor: 'pointer',
        }}>Eliminar</button>
      </div>
    </div>
  )
}

function Preview({ doc, signedUrl }) {
  // Inline markdown
  if (doc.storage_provider === 'inline' && doc.content) {
    return (
      <pre style={{
        fontSize: '0.78rem', whiteSpace: 'pre-wrap', lineHeight: 1.55,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 6, padding: 14, color: 'var(--text)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}>{doc.content}</pre>
    )
  }

  // Supabase Storage
  if (doc.storage_provider === 'supabase') {
    if (!signedUrl) {
      return <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>A obter URL assinada…</div>
    }
    const mime = doc.mime_type ?? ''
    const name = (doc.file_name ?? '').toLowerCase()

    if (mime === 'application/pdf' || name.endsWith('.pdf')) {
      return <embed src={signedUrl} type="application/pdf" style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 6 }} />
    }
    if (mime.startsWith('image/')) {
      return <img src={signedUrl} alt={doc.title} style={{ maxWidth: '100%', borderRadius: 6, background: 'var(--bg-card)' }} />
    }
    if (mime.startsWith('audio/')) {
      return <audio controls src={signedUrl} style={{ width: '100%' }} />
    }
    if (mime.startsWith('video/')) {
      return <video controls src={signedUrl} style={{ width: '100%', borderRadius: 6 }} />
    }
    // Office documents (Word, Excel, PowerPoint) → Microsoft Office viewer
    // Requer URL pública acessível pela Microsoft. Signed URL Supabase serve.
    const isOffice =
      mime.includes('officedocument') || mime === 'application/msword' ||
      mime === 'application/vnd.ms-excel' || mime === 'application/vnd.ms-powerpoint' ||
      /\.(docx?|xlsx?|pptx?|odt|ods|odp)$/.test(name)
    if (isOffice) {
      const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`
      return (
        <div>
          <iframe
            src={officeUrl}
            style={{ width: '100%', height: '70vh', border: '1px solid var(--border)', borderRadius: 6, background: '#fff' }}
            title={doc.title}
          />
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 6 }}>
            Preview via Microsoft Office Online (read-only). Para editar: download abaixo.
          </div>
        </div>
      )
    }
    return (
      <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
        Preview não disponível para <code>{mime || name}</code>. Usa "Abrir / Download" abaixo.
      </div>
    )
  }

  // Drive — Sprint 2
  return (
    <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
      Google Drive integration: Sprint 2. <a href={doc.source_url ?? '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--info)' }}>Abrir externamente</a>
    </div>
  )
}
