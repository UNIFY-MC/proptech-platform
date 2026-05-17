// FilesPage — file manager multi-tenant /files (CookAI-style)
// Dados de system.context_docs via public.cookai_context_docs
// Storage híbrido: inline (markdown <100KB) · Supabase Storage · Drive (>50MB)
//
// A1.5 Sprint A1: sidebar esquerda com folders canónicos da plataforma.
// Folders top-level: Plataforma · Condomínios · Site · Equipa ·
//                    ads · agentes · briefings · chamadas · scripts · sops
// Quando se cria um novo condomínio, criar subfolders automaticamente.

import { useCallback, useMemo, useRef, useState } from 'react'
import * as Icons from 'lucide-react'
import { useContextDocs, useContextDocsSearch, useContextDocOps, useOrgs } from '../hooks/useContextDocs.js'
import FilePreviewDrawer from '../components/files/FilePreviewDrawer.jsx'

// Estrutura canónica de folders (top-level e subfolders pré-definidos)
const CANONICAL_FOLDERS = [
  { slug: 'plataforma',  label: 'Plataforma',  icon: 'Layers',    color: '#6366f1' },
  { slug: 'condominios', label: 'Condomínios',  icon: 'Building2', color: '#10b981',
    subfolders: ['actas', 'correspondencia', 'faturas', 'seguros', 'obras'] },
  { slug: 'site',        label: 'Site',         icon: 'Globe',     color: '#3b82f6' },
  { slug: 'equipa',      label: 'Equipa',       icon: 'Users',     color: '#8b5cf6' },
  { slug: 'ads',         label: 'ads',          icon: 'Megaphone', color: '#f59e0b' },
  { slug: 'agentes',     label: 'agentes',      icon: 'Bot',       color: '#06b6d4' },
  { slug: 'briefings',   label: 'briefings',    icon: 'FileText',  color: '#a855f7' },
  { slug: 'chamadas',    label: 'chamadas',     icon: 'Phone',     color: '#ec4899' },
  { slug: 'scripts',     label: 'scripts',      icon: 'Code2',     color: '#14b8a6' },
  { slug: 'sops',        label: 'sops',         icon: 'BookOpen',  color: '#f97316' },
]

