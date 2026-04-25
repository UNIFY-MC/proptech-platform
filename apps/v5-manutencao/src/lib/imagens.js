const FALLBACK_POR_CATEGORIA = {
  limpeza:     'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
  canalizacao: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80',
  eletrica:    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80',
  manutencao:  'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&q=80',
  pintura:     'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80',
  jardim:      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80',
  piscina:     'https://images.unsplash.com/photo-1572724013060-7e5c5c4d3527?w=800&q=80',
  pos_obra:    'https://images.unsplash.com/photo-1583947581924-860bda3c3a17?w=800&q=80',
}

const FALLBACK_GENERICO = 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&q=80'

export function getImagemServico(servico) {
  if (servico?.imagem_url) return servico.imagem_url
  return FALLBACK_POR_CATEGORIA[servico?.categoria_id] || FALLBACK_GENERICO
}
