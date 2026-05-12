import { useEffect, useState } from 'react'
import { v2LegacyClient, v2LegacyEnabled } from '../lib/clients.js'

// Mapa de tabelas conhecidas no V2 produção (eozklslwfaqujaijvdnl).
// Snapshot tirado em 2026-05-12 via Supabase MCP. rls=true → anon bloqueado
// (precisa de login user real do utilizadores_portal); rls=false → anon
// consegue ler (e infelizmente escrever — risco fora deste âmbito).
const V2_TABLES = [
  { name: 'condominios',                 rows: 1,     rls: false, group: 'core' },
  { name: 'fracoes',                     rows: 97,    rls: true,  group: 'core' },
  { name: 'condominos',                  rows: 65,    rls: true,  group: 'core' },
  { name: 'condominos_contactos',        rows: 0,     rls: false, group: 'core' },
  { name: 'historico_proprietarios',     rows: 97,    rls: true,  group: 'core' },
  { name: 'utilizadores_portal',         rows: 64,    rls: true,  group: 'auth' },
  { name: 'portal_acessos',              rows: 50,    rls: true,  group: 'auth' },
  { name: 'permissoes_grupo',            rows: 52,    rls: true,  group: 'auth' },
  { name: 'recebimentos',                rows: 593,   rls: true,  group: 'financeiro' },
  { name: 'faturas_pendentes',           rows: 172,   rls: true,  group: 'financeiro' },
  { name: 'faturas_ocr',                 rows: 99,    rls: true,  group: 'financeiro' },
  { name: 'extrato_bancario',            rows: 1056,  rls: true,  group: 'financeiro' },
  { name: 'orcamentos',                  rows: 83,    rls: true,  group: 'financeiro' },
  { name: 'orcamento_por_fracao',        rows: 294,   rls: true,  group: 'financeiro' },
  { name: 'fornecedores',                rows: 13,    rls: true,  group: 'financeiro' },
  { name: 'dividas_condominos_snapshot', rows: 42,    rls: true,  group: 'snapshots' },
  { name: 'dividas_fracoes_snapshot',    rows: 25,    rls: false, group: 'snapshots' },
  { name: 'financeiro_snapshot',         rows: 29,    rls: true,  group: 'snapshots' },
  { name: 'configuracoes',               rows: 12,    rls: false, group: 'config' },
  { name: 'documentos',                  rows: 2733,  rls: true,  group: 'docs' },
  { name: 'documentos_drive',            rows: 93,    rls: true,  group: 'docs' },
  { name: 'documentos_institucionais',   rows: 11,    rls: true,  group: 'docs' },
  { name: 'seguro_fracoes',              rows: 98,    rls: true,  group: 'seguros' },
  { name: 'carregadores_contagens',      rows: 359,   rls: false, group: 'energia' },
  { name: 'eventos',                     rows: 7,     rls: true,  group: 'historia' },
  { name: 'audit_log',                   rows: 151,   rls: true,  group: 'historia' },
  { name: 'email_log',                   rows: 27,    rls: true,  group: 'historia' },
  { name: 'envios_log',                  rows: 0,     rls: false, group: 'historia' },
]

const GROUP_LABEL = {
  core:       'Core (fracções + pessoas)',
  auth:       'Autenticação & portal',
  financeiro: 'Financeiro',
  snapshots:  'Snapshots financeiros',
  config:     'Configurações',
  docs:       'Documentos',
  seguros:    'Seguros',
  energia:    'Energia / EV',
  historia:   'Histórico & logs',
}

export default function V2Legacy() {
  if (!v2LegacyEnabled) {
    return (
      <div>
        <h1>V2 Legacy (produção)</h1>
        <NotConfigured />
      </div>
    )
  }

  return (
    <div>
      <h1>V2 Legacy <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', fontWeight: 400, marginLeft: 8 }}>eozklslwfaqujaijvdnl · read-only</span></h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -8, marginBottom: 20 }}>
        Snapshot das 28 tabelas em produção em <code className="mono">prataowners.pt</code>. RLS protege a maioria — anon vê apenas as 8 tabelas com RLS off. Para ver o resto, precisamos de login user real (<code className="mono">utilizadores_portal</code>) ou do <code className="mono">importador-v2</code> agent para popular o V1 Core Hub.
      </p>

      <LiveQueries />

      <h2 style={{ marginTop: 28 }}>Catálogo de tabelas (28)</h2>
      {Object.entries(GROUP_LABEL).map(([key, label]) => (
        <GroupTable key={key} title={label} rows={V2_TABLES.filter(t => t.group === key)} />
      ))}
    </div>
  )
}

