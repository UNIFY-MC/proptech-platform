// useContextDocs — hooks para o file manager multi-tenant /files
// Lê de public.cookai_context_docs (view sobre system.context_docs)
// Upload escolhe storage provider auto (inline/supabase/drive) por size/mime
//
// API:
//   const { items, loading, error, refetch } = useContextDocs(orgId, folderPath)
//   const { results, loading } = useContextDocsSearch(orgId, query)
//   const ops = useContextDocOps() — createFolder, uploadFile, deleteDoc, moveDoc

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useNotificationsStore } from '../store'

const INLINE_THRESHOLD  = 100 * 1024         // 100KB
const DRIVE_THRESHOLD   = 50 * 1024 * 1024   // 50MB
const SUPABASE_BUCKET   = 'context-docs'

function pickStorageProvider(file) {
  const mime = file.type || 'application/octet-stream'
  if (file.size < INLINE_THRESHOLD && (mime.startsWith('text/') || mime === 'application/markdown')) {
    return 'inline'
  }
  if (file.size > DRIVE_THRESHOLD) return 'drive'
  return 'supabase'
}

// Supabase Storage só aceita ASCII safe (a-z, 0-9, -, _, ., /).
// Acentos, espaços, ç → sanitizados. Mantemos extensão.
function sanitizeStorageKey(filename) {
  const parts = String(filename).split('.')
  const ext = parts.length > 1 ? '.' + parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '') : ''
  const base = parts.join('.')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')                      // outros chars → -
    .replace(/-+/g, '-').replace(/^-|-$/g, '')           // collapse + trim
    || 'file'
  return base + ext
}

function inferDocType(mime, name) {
  const ext = (name?.split('.').pop() || '').toLowerCase()
  if (mime === 'application/pdf' || ext === 'pdf') return 'file'
  if (mime?.startsWith('text/')) return 'sop'  // markdown defaults a sop; user pode mudar
  if (mime?.startsWith('image/')) return 'file'
  if (mime?.startsWith('audio/') || mime?.startsWith('video/')) return 'call_recap'
  return 'file'
}

