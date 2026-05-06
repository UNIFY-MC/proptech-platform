// apps/core/src/components/VerticaisNav.jsx
// Hub de navegação — usa as classes CSS existentes da sidebar Core
// Alinhado com ADR-004 (Core + V1-V10, Owners Club = V1)

import React from 'react'

const VERTICAIS = [
  { num: 'V1', nome: 'Owners Club', porta: 5171, url: 'http://localhost:5171',                 cor: 'var(--gold)'  },
  { num: 'V2', nome: 'Condomínios', porta: 5172, url: 'http://localhost:5172/test-v2.html',    cor: 'var(--green)' },
  { num: 'V4', nome: 'Energia',     porta: 5174, url: 'http://localhost:5174',                 cor: '#eab308'      },
  { num: 'V5', nome: 'Manutenção',  porta: 5175, url: 'http://localhost:5175',                 cor: '#3b82f6'      },
]

const INFRA = [
  { nome: 'Core Hub DB',     url: 'https://supabase.com/dashboard/project/hkmvszkpxjbxmnixzqbl', cor: 'var(--green)' },
  { nome: 'V2 Condo Hub DB', url: 'https://supabase.com/dashboard/project/eozklslwfaqujaijvdnl', cor: '#15803d'      },
]

const labelStyle = {
  fontFamily: 'var(--mono)',
  fontSize: 8,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  padding: '8px 14px 4px',
}

export function VerticaisNav() {
  return (
    <>
      <div style={labelStyle}>Verticais</div>
      {VERTICAIS.map(v => (
        <a key={v.num} className="ext-a" href={v.url} target="_blank" rel="noreferrer">
          <span className="ext-dot" style={{ background: v.cor }}></span>
          {v.num} {v.nome}
        </a>
      ))}

      <div style={labelStyle}>Infra</div>
      {INFRA.map(i => (
        <a key={i.nome} className="ext-a" href={i.url} target="_blank" rel="noreferrer">
          <span className="ext-dot" style={{ background: i.cor }}></span>
          {i.nome}
        </a>
      ))}
    </>
  )
}

export default VerticaisNav