function GroupTable({ title, rows }) {
  const total = rows.reduce((acc, r) => acc + r.rows, 0)
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</h3>
        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)' }}>
          {rows.length} tabelas · {total.toLocaleString()} linhas
        </span>
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        {rows.map((t, i) => (
          <div key={t.name} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 12px',
            borderBottom: i < rows.length - 1 ? '1px solid var(--border-soft)' : 'none',
            fontSize: 12,
          }}>
            <code className="mono" style={{ flex: 1, color: 'var(--text)' }}>{t.name}</code>
            <span style={{
              fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
              padding: '1px 6px', borderRadius: 3,
              background: t.rls ? 'rgba(83,74,183,0.12)' : 'rgba(245,158,11,0.15)',
              color: t.rls ? 'var(--primary)' : 'var(--warning)',
            }}>
              {t.rls ? 'RLS' : 'RLS-OFF'}
            </span>
            <span className="mono" style={{ minWidth: 70, textAlign: 'right', color: 'var(--text-dim)' }}>
              {t.rows.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LiveQueries() {
  const [condominios, setCondominios]   = useState({ state: 'idle' })
  const [carregadores, setCarregadores] = useState({ state: 'idle' })
  const [fracoes, setFracoes]           = useState({ state: 'idle' })

  useEffect(() => {
    if (!v2LegacyClient) return

    v2LegacyClient
      .from('condominios')
      .select('*')
      .limit(5)
      .then(({ data, error }) => setCondominios(
        error ? { state: 'error', error: error.message } : { state: 'ok', rows: data ?? [] }
      ))

    v2LegacyClient
      .from('carregadores_contagens')
      .select('*')
      .order('data_leitura', { ascending: false })
      .limit(5)
      .then(({ data, error }) => setCarregadores(
        error ? { state: 'error', error: error.message } : { state: 'ok', rows: data ?? [] }
      ))

    v2LegacyClient
      .from('fracoes')
      .select('id, letra')
      .limit(5)
      .then(({ data, error }) => setFracoes(
        error ? { state: 'error', error: error.message } : { state: 'ok', rows: data ?? [] }
      ))
  }, [])

  return (
    <div style={{
      background: 'var(--bg-card-soft)', border: '1px solid var(--border-soft)',
      borderRadius: 10, padding: '14px 16px', marginBottom: 16,
    }}>
      <div style={{
        fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)',
        marginBottom: 8,
      }}>
        Probe live (anon)
      </div>

      <ProbeRow
        label="condominios"
        note="RLS off — anon deve conseguir"
        result={condominios}
        render={r => `${r.length} linha · ${r[0]?.nome ?? r[0]?.id?.slice(0, 8) ?? '—'}`}
      />
      <ProbeRow
        label="carregadores_contagens"
        note="RLS off — anon deve conseguir"
        result={carregadores}
        render={r => `${r.length} linhas · última leitura ${r[0]?.data_leitura ?? '—'}`}
      />
      <ProbeRow
        label="fracoes"
        note="RLS on — anon deve devolver 0 linhas"
        result={fracoes}
        render={r => `${r.length} linhas devolvidas (bloqueado por RLS se 0)`}
      />
    </div>
  )
}

function ProbeRow({ label, note, result, render }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12, padding: '4px 0' }}>
      <code className="mono" style={{ minWidth: 200, color: 'var(--text)' }}>{label}</code>
      <span style={{ flex: 1, color: 'var(--text-dim)', fontSize: 11 }}>
        {result.state === 'idle' && '⋯'}
        {result.state === 'error' && <span style={{ color: 'var(--danger)' }}>erro: {result.error}</span>}
        {result.state === 'ok' && render(result.rows)}
      </span>
      <span style={{ fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic' }}>{note}</span>
    </div>
  )
}

function NotConfigured() {
  return (
    <div style={{
      padding: '20px 24px', background: 'var(--bg-card-soft)',
      border: '1px dashed var(--border)', borderRadius: 8,
    }}>
      <div style={{ fontSize: 14, marginBottom: 8, color: 'var(--text)' }}>
        Cliente V2 legacy não configurado
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
        Para ver dados reais de <code className="mono">eozklslwfaqujaijvdnl</code> (produção em <code className="mono">prataowners.pt</code>), adicionar ao <code className="mono">.env.local</code>:
        <pre style={{
          background: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: 5,
          fontSize: 11, marginTop: 8, overflowX: 'auto',
        }}>{`VITE_SUPABASE_V2_LEGACY_ANON_KEY=eyJ...`}</pre>
      </div>
    </div>
  )
}
