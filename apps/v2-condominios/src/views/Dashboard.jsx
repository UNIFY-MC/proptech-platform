import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { v2Client } from '../lib/clients.js'
import { CONDO_AGENTS } from '../lib/agents.js'

function eur(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
}

function fdate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-PT')
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    v2Client.rpc('condo_dashboard_summary').then(({ data, error }) => {
      if (!active) return
      if (error) setError(error.message)
      else setSummary(data)
    })
    return () => { active = false }
  }, [])

  const k = summary?.kpis ?? {}
  const devedores = summary?.top_devedores ?? []
  const recebimentos = summary?.recebimentos_recentes ?? []
  const faturas = summary?.faturas_pendentes ?? []

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="dim" style={{ fontSize: 13, marginTop: -8, marginBottom: 20 }}>
        Vista geral do condomínio. Dados live de <code className="mono">condo_dashboard_summary</code>.
      </p>

      {error && <div className="error-banner">Erro: {error}</div>}

      <div className="kpi-grid">
        <div className="kpi kpi-red">
          <div className="kpi-l">Mora total</div>
          <div className="kpi-v">{summary === null ? '…' : eur(k.mora_total)}</div>
          <div className="kpi-s">{k.fracoes_mora ?? 0} fracções afectadas</div>
        </div>
        <div className="kpi kpi-green">
          <div className="kpi-l">Receitas ano</div>
          <div className="kpi-v">{summary === null ? '…' : eur(k.receitas)}</div>
          <div className="kpi-s">acumulado {new Date().getFullYear()}</div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Despesas ano</div>
          <div className="kpi-v">{summary === null ? '…' : eur(k.despesas)}</div>
          <div className="kpi-s">acumulado {new Date().getFullYear()}</div>
        </div>
        <div className="kpi kpi-gold">
          <div className="kpi-l">Saldo final</div>
          <div className="kpi-v">{summary === null ? '…' : eur(k.saldo_final)}</div>
          <div className="kpi-s">início: {eur(k.saldo_inicial)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Faturas pendentes</div>
          <div className="kpi-v">{summary === null ? '…' : faturas.length}</div>
          <div className="kpi-s">a vencer (top 10)</div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Recebimentos recentes</div>
          <div className="kpi-v">{summary === null ? '…' : recebimentos.length}</div>
          <div className="kpi-s">últimos 10</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18, marginTop: 24 }}>
        <Panel
          title="Top devedores"
          link="/divida-actual-2026"
          empty="Sem dívida pendente."
          loading={summary === null}
          rows={devedores}
          renderHeader={() => (
            <tr>
              <th>Fracção</th>
              <th>Condómino</th>
              <th style={{ textAlign: 'right' }}>Dívida</th>
              <th>Último pag.</th>
            </tr>
          )}
          renderRow={(d, i) => (
            <tr key={i}>
              <td className="mono">{d.fracao ?? '—'}</td>
              <td style={{ fontSize: 12 }}>{d.condomino ?? <span className="dim">—</span>}</td>
              <td className="mono" style={{ textAlign: 'right', color: 'var(--rd)' }}>{eur(d.divida)}</td>
              <td className="mono" style={{ fontSize: 11 }}>{fdate(d.ultimo_pagamento)}</td>
            </tr>
          )}
        />

        <Panel
          title="Faturas a vencer"
          link="/faturas"
          empty="Sem faturas pendentes."
          loading={summary === null}
          rows={faturas}
          renderHeader={() => (
            <tr>
              <th>Fornecedor</th>
              <th>Nº</th>
              <th>Vencimento</th>
              <th style={{ textAlign: 'right' }}>Valor</th>
            </tr>
          )}
          renderRow={(f, i) => (
            <tr key={i}>
              <td style={{ fontSize: 12 }}>{f.fornecedor ?? '—'}</td>
              <td className="mono" style={{ fontSize: 10 }}>{f.numero ?? '—'}</td>
              <td className="mono" style={{ fontSize: 11 }}>{fdate(f.vencimento)}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{eur(f.valor)}</td>
            </tr>
          )}
        />

        <Panel
          title="Recebimentos recentes"
          link="/recebimentos"
          empty="Sem recebimentos."
          loading={summary === null}
          rows={recebimentos}
          renderHeader={() => (
            <tr>
              <th>Data</th>
              <th>Fracção</th>
              <th>Referência</th>
              <th style={{ textAlign: 'right' }}>Valor</th>
            </tr>
          )}
          renderRow={(r, i) => (
            <tr key={i}>
              <td className="mono" style={{ fontSize: 11 }}>{fdate(r.data)}</td>
              <td className="mono">{r.fracao_codigo ?? '—'}</td>
              <td className="mono" style={{ fontSize: 10 }}>{r.referencia ?? '—'}</td>
              <td className="mono" style={{ textAlign: 'right', color: 'var(--gr)' }}>{eur(r.valor)}</td>
            </tr>
          )}
        />
      </div>

      <h2 style={{ marginTop: 28 }}>Agentes condomínio</h2>
      <p className="dim" style={{ fontSize: 12, marginTop: -8, marginBottom: 14 }}>
        Click num agente para abrir o painel de skills e instructions.
      </p>

      <div className="agent-grid">
        {CONDO_AGENTS.map(a => (
          <div
            key={a.slug}
            className="agent-card"
            onClick={() => navigate(`/agentes/${a.slug}`)}
          >
            <div className="agent-card-head">
              <div className="agent-avatar">{a.avatarInitial ?? a.name[0]}</div>
              <div style={{ minWidth: 0 }}>
                <div className="agent-card-name">{a.name}</div>
                <div className="agent-card-role">{a.role}</div>
              </div>
            </div>
            <div className={`agent-card-status status-${a.status}`}>{a.status}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Panel({ title, link, empty, loading, rows, renderHeader, renderRow }) {
  return (
    <div style={{
      background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 8,
      padding: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <h3 style={{ fontSize: 13, margin: 0, color: 'var(--tx)' }}>{title}</h3>
        <Link to={link} className="dim mono" style={{ fontSize: 10, textDecoration: 'none' }}>
          ver tudo →
        </Link>
      </div>
      {loading && <div className="dim" style={{ fontSize: 12 }}>A carregar…</div>}
      {!loading && rows.length === 0 && (
        <div className="dim" style={{ fontSize: 12 }}>{empty}</div>
      )}
      {!loading && rows.length > 0 && (
        <table style={{ marginTop: 4 }}>
          <thead>{renderHeader()}</thead>
          <tbody>{rows.map(renderRow)}</tbody>
        </table>
      )}
    </div>
  )
}
