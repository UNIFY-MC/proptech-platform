export const CATEGORIAS = {
  habitacional: {
    label: 'Habitação', emoji: '🏠', criavel: true,
    descricao: 'Casa, apartamento, moradia · onde alguém vive',
  },
  comercial: {
    label: 'Comercial', emoji: '🏪', criavel: true,
    descricao: 'Loja, escritório, restaurante, clínica',
  },
  industrial: {
    label: 'Industrial', emoji: '🏭', criavel: true,
    descricao: 'Armazém, oficina, fábrica',
  },
  rural: {
    label: 'Rural', emoji: '🌾', criavel: true,
    descricao: 'Quinta, monte, herdade',
  },
  condominio: {
    label: 'Condomínio', emoji: '🏢', criavel: false,
    descricao: 'Sincronizado da V2 · gestão estrutural lá',
  },
}

export const TIPOLOGIAS = {
  habitacional: ['T0','T1','T2','T3','T4','T5+','V0','V1','V2','V3','V4','V5+','Studio','Loft','Duplex'],
  comercial:    ['Loja','Escritório','Restaurante','Café/Bar','Clínica','Hotel','Pousada','Outro'],
  industrial:   ['Armazém','Oficina','Fábrica','Outro'],
  rural:        ['Quinta','Monte','Herdade','Casal','Terreno'],
  condominio:   ['Prédio','Conjunto','Cond. fechado','Misto'],
}

export const USOS = {
  residencia_principal: {
    label: 'Residência principal', emoji: '🏠',
    categorias: ['habitacional'], external: false,
  },
  segunda_habitacao: {
    label: 'Segunda habitação', emoji: '🏖️',
    categorias: ['habitacional'], external: false,
  },
  AL_airbnb: {
    label: 'AL · Airbnb', emoji: '🛏️',
    categorias: ['habitacional','comercial'], external: false,
  },
  arrendado_LT: {
    label: 'Arrendado long-term', emoji: '🔗',
    categorias: ['habitacional','comercial'], external: true,
    externalApp: 'V7/V8',
    aviso: 'Gestão de arrendamento na V7/V8 · funcionalidades limitadas aqui',
  },
  actividade_propria: {
    label: 'Actividade própria', emoji: '💼',
    categorias: ['comercial','industrial','rural'], external: false,
  },
  cedido: {
    label: 'Cedido', emoji: '🤝',
    categorias: ['habitacional','comercial','rural'], external: false,
  },
  vazio: {
    label: 'Vazio', emoji: '⚪',
    categorias: ['habitacional','comercial','industrial','rural'], external: false,
  },
  obras: {
    label: 'Em obras', emoji: '🚧',
    categorias: ['habitacional','comercial','industrial','rural'], external: false,
  },
  gestao_terceiros: {
    label: 'Gestão de terceiros', emoji: '👥',
    categorias: ['condominio'], external: false,
  },
}

export const SISTEMAS_DEFAULT = {
  habitacional: ['avac','aguas_quentes','canalizacao','eletrica','gas','limpeza','electrodomesticos'],
  comercial:    ['avac','eletrica','seguranca_alarme','cctv','limpeza','frio_comercial'],
  industrial:   ['eletrica','aguas_industriais','anti_incendio','ventilacao'],
  rural:        ['furo_poco','rede_rega','vedacao','energia_offgrid','estruturas'],
  condominio:   ['elevador','limpeza_partes_comuns','iluminacao_comum','anti_incendio','cctv','jardim_comum','garagem_comum'],
}

export const SISTEMAS_POR_USO = {
  AL_airbnb:        ['lavandaria','check_in_out','limpeza_profissional','internet'],
  segunda_habitacao: ['monitoring_remoto','alarme_remoto'],
  obras:            [],
}

export const SISTEMAS_LABELS = {
  avac:                    'AVAC / Climatização',
  aguas_quentes:           'Águas quentes (caldeira)',
  canalizacao:             'Canalização e esgotos',
  eletrica:                'Eléctrica',
  gas:                     'Gás',
  limpeza:                 'Limpeza',
  electrodomesticos:       'Electrodomésticos',
  internet:                'Internet / Telecom',
  jardim:                  'Jardim',
  piscina:                 'Piscina',
  frio_comercial:          'Frio comercial',
  montra:                  'Montra / vitrine',
  seguranca_alarme:        'Sistema segurança / alarme',
  cctv:                    'CCTV',
  elevador:                'Elevador(es)',
  limpeza_partes_comuns:   'Limpeza partes comuns',
  iluminacao_comum:        'Iluminação comum',
  anti_incendio:           'Sistema anti-incêndio',
  jardim_comum:            'Jardim comum',
  garagem_comum:           'Garagem comum',
  aguas_industriais:       'Águas industriais',
  ventilacao:              'Ventilação',
  furo_poco:               'Furo / poço',
  rede_rega:               'Rede de rega',
  vedacao:                 'Vedação',
  energia_offgrid:         'Energia off-grid',
  estruturas:              'Estruturas e anexos',
  lavandaria:              'Lavandaria',
  check_in_out:            'Check-in / out',
  limpeza_profissional:    'Limpeza profissional regular',
  monitoring_remoto:       'Monitorização remota',
  alarme_remoto:           'Alarme remoto',
}

export const AMENITIES_LABELS = {
  tem_elevador: 'Elevador',
  tem_piscina:  'Piscina',
  tem_garagem:  'Garagem',
  tem_jardim:   'Jardim',
  tem_terraco:  'Terraço',
  tem_alarme:   'Alarme',
  tem_porteiro: 'Porteiro',
}
