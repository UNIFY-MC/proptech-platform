import { useState, useEffect, useRef, useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { supa } from '../supa'
import { useAuth } from '../lib/AuthContext'
import { compressImage } from '../lib/imageCompression'

const C = {
  forest:       '#0B3D2E',
  forestGrad:   'linear-gradient(145deg,#0B3D2E,#164E3A)',
  ink:          '#0A1620',
  slate:        '#6B7685',
  slateLight:   '#9CA3AF',
  border:       '#ECE9E2',
  bg:           '#FAFAF6',
  white:        '#FFFFFF',
  emerald:      '#10B981',
  emeraldDark:  '#059669',
  emeraldSoft:  '#D1FAE5',
  emeraldPale:  '#ECFDF5',
  amber:        '#F59E0B',
  amberSoft:    '#FEF3C7',
  red:          '#EF4444',
  redSoft:      '#FEE2E2',
  purple:       '#7C3AED',
  purplePale:   '#F5F3FF',
  purpleSoft:   '#DDD6FE',
}

const BUCKET = 'equipamentos-fotos'

const INPUT_STYLE = {
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 14,
  color: C.ink,
  background: C.white,
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'Outfit, sans-serif',
  outline: 'none',
}

const CATEGORIA_LABEL = {
  aquecimento:    'Aquecimento',
  climatizacao:   'Climatização',
  aguas_quentes:  'Águas quentes',
  canalizacao:    'Canalização',
  eletrica:       'Eléctrica',
  cobertura:      'Cobertura',
  estrutura:      'Estrutura',
  piscina:        'Piscina',
  solar:          'Solar',
  elevador:       'Elevador',
  gerador:        'Gerador',
  eletrodomestico:'Electrodoméstico',
  seguranca:      'Segurança',
  outros:         'Outros',
}

const CATEGORIA_EMOJI = {
  aquecimento: '🔥', climatizacao: '❄️', aguas_quentes: '🚿', canalizacao: '🚰',
  eletrica: '⚡', cobertura: '🏠', estrutura: '🏗️', piscina: '🏊',
  solar: '☀️', elevador: '🛗', gerador: '🔋', eletrodomestico: '🍽️',
  seguranca: '🔐', outros: '🔩',
}

const ESTADO_COLOR = {
  operacional:         C.emerald,
  avaria:              C.red,
  manutencao_pendente: C.amber,
  desativado:          C.slate,
}

const ESTADO_LABEL = {
  operacional:         'Operacional',
  avaria:              'Avaria',
  manutencao_pendente: 'Manutenção pendente',
  desativado:          'Desactivado',
}

const ISSUE_LABEL = {
  oxidacao:             'Oxidação',
  fuga_agua:            'Fuga de água',
  fuga_gas:             'Fuga de gás',
  fissura:              'Fissura',
  ferrugem:             'Ferrugem',
  manchas:              'Manchas',
  ruido_anormal:        'Ruído anormal',
  etiqueta_ilegivel:    'Etiqueta ilegível',
  instalacao_irregular: 'Instalação irregular',
}

function issueLabel(issue) {
  if (typeof issue === 'string' && issue.startsWith('outros:')) return issue.replace('outros:', '').trim()
  return ISSUE_LABEL[issue] || issue
}

function fmtDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtDateShort(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('pt-PT', { month: '2-digit', year: 'numeric' })
}

function fmtDateTime(d) {
  if (!d) return null
  return new Date(d).toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function capitalize(s) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EquipamentoFichaScreen({ equipamentoId, onBack }) {
  const { pessoa_id: pessoaId, memberships } = useAuth()
  const orgId = memberships?.[0]?.organization_id ?? null

  const [eq,                 setEq]                = useState(null)
  const [locNome,            setLocNome]           = useState(null)
  const [fotoUrl,            setFotoUrl]           = useState(null)
  const [faturaUrl,          setFaturaUrl]         = useState(null)
  const [fotosExtras,        setFotosExtras]       = useState([])
  const [fotosUrls,          setFotosUrls]         = useState({})
  const [loading,            setLoading]           = useState(true)
  const [error,              setError]             = useState(null)
  const [editMode,           setEditMode]          = useState(false)
  const [editDraft,          setEditDraft]         = useState({})
  const [divisoesSugeridas,  setDivisoesSugeridas] = useState([])
  const [saving,             setSaving]            = useState(false)
  const [faturaUploading,    setFaturaUploading]   = useState(false)
  const [fotoExtraUploading, setFotoExtraUploading] = useState(false)

  useEffect(() => {
    if (!equipamentoId) return
    load()
  }, [equipamentoId])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // Equipamento
      const { data: eqData, error: eqErr } = await supa
        .from('equipamentos')
        .select('*')
        .eq('id', equipamentoId)
        .maybeSingle()
      if (eqErr) throw eqErr
      if (!eqData) throw new Error('Equipamento não encontrado.')
      setEq(eqData)

      // Localização (nome apenas)
      if (eqData.localizacao_id) {
        const { data: locData } = await supa
          .from('localizacoes')
          .select('nome')
          .eq('id', eqData.localizacao_id)
          .maybeSingle()
        setLocNome(locData?.nome || null)
      }

      // Foto principal (signed URL)
      const fotoPath = eqData.dados_ia?.foto_principal_path
      if (fotoPath) {
        const { data: signed } = await supa.storage
          .from(BUCKET)
          .createSignedUrl(fotoPath, 300)
        if (signed?.signedUrl) setFotoUrl(signed.signedUrl)
      }

      // Fatura compra (signed URL)
      if (eqData.fatura_compra_path) {
        const { data: signedFatura } = await supa.storage
          .from(BUCKET)
          .createSignedUrl(eqData.fatura_compra_path, 3600)
        if (signedFatura?.signedUrl) setFaturaUrl(signedFatura.signedUrl)
      } else {
        setFaturaUrl(null)
      }

      // Fotos extras
      const { data: fotosData } = await supa
        .from('equipamento_fotos')
        .select('*')
        .eq('equipamento_id', equipamentoId)
        .order('created_at', { ascending: false })
      if (fotosData?.length) {
        setFotosExtras(fotosData)
        const signedAll = await Promise.all(
          fotosData.map(async (f) => {
            const { data: s } = await supa.storage.from(BUCKET).createSignedUrl(f.foto_path, 300)
            return { id: f.id, url: s?.signedUrl }
          })
        )
        setFotosUrls(Object.fromEntries(signedAll.filter(r => r.url).map(r => [r.id, r.url])))
      } else {
        setFotosExtras([])
        setFotosUrls({})
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar equipamento.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchDivisoes() {
    if (!eq?.localizacao_id) return
    const { data } = await supa
      .from('equipamentos')
      .select('localizacao_imovel')
      .eq('localizacao_id', eq.localizacao_id)
      .not('localizacao_imovel', 'is', null)
    if (data) {
      const unique = [...new Set(data.map(r => r.localizacao_imovel).filter(Boolean))]
      setDivisoesSugeridas(unique)
    }
  }

  function enterEditMode() {
    setEditDraft({
      marca:                    eq.marca || '',
      modelo:                   eq.modelo || '',
      numero_serie:             eq.numero_serie || '',
      localizacao_imovel:       eq.localizacao_imovel || '',
      data_instalacao:          eq.data_instalacao || '',
      data_instalacao_precisao: eq.dados_ia?.data_instalacao_precisao || '',
      data_compra:              eq.data_compra || '',
      data_compra_precisao:     eq.data_compra_precisao || '',
    })
    fetchDivisoes()
    setEditMode(true)
  }

  function cancelEdit() {
    setEditMode(false)
    setEditDraft({})
  }

  function draft(key, val) {
    setEditDraft(d => ({ ...d, [key]: val }))
  }

  async function guardar() {
    setSaving(true)
    try {
      const dadosIaUpdated = editDraft.data_instalacao_precisao !== (eq.dados_ia?.data_instalacao_precisao || '')
        ? { ...(eq.dados_ia || {}), data_instalacao_precisao: editDraft.data_instalacao_precisao || null }
        : null

      const updates = {
        marca:                editDraft.marca || null,
        modelo:               editDraft.modelo || null,
        numero_serie:         editDraft.numero_serie || null,
        localizacao_imovel:   editDraft.localizacao_imovel || null,
        data_instalacao:      editDraft.data_instalacao || null,
        data_compra:          editDraft.data_compra || null,
        data_compra_precisao: editDraft.data_compra_precisao || null,
        ...(dadosIaUpdated ? { dados_ia: dadosIaUpdated } : {}),
      }

      const { error: updateErr } = await supa
        .from('equipamentos')
        .update(updates)
        .eq('id', equipamentoId)

      if (updateErr) {
        if (updateErr.code === '42501') alert('Sem permissão para editar este equipamento.')
        else if (updateErr.code === '23505') alert('Já existe um equipamento com estes dados.')
        else alert(`Erro: ${updateErr.message}`)
        return
      }

      setEditMode(false)
      setEditDraft({})
      load()
    } catch (e) {
      alert(`Erro inesperado: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function uploadFatura(file) {
    if (!file || !pessoaId) return
    setFaturaUploading(true)
    try {
      const ext = file.name.split('.').pop().toLowerCase() || 'pdf'
      const path = `${pessoaId}/faturas/${equipamentoId}.${ext}`
      const { error: storageError } = await supa.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true })
      if (storageError) throw storageError

      const { error: updateError } = await supa
        .from('equipamentos')
        .update({ fatura_compra_path: path })
        .eq('id', equipamentoId)
      if (updateError) throw updateError

      const { data: signed } = await supa.storage.from(BUCKET).createSignedUrl(path, 3600)
      setFaturaUrl(signed?.signedUrl || null)
      setEq(prev => ({ ...prev, fatura_compra_path: path }))
    } catch (e) {
      alert(`Erro ao carregar fatura: ${e.message}`)
    } finally {
      setFaturaUploading(false)
    }
  }

  async function deleteFatura() {
    if (!confirm('Eliminar fatura de compra?')) return
    try {
      if (eq.fatura_compra_path) {
        await supa.storage.from(BUCKET).remove([eq.fatura_compra_path])
      }
      const { error } = await supa
        .from('equipamentos')
        .update({ fatura_compra_path: null })
        .eq('id', equipamentoId)
      if (error) throw error
      setFaturaUrl(null)
      setEq(prev => ({ ...prev, fatura_compra_path: null }))
    } catch (e) {
      alert(`Erro: ${e.message}`)
    }
  }

  async function uploadFotoExtra(file) {
    if (!file || !pessoaId || !orgId) return
    setFotoExtraUploading(true)
    try {
      const compressed = await compressImage(file)
      const ts = Date.now()
      const path = `${pessoaId}/extras/${equipamentoId}/${ts}.jpg`
      const { error: storageError } = await supa.storage
        .from(BUCKET)
        .upload(path, compressed.blob, { contentType: 'image/jpeg' })
      if (storageError) throw storageError

      const { error: insertError } = await supa
        .from('equipamento_fotos')
        .insert({
          equipamento_id:  equipamentoId,
          pessoa_id:       pessoaId,
          organization_id: orgId,
          foto_path:       path,
          origem:          'manual_user',
        })
      if (insertError) throw insertError
      load()
    } catch (e) {
      alert(`Erro ao adicionar foto: ${e.message}`)
    } finally {
      setFotoExtraUploading(false)
    }
  }

  async function deleteFoto(fotoId, fotoPath) {
    if (!confirm('Eliminar esta foto?')) return
    try {
      const { error: deleteError } = await supa
        .from('equipamento_fotos')
        .delete()
        .eq('id', fotoId)
      if (deleteError) throw deleteError
      await supa.storage.from(BUCKET).remove([fotoPath])
      load()
    } catch (e) {
      alert(`Erro: ${e.message}`)
    }
  }

  async function eliminarEquipamento() {
    const nome = [eq.marca, eq.modelo].filter(Boolean).join(' ') || eq.nome || 'este equipamento'
    if (!confirm(
      `Eliminar "${nome}"?\n\nEsta acção não pode ser desfeita. ` +
      `Todas as fotos, faturas e análises IA deste equipamento serão eliminadas.`
    )) return

    const { error: delErr } = await supa
      .from('equipamentos')
      .delete()
      .eq('id', equipamentoId)

    if (delErr) {
      alert(`Erro: ${delErr.message}`)
      return
    }
    onBack()
  }

  if (loading) return <LoadingView onBack={onBack} />
  if (error || !eq) return <ErrorView message={error} onBack={onBack} onRetry={load} />

  const dadosIa  = eq.dados_ia || {}
  const issues   = Array.isArray(dadosIa.issues_detectados) ? dadosIa.issues_detectados : []
  const history  = Array.isArray(dadosIa.agente_inspecao_history) ? dadosIa.agente_inspecao_history : []
  const emoji    = CATEGORIA_EMOJI[eq.categoria] || '🔩'
  const nomeDisplay = [eq.marca, eq.modelo].filter(Boolean).join(' ') || eq.nome

  const iaResumo = [
    dadosIa.confianca_identificacao ? `IA: ${dadosIa.confianca_identificacao} confiança` : null,
    dadosIa.idade_estimada_anos != null ? `~${dadosIa.idade_estimada_anos} anos` : null,
  ].filter(Boolean).join(' · ')

  const hasIA       = dadosIa.agente_inspecao_em || dadosIa.confianca_identificacao || dadosIa.idade_estimada_anos != null
  const hasDates    = eq.data_instalacao || eq.data_garantia_fim || eq.data_ultima_revisao || eq.data_proxima_revisao || eq.data_compra
  const hasHistorico = history.length > 0 || !!dadosIa.agente_inspecao_em
  const totalFotos  = (fotoUrl ? 1 : 0) + fotosExtras.length

  // Divisão dropdown helpers
  const divisaoOptions   = [...new Set([...divisoesSugeridas, eq.localizacao_imovel].filter(Boolean))]
  const divisaoIsCustom  = editDraft.localizacao_imovel && !divisoesSugeridas.includes(editDraft.localizacao_imovel)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Outfit, sans-serif', paddingBottom: 80 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ── */}
      <div style={{ background: C.forestGrad, color: '#fff', padding: '14px 16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span
            style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', cursor: 'pointer', padding: '4px 0' }}
            onClick={editMode ? cancelEdit : onBack}
          >
            {editMode ? '✕ cancelar' : '← Voltar'}
          </span>
          {editMode ? (
            <button
              onClick={guardar}
              disabled={saving}
              style={{
                background: saving ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.2)',
                border: '1px solid rgba(255,255,255,.4)',
                borderRadius: 8, padding: '5px 14px',
                color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              {saving ? 'A guardar…' : '✓ guardar'}
            </button>
          ) : (
            <button
              onClick={enterEditMode}
              style={{
                background: 'rgba(255,255,255,.15)', border: 'none',
                borderRadius: 8, padding: '5px 12px',
                color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              editar
            </button>
          )}
        </div>

        {/* Nome */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>{emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.2, marginBottom: 4 }}>
              {nomeDisplay}
            </div>

            {/* categoria · imóvel · divisão */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: editMode ? 8 : 6 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.8)' }}>
                {CATEGORIA_LABEL[eq.categoria] || eq.categoria}
              </span>
              {!editMode && locNome && (
                <>
                  <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 11 }}>·</span>
                  <span
                    style={{ fontSize: 12, color: 'rgba(255,255,255,.9)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,.3)' }}
                    onClick={onBack}
                    title="Ver imóvel"
                  >
                    {locNome}
                  </span>
                </>
              )}
              {!editMode && eq.localizacao_imovel && (
                <>
                  <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 11 }}>·</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.85)' }}>
                    📍 {capitalize(eq.localizacao_imovel)}
                  </span>
                </>
              )}
            </div>

            {/* Divisão — edit mode dropdown */}
            {editMode && (
              <div style={{ marginBottom: 6 }}>
                <select
                  value={divisaoIsCustom ? '__outra__' : (editDraft.localizacao_imovel || '')}
                  onChange={e => {
                    if (e.target.value === '__outra__') draft('localizacao_imovel', '')
                    else draft('localizacao_imovel', e.target.value)
                  }}
                  style={{
                    ...INPUT_STYLE,
                    background: 'rgba(255,255,255,.12)',
                    border: '1px solid rgba(255,255,255,.3)',
                    color: '#fff',
                    fontSize: 13,
                  }}
                >
                  <option value="" style={{ color: C.ink }}>— sem divisão —</option>
                  {divisaoOptions.map(s => (
                    <option key={s} value={s} style={{ color: C.ink }}>{capitalize(s)}</option>
                  ))}
                  <option value="__outra__" style={{ color: C.ink }}>Outra…</option>
                </select>
                {divisaoIsCustom && (
                  <input
                    type="text"
                    value={editDraft.localizacao_imovel}
                    onChange={e => draft('localizacao_imovel', e.target.value)}
                    placeholder="Nome da divisão (ex: cozinha)"
                    style={{
                      ...INPUT_STYLE,
                      marginTop: 6,
                      background: 'rgba(255,255,255,.12)',
                      border: '1px solid rgba(255,255,255,.3)',
                      color: '#fff',
                    }}
                  />
                )}
              </div>
            )}

            {/* IA resumo */}
            {iaResumo && !editMode && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)' }}>{iaResumo}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bloco Análise IA ── */}
      {hasIA && <AnaliseIABlock dadosIa={dadosIa} history={history} />}

      {/* ── Análise do agente IA (markdown) ── */}
      <MarkdownAnaliseBlock markdown={eq.ai_resumo_markdown} updatedAt={eq.ai_resumo_updated_at} />

      {/* ── Issues ── */}
      {issues.length > 0 && (
        <Section title={`⚠️ Issues detectados (${issues.length})`} accent={C.amber}>
          {issues.map((issue, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0',
              borderBottom: i < issues.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <span style={{ fontSize: 13 }}>•</span>
              <span style={{ fontSize: 14, color: C.ink }}>{issueLabel(issue)}</span>
            </div>
          ))}
        </Section>
      )}

      {/* ── Ficha técnica ── */}
      <Section title="Ficha técnica">
        {editMode ? (
          <>
            <EditInputRow label="Marca"    value={editDraft.marca}        onChange={v => draft('marca', v)} />
            <EditInputRow label="Modelo"   value={editDraft.modelo}       onChange={v => draft('modelo', v)} />
            <EditInputRow label="Nº série" value={editDraft.numero_serie} onChange={v => draft('numero_serie', v)} />
          </>
        ) : (
          <>
            <Row label="Marca"    value={eq.marca} />
            <Row label="Modelo"   value={eq.modelo} />
            <Row label="Nº série" value={eq.numero_serie} />
          </>
        )}
        {/* locNome removido daqui — está no header */}
        {!editMode && eq.estado && (
          <Row
            label="Estado"
            value={ESTADO_LABEL[eq.estado] || capitalize(eq.estado)}
            color={ESTADO_COLOR[eq.estado]}
          />
        )}
        {!editMode && eq.classe_energetica && <Row label="Classe energética" value={eq.classe_energetica} />}
      </Section>

      {/* ── Datas ── */}
      {(hasDates || editMode) && (
        <Section title="Datas">
          {editMode ? (
            <>
              <EditDateRow
                label="Instalação"
                dateValue={editDraft.data_instalacao}
                onDateChange={v => draft('data_instalacao', v)}
                precisaoValue={editDraft.data_instalacao_precisao}
                onPrecisaoChange={v => draft('data_instalacao_precisao', v)}
              />
              <EditDateRow
                label="Compra"
                dateValue={editDraft.data_compra}
                onDateChange={v => draft('data_compra', v)}
                precisaoValue={editDraft.data_compra_precisao}
                onPrecisaoChange={v => draft('data_compra_precisao', v)}
              />
            </>
          ) : (
            <>
              {eq.data_instalacao && (
                <Row
                  label="Instalação"
                  value={fmtDateShort(eq.data_instalacao)}
                  note={dadosIa.data_instalacao_precisao === 'year_only' ? '(só ano)' : dadosIa.data_instalacao_precisao === 'estimated' ? '(estimado)' : null}
                />
              )}
              {eq.data_compra && (
                <Row
                  label="Compra"
                  value={fmtDateShort(eq.data_compra)}
                  note={eq.data_compra_precisao === 'estimated' ? '(estimado)' : eq.data_compra_precisao === 'year_only' ? '(só ano)' : null}
                />
              )}
              {eq.data_garantia_fim && (
                <Row
                  label="Garantia até"
                  value={fmtDate(eq.data_garantia_fim)}
                  color={new Date(eq.data_garantia_fim) < new Date() ? C.red : undefined}
                />
              )}
              {eq.data_ultima_revisao  && <Row label="Última revisão"  value={fmtDate(eq.data_ultima_revisao)} />}
              {eq.data_proxima_revisao && <Row label="Próxima revisão" value={fmtDate(eq.data_proxima_revisao)} />}
            </>
          )}
        </Section>
      )}

      {/* ── Notas ── */}
      {eq.notas && !editMode && (
        <Section title="Notas">
          <p style={{ margin: '4px 0 0', fontSize: 14, color: C.ink, lineHeight: 1.55 }}>{eq.notas}</p>
        </Section>
      )}

      {/* ── Fatura de compra ── */}
      {!editMode && (
        <FaturaBlock
          faturaCaminho={eq.fatura_compra_path}
          faturaUrl={faturaUrl}
          uploading={faturaUploading}
          onUpload={uploadFatura}
          onDelete={deleteFatura}
        />
      )}

      {/* ── Análises IA (histórico) ── */}
      {hasHistorico && !editMode && (
        <HistoricoBlock dadosIa={dadosIa} history={history} eq={eq} />
      )}

      {/* ── Manutenções e reparações (placeholder) ── */}
      {!editMode && <ManutencaoPlaceholder />}

      {/* ── Fotos (collapsible, agora funcional) ── */}
      {!editMode && (
        <FotosCollapsible
          fotoUrl={fotoUrl}
          fotosExtras={fotosExtras}
          fotosUrls={fotosUrls}
          nomeDisplay={nomeDisplay}
          uploading={fotoExtraUploading}
          onUpload={uploadFotoExtra}
          onDeleteFoto={deleteFoto}
          totalCount={totalFotos}
        />
      )}

      {/* ── Documentos do equipamento (placeholder) ── */}
      {!editMode && <DocumentosPlaceholder />}

      {/* ── Acções ── */}
      {!editMode && (
        <div style={{ padding: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            disabled
            title="Disponível em breve"
            style={{
              opacity: 0.4, cursor: 'not-allowed',
              background: C.forest, color: '#fff', border: 'none',
              borderRadius: 12, padding: '14px 20px',
              fontSize: 15, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            🔧 Pedir manutenção
          </button>
          <button
            onClick={eliminarEquipamento}
            style={{
              background: C.white, color: C.red, border: `1px solid ${C.red}40`,
              borderRadius: 12, padding: '12px 20px',
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            🗑️ Eliminar equipamento
          </button>
        </div>
      )}
    </div>
  )
}

// ── FaturaBlock ───────────────────────────────────────────────────────────────

function FaturaBlock({ faturaCaminho, faturaUrl, uploading, onUpload, onDelete }) {
  const fileRef = useRef(null)
  const hasFatura = !!faturaCaminho

  return (
    <div style={{ background: C.white, margin: '12px 16px', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.slate, fontFamily: 'JetBrains Mono, monospace' }}>
          📎 Fatura de compra
        </span>
      </div>
      <div style={{ padding: '10px 16px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {hasFatura ? (
          <>
            <a
              href={faturaUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.emeraldPale, color: C.emeraldDark, borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}
            >
              📎 ver fatura
            </a>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 14px', fontSize: 13, color: C.slate, cursor: uploading ? 'wait' : 'pointer' }}
            >
              ↻ substituir
            </button>
            <button
              onClick={onDelete}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${C.redSoft}`, borderRadius: 8, padding: '7px 12px', fontSize: 13, color: C.red, cursor: 'pointer' }}
            >
              🗑 remover
            </button>
          </>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.emeraldPale, color: C.emeraldDark, border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1 }}
          >
            {uploading ? '⏳ A carregar…' : '📎 carregar fatura'}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={e => {
            if (e.target.files?.[0]) onUpload(e.target.files[0])
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

// ── EditInputRow ──────────────────────────────────────────────────────────────

function EditInputRow({ label, value, onChange, placeholder }) {
  return (
    <div style={{ padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, color: C.slate, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || label}
        style={INPUT_STYLE}
      />
    </div>
  )
}

// ── EditDateRow ───────────────────────────────────────────────────────────────

function EditDateRow({ label, dateValue, onDateChange, precisaoValue, onPrecisaoChange }) {
  const isEstimated = precisaoValue === 'estimated'
  return (
    <div style={{ padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, color: C.slate, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <input
        type="date"
        value={dateValue || ''}
        onChange={e => onDateChange(e.target.value)}
        disabled={isEstimated}
        style={{ ...INPUT_STYLE, opacity: isEstimated ? 0.35 : 1, cursor: isEstimated ? 'not-allowed' : undefined }}
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={isEstimated}
          onChange={e => {
            if (e.target.checked) { onPrecisaoChange('estimated'); onDateChange('') }
            else onPrecisaoChange('exact')
          }}
          style={{ accentColor: C.forest }}
        />
        <span style={{ fontSize: 12, color: C.slate }}>Não tenho a certeza da data</span>
      </label>
      {isEstimated && (
        <div style={{ fontSize: 11, color: C.amber, marginTop: 3 }}>Ficará marcado como estimado</div>
      )}
    </div>
  )
}

// ── CSS prose-content (injectado uma vez) ────────────────────────────────────

const PROSE_CSS = `
.prose-content h1,.prose-content h2,.prose-content h3{
  font-size:14px;font-weight:600;color:#0A1620;margin:10px 0 4px;line-height:1.3;
}
.prose-content h1{font-size:15px;}
.prose-content p{font-size:13px;color:#374151;line-height:1.6;margin:0 0 8px;}
.prose-content ul,.prose-content ol{font-size:13px;color:#374151;line-height:1.6;margin:0 0 8px;padding-left:18px;}
.prose-content li{margin-bottom:3px;}
.prose-content strong{font-weight:600;color:#0A1620;}
.prose-content em{font-style:italic;}
.prose-content table{font-size:12px;border-collapse:collapse;width:100%;margin-bottom:10px;}
.prose-content th{background:#F3F4F6;padding:5px 8px;text-align:left;font-weight:600;color:#374151;}
.prose-content td{padding:5px 8px;border-top:1px solid #E5E7EB;color:#374151;}
.prose-content hr{border:none;border-top:1px solid #E5E7EB;margin:10px 0;}
.prose-content a{color:#7C3AED;text-decoration:none;}
.prose-content blockquote{border-left:3px solid #DDD6FE;padding-left:10px;color:#6B7280;font-style:italic;margin:6px 0;}
`

let proseStyleInjected = false

// ── MarkdownAnaliseBlock ──────────────────────────────────────────────────────

function MarkdownAnaliseBlock({ markdown, updatedAt }) {
  const [open, setOpen] = useState(true)

  const sanitizedHtml = useMemo(() => {
    if (!markdown) return null
    const rawHtml = marked.parse(markdown, { breaks: true, gfm: true })
    return DOMPurify.sanitize(rawHtml)
  }, [markdown])

  if (!sanitizedHtml) return null

  if (!proseStyleInjected && typeof document !== 'undefined') {
    const style = document.createElement('style')
    style.textContent = PROSE_CSS
    document.head.appendChild(style)
    proseStyleInjected = true
  }

  return (
    <div style={{ margin: '12px 16px', borderRadius: 12, background: C.purplePale, border: `1px solid ${C.purpleSoft}`, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.purple, fontFamily: 'JetBrains Mono, monospace' }}>
          ✨ Análise do agente IA
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {updatedAt && <span style={{ fontSize: 10, color: C.slateLight }}>{fmtDate(updatedAt)}</span>}
          <span style={{ fontSize: 11, color: C.slateLight }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div
          className="prose-content"
          style={{ padding: '0 16px 14px', borderTop: `1px solid ${C.purpleSoft}` }}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      )}
    </div>
  )
}

// ── Bloco Análise IA ─────────────────────────────────────────────────────────

function AnaliseIABlock({ dadosIa, history }) {
  const totalInspecoes = history.length + (dadosIa.agente_inspecao_em ? 1 : 0)
  return (
    <div style={{ margin: '12px 16px', borderRadius: 12, background: C.purplePale, border: `1px solid ${C.purpleSoft}`, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${C.purpleSoft}` }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.purple, fontFamily: 'JetBrains Mono, monospace' }}>
          ✨ Análise IA
        </span>
      </div>
      <div style={{ padding: '4px 16px 10px' }}>
        {dadosIa.idade_estimada_anos != null && (
          <IARow label="Idade estimada" value={`~${dadosIa.idade_estimada_anos} anos`} note="(visual)" />
        )}
        {dadosIa.confianca_identificacao && (
          <IARow label="Confiança" value={dadosIa.confianca_identificacao} />
        )}
        {dadosIa.agente_inspecao_em && (
          <IARow label="Última análise" value={fmtDateTime(dadosIa.agente_inspecao_em)} />
        )}
        {dadosIa.agente_inspecao_session_id && (
          <IARow label="Sessão" value={dadosIa.agente_inspecao_session_id.slice(0, 8) + '…'} />
        )}
        {totalInspecoes > 1 && (
          <IARow label="Total análises" value={String(totalInspecoes)} />
        )}
      </div>
    </div>
  )
}

function IARow({ label, value, note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '7px 0', borderBottom: `1px solid ${C.purpleSoft}` }}>
      <span style={{ fontSize: 12, color: C.purple, minWidth: 130, flexShrink: 0, opacity: 0.8 }}>{label}</span>
      <span style={{ fontSize: 14, color: C.ink, fontWeight: 500 }}>
        {value}
        {note && <span style={{ fontSize: 11, color: C.slateLight, marginLeft: 6 }}>{note}</span>}
      </span>
    </div>
  )
}

// ── Análises IA (histórico) ──────────────────────────────────────────────────

function HistoricoBlock({ dadosIa, history, eq }) {
  const total = history.length + (dadosIa.agente_inspecao_em ? 1 : 0)

  const sessions = []
  if (dadosIa.agente_inspecao_em) {
    sessions.push({
      em: dadosIa.agente_inspecao_em,
      session_id: dadosIa.agente_inspecao_session_id,
      confianca: dadosIa.confianca_identificacao,
      current: true,
    })
  }
  for (let i = history.length - 1; i >= 0; i--) {
    sessions.push({ ...history[i], current: false })
  }

  function sessionSubline(s) {
    if (s.current) {
      const id = [eq?.marca, eq?.modelo].filter(Boolean).join(' ')
      const conf = s.confianca ? ` · confiança: ${s.confianca}` : ''
      return id ? id + conf : s.confianca ? `confiança: ${s.confianca}` : '—'
    }
    return 'Re-verificação'
  }

  return (
    <Section title={`✨ Análises IA (${total})`}>
      {sessions.map((s, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '8px 0',
          borderBottom: i < sessions.length - 1 ? `1px solid ${C.border}` : 'none',
        }}>
          <span style={{ fontSize: 13, marginTop: 1 }}>✨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>
              {fmtDateTime(s.em)}
              {s.current && <span style={{ marginLeft: 6, fontSize: 10, background: C.emeraldSoft, color: C.emeraldDark, borderRadius: 4, padding: '1px 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>actual</span>}
            </div>
            <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>
              {sessionSubline(s)}
            </div>
          </div>
        </div>
      ))}
    </Section>
  )
}

// ── Manutenções e reparações (placeholder) ───────────────────────────────────

function ManutencaoPlaceholder() {
  return (
    <div style={{ background: C.white, margin: '12px 16px', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.slate, fontFamily: 'JetBrains Mono, monospace' }}>
          🔧 Manutenções e reparações (0)
        </span>
      </div>
      <div style={{ padding: '10px 16px 12px' }}>
        <p style={{ fontSize: 13, color: C.slate, fontStyle: 'italic', margin: '0 0 6px' }}>
          Sem registos de intervenções profissionais.
        </p>
        <p style={{ fontSize: 12, color: C.slateLight, margin: 0, lineHeight: 1.5 }}>
          Quando solicitar manutenção via "Pedir manutenção", os registos aparecerão aqui.
        </p>
      </div>
    </div>
  )
}

// ── Documentos do equipamento (placeholder) ──────────────────────────────────

function DocumentosPlaceholder() {
  return (
    <div style={{ background: C.white, margin: '12px 16px', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.slate, fontFamily: 'JetBrains Mono, monospace' }}>
          📁 Documentos do equipamento (0)
        </span>
      </div>
      <div style={{ padding: '10px 16px 12px' }}>
        <p style={{ fontSize: 13, color: C.slate, fontStyle: 'italic', margin: '0 0 10px' }}>
          Sem manuais, garantias ou fichas técnicas guardadas.
        </p>
        <button
          disabled
          title="Disponível em breve"
          style={{
            opacity: 0.4, cursor: 'not-allowed',
            background: 'none', border: `1px dashed ${C.border}`,
            borderRadius: 8, padding: '7px 14px',
            fontSize: 12, color: C.slate,
          }}
        >
          + Adicionar documento (em breve)
        </button>
      </div>
    </div>
  )
}

// ── Fotos collapsible (agora funcional) ──────────────────────────────────────

function FotosCollapsible({ fotoUrl, fotosExtras, fotosUrls, nomeDisplay, uploading, onUpload, onDeleteFoto, totalCount }) {
  const [open, setOpen] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const fileRef = useRef(null)

  return (
    <>
      <div style={{ background: C.white, margin: '12px 16px', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.slate, fontFamily: 'JetBrains Mono, monospace' }}>
            📷 Fotos ({totalCount})
          </span>
          <span style={{ fontSize: 12, color: C.slateLight }}>{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {/* Foto principal (agente IA) */}
              {fotoUrl && (
                <div style={{ position: 'relative' }}>
                  <img
                    src={fotoUrl}
                    alt={nomeDisplay}
                    style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}`, cursor: 'pointer' }}
                    onClick={() => setLightbox(fotoUrl)}
                  />
                  <span style={{ position: 'absolute', bottom: 3, left: 3, fontSize: 8, background: 'rgba(0,0,0,.55)', color: '#fff', borderRadius: 3, padding: '1px 4px', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.04em' }}>IA</span>
                </div>
              )}
              {/* Fotos extras */}
              {fotosExtras.map(f => (
                <div key={f.id} style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={fotosUrls[f.id] || ''}
                    alt="foto extra"
                    style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}`, cursor: fotosUrls[f.id] ? 'pointer' : 'default', background: C.bg, display: 'block' }}
                    onClick={() => fotosUrls[f.id] && setLightbox(fotosUrls[f.id])}
                  />
                  <button
                    onClick={e => { e.stopPropagation(); onDeleteFoto(f.id, f.foto_path) }}
                    style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(239,68,68,.85)', border: 'none', color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: '18px', textAlign: 'center', cursor: 'pointer', padding: 0 }}
                    title="Eliminar foto"
                  >×</button>
                  {f.origem === 'agente_ia' && (
                    <span style={{ position: 'absolute', bottom: 3, left: 3, fontSize: 8, background: 'rgba(0,0,0,.55)', color: '#fff', borderRadius: 3, padding: '1px 4px', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>IA</span>
                  )}
                </div>
              ))}
              {/* Botão adicionar foto */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  width: 76, height: 76,
                  border: `1.5px dashed ${C.border}`, borderRadius: 8,
                  background: 'none', cursor: uploading ? 'wait' : 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                  opacity: uploading ? 0.6 : 1,
                }}
              >
                <span style={{ fontSize: 18, color: C.slateLight }}>{uploading ? '⏳' : '+'}</span>
                <span style={{ fontSize: 9, color: C.slateLight }}>foto</span>
              </button>
            </div>
            {totalCount === 0 && (
              <p style={{ fontSize: 12, color: C.slateLight, margin: '6px 0 0' }}>Sem fotos além da análise IA.</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files?.[0]) onUpload(e.target.files[0])
                e.target.value = ''
              }}
            />
          </div>
        )}
      </div>

      {/* Lightbox simples */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, cursor: 'zoom-out', padding: 16,
          }}
        >
          <img
            src={lightbox}
            alt="foto"
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }}
          />
        </div>
      )}
    </>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Section({ title, children, accent }) {
  const borderColor = accent ? accent + '40' : C.border
  const titleColor  = accent ? accent : C.slate
  return (
    <div style={{ background: C.white, margin: '12px 16px', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${borderColor}` }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: titleColor, fontFamily: 'JetBrains Mono, monospace' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '4px 16px 10px' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, note, color }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: C.slate, minWidth: 115, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, color: color || C.ink, fontWeight: color ? 600 : 400 }}>
        {value}
        {note && <span style={{ fontSize: 11, color: C.slateLight, marginLeft: 6 }}>{note}</span>}
      </span>
    </div>
  )
}

// ── Loading / Error views ─────────────────────────────────────────────────────

function LoadingView({ onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Outfit, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ background: C.forestGrad, color: '#fff', padding: '14px 16px 16px' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', cursor: 'pointer' }} onClick={onBack}>← Voltar</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.emerald}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 14, color: C.slate }}>A carregar equipamento…</span>
      </div>
    </div>
  )
}

function ErrorView({ message, onBack, onRetry }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ background: C.forestGrad, color: '#fff', padding: '14px 16px 16px' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', cursor: 'pointer' }} onClick={onBack}>← Voltar</span>
      </div>
      <div style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ color: C.red, fontSize: 14, marginBottom: 20 }}>{message || 'Erro desconhecido.'}</p>
        <button
          onClick={onRetry}
          style={{ background: C.forest, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 }}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
