// src/CWishlist.jsx — Wishlist submit agrupado por categoria (débito 3a.4)
import React, { useState, useEffect } from 'react'
import { C } from './constants'
import { Card } from './components/ui'
import { supa } from './supa'

/* ── REST helpers (public schema) ── */
const SB_URL = 'https://hkmvszkpxjbxmnixzqbl.supabase.co'
const SB_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || ''
const sbH = (token) => ({
  'apikey': SB_KEY,
  'Authorization': `Bearer ${token || SB_KEY}`,
  'Content-Type': 'application/json',
})
async function sbGet(table, filter = '', token) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}${filter}`, { headers: sbH(token) })
    return r.ok ? r.json() : null
  } catch { return null }
}
async function sbSave(table, data, token) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...sbH(token), 'Prefer': 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify(data),
    })
    if (!r.ok) { console.warn(`[sbSave ${table}]`, r.status, await r.text().catch(() => '')); return null }
    return r.json()
  } catch (e) { console.warn(`[sbSave ${table}]`, e); return null }
}
async function sbUpdate(table, filter, data, token) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}${filter}`, {
      method: 'PATCH',
      headers: { ...sbH(token), 'Prefer': 'return=representation' },
      body: JSON.stringify(data),
    })
    if (!r.ok) { console.warn(`[sbUpdate ${table}]`, r.status, await r.text().catch(() => '')); return null }
    return r.json()
  } catch (e) { console.warn(`[sbUpdate ${table}]`, e); return null }
}
async function sbDelete(table, filter, token) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}${filter}`, {
      method: 'DELETE',
      headers: sbH(token),
    })
    if (!r.ok) { console.warn(`[sbDelete ${table}]`, r.status, await r.text().catch(() => '')); return false }
    return true
  } catch (e) { console.warn(`[sbDelete ${table}]`, e); return false }
}

/* ── Helpers de lista ── */
async function sbGetOrCreateListaAberta(uid, token) {
  const existing = await sbGet('listas_cliente', `?cliente_id=eq.${uid}&estado=eq.aberta&select=*`, token)
  if (Array.isArray(existing) && existing.length > 0) return existing[0]
  const created = await sbSave('listas_cliente', { cliente_id: uid, estado: 'aberta' }, token)
  const row = Array.isArray(created) ? created[0] : created
  return row || null
}

/* ── Mapa categoria → prefixo do serviço personalizado ── */
const CATEGORY_PREFIX = {
  limpeza: 'cln', manutencao: 'mnt', jardim: 'jar', piscina: 'pol',
  pintura: 'pnt', eletrica: 'elc', canalizacao: 'can', pos_obra: 'pos',
}

const CATNAMES = {
  limpeza: 'Limpeza', manutencao: 'Manutenção', jardim: 'Jardim', piscina: 'Piscina',
  pintura: 'Pintura', eletrica: 'Eléctrica', canalizacao: 'Canalização', pos_obra: 'Pós-obra', outros: 'Outros',
}

export default function CWishlist({ authUser, onBack, onCreateNew, onSubmitted, setOrdens, ScheduleModal }) {
  const [lista, setLista] = useState(null)
  const [items, setItems] = useState(null)
  const [moradas, setMoradas] = useState(null)
  const [selectedMoradaId, setSelectedMoradaId] = useState(null)
  const [scheduleMode, setScheduleMode] = useState('imediato')
  const [selectedSlots, setSelectedSlots] = useState([])
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rates, setRates] = useState({})
  const [horasPorCat, setHorasPorCat] = useState({})
  const uid = authUser?.user?.id

  const refetch = async () => {
    if (!uid) return
    const l = await sbGetOrCreateListaAberta(uid, authUser?.token)
    setLista(l)
    if (l) {
      const rows = await sbGet('lista_items', `?lista_id=eq.${l.id}&order=created_at.asc`, authUser?.token)
      setItems(rows || [])
    } else {
      setItems([])
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refetch() }, [uid])

  useEffect(() => {
    if (!uid) return
    let active = true
    sbGet('cliente_moradas', `?cliente_id=eq.${uid}&order=is_default.desc,created_at.asc`, authUser?.token).then(rows => {
      if (!active) return
      const list = rows || []
      setMoradas(list)
      if (list.length > 0) {
        const def = list.find(m => m.is_default) || list[0]
        setSelectedMoradaId(def.id)
      }
    })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  useEffect(() => {
    let active = true
    sbGet('servicos', '?id=like.personalizado-*&select=id,preco', authUser?.token).then(rows => {
      if (!active) return
      const map = {}
      ;(rows || []).forEach(r => {
        const prefix = String(r.id).replace('personalizado-', '')
        const entry = Object.entries(CATEGORY_PREFIX).find(([, v]) => v === prefix)
        if (entry) map[entry[0]] = Number(r.preco) || 0
      })
      setRates(map)
    })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.token])

  const remove = async (item) => {
    const ok = await sbDelete('lista_items', `?id=eq.${item.id}`, authUser?.token)
    if (!ok) { alert('Erro ao remover.'); return }
    setItems(p => (p || []).filter(x => x.id !== item.id))
  }

  const byCategoria = (items || []).reduce((acc, it) => {
    const k = it.categoria_id || 'outros'
    if (!acc[k]) acc[k] = []
    acc[k].push(it)
    return acc
  }, {})
  const nCategorias = Object.keys(byCategoria).length
  const nTarefas = (items || []).length
  const moradaSelected = (moradas || []).find(m => m.id === selectedMoradaId)

  useEffect(() => {
    if (!items) return
    setHorasPorCat(prev => {
      const next = { ...prev }
      Object.entries(byCategoria).forEach(([cat, arr]) => {
        if (next[cat] == null) {
          const sum = arr.reduce((s, i) => s + Number(i.horas_estimadas || 1), 0)
          next[cat] = Math.max(1, Math.round(sum))
        }
      })
      Object.keys(next).forEach(k => { if (!byCategoria[k]) delete next[k] })
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const canSubmit = nTarefas > 0 && !!moradaSelected &&
    (scheduleMode === 'imediato' || (scheduleMode === 'agendar' && selectedSlots.length > 0))

  /* ── submitWishlist — débito 3a.4 ── */
  async function submitWishlist() {
    if (!canSubmit || !uid || !lista) return
    setSubmitting(true)

    const nomeItem = it => {
      if (it.tipo === 'fixo') return it.descricao || it.servico_id || 'Serviço'
      const d = (it.descricao || '').slice(0, 200)
      return d + ((it.descricao || '').length > 200 ? '…' : '')
    }

    // 1. Criar 1 ordem por categoria com estado pendente_orcamento
    const createdRows = []
    const results = []
    for (const cat of Object.keys(byCategoria)) {
      const group = byCategoria[cat]
      const horas = Number(horasPorCat[cat] || 1)
      const descricao =
        `Lista de tarefas — ${CATNAMES[cat] || cat}\n` +
        `${horas}h estimadas · orçamento a confirmar pelo técnico.\n\n` +
        `Tarefas:\n` +
        group.map(it => `• ${nomeItem(it)}`).join('\n')
      const servicoId = CATEGORY_PREFIX[cat] ? `personalizado-${CATEGORY_PREFIX[cat]}` : null
      const firstSlot = (scheduleMode === 'agendar' && selectedSlots[0]) || null
      const dataIso = firstSlot?.dayDate ? (() => {
        try {
          const [d, m, y] = firstSlot.dayDate.split(' ')
          const MM = { jan:'01',fev:'02',mar:'03',abr:'04',mai:'05',jun:'06',jul:'07',ago:'08',set:'09',out:'10',nov:'11',dez:'12' }
          return `${y}-${MM[m.toLowerCase()]}-${String(d).padStart(2, '0')}`
        } catch { return null }
      })() : null

      const payload = {
        servico_id:              servicoId,
        cliente_id:              uid,
        prestador_id:            null,
        estado:                  'pendente_orcamento',
        morada:                  moradaSelected.morada,
        cod_postal:              moradaSelected.cp || null,
        cidade:                  moradaSelected.cidade || null,
        data_agendada:           dataIso,
        hora_agendada:           firstSlot?.time || null,
        schedule_mode:           scheduleMode,
        slots_flexiveis:         scheduleMode === 'agendar' ? selectedSlots : [],
        valor_cobrado:           null,
        taxa_pct:                null,
        valor_plataforma:        null,
        valor_prestador:         null,
        is_personalizado:        true,
        descricao_personalizada: descricao,
        horas_estimadas:         horas,
        notas:                   `Lista agrupada: ${group.length} tarefa${group.length === 1 ? '' : 's'} em ${CATNAMES[cat] || cat}.`,
      }
      const r = await sbSave('ordens', payload, authUser?.token)
      if (!r) { console.warn('[wishlist] falha ao criar ordem para cat', cat); results.push({ cat, ok: false }); continue }
      const row = Array.isArray(r) ? r[0] : r
      if (row) createdRows.push({ row, cat, horas, group })
      results.push({ cat, ok: true })
    }

    const successCount = results.filter(r => r.ok).length
    if (successCount === 0) {
      alert('Erro: nenhum pedido foi criado. Ver consola.')
      setSubmitting(false)
      return
    }

    // Sincronizar estado local para CPedidos/CHome mostrarem imediatamente
    if (setOrdens && createdRows.length > 0) {
      const nomeCliente = authUser?.nome || 'Cliente'
      const nowIso = new Date().toISOString()
      const locals = createdRows.map(({ row, cat, horas }) => ({
        id:                      row.id ? `bd${row.id.slice(0, 8)}` : `ot${Date.now()}-${cat}`,
        bd_id:                   row.id || null,
        sid:                     null,
        cli:                     nomeCliente,
        cliId:                   uid,
        morada:                  row.morada,
        cp:                      row.cod_postal || '',
        data:                    scheduleMode === 'imediato' ? 'Imediato' : (selectedSlots[0] ? `${selectedSlots[0].dayLabel} ${selectedSlots[0].time}` : 'Em breve'),
        hora:                    selectedSlots[0]?.time || '—',
        tid:                     null,
        st:                      'pendente_orcamento',
        fotos:                   [],
        ass:                     false,
        aval:                    null,
        notas:                   row.notas,
        val:                     null,
        taxa:                    null,
        dt_pedido:               new Date().toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        dt_pedido_iso:           nowIso,
        pago:                    false,
        nome:                    'Serviço agrupado',
        numero_sequencial:       row.numero_sequencial,
        servico_id:              row.servico_id,
        servico_nome:            'Serviço agrupado',
        categoria_id:            cat,
        is_personalizado:        true,
        valor_cobrado:           null,
        schedule_mode:           row.schedule_mode,
        data_agendada:           row.data_agendada,
        hora_agendada:           row.hora_agendada,
        descricao_personalizada: row.descricao_personalizada,
        horas_estimadas:         horas,
        created_at:              row.created_at || nowIso,
      }))
      setOrdens(prev => [...locals, ...prev])
    }

    // 2. Marcar lista como submetida
    await sbUpdate('listas_cliente', `?id=eq.${lista.id}`, {
      estado:       'submetida',
      submetida_at: new Date().toISOString(),
      morada_id:    moradaSelected.id,
    }, authUser?.token)

    // 3. Apagar lista_items (lista fechada — nova lista começa limpa)
    await sbDelete('lista_items', `?lista_id=eq.${lista.id}`, authUser?.token)

    // 4. +100 pontos — pontos_historico (schema v5_manutencao)
    // TODO(mario): criar tabela pontos_historico antes do go-live (ver MASTER.md §9.2)
    try {
      await supa.from('pontos_historico').insert({
        pessoa_id: uid,
        pontos:    100,
        motivo:    'submit_wishlist',
        ref_tipo:  'wishlist',
      })
    } catch (e) {
      console.warn('[wishlist] pontos_historico insert falhou (tabela pode não existir ainda):', e)
    }

    setSubmitting(false)
    alert(`✓ ${successCount} pedido${successCount === 1 ? '' : 's'} de orçamento submetido${successCount === 1 ? '' : 's'}.`)
    if (onSubmitted) onSubmitted()
    else onBack?.()
  }

  return (
    <div style={{ minHeight: '100vh', background: C.mist, paddingBottom: 120 }}>
      <div style={{ background: C.white, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.navy }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>A minha lista</div>
          <div style={{ fontSize: 10, color: C.slate }}>{items?.length || 0} tarefa{(items?.length || 0) === 1 ? '' : 's'} · orçamento no final</div>
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {items === null && <div className="sk" style={{ height: 80, marginBottom: 8 }} />}

        {items && items.length === 0 && (
          <div style={{ padding: '32px 20px', textAlign: 'center', background: C.white, borderRadius: 14, border: `1px dashed ${C.border}` }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Sem items na lista</div>
            <div style={{ fontSize: 12, color: C.slate, lineHeight: 1.5, maxWidth: 280, margin: '0 auto 14px' }}>
              Vá acumulando coisas para fazer em casa — sempre que estiver num serviço ou no personalizado, toque em <b>+ Lista</b>. Submete tudo depois de uma só vez.
            </div>
            <button onClick={onCreateNew} style={{ background: C.g, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Explorar serviços</button>
          </div>
        )}

        {items && items.map(it => {
          const nome = (it.descricao && it.tipo === 'fixo') ? it.descricao
            : it.tipo === 'fixo' ? (it.servico_id || 'Serviço')
            : (it.descricao ? it.descricao.slice(0, 60) + (it.descricao.length > 60 ? '…' : '') : 'Serviço personalizado')
          const cat = it.categoria_id ? (CATNAMES[it.categoria_id] || it.categoria_id) : null
          return (
            <Card key={it.id} style={{ padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f1f5f9', color: C.slate, display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0 }}>{it.tipo === 'fixo' ? '🔧' : '✨'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.navy, lineHeight: 1.35 }}>{nome}</div>
                  {cat && <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>{cat}</div>}
                  {it.tipo === 'personalizado' && it.descricao && it.descricao.length > 60 && (
                    <div style={{ fontSize: 11.5, color: C.slate, marginTop: 6, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{it.descricao}</div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button onClick={() => remove(it)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #fecaca', background: C.white, color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🗑 Remover</button>
              </div>
            </Card>
          )
        })}

        {items && items.length > 0 && (
          <div style={{ marginTop: 18, padding: 14, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Submeter pedido de orçamento</div>

            {/* Morada */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>Morada do serviço</div>
              {moradas === null && <div className="sk" style={{ height: 36 }} />}
              {moradas && moradas.length === 0 && (
                <div style={{ fontSize: 12, color: C.slate, fontStyle: 'italic', padding: 8 }}>Adicione uma morada em Perfil → Moradas.</div>
              )}
              {moradas && moradas.length > 0 && (
                <select value={selectedMoradaId || ''} onChange={e => setSelectedMoradaId(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.navy, background: C.white, outline: 'none' }}>
                  {moradas.map(m => (
                    <option key={m.id} value={m.id}>{m.label} — {m.morada}{m.is_default ? ' (default)' : ''}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Imediato vs Agendar */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>Quando</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setScheduleMode('imediato')} style={{ flex: 1, padding: '9px', borderRadius: 8, border: `1.5px solid ${scheduleMode === 'imediato' ? C.g : C.border}`, background: scheduleMode === 'imediato' ? 'rgba(22,163,74,0.08)' : C.white, color: C.navy, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Imediato</button>
                <button onClick={() => setScheduleMode('agendar')} style={{ flex: 1, padding: '9px', borderRadius: 8, border: `1.5px solid ${scheduleMode === 'agendar' ? C.g : C.border}`, background: scheduleMode === 'agendar' ? 'rgba(22,163,74,0.08)' : C.white, color: C.navy, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Agendar</button>
              </div>
              {scheduleMode === 'agendar' && (
                <button onClick={() => setScheduleModalOpen(true)} style={{
                  marginTop: 8, width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: `1px solid ${selectedSlots.length > 0 ? C.g : C.border}`,
                  background: selectedSlots.length > 0 ? 'rgba(22,163,74,0.06)' : C.white,
                  color: C.navy, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                }}>
                  {selectedSlots.length === 0 ? '📅 Escolher horários (até 5)'
                    : selectedSlots.length === 1 ? `📅 ${selectedSlots[0].dayLabel} ${selectedSlots[0].dayDate} · ${selectedSlots[0].time}`
                    : `📅 ${selectedSlots.length} horários escolhidos`}
                </button>
              )}
            </div>

            <div style={{ fontSize: 11.5, color: C.slate, marginBottom: 10, lineHeight: 1.5, background: '#f8fafc', padding: '10px 12px', borderRadius: 8 }}>
              <b>{nTarefas}</b> tarefa{nTarefas === 1 ? '' : 's'} → <b>{nCategorias}</b> pedido{nCategorias === 1 ? '' : 's'} (um por categoria). O técnico envia orçamento por categoria; paga só depois de aceitar.
            </div>

            {/* Horas por categoria (estimativa para o técnico) */}
            <div style={{ marginBottom: 12 }}>
              {Object.entries(byCategoria).map(([cat, arr]) => {
                const rate = rates[cat]
                const horas = horasPorCat[cat] || 1
                const total = rate ? (horas * rate) : null
                return (
                  <div key={cat} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: C.navy }}>{CATNAMES[cat] || cat}</span>
                      <span style={{ fontSize: 10, color: C.slate }}>{arr.length} tarefa{arr.length === 1 ? '' : 's'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: C.slate, flexShrink: 0 }}>Estimativa</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button onClick={() => setHorasPorCat(p => ({ ...p, [cat]: Math.max(1, (p[cat] || 1) - 1) }))}
                          style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: C.navy }}>−</button>
                        <span style={{ width: 28, textAlign: 'center', fontSize: 13, fontWeight: 700, color: C.navy }}>{horas}h</span>
                        <button onClick={() => setHorasPorCat(p => ({ ...p, [cat]: (p[cat] || 1) + 1 }))}
                          style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: C.navy }}>+</button>
                      </div>
                      <span style={{ fontSize: 10, color: C.slate, flex: 1 }}>
                        {total != null ? `≈ €${total.toFixed(2).replace('.', ',')}` : ''}
                      </span>
                      <span style={{ fontSize: 11, color: C.slate, fontStyle: 'italic' }}>a confirmar</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <button onClick={submitWishlist} disabled={!canSubmit || submitting} style={{
              width: '100%', padding: '12px 14px', borderRadius: 10, border: 'none',
              background: !canSubmit || submitting ? C.border : C.g,
              color: !canSubmit || submitting ? C.slate : '#fff',
              fontSize: 14, fontWeight: 700,
              cursor: !canSubmit || submitting ? 'default' : 'pointer',
            }}>
              {submitting ? 'A submeter…'
                : canSubmit ? `Pedir orçamento · ${nCategorias} pedido${nCategorias === 1 ? '' : 's'}`
                : 'Complete morada e horário'}
            </button>
          </div>
        )}
      </div>

      {scheduleModalOpen && ScheduleModal && (
        <ScheduleModal
          slots={selectedSlots}
          onClose={() => setScheduleModalOpen(false)}
          onConfirm={(slots) => { setSelectedSlots(slots); setScheduleModalOpen(false) }}
        />
      )}
    </div>
  )
}