// Slug seguro para nomes PT (remove diacriticos via NFD + strip combining chars U+0300-U+036F)
function toSlug(str) {
  return str.trim().toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
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
    await ops.createFolder({ orgId, folderPath, title: name })
    refetch()
  }, [orgId, folderPath, ops, refetch])

  // Cria subfolders canonicos para um novo condominio
  const handleCreateCondominioFolders = useCallback(async (nomeCondominio) => {
    const slugBase = `condominios/${nomeCondominio.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
    const subs = ['actas', 'correspondencia', 'faturas', 'seguros', 'obras']
    for (const sub of subs) {
      await ops.createFolder({ orgId, folderPath: slugBase, title: sub }).catch(() => {})
    }
    setFolderPath(slugBase)
    refetch()
  }, [orgId, ops, refetch])

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
      const slug = item.title.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const newPath = folderPath ? `${folderPath}/${slug}` : slug
      setFolderPath(newPath)
      setSearch('')
    } else {
      setSelectedDoc(item)
    }
  }, [folderPath])

  const navigateToCanonical = useCallback((slug) => {
    setFolderPath(slug)
    setSearch('')
    setOrgId(null)
  }, [])

  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
         style={{ display: 'flex', gap: 0, minHeight: '70vh' }}>

      {/* SIDEBAR CANÓNICA */}
      <CanonicalSidebar
        folderPath={folderPath}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(p => !p)}
        onNavigate={navigateToCanonical}
        onCreateCondominio={handleCreateCondominioFolders}
      />

      {/* CONTEÚDO PRINCIPAL */}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: sidebarCollapsed ? 0 : 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Files</h1>

          {/* Org switcher */}
          <select
            value={orgId ?? ''}
            onChange={(e) => { setOrgId(e.target.value || null); setFolderPath(null); setSearch('') }}
            style={{
              padding: '6px 10px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 5, fontSize: '0.78rem', color: 'var(--text)', outline: 'none',
            }}>
            <option value="">Global</option>
            {orgsLoading ? (
              <option disabled>A carregar orgs…</option>
            ) : (
              orgs.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)
            )}
          </select>

          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar ficheiros…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '6px 10px 6px 30px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 5, fontSize: '0.78rem', color: 'var(--text)', outline: 'none',
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
            {searchResults.length} resultados para "{search}"
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
              Arrasta ficheiros aqui · clica <strong>Upload</strong> ou <strong>+ Pasta</strong>
            </div>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
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
    </div>
  )
}

// ─── Sidebar canónica de navegação ──────────────────────────────────────────
function CanonicalSidebar({ folderPath, collapsed, onToggle, onNavigate, onCreateCondominio }) {
  const [expandedCondominio, setExpandedCondominio] = useState(false)

  const sidebarW = collapsed ? 36 : 200

  return (
    <div style={{
      width: sidebarW, flexShrink: 0,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: collapsed ? '8px 4px' : '10px 0',
      transition: 'width 0.15s',
      alignSelf: 'flex-start',
      position: 'sticky', top: 24,
    }}>
      {/* Toggle collapse */}
      <button
        onClick={onToggle}
        style={{
          display: 'block', width: '100%', padding: '4px 8px', marginBottom: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-dim)', textAlign: collapsed ? 'center' : 'right',
          fontSize: 12,
        }}
        title={collapsed ? 'Expandir' : 'Recolher'}
      >
        {collapsed ? '»' : '«'}
      </button>

      {!collapsed && (
        <div style={{
          fontSize: '0.5rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
          textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)',
          padding: '0 12px', marginBottom: 6,
        }}>Folders</div>
      )}

      {CANONICAL_FOLDERS.map(folder => {
        const isActive = folderPath === folder.slug || folderPath?.startsWith(folder.slug + '/')
        const isCondominio = folder.slug === 'condominios'

        return (
          <div key={folder.slug}>
            <button
              onClick={() => {
                onNavigate(folder.slug)
                if (isCondominio) setExpandedCondominio(p => !p)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 8,
                width: '100%', padding: collapsed ? '7px 6px' : '7px 12px',
                background: isActive ? 'rgba(99,102,241,0.1)' : 'none',
                border: 'none', cursor: 'pointer',
                borderLeft: isActive ? `2px solid ${folder.color}` : '2px solid transparent',
                color: isActive ? 'var(--text)' : 'var(--text-dim)',
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                justifyContent: collapsed ? 'center' : 'flex-start',
                transition: 'all 0.1s',
              }}
              title={collapsed ? folder.label : undefined}
            >
              <Ic name={folder.icon} size={13} color={isActive ? folder.color : 'var(--text-dim)'} />
              {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.label}</span>}
            </button>

            {/* Subfolders Condomínios */}
            {!collapsed && isCondominio && expandedCondominio && (
              <div style={{ paddingLeft: 24 }}>
                {(folder.subfolders || []).map(sub => (
                  <button
                    key={sub}
                    onClick={() => onNavigate(`${folder.slug}/${sub}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      width: '100%', padding: '5px 12px',
                      background: folderPath === `${folder.slug}/${sub}` ? 'rgba(99,102,241,0.08)' : 'none',
                      border: 'none', cursor: 'pointer', color: 'var(--text-dim)',
                      fontSize: 11,
                    }}
                  >
                    <Ic name="Folder" size={11} color="var(--text-dim)" />
                    {sub}
                  </button>
                ))}
                {/* Criar novo condomínio */}
                <button
                  onClick={() => {
                    const nome = prompt('Nome do condomínio (ex: Prata 2):')
                    if (nome) onCreateCondominio(nome)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    width: '100%', padding: '5px 12px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--info)', fontSize: 11,
                  }}
                >
                  + novo condomínio
                </button>
              </div>
            )}
          </div>
        )
      })}
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
