// FilesPage — file manager multi-tenant /files (CookAI-style)
// Dados de system.context_docs via public.cookai_context_docs
// Storage híbrido: inline (markdown <100KB) · Supabase Storage · Drive (>50MB)

import { useCallback, useMemo, useRef, useState } from 'react'
import * as Icons from 'lucide-react'
import { useContextDocs, useContextDocsSearch, useContextDocOps, useOrgs } from '../hooks/useContextDocs.js'
import FilePreviewDrawer from '../components/files/FilePreviewDrawer.jsx'

const FALLBACK_ICON = Icons.File

function Ic({ name, size = 16, color = 'var(--text-dim)' }) {
  const Comp = (name && Icons[name]) || FALLBACK_ICON
  return <Comp size={size} style={{ color, flexShrink: 0 }} />
}

function iconForMime(mime) {
  if (!mime) return 'File'
  if (mime === 'application/pdf') return 'FileText'
  if (mime.startsWith('image/')) return 'Image'
  if (mime.startsWith('audio/')) return 'Music'
  if (mime.startsWith('video/')) return 'Video'
  if (mime.startsWith('text/')) return 'FileText'
  return 'File'
}

function fmtSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function FilesPage() {
  const { orgs, loading: orgsLoading } = useOrgs()
  const [orgId, setOrgId] = useState(null)              // null = global view
  const [folderPath, setFolderPath] = useState(null)    // null = root
  const [search, setSearch] = useState('')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const fileInputRef = useRef(null)

  const { items, loading, refetch } = useContextDocs(orgId, folderPath)
  const { results: searchResults } = useContextDocsSearch(orgId, search)
  const ops = useContextDocOps()

  const isSearching = search.trim().length >= 2
  const visibleItems = isSearching ? searchResults : items

  // Breadcrumb
  const crumbs = useMemo(() => {
    const parts = (folderPath || '').split('/').filter(Boolean)
    return [
      { label: 'root', path: null },
      ...parts.map((part, i) => ({
        label: part,
        path: parts.slice(0, i + 1).join('/'),
      })),
    ]
  }, [folderPath])

  const handleCreateFolder = useCallback(async () => {
    const name = prompt('Nome da nova pasta:')
    if (!name) return
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const newPath = folderPath ? `${folderPath}/${slug}` : slug
    await ops.createFolder({ orgId, folderPath, title: name })
    refetch()
  }, [orgId, folderPath, ops, refetch])

  const handleUpload = useCallback(async (files) => {
    for (const f of Array.from(files)) {
      await ops.uploadFile({ orgId, folderPath, file: f })
    }
    refetch()
  }, [orgId, folderPath, ops, refetch])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    if (e.dataTransfer?.files?.length) handleUpload(e.dataTransfer.files)
  }, [handleUpload])

  const handleItemClick = useCallback((item) => {
    if (item.is_folder) {
      const slug = item.title.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
      const newPath = folderPath ? `${folderPath}/${slug}` : slug
      setFolderPath(newPath)
      setSearch('')
    } else {
      setSelectedDoc(item)
    }
  }, [folderPath])

  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Files</h1>

        {/* Org switcher */}
        <select
          value={orgId ?? ''}
          onChange={(e) => { setOrgId(e.target.value || null); setFolderPath(null); setSearch('') }}
          style={{
            padding: '6px 10px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 5, fontSize: '0.78rem', color: 'var(--text)',
            outline: 'none',
          }}>
          <option value="">🌐 Global (cross-org)</option>
          {orgsLoading ? (
            <option disabled>A carregar orgs…</option>
          ) : (
            orgs.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)
          )}
        </select>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Ic name="Search" size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar em title / content / OCR…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '6px 10px 6px 30px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 5, fontSize: '0.78rem', color: 'var(--text)',
              outline: 'none',
            }} />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <Ic name="Search" size={13} />
          </span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={handleCreateFolder} style={btnGhost}>+ Pasta</button>
          <button onClick={() => fileInputRef.current?.click()} style={btnPrimary}>
            <Ic name="Upload" size={13} color="#fff" />
            <span style={{ marginLeft: 6 }}>Upload</span>
          </button>
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files) handleUpload(e.target.files); e.target.value = '' }} />
        </div>
      </div>

      {/* Breadcrumb */}
      {!isSearching && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, fontSize: '0.78rem' }}>
          {crumbs.map((c, i) => (
            <span key={c.path ?? 'root'} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => setFolderPath(c.path)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: i === crumbs.length - 1 ? 'var(--text)' : 'var(--info)',
                  fontWeight: i === crumbs.length - 1 ? 600 : 400,
                  padding: 0, font: 'inherit',
                }}>
                {c.label}
              </button>
              {i < crumbs.length - 1 && <span style={{ color: 'var(--text-dim)' }}>/</span>}
            </span>
          ))}
        </div>
      )}

      {isSearching && (
        <div style={{ marginBottom: 14, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          {searchResults.length} resultados para “{search}”
        </div>
      )}

      {/* Grid */}
      {loading && (
        <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>A carregar…</div>
      )}

      {!loading && visibleItems.length === 0 && (
        <div style={{
          padding: '60px 20px', textAlign: 'center',
          background: 'var(--bg-card)', border: '1px dashed var(--border)',
          borderRadius: 10, color: 'var(--text-dim)',
        }}>
          <div style={{ fontSize: '2.4rem', marginBottom: 8 }}>📁</div>
          <div style={{ fontSize: '0.85rem', marginBottom: 6 }}>
            {isSearching ? 'Sem resultados.' : 'Pasta vazia'}
          </div>
          <div style={{ fontSize: '0.7rem' }}>
            Arrasta ficheiros aqui ou clica <strong>Upload</strong> · <strong>+ Pasta</strong> para criar subpasta
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        gap: 12,
      }}>
        {visibleItems.map(item => (
          <Card key={item.id} item={item} onClick={() => handleItemClick(item)} />
        ))}
      </div>

      {/* Preview drawer */}
      {selectedDoc && (
        <FilePreviewDrawer
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDeleted={() => { setSelectedDoc(null); refetch() }}
        />
      )}
    </div>
  )
}

function Card({ item, onClick }) {
  const isFolder = item.is_folder
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 14, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 8,
        transition: 'background 0.12s, transform 0.12s',
        textAlign: 'left', minHeight: 100,
        font: 'inherit', color: 'inherit',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isFolder
          ? <Ic name="Folder" size={26} color="var(--warning)" />
          : <Ic name={iconForMime(item.mime_type)} size={26} color="var(--info)" />}
        {item.storage_provider && !isFolder && (
          <span style={{
            marginLeft: 'auto',
            fontSize: '0.5rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
            padding: '2px 5px', borderRadius: 3,
            background: 'var(--bg-elevated)', color: 'var(--text-dim)',
          }}>{item.storage_provider.toUpperCase()}</span>
        )}
      </div>
      <div style={{
        fontWeight: 600, fontSize: '0.82rem', color: 'var(--text)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{item.title}</div>
      <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
        {isFolder ? 'folder' : (item.type + ' · ' + fmtSize(item.size_bytes))}
      </div>
    </button>
  )
}

const btnBase = {
  padding: '6px 12px', borderRadius: 5, fontSize: '0.74rem', fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
}
const btnPrimary = { ...btnBase, background: 'var(--primary)', color: '#fff', border: 'none' }
const btnGhost = { ...btnBase, background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }
