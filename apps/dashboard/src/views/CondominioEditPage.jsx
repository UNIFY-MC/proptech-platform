// CondominioEditPage — /condominios/:codigo
// Editor de um condomínio: dados gerais, email, assinatura, proprietários, cores.

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, Plus, X, Mail, AlertCircle, Eye } from 'lucide-react'
import { useCondominio } from '../hooks/useCondominios.js'

const SECTIONS = [
  { id: 'geral',       label: 'Dados gerais' },
  { id: 'email',       label: 'Email e assinatura' },
  { id: 'proprios',    label: 'Proprietários' },
  { id: 'portal',      label: 'Portal (cores)' },
]

export default function CondominioEditPage() {
  const { codigo } = useParams()
  const navigate = useNavigate()
  const { data, loading, saving, error, update } = useCondominio(codigo)
  const [section, setSection] = useState('geral')
  const [draft, setDraft] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  const [showHtmlPreview, setShowHtmlPreview] = useState(false)

  useEffect(() => {
    if (data && !draft) setDraft({ ...data })
  }, [data, draft])

  if (loading || !draft) {
    return <div style={{ padding: 40, color: 'var(--text-dim)' }}><Loader2 size={16} className="spin" /> A carregar…</div>
  }
  if (!data) {
    return <div style={{ padding: 40 }}>Condomínio não encontrado.</div>
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(data)

  const save = async () => {
    const ok = await update({
      codigo: draft.codigo, nome: draft.nome, nome_completo: draft.nome_completo,
      nif: draft.nif, morada: draft.morada, codpostal: draft.codpostal, localidade: draft.localidade,
      iban: draft.iban, banco: draft.banco, telefone: draft.telefone, website: draft.website,
      email: draft.email, email_from_name: draft.email_from_name, gmail_staff_id: draft.gmail_staff_id,
      email_assinatura: draft.email_assinatura, email_signature_html: draft.email_signature_html,
      email_logo_url: draft.email_logo_url, recibo_logo_url: draft.recibo_logo_url,
      proprietarios: draft.proprietarios, whatsapp: draft.whatsapp,
      portal_cor_primaria: draft.portal_cor_primaria, portal_cor_accent: draft.portal_cor_accent,
      ativo: draft.ativo,
    })
    if (ok) setSavedAt(new Date())
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '12px 16px 60px' }}>
      <button onClick={() => navigate('/condominios')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0, marginBottom: 14 }}>
        <ArrowLeft size={13} /> Condomínios
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{
          fontSize: 11, padding: '4px 9px', borderRadius: 4,
          background: 'var(--bg-elevated)', color: 'var(--text-dim)',
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
        }}>#{draft.codigo}</span>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{draft.nome}</h1>
        <div style={{ flex: 1 }} />
        {savedAt && !dirty && <span style={{ fontSize: 11, color: '#10b981' }}>✓ Guardado {savedAt.toLocaleTimeString('pt-PT')}</span>}
        <button onClick={save} disabled={!dirty || saving} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 6,
          background: dirty ? '#10b981' : 'var(--bg-card)', color: dirty ? '#fff' : 'var(--text-dim)',
          border: dirty ? 'none' : '1px solid var(--border)',
          cursor: dirty && !saving ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600,
        }}>
          {saving ? <Loader2 size={12} className="spin" /> : <Save size={12} />}
          {saving ? 'A guardar…' : dirty ? 'Guardar' : 'Sem alterações'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 5, color: '#ef4444', fontSize: 12, marginBottom: 12 }}>
          <AlertCircle size={12} /> Erro: {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 14px', borderBottom: `2px solid ${section === s.id ? 'var(--primary)' : 'transparent'}`,
            color: section === s.id ? 'var(--text)' : 'var(--text-dim)',
            fontSize: 12, fontWeight: 600, marginBottom: -1,
          }}>{s.label}</button>
        ))}
      </div>

      {section === 'geral' && <GeralSection draft={draft} setDraft={setDraft} />}
      {section === 'email' && <EmailSection draft={draft} setDraft={setDraft} showHtmlPreview={showHtmlPreview} setShowHtmlPreview={setShowHtmlPreview} />}
      {section === 'proprios' && <ProprietariosSection draft={draft} setDraft={setDraft} />}
      {section === 'portal' && <PortalSection draft={draft} setDraft={setDraft} />}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic' }}>{hint}</span>}
    </label>
  )
}

const inputCss = {
  padding: '7px 10px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 5,
  color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit',
}

function GeralSection({ draft, setDraft }) {
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <Field label="Código (multi-tenant key)" hint="3 dígitos. Imutável após criação.">
        <input value={draft.codigo || ''} onChange={set('codigo')} style={inputCss} />
      </Field>
      <Field label="Nome curto"><input value={draft.nome || ''} onChange={set('nome')} style={inputCss} /></Field>
      <Field label="Nome completo (oficial)" hint="Usado em comunicações formais"><input value={draft.nome_completo || ''} onChange={set('nome_completo')} style={inputCss} /></Field>
      <Field label="NIF / NIPC"><input value={draft.nif || ''} onChange={set('nif')} style={inputCss} /></Field>
      <Field label="Morada" hint="Rua + número/lote"><input value={draft.morada || ''} onChange={set('morada')} style={inputCss} /></Field>
      <Field label="Código postal"><input value={draft.codpostal || ''} onChange={set('codpostal')} style={inputCss} /></Field>
      <Field label="Localidade"><input value={draft.localidade || ''} onChange={set('localidade')} style={inputCss} /></Field>
      <Field label="Telefone"><input value={draft.telefone || ''} onChange={set('telefone')} style={inputCss} /></Field>
      <Field label="IBAN"><input value={draft.iban || ''} onChange={set('iban')} style={{ ...inputCss, fontFamily: 'JetBrains Mono, monospace' }} /></Field>
      <Field label="Banco"><input value={draft.banco || ''} onChange={set('banco')} style={inputCss} /></Field>
      <Field label="Website"><input value={draft.website || ''} onChange={set('website')} style={inputCss} /></Field>
      <Field label="WhatsApp (display)"><input value={draft.whatsapp || ''} onChange={set('whatsapp')} style={inputCss} /></Field>
      <Field label="Activo">
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={!!draft.ativo} onChange={(e) => setDraft({ ...draft, ativo: e.target.checked })} /> Sim
        </label>
      </Field>
    </div>
  )
}

function EmailSection({ draft, setDraft, showHtmlPreview, setShowHtmlPreview }) {
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        padding: '10px 12px', background: 'rgba(59,130,246,0.08)',
        border: '1px solid rgba(59,130,246,0.25)', borderRadius: 6,
        fontSize: 12, color: 'var(--text)', lineHeight: 1.55,
      }}>
        <strong>📧 Como os emails são enviados em nome deste condomínio:</strong><br/>
        1. <code>gmail_staff_id</code> aponta para uma conta Google ligada em <a href="/integrations" style={{ color: 'var(--primary)' }}>/integrations</a>.<br/>
        2. Os agentes (Fina, Clara, …) usam <code>email_from_name</code> + <code>email_signature_html</code> ao escrever a resposta.<br/>
        3. <code>gmail-send-google</code> usa este staff_id (não o default p7.digitall) para enviar.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Email do condomínio" hint="Inbox dedicado (ex: condominio.lote2a@prataowners.pt)">
          <input value={draft.email || ''} onChange={set('email')} style={inputCss} />
        </Field>
        <Field label="Display name (From:)" hint="Aparece no campo De: do email">
          <input value={draft.email_from_name || ''} onChange={set('email_from_name')} style={inputCss} />
        </Field>
        <Field label="Gmail OAuth staff_id" hint="staff_id em system.google_oauth_tokens. Liga em /integrations.">
          <input value={draft.gmail_staff_id || ''} onChange={set('gmail_staff_id')} style={{ ...inputCss, fontFamily: 'JetBrains Mono, monospace' }} />
        </Field>
        <Field label="Logo URL (email + recibo)">
          <input value={draft.email_logo_url || ''} onChange={set('email_logo_url')} style={inputCss} placeholder="https://..." />
        </Field>
      </div>

      <Field label="Assinatura — texto plano" hint="Multilinha com \n. Usado em emails text/plain.">
        <textarea rows={6} value={draft.email_assinatura || ''} onChange={set('email_assinatura')} style={{ ...inputCss, resize: 'vertical', fontFamily: 'inherit' }} />
      </Field>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <Field label="Assinatura HTML" hint="Banner rico injectado no final do body_html dos emails.">
            <></>
          </Field>
          <button onClick={() => setShowHtmlPreview(v => !v)} style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 4,
            background: showHtmlPreview ? 'var(--primary)' : 'var(--bg-card)',
            color: showHtmlPreview ? '#fff' : 'var(--text)',
            border: '1px solid var(--border)', cursor: 'pointer', fontSize: 11,
          }}><Eye size={11} /> {showHtmlPreview ? 'Editar' : 'Preview'}</button>
        </div>
        {showHtmlPreview ? (
          <div style={{
            padding: 14, background: '#fff', borderRadius: 5,
            border: '1px solid var(--border)', minHeight: 180,
          }} dangerouslySetInnerHTML={{ __html: draft.email_signature_html || '<em>(vazio)</em>' }} />
        ) : (
          <textarea rows={10} value={draft.email_signature_html || ''} onChange={set('email_signature_html')} style={{ ...inputCss, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
        )}
      </div>
    </div>
  )
}

function ProprietariosSection({ draft, setDraft }) {
  const props = Array.isArray(draft.proprietarios) ? draft.proprietarios : []
  const add = () => setDraft({ ...draft, proprietarios: [...props, { nome: '', role: 'administrador' }] })
  const remove = (i) => setDraft({ ...draft, proprietarios: props.filter((_, idx) => idx !== i) })
  const setP = (i, k, v) => {
    const next = [...props]; next[i] = { ...next[i], [k]: v }
    setDraft({ ...draft, proprietarios: next })
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 6px' }}>
        Lista de proprietários que assinam comunicações em nome do condomínio.
      </p>
      {props.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input value={p.nome || ''} onChange={(e) => setP(i, 'nome', e.target.value)} placeholder="Nome" style={{ ...inputCss, flex: 2 }} />
          <select value={p.role || 'administrador'} onChange={(e) => setP(i, 'role', e.target.value)} style={{ ...inputCss, flex: 1, maxWidth: 200 }}>
            <option value="administrador">Administrador</option>
            <option value="proprietario">Proprietário</option>
            <option value="vogal">Vogal</option>
          </select>
          <button onClick={() => remove(i)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 8px', cursor: 'pointer', color: 'var(--danger, #ef4444)' }}><X size={12} /></button>
        </div>
      ))}
      <button onClick={add} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
        padding: '6px 12px', borderRadius: 5, background: 'var(--bg-card)',
        border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12,
      }}><Plus size={12} /> Adicionar proprietário</button>
    </div>
  )
}

function PortalSection({ draft, setDraft }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 600 }}>
      <Field label="Cor primária" hint="Hex. Usada no portal e PDFs.">
        <input type="color" value={draft.portal_cor_primaria || '#1a5a1a'} onChange={(e) => setDraft({ ...draft, portal_cor_primaria: e.target.value })} style={{ width: 60, height: 36 }} />
        <input value={draft.portal_cor_primaria || ''} onChange={(e) => setDraft({ ...draft, portal_cor_primaria: e.target.value })} style={{ ...inputCss, marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }} />
      </Field>
      <Field label="Cor accent" hint="Hex. Botões secundários.">
        <input type="color" value={draft.portal_cor_accent || '#a8d8a8'} onChange={(e) => setDraft({ ...draft, portal_cor_accent: e.target.value })} style={{ width: 60, height: 36 }} />
        <input value={draft.portal_cor_accent || ''} onChange={(e) => setDraft({ ...draft, portal_cor_accent: e.target.value })} style={{ ...inputCss, marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }} />
      </Field>
    </div>
  )
}
