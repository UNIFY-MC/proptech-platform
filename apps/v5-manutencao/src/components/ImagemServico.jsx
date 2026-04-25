import { useState } from 'react'
import { getImagemServico } from '../lib/imagens.js'

export default function ImagemServico({ servico, height = 240, style = {} }) {
  const [erro, setErro] = useState(false)
  const url = getImagemServico(servico)

  return (
    <div style={{ width: '100%', height, position: 'relative', background: '#e5e5e3', overflow: 'hidden', ...style }}>
      {!erro ? (
        <img
          src={url}
          alt={servico?.imagem_alt || servico?.nome || 'Serviço'}
          onError={() => setErro(true)}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, opacity: .4 }}>
          🛠️
        </div>
      )}
    </div>
  )
}
