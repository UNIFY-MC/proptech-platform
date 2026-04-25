import { useState } from 'react'
import EscolherImovelSheet from '../components/EscolherImovelSheet'

export function useEscolherImovel() {
  const [config, setConfig] = useState(null)

  function escolher(opcoes = {}) {
    return new Promise((resolve) => {
      setConfig({
        ...opcoes,
        onSelect: (imovel) => { setConfig(null); resolve(imovel) },
        onClose:  ()      => { setConfig(null); resolve(null)   },
      })
    })
  }

  const sheet = config ? (
    <EscolherImovelSheet
      open={true}
      titulo={config.titulo}
      motivo={config.motivo}
      excluirIds={config.excluirIds}
      onAdicionarImovel={config.onAdicionarImovel}
      onSelect={config.onSelect}
      onClose={config.onClose}
    />
  ) : null

  return { escolher, sheet }
}
