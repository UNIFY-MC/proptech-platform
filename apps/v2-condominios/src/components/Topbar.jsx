import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useYear, YEAR_OPTIONS } from '../context/YearContext.jsx'

// Mapeamento rota → label para topbar-meta (substitui hardcoded "Prestação de Contas")
const ROUTE_LABELS = {
  '/':                    'Início',
  '/prestacao-contas':    'Prestação de Contas',
  '/dividas-2025':        'Dívidas 2025',
  '/divida-actual-2026':  'Dívida Actual 2026',
  '/recebimentos':        'Recebimentos',
  '/bancos':              'Bancos',
  '/condominos':          'Condóminos',
  '/fracoes':             'Fracções',
  '/faturas':             'Faturas',
  '/mapa-receitas':       'Mapa de Receitas',
  '/documentos':          'Documentos',
  '/portal-condomino':    'Portal Condómino',
  '/automacoes':          'Automações',
  '/permissoes':          'Permissões',
  '/energia':             'Energia',
  '/seguros':             'Seguros',
  '/assembleias':         'Assembleias',
  '/comunicacao':         'Comunicação',
  '/inbox':               'Inbox',
  '/approvals':           'Aprovações',
  '/chat':                'Chat',
}

export default function Topbar() {
  const { year, setYear } = useYear()
  const [lang, setLang] = useState('PT')
  const location = useLocation()
  const currentLabel = ROUTE_LABELS[location.pathname] || ROUTE_LABELS[Object.keys(ROUTE_LABELS).find(k => location.pathname.startsWith(k) && k !== '/')] || ''

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">Condomínio Prata Lote 2A</div>
        <div className="topbar-meta">
          NIF 902266535
          {currentLabel && <> · {currentLabel}</>}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div className="year-pills" role="tablist" aria-label="Filtro por ano">
        <button className="tb-btn" disabled style={{ opacity: 0.5, cursor: 'default' }}>PRATA 2A</button>
        {YEAR_OPTIONS.map(y => (
          <button
            key={y}
            className={'year-pill' + (year === y ? ' active' : '')}
            onClick={() => setYear(y)}
          >
            {y}
          </button>
        ))}
      </div>

      <button className="tb-btn" onClick={() => setLang(lang === 'PT' ? 'EN' : 'PT')}>
        {lang}
      </button>
      <button className="tb-btn" onClick={() => window.print()} title="Imprimir / PDF">
        PDF
      </button>
    </header>
  )
}
