// RecordsListPage — página de lista genérica para qualquer record type CRM
// Props via useParams: recordType — mas recebe também como prop directa para flexibilidade
// Espelha mockup: header + filters bar + tabela com avatar, nome, email, role, vertical pill, last contact

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecords } from '../../hooks/useRecords.js'
import { useRecordCount } from '../../hooks/useRecordCount.js'

// Metadata por tipo de record
const TYPE_META = {
  pessoa: {
    label: 'Pessoas',
    icon: '📇',
    newLabel: 'Nova pessoa',
    columns: ['Nome', 'Email', 'Telemóvel', 'NIF', 'Última actividade'],
  },
  empresa: {
    label: 'Empresas',
    icon: '🏢',
    newLabel: 'Nova empresa',
    columns: ['Nome', 'NIPC', 'Email', 'Tipo', 'Última actividade'],
  },
  imovel: {
    label: 'Imóveis',
    icon: '🏠',
    newLabel: 'Novo imóvel',
    columns: ['Descrição', 'Morada', 'Tipo', 'Área m²', 'Última actividade'],
  },
  condominio: {
    label: 'Condomínios',
    icon: '🏛',
    newLabel: 'Novo condomínio',
    columns: ['Nome', 'Morada', 'Fracções', 'Gestor', 'Última actividade'],
  },
  oportunidade: {
    label: 'Oportunidades',
    icon: '🎯',
    newLabel: 'Nova oportunidade',
    columns: ['Título', 'Empresa', 'Valor', 'Etapa', 'Última actividade'],
  },
}

// Iniciais para avatar circular
function initials(name = '') {
  if (!name) return '?'
  const parts = String(name).split(' ')
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

// Cor determinística para avatar com base no nome
function avatarColor(name = '') {
  const colors = ['var(--blue)', 'var(--purple)', 'var(--green)', 'var(--gold)', 'var(--red)']
  let h = 0
  for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) % colors.length
  return colors[h]
}

// Formata data relativa
function relDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d) / 86400000)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  if (diff < 7)  return `${diff}d atrás`
  if (diff < 30) return `${Math.floor(diff / 7)}sem atrás`
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

// Célula principal (nome + avatar) de uma row
function NameCell({ record, recordType }) {
  const nome = record.nome || record.name || record.descricao || record.titulo || '—'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        width: 24, height: 24, borderRadius: '50%',
        background: `linear-gradient(135deg, ${avatarColor(nome)}, var(--purple))`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0,
      }}>
        {initials(nome)}
      </span>
      <span style={{ fontWeight: 500, color: 'var(--text)', fontSize: 12 }}>{nome}</span>
    </div>
  )
}

// Extrai campos da row por tipo
function rowFields(record, recordType) {
  switch (recordType) {
    case 'pessoa':
      return [record.email, record.telemovel, record.nif]
    case 'empresa':
      return [record.nipc, record.email, record.kind || '—']
    case 'imovel':
      return [record.morada, record.tipo, record.area_m2 ? `${record.area_m2} m²` : '—']
    case 'condominio':
      return [record.morada, record.num_fracoes ?? '—', record.gestor_nome]
    case 'oportunidade':
      return [record.empresa_nome, record.valor_eur ? `€ ${Number(record.valor_eur).toLocaleString('pt-PT')}` : '—', record.stage]
    default:
      return []
  }
}

