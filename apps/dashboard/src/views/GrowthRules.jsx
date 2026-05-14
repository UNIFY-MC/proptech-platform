import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hkmvszkpxjbxmnixzqbl.supabase.co'
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const sb = createClient(SUPABASE_URL, ANON_KEY, { db: { schema: 'growth' } })

function fdt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

export default function GrowthRules() {
  const [rules, setRules] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(null)
  const [running, setRunning] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await sb.from('cross_sell_rules').select('*').order('priority')
    if (error) setError(error.message)
    else setRules(data || [])
  }

  async function toggleActive(rule) {
    setBusy(true)
    const { error } = await sb.from('cross_sell_rules').update({ active: !rule.active }).eq('id', rule.id)
    setBusy(false)
    if (!error) { setFlash({ ok: true, msg: `${rule.nome} → ${!rule.active ? 'activa' : 'pausada'}` }); load() }
    else setFlash({ ok: false, msg: error.message })
  }

  async function saveEdit() {
    if (!editing) return
    setBusy(true)
    let if_parsed, then_parsed
    try {
      if_parsed = JSON.parse(editing.if_text)
      then_parsed = JSON.parse(editing.then_text)
    } catch (e) {
      setFlash({ ok: false, msg: 'JSON inválido: ' + e.message })
      setBusy(false); return
    }
    const patch = {
      nome: editing.nome,
      descricao: editing.descricao,
      vertical_origem: editing.vertical_origem,
      vertical_alvo: editing.vertical_alvo,
      priority: editing.priority,
      active: editing.active,
      if_clause: if_parsed,
      then_clause: then_parsed,
    }
    const { error } = editing.isNew
      ? await sb.from('cross_sell_rules').insert(patch)
      : await sb.from('cross_sell_rules').update(patch).eq('id', editing.id)
    setBusy(false)
    if (error) setFlash({ ok: false, msg: error.message })
    else { setFlash({ ok: true, msg: 'Guardado' }); setEditing(null); load() }
  }

  async function runRules() {
    setRunning(true)
    setFlash(null)
    const { data, error } = await sb.rpc('_cron_executar_cross_sell')
    setRunning(false)
    if (error) setFlash({ ok: false, msg: error.message })
    else setFlash({ ok: true, msg: `Executado: ${data?.total_oportunidades ?? 0} novas oportunidades` })
    load()
  }

  function openNew() {
    setEditing({
      isNew: true,
      nome: '',
      descricao: '',
      vertical_origem: 'v2',
      vertical_alvo: 'v4',
      priority: 100,
      active: true,
      if_text: JSON.stringify({ months_since_signup: { '>=': 6 }, no_vertical: 'v4' }, null, 2),
      then_text: JSON.stringify({
        create_oportunidade: { vertical: 'v4', valor_estimado: 120, probabilidade: 30 },
        send_email: { template: 'cross_sell_default' }
      }, null, 2),
    })
  }

  function openEdit(r) {
    setEditing({
      ...r,
      if_text: JSON.stringify(r.if_clause, null, 2),
      then_text: JSON.stringify(r.then_clause, null, 2),
    })
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <h1>Growth · Regras Cross-Sell</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={runRules} disabled={running} style={btnSecondary}>
            {running ? 'A correr…' : '▶ Executar agora'}
          </button>
          <button onClick={openNew} style={btnPrimary}>+ Nova regra</button>
        </div>
      </div>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
        Regras DSL JSON. Cron diário 09:00 UTC corre <code style={{ fontFamily: 'monospace' }}>growth._cron_executar_cross_sell()</code>. Schema <code style={{ fontFamily: 'monospace' }}>growth.cross_sell_rules</code>.
      </p>

      {flash && (
        <div style={{
          padding: 10, marginBottom: 14, borderRadius: 6, fontSize: 12,
          background: flash.ok ? 'rgba(63,185,80,0.10)' : 'rgba(255,123,114,0.10)',
          color: flash.ok ? '#3fb950' : '#ff7b72',
          border: '1px solid ' + (flash.ok ? 'rgba(63,185,80,0.30)' : 'rgba(255,123,114,0.30)'),
        }}>{flash.msg}</div>
      )}

      {error && <div style={{ color: '#ff7b72', fontSize: 13, marginBottom: 12 }}>Erro: {error}</div>}

      {rules === null && <div style={{ color: '#888' }}>A carregar…</div>}
      {rules && rules.length === 0 && <div style={{ color: '#888' }}>Sem regras configuradas.</div>}

      {rules && rules.map(r => (
        <div key={r.id} style={{
          background: '#1c2840', border: '1px solid #35405a', borderRadius: 8,
          padding: 14, marginBottom: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{r.nome}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => toggleActive(r)} disabled={busy} style={{
                ...btnSmall,
                color: r.active ? '#3fb950' : '#888',
                border: '1px solid ' + (r.active ? '#3fb950' : '#35405a'),
              }}>
                {r.active ? '● activa' : '○ pausada'}
              </button>
              <button onClick={() => openEdit(r)} style={btnSmall}>Editar</button>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#bbb', margin: '4px 0 8px' }}>{r.descricao}</p>
          <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#888', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 3, fontFamily: 'monospace' }}>{r.vertical_origem}</span>
            <span>→</span>
            <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 3, fontFamily: 'monospace' }}>{r.vertical_alvo}</span>
            <span style={{ marginLeft: 10 }}>priority {r.priority}</span>
            <span>·</span>
            <span>{r.total_disparos} disparos</span>
            <span>·</span>
            <span>{r.total_conversoes} conv.</span>
            <span>·</span>
            <span>última {fdt(r.ultima_execucao)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <pre style={preStyle}>IF:{'\n'}{JSON.stringify(r.if_clause, null, 2)}</pre>
            <pre style={preStyle}>THEN:{'\n'}{JSON.stringify(r.then_clause, null, 2)}</pre>
          </div>
        </div>
      ))}

      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24,
        }} onClick={() => setEditing(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#0d1117', border: '1px solid #35405a', borderRadius: 10,
            padding: 24, maxWidth: 800, width: '100%', maxHeight: '90vh', overflow: 'auto',
          }}>
            <h2 style={{ marginBottom: 14 }}>{editing.isNew ? 'Nova regra' : 'Editar: ' + editing.nome}</h2>
            <Field label="Nome">
              <input value={editing.nome} onChange={e => setEditing({...editing, nome: e.target.value})} style={input} />
            </Field>
            <Field label="Descrição">
              <input value={editing.descricao || ''} onChange={e => setEditing({...editing, descricao: e.target.value})} style={input} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
              <Field label="Origem">
                <select value={editing.vertical_origem} onChange={e => setEditing({...editing, vertical_origem: e.target.value})} style={input}>
                  {['v2','v3','v4','v5','v10'].map(v => <option key={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Alvo">
                <select value={editing.vertical_alvo} onChange={e => setEditing({...editing, vertical_alvo: e.target.value})} style={input}>
                  {['v2','v3','v4','v5','v10'].map(v => <option key={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <input type="number" value={editing.priority} onChange={e => setEditing({...editing, priority: Number(e.target.value)})} style={input} />
              </Field>
              <Field label="Activa">
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 0' }}>
                  <input type="checkbox" checked={editing.active} onChange={e => setEditing({...editing, active: e.target.checked})} />
                  <span style={{ fontSize: 11 }}>{editing.active ? 'sim' : 'não'}</span>
                </label>
              </Field>
            </div>
            <Field label="IF (JSON DSL)">
              <textarea value={editing.if_text} onChange={e => setEditing({...editing, if_text: e.target.value})}
                style={{ ...input, minHeight: 120, fontFamily: 'monospace', fontSize: 12 }} />
            </Field>
            <Field label="THEN (JSON DSL)">
              <textarea value={editing.then_text} onChange={e => setEditing({...editing, then_text: e.target.value})}
                style={{ ...input, minHeight: 120, fontFamily: 'monospace', fontSize: 12 }} />
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)} style={btnSecondary}>Cancelar</button>
              <button onClick={saveEdit} disabled={busy} style={btnPrimary}>{busy ? 'A guardar…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontFamily: 'monospace' }}>{label}</span>
      {children}
    </label>
  )
}

const input = {
  width: '100%', boxSizing: 'border-box', padding: '8px 10px',
  background: '#1c2840', border: '1px solid #35405a', borderRadius: 6,
  color: '#e6edf3', fontSize: 12, fontFamily: 'monospace',
}
const btnPrimary = {
  padding: '6px 12px', background: '#58a6ff', color: '#0d1117',
  border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
}
const btnSecondary = {
  padding: '6px 12px', background: 'transparent', color: '#888',
  border: '1px solid #35405a', borderRadius: 6, fontSize: 11, cursor: 'pointer',
}
const btnSmall = {
  padding: '3px 10px', background: 'transparent', color: '#888',
  border: '1px solid #35405a', borderRadius: 4, fontSize: 10, cursor: 'pointer',
  fontFamily: 'monospace',
}
const preStyle = {
  background: '#0d1117', border: '1px solid #35405a', borderRadius: 4,
  padding: 8, fontSize: 10, fontFamily: 'monospace', color: '#888',
  overflow: 'auto', margin: 0,
}
