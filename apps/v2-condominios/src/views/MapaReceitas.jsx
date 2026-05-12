export default function MapaReceitas() {
  return (
    <div>
      <h1>Mapa de Receitas</h1>
      <p className="dim" style={{ fontSize: 13, marginBottom: 16 }}>
        Distribuição orçamentária por fracção. Mostra <code className="mono">orcamento_por_fracao</code> JOIN <code className="mono">recebimentos</code> para identificar quem está em dia.
      </p>
      <div className="empty-state">
        <div style={{ fontSize: 14, marginBottom: 4 }}>Por construir</div>
        <div style={{ fontSize: 12 }}>
          Tabela cruzada fracção × mês com cores: verde (pago), amarelo (parcial), vermelho (em dívida). Requer dados pós-import.
        </div>
      </div>
    </div>
  )
}
