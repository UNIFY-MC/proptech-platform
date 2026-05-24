import { useEffect, useMemo, useState } from 'react'
import { v2Client, systemClient } from '../lib/clients.js'

function agingBucket(dias) {
  if (dias < 0)   return { label: 'a vencer',   tone: 'dim',     nivel: 0 }
  if (dias < 7)   return { label: '< 7d',       tone: 'dim',     nivel: 0 }
  if (dias < 30)  return { label: '> 7d',       tone: 'warning', nivel: 1 }
  if (dias < 60)  return { label: '> 30d',      tone: 'warning', nivel: 2 }
  if (dias < 90)  return { label: '> 60d',      tone: 'danger',  nivel: 3 }
  return            { label: '> 90d (legal)',   tone: 'danger',  nivel: 4 }
}

function nivelToAcao(nivel) {
  if (nivel <= 1) return { tipo: 'aviso_1', label: 'Aviso 1º' }
  if (nivel === 2) return { tipo: 'aviso_2', label: 'Aviso 2º' }
  if (nivel === 3) return { tipo: 'compliance', label: 'Compliance' }
  return { tipo: 'legal', label: 'Via Legal' }
}

function eur(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
}
function fdate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-PT')
}

export default function Mora() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(null) // row.id em curso
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      // Source canónica: v_mora_actual (view calculada em V1)
      // = orcamento_por_fracao 2026 (quotas esperadas) - pagamentos efectuados (V2 bridge + matcher)
      // Substitui a tabela v2_condominios.recebimentos que tinha 638 rows com label estado errado
      // (ver memory project-v2-import-artifacts-2026-05-16).
      const { data, error } = await v2Client
        .from('v_mora_actual')
        .select('fracao_codigo, fracao_id, periodo, vencimento, valor_emitido, valor_pago, divida, dias_atraso, nivel_mora')
        .order('dias_atraso', { ascending: false })
        .limit(500)
      if (!active) return
      if (error) setError(error.message)
      else setRows(data ?? [])
    }
    load()
    return () => { active = false }
  }, [])

  // v_mora_actual já calcula divida/dias_atraso, mas mantemos compat com aging buckets locais
  // (cria objecto bucket por row para renderer continuar a funcionar)
  const enriched = useMemo(() => {
    if (!rows) return null
    return rows.map(r => {
      const dias = Number(r.dias_atraso ?? 0)
      const bucket = agingBucket(dias)
      return {
        id: `${r.fracao_codigo}-${r.periodo}`, // chave estável (view não tem id próprio)
        fracao_id: r.fracao_id,
        fracoes: { codigo: r.fracao_codigo },
        valor_emitido: r.valor_emitido,
        valor_pago: r.valor_pago,
        vencimento: r.vencimento,
        periodo: r.periodo,
        nivel_mora: r.nivel_mora,
        divida: Number(r.divida ?? 0),
        dias,
        bucket,
      }
    }).filter(r => r.divida > 0)
  }, [rows])

  const totals = useMemo(() => {
    if (!enriched) return null
    return {
      divida: enriched.reduce((a, r) => a + r.divida, 0),
      fracoes: new Set(enriched.map(r => r.fracao_id)).size,
      criticas: enriched.filter(r => r.bucket.nivel >= 3).length,
    }
  }, [enriched])

  async function dispararAviso(row) {
    setFeedback(null)
    setSubmitting(row.id)
    const acao = nivelToAcao(row.bucket.nivel)
    const payload = {
      vertical: 'v2_condominios',
      source: 'mora-ui',
      target_agent: acao.tipo === 'legal' ? 'compliance-condo' : 'financeiro-condo',
      title: `${acao.label} — fracção ${row.fracoes?.codigo ?? row.fracao_id?.slice(0,8)}`,
      description: `Dívida ${eur(row.divida)} · ${row.dias} dias de atraso · vencimento ${fdate(row.vencimento)}`,
      payload: {
        tipo: acao.tipo,
        recebimento_id: row.id,
        fracao_id: row.fracao_id,
        fracao_codigo: row.fracoes?.codigo,
        valor_divida: row.divida,
        dias_atraso: row.dias,
        vencimento: row.vencimento,
        periodo: row.periodo,
        nivel: row.bucket.nivel,
      },
      status: 'pending',
    }

    const { error: insertErr } = await systemClient
      .from('inbox_items')
      .insert(payload)

    setSubmitting(null)
    if (insertErr) {
      setFeedback({ ok: false, msg: `Falhou: ${insertErr.message}` })
    } else {
      setFeedback({ ok: true, msg: `${acao.label} criado em Inbox para ${payload.target_agent}.` })
    }
  }

  return (
    <div>
      <h1>Mora</h1>
      <p className="dim" style={{ fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Quotas vencidas. Aging legal: &gt;7d aviso 1º, &gt;30d aviso 2º, &gt;60d compliance, &gt;90d via legal.
        Click numa acção → cria item em <code className="mono">inbox_items</code> para o agente.
      </p>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="kpi kpi-red">
          <div className="kpi-l">Total em dívida</div>
          <div className="kpi-v">{totals === null ? '…' : eur(totals.divida)}</div>
          <div className="kpi-s">{enriched?.length ?? 0} quotas</div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Fracções afectadas</div>
          <div className="kpi-v">{totals?.fracoes ?? '…'}</div>
          <div className="kpi-s">distintas</div>
        </div>
        <div className="kpi kpi-red">
          <div className="kpi-l">Críticas (≥ 60d)</div>
          <div className="kpi-v">{totals?.criticas ?? '…'}</div>
          <div className="kpi-s">requer compliance ou legal</div>
        </div>
      </div>

      {error && <div className="error-banner">Erro: {error}</div>}
      {feedback && (
        <div style={{
          padding: '8px 12px', marginBottom: 14, borderRadius: 6, fontSize: 12,
          background: feedback.ok ? 'rgba(63,185,80,0.10)' : 'rgba(255,123,114,0.10)',
          color: feedback.ok ? 'var(--gr)' : 'var(--rd)',
          border: `1px solid ${feedback.ok ? 'rgba(63,185,80,0.30)' : 'rgba(255,123,114,0.30)'}`,
        }}>{feedback.msg}</div>
      )}

      {rows === null && !error && <div className="dim">A carregar…</div>}
      {enriched && enriched.length === 0 && !error && (
        <div className="empty-state">
          <div style={{ fontSize: 14, marginBottom: 6 }}>Sem mora</div>
          <div style={{ fontSize: 12 }}>Não há quotas por pagar.</div>
        </div>
      )}

      {enriched && enriched.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Fracção</th>
              <th>Vencimento</th>
              <th style={{ textAlign: 'right' }}>Dívida</th>
              <th>Aging</th>
              <th>Acção</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map(r => {
              const acao = nivelToAcao(r.bucket.nivel)
              const isSubmitting = submitting === r.id
              const toneColor = r.bucket.tone === 'danger'  ? 'var(--rd)'
                              : r.bucket.tone === 'warning' ? 'var(--go)'
                              : 'var(--mu)'
              const btnColor = r.bucket.nivel >= 3 ? 'var(--rd)' : 'var(--go)'
              return (
                <tr key={r.id}>
                  <td className="mono" style={{ fontWeight: 600 }}>{r.fracoes?.codigo ?? r.fracao_id?.slice(0,8)}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{fdate(r.vencimento)}</td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--rd)' }}>{eur(r.divida)}</td>
                  <td>
                    <span className="mono" style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 4,
                      background: 'var(--sf2)', color: toneColor, fontWeight: 600,
                    }}>
                      {r.bucket.label} · {r.dias}d
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => dispararAviso(r)}
                      disabled={isSubmitting}
                      style={{
                        padding: '4px 10px',
                        background: 'transparent',
                        color: btnColor,
                        border: `1px solid ${btnColor}`,
                        borderRadius: 4,
                        fontSize: 10,
                        fontFamily: 'DM Mono, monospace',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        cursor: isSubmitting ? 'wait' : 'pointer',
                        opacity: isSubmitting ? 0.4 : 1,
                      }}
                    >
                      {isSubmitting ? '…' : acao.label}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
