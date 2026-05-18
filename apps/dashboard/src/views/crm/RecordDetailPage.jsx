// RecordDetailPage — página de detalhe genérica para qualquer record type CRM
// Layout 2 colunas: main (1fr) + side panel (280px)
// 8 tabs: Overview · Activity · Emails · Calls · Notes · Tasks · Files · Lists

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRecord } from '../../hooks/useRecord.js'
import ActivityTimeline from '../../components/crm/ActivityTimeline.jsx'
import RecordDetailsPanel from '../../components/crm/RecordDetailsPanel.jsx'

// Iniciais para avatar grande
function initials(name = '') {
  const parts = String(name || '').split(' ')
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

// Cor determinística para avatar
function avatarColor(name = '') {
  const colors = ['#58a6ff', '#d2a8ff', '#3fb950', '#e3b341', '#ff7b72']
  let h = 0
  for (const c of String(name || '')) h = (h * 31 + c.charCodeAt(0)) % colors.length
  return colors[h]
}

// Tipo → metadata de display
const TYPE_META = {
  pessoa:      { label: 'Pessoas',     icon: '📇', breadcrumb: 'CRM · Pessoas' },
  empresa:     { label: 'Empresas',    icon: '🏢', breadcrumb: 'CRM · Empresas' },
  imovel:      { label: 'Imóveis',     icon: '🏠', breadcrumb: 'CRM · Imóveis' },
  condominio:  { label: 'Condomínios', icon: '🏛', breadcrumb: 'CRM · Condomínios' },
  oportunidade:{ label: 'Oportunidades',icon: '🎯',breadcrumb: 'CRM · Oportunidades' },
}

// Path base para breadcrumb
const TYPE_PATH = {
  pessoa:       '/crm/pessoas',
  empresa:      '/crm/empresas',
  imovel:       '/crm/imoveis',
  condominio:   '/crm/condominios',
  oportunidade: '/crm/oportunidades',
}

// Tab placeholder simples
function PlaceholderTab({ name, sprint }) {
  return (
    <div style={{
      padding: '48px 24px', textAlign: 'center',
      color: 'var(--text-dim)', fontSize: 13,
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🔧</div>
      <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Em construção ({sprint})</div>
    </div>
  )
}

// Highlights do Overview — 4 cards
function HighlightsGrid({ summary }) {
  const cards = [
    {
      label: 'Força de ligação',
      value: summary?.connection_strength ?? '—',
      valueColor: 'var(--green)',
      sub: 'baseado em interacções',
    },
    {
      label: 'Último email',
      value: summary?.last_email_at
        ? new Date(summary.last_email_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
        : '—',
      sub: 'recebido ou enviado',
    },
    {
      label: 'Tasks abertas',
      value: summary?.open_tasks_count ?? '—',
      sub: 'pendentes',
    },
    {
      label: 'Deals activos',
      value: summary?.active_deals_count ?? '—',
      valueColor: 'var(--gold)',
      sub: 'oportunidades abertas',
    },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: 10,
      marginBottom: 20,
    }}>
      {cards.map(c => (
        <div key={c.label} style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 6, padding: 12,
        }}>
          <div style={{
            fontSize: 9, color: 'var(--text-dim)',
            textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.04em', marginBottom: 6,
          }}>
            {c.label}
          </div>
          <div style={{
            fontSize: 20, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            color: c.valueColor ?? 'var(--text)',
          }}>
            {c.value}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  )
}

// Tab "Overview"
function OverviewTab({ record, summary, recordType }) {
  return (
    <div style={{ padding: '20px 24px' }}>
      <HighlightsGrid summary={summary} />

      <div style={{
        fontSize: 9, textTransform: 'uppercase', color: 'var(--text-dim)',
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em',
        fontWeight: 600, marginBottom: 12,
      }}>
        Actividade recente
      </div>

      <ActivityTimeline
        recordType={recordType}
        recordId={record?.id}
        sinceDays={7}
        limit={5}
      />
    </div>
  )
}

// Tabs config
const TABS = [
  { id: 'overview',   label: 'Visão geral',   countKey: null },
  { id: 'activity',   label: 'Actividade',    countKey: 'activity_count' },
  { id: 'emails',     label: 'Emails',        countKey: 'emails_count' },
  { id: 'calls',      label: 'Chamadas',      countKey: 'calls_count' },
  { id: 'notes',      label: 'Notas',         countKey: 'notes_count' },
  { id: 'tasks',      label: 'Tasks',         countKey: 'tasks_count' },
  { id: 'files',      label: 'Ficheiros',     countKey: 'files_count' },
  { id: 'lists',      label: 'Listas',        countKey: 'lists_count' },
]

export default function RecordDetailPage({ recordType }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  const meta = TYPE_META[recordType] ?? { label: recordType, icon: '📌', breadcrumb: 'CRM' }
  const basePath = TYPE_PATH[recordType] ?? '/crm'

  const { record, summary, loading, error } = useRecord(recordType, id)

  const nome = record?.nome || record?.name || record?.descricao || record?.titulo || '—'
  const email = record?.email ?? null
  const telemovel = record?.telemovel ?? null

  // Render tab content
  function renderTab() {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab record={record} summary={summary} recordType={recordType} />
      case 'activity':
        return (
          <div style={{ padding: '16px 24px' }}>
            <ActivityTimeline recordType={recordType} recordId={id} sinceDays={30} limit={50} />
          </div>
        )
      case 'emails':
        return <PlaceholderTab name="Emails" sprint="Sprint C4" />
      case 'calls':
        return <PlaceholderTab name="Chamadas" sprint="Sprint C4" />
      case 'notes':
        return <PlaceholderTab name="Notas" sprint="Sprint C4" />
      case 'tasks':
        return <PlaceholderTab name="Tasks" sprint="Sprint C4" />
      case 'files':
        return <PlaceholderTab name="Ficheiros" sprint="Sprint C4" />
      case 'lists':
        return <PlaceholderTab name="Listas" sprint="Sprint C3" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, color: 'var(--text-dim)', fontSize: 13 }}>
        A carregar registo…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 40, color: 'var(--red)', fontSize: 13 }}>
        Erro ao carregar: {error}
      </div>
    )
  }

  // Record não encontrado — mostrar UI vazia mas funcional
  const displayRecord = record ?? { id }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Breadcrumb */}
      <div style={{
        padding: '8px 24px', fontSize: 11, color: 'var(--text-dim)',
        borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6,
        flexShrink: 0,
      }}>
        <button
          onClick={() => navigate(basePath)}
          style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 11, cursor: 'pointer', padding: 0 }}
        >
          {meta.breadcrumb}
        </button>
        <span style={{ color: 'var(--border)' }}>›</span>
        <span style={{ color: 'var(--text)' }}>{nome}</span>
      </div>

      {/* Hero */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 16,
        flexShrink: 0,
      }}>
        {/* Avatar grande */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: `linear-gradient(135deg, ${avatarColor(nome)}, var(--purple))`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {initials(nome)}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text)' }}>{nome}</h2>
          <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 4 }}>
            {meta.icon} {meta.label.slice(0, -1)}
            {record?.kind && <span style={{ marginLeft: 8 }}>· {record.kind}</span>}
          </div>
          {(email || telemovel) && (
            <div style={{
              color: 'var(--text-dim)', fontSize: 11, marginTop: 6,
              display: 'flex', gap: 12, flexWrap: 'wrap',
            }}>
              {email && <span>✉️ {email}</span>}
              {telemovel && <span>📱 {telemovel}</span>}
            </div>
          )}
          {/* Tags */}
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {record?.vertical && (
              <span style={{
                background: 'var(--surface2)', padding: '2px 8px', borderRadius: 10,
                fontSize: 10, color: 'var(--text-dim)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {record.vertical}
              </span>
            )}
          </div>
        </div>

        {/* Acções */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button style={heroBtn}>✉️ Email</button>
          <button style={heroBtn}>📞 Ligar</button>
          <button style={{ ...heroBtn, padding: '5px 8px' }}>⋯</button>
        </div>
      </div>

      {/* 2 colunas: main + side */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', padding: '0 24px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)', flexShrink: 0,
            overflowX: 'auto',
          }}>
            {TABS.map(t => {
              const tabCount = summary?.[t.countKey]
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    padding: '10px 12px',
                    fontSize: 12,
                    color: activeTab === t.id ? 'var(--text)' : 'var(--text-dim)',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === t.id ? '2px solid var(--purple)' : '2px solid transparent',
                    cursor: 'pointer',
                    fontWeight: activeTab === t.id ? 500 : 400,
                    whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {t.label}
                  {tabCount !== undefined && tabCount !== null && tabCount > 0 && (
                    <span style={{
                      background: 'var(--surface2)',
                      padding: '0 5px', borderRadius: 8,
                      fontSize: 9, color: 'var(--text-dim)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {tabCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {renderTab()}
          </div>
        </div>

        {/* Side panel */}
        <div style={{
          width: 280, flexShrink: 0,
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          overflowY: 'auto',
          padding: 16,
        }}>
          <RecordDetailsPanel record={displayRecord} recordType={recordType} />
        </div>
      </div>
    </div>
  )
}

const heroBtn = {
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 5, padding: '5px 10px',
  fontSize: 11, color: 'var(--text)',
  cursor: 'pointer',
}
