export default function PortalCondomino() {
  return (
    <div>
      <h1>Abrir como Condómino</h1>
      <p className="dim" style={{ fontSize: 13, marginBottom: 16 }}>
        Modo impersonation — visualizar o portal como um condómino específico. Útil para suporte e validação de UX.
      </p>
      <div className="empty-state">
        <div style={{ fontSize: 14, marginBottom: 4 }}>Por construir</div>
        <div style={{ fontSize: 12 }}>
          Picker de condómino + redirect para vista cliente (paleta dourada Cormorant). Equivalente ao <code className="mono">vPortalCond</code> da legacy.
        </div>
      </div>
    </div>
  )
}