// ─── List items numa pasta ──────────────────────────────────────────────────
export function useContextDocs(orgId, folderPath = null) {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const fetchItems = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    let q = supabase.from('cookai_context_docs').select('*')
    // Org filter: específico ou NULL global
    if (orgId) {
      q = q.or(`organization_id.eq.${orgId},organization_id.is.null`)
    } else {
      q = q.is('organization_id', null)
    }
    // Folder filter — match exact path (NULL = root)
    if (folderPath) {
      q = q.eq('folder_path', folderPath)
    } else {
      q = q.is('folder_path', null)
    }
    q = q.order('is_folder', { ascending: false }).order('title', { ascending: true })
    const { data, error } = await q
    if (error) {
      setError(error.message)
      setItems([])
    } else {
      setItems(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [orgId, folderPath])

  useEffect(() => { fetchItems() }, [fetchItems])

  return { items, loading, error, refetch: fetchItems }
}

// ─── Full-text search ───────────────────────────────────────────────────────
export function useContextDocsSearch(orgId, query) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supabase || !query || query.trim().length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    setLoading(true)
    // Postgres FTS via .textSearch — busca em title + content + ocr_text via index gin
    let q = supabase.from('cookai_context_docs')
      .select('id, title, folder_path, file_name, type, mime_type, content, ocr_text')
      .eq('is_folder', false)
      .textSearch('title', query, { type: 'plain', config: 'portuguese' })
      .limit(20)
    if (orgId) q = q.or(`organization_id.eq.${orgId},organization_id.is.null`)

    q.then(({ data, error }) => {
      if (cancelled) return
      if (error) { setResults([]) } else { setResults(data ?? []) }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [orgId, query])

  return { results, loading }
}

// ─── CRUD ops ────────────────────────────────────────────────────────────────
export function useContextDocOps() {
  const addToast = useNotificationsStore(s => s.addToast)

  const createFolder = useCallback(async ({ orgId, folderPath, title }) => {
    const row = {
      organization_id: orgId ?? null,
      folder_path: folderPath ?? null,
      title,
      is_folder: true,
      type: 'folder',
    }
    const { data, error } = await supabase.from('cookai_context_docs').insert(row).select().single()
    if (error) {
      addToast({ type: 'error', message: `Criar pasta falhou: ${error.message}` })
      return null
    }
    addToast({ type: 'success', message: `Pasta "${title}" criada.` })
    return data
  }, [addToast])

  const uploadFile = useCallback(async ({ orgId, folderPath, file }) => {
    const provider = pickStorageProvider(file)
    const docType = inferDocType(file.type, file.name)
    const baseRow = {
      organization_id: orgId ?? null,
      folder_path: folderPath ?? null,
      title: file.name,
      file_name: file.name,
      is_folder: false,
      type: docType,
      mime_type: file.type || null,
      size_bytes: file.size,
      storage_provider: provider,
    }

    try {
      if (provider === 'inline') {
        const content = await file.text()
        const { data, error } = await supabase.from('cookai_context_docs')
          .insert({ ...baseRow, content }).select().single()
        if (error) throw error
        addToast({ type: 'success', message: `${file.name} guardado (inline).` })
        return data
      }

      if (provider === 'supabase') {
        const orgFolder = orgId || 'global'
        // Path sanitizado (ASCII-only) para evitar Storage InvalidKey
        const fpSanitized = folderPath
          ? folderPath.split('/').map(sanitizeStorageKey).join('/') + '/'
          : ''
        const safeName = sanitizeStorageKey(file.name)
        const storagePath = `${orgFolder}/${fpSanitized}${safeName}`
        const { error: upErr } = await supabase.storage.from(SUPABASE_BUCKET)
          .upload(storagePath, file, { upsert: true, contentType: file.type })
        if (upErr) throw upErr
        const willOcr = (file.type === 'application/pdf' || file.type?.startsWith('image/'))
        const { data, error } = await supabase.from('cookai_context_docs')
          .insert({ ...baseRow, storage_ref: storagePath, ocr_status: willOcr ? 'pending' : null })
          .select().single()
        if (error) throw error
        addToast({ type: 'success', message: `${file.name} guardado (${(file.size/1024).toFixed(1)} KB).` })
        return data
      }

      // drive — Sprint 2: integração real via Google Drive MCP
      addToast({ type: 'info', message: `${file.name} excede 50MB. Drive integration: Sprint 2.` })
      return null
    } catch (err) {
      addToast({ type: 'error', message: `Upload falhou: ${err?.message ?? err}` })
      return null
    }
  }, [addToast])

  const deleteDoc = useCallback(async (doc) => {
    // Limpa Storage primeiro se aplicável
    if (doc.storage_provider === 'supabase' && doc.storage_ref) {
      await supabase.storage.from(SUPABASE_BUCKET).remove([doc.storage_ref])
    }
    const { error } = await supabase.from('cookai_context_docs').delete().eq('id', doc.id)
    if (error) {
      addToast({ type: 'error', message: `Eliminar falhou: ${error.message}` })
      return false
    }
    addToast({ type: 'success', message: `${doc.title} eliminado.` })
    return true
  }, [addToast])

  const moveDoc = useCallback(async (docId, newFolderPath) => {
    const { error } = await supabase.from('cookai_context_docs')
      .update({ folder_path: newFolderPath ?? null }).eq('id', docId)
    if (error) {
      addToast({ type: 'error', message: `Mover falhou: ${error.message}` })
      return false
    }
    addToast({ type: 'success', message: 'Movido.' })
    return true
  }, [addToast])

  const getSignedUrl = useCallback(async (doc) => {
    if (doc.storage_provider !== 'supabase' || !doc.storage_ref) return null
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET)
      .createSignedUrl(doc.storage_ref, 3600)  // 1h
    if (error) return null
    return data?.signedUrl ?? null
  }, [])

  return { createFolder, uploadFile, deleteDoc, moveDoc, getSignedUrl }
}

// ─── Org context ────────────────────────────────────────────────────────────
export function useOrgs() {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.rpc('current_organization_ids').then(async ({ data: ids }) => {
      if (!ids || ids.length === 0) { setOrgs([]); setLoading(false); return }
      const { data } = await supabase.schema('core').from('organizations')
        .select('id, nome, tipo, ativo').in('id', ids).eq('ativo', true).order('nome')
      setOrgs(data ?? [])
      setLoading(false)
    })
  }, [])
  return { orgs, loading }
}
