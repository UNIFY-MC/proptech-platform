import { useState } from 'react'
import { useYear, YEAR_OPTIONS } from '../context/YearContext.jsx'

export default function Topbar() {
  const { year, setYear } = useYear()
  const [lang, setLang] = useState('PT')

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">Condomínio Prata Lote 2A</div>
        <div className="topbar-meta">NIF 902266535 · Prestação de Contas</div>
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
