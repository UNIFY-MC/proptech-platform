export const tipoImovelLabel = (tipo) => ({
  'habitacao':          'Casa',
  'segunda_habitacao':  'Casa secundária',
  'condominio':         'Condomínio',
  'empresa':            'Escritório',
  // aliases mock (fallback graceful)
  'casa':               'Casa',
  'apartamento':        'Apartamento',
  'escritorio':         'Escritório',
  'outro':              'Outro',
}[tipo] || 'Casa')

export const tipoImovelEmoji = (tipo) => ({
  'habitacao':          '🏠',
  'segunda_habitacao':  '🏖️',
  'condominio':         '🏢',
  'empresa':            '🏢',
  // aliases mock
  'casa':               '🏠',
  'apartamento':        '🏢',
  'escritorio':         '🏢',
  'outro':              '📍',
}[tipo] || '🏠')

// Suporta real schema (morada + localidade) e form temporário (rua + numero + andar + cidade)
export const formatarMorada = (loc) => {
  if (!loc) return ''
  const linha1 = loc.morada
    || [loc.rua, loc.numero, loc.andar].filter(Boolean).join(', ')
  const cidade = loc.localidade || loc.cidade || ''
  const cp = loc.codigo_postal || ''
  return `${linha1}${cp ? ' · ' + cp : ''}${cidade ? ', ' + cidade : ''}`
}

const NIVEIS_PT = {
  'bronze':   { label: 'Bronze',   next: 'Prata',    min: 0,    max: 500  },
  'silver':   { label: 'Prata',    next: 'Ouro',     min: 500,  max: 1500 },
  'gold':     { label: 'Ouro',     next: 'Platina',  min: 1500, max: 3500 },
  'platinum': { label: 'Platina',  next: 'Diamante', min: 3500, max: 7500 },
  'diamond':  { label: 'Diamante', next: null,       min: 7500, max: 7500 },
  // aliases PT usados em MOCK
  'Bronze':   { label: 'Bronze',   next: 'Prata',    min: 0,    max: 500  },
  'Prata':    { label: 'Prata',    next: 'Ouro',     min: 500,  max: 1500 },
  'Ouro':     { label: 'Ouro',     next: 'Platina',  min: 1500, max: 3500 },
  'Platina':  { label: 'Platina',  next: 'Diamante', min: 3500, max: 7500 },
  'Diamante': { label: 'Diamante', next: null,       min: 7500, max: 7500 },
}

export const nivelLabel = (pontos, nivelKey) => {
  const info = NIVEIS_PT[nivelKey] || NIVEIS_PT['bronze']
  const falta = info.next ? Math.max(0, info.max - pontos) : 0
  return { nivel: info.label, proximo: info.next, falta, max: info.max }
}