export default function RecordsListPage({ recordType }) {
  const navigate = useNavigate()
  const meta = TYPE_META[recordType] ?? { label: recordType, icon: '📌', newLabel: 'Novo', columns: [] }
  const { count } = useRecordCount(recordType)

  const [search, setSearch]       = useState('')
  const [debouncedSearch, setDS]  = useState('')
  const [sort, setSort]           = useState('last_activity_desc')
  const [page, setPage]           = useState(0)
  const LIMIT = 50

  // Debounce search 300ms
  const debounceRef = useRef(null)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDS(search); setPage(0) }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const { records, total, loading, error } = useRecords(recordType, {
    search: debouncedSearch,
    sort,
    limit: LIMIT,
    offset: page * LIMIT,
  })

  const sortOptions = [
    { value: 'last_activity_desc', label: 'Última actividade ↓' },
    { value: 'name_asc',           label: 'Nome A-Z' },
    { value: 'created_desc',       label: 'Mais recente' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{meta.icon}</span>
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{meta.label}</h1>
          <span style={{
            background: 'var(--surface2)', padding: '1px 8px', borderRadius: 10,
            fontSize: 11, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace",
          }}>
            {count !== null ? count.toLocaleString('pt-PT') : '…'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            background: 'var(--purple)', color: '#000',
            border: 'none', borderRadius: 5, padding: '5px 12px',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            + {meta.newLabel}
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div style={{
        padding: '8px 24px', display: 'flex', gap: 8, alignItems: 'center',
        borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0,
      }}>
        {/* Search */}
        <input
          type="search"
          placeholder={`Pesquisar ${meta.label.toLowerCase()}…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 5, padding: '4px 10px', fontSize: 11,
            color: 'var(--text)', outline: 'none', width: 220,
          }}
        />

        {/* Sort */}
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 5, padding: '4px 8px', fontSize: 11,
            color: 'var(--text)', cursor: 'pointer',
          }}
        >
          {sortOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>
          {loading ? 'A carregar…' : `${total.toLocaleString('pt-PT')} resultados`}
        </span>
      </div>

      {/* Tabela */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {error && (
          <div style={{ padding: 24, color: 'var(--red)', fontSize: 12 }}>
            Erro: {error}
          </div>
        )}

        {!error && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Nome</th>
                {meta.columns.slice(1, -1).map(col => (
                  <th key={col} style={thStyle}>{col}</th>
                ))}
                <th style={thStyle}>Última actividade</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={meta.columns.length} style={{ padding: '10px 12px' }}>
                    <div style={{ height: 14, background: 'var(--surface2)', borderRadius: 3, width: '60%' }} />
                  </td>
                </tr>
              ))}
              {!loading && records.length === 0 && (
                <tr>
                  <td
                    colSpan={meta.columns.length}
                    style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}
                  >
                    {debouncedSearch ? `Nenhum resultado para "${debouncedSearch}"` : `Sem ${meta.label.toLowerCase()} ainda.`}
                  </td>
                </tr>
              )}
              {!loading && records.map(r => {
                const extra = rowFields(r, recordType)
                return (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/crm/${recordType}s/${r.id}`)}
                    style={{ cursor: 'pointer' }}
                    className="crm-table-row"
                  >
                    <td style={tdStyle}><NameCell record={r} recordType={recordType} /></td>
                    {extra.map((v, i) => (
                      <td key={i} style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-dim)' }}>
                        {v ?? '—'}
                      </td>
                    ))}
                    <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-dim)' }}>
                      {relDate(r.last_activity_at || r.updated_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {total > LIMIT && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '8px 24px', borderTop: '1px solid var(--border)', flexShrink: 0,
        }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={paginBtn}
          >
            ← Anterior
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
            {page + 1} / {Math.ceil(total / LIMIT)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={(page + 1) * LIMIT >= total}
            style={paginBtn}
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}

const thStyle = {
  textAlign: 'left', padding: '8px 12px',
  fontSize: 9, textTransform: 'uppercase',
  letterSpacing: '0.04em', color: 'var(--text-dim)',
  fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
  borderBottom: '1px solid var(--border)',
  background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 1,
}

const tdStyle = {
  padding: '10px 12px',
  fontSize: 12,
  borderBottom: '1px solid var(--border)',
  color: 'var(--text)',
}

const paginBtn = {
  background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 5, padding: '4px 10px', fontSize: 11,
  color: 'var(--text)', cursor: 'pointer',
}
