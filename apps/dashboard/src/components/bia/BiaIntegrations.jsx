export default function BiaIntegrations({ integrations }) {
  return (
    <div className="bia-intg">
      <div className="bia-intg-head">
        <span className="bia-intg-label">Integrations</span>
        <button
          className="bia-intg-manage"
          onClick={() => console.log('[BiaIntegrations] Manage stub — BiaDetailsDrawer Phase 5.1')}
        >
          Manage
        </button>
      </div>

      <div className="bia-intg-grid">
        {integrations.map(int => (
          <div key={int.id} className={`bia-intg-card${int.planned ? ' planned' : ''}`}>
            <div className={`bia-intg-icon ${int.color}`}>{int.icon}</div>
            <div className="bia-intg-info">
              <div className="bia-intg-name">
                {int.name}
                {int.planned && <span className="bia-intg-planned-badge">planned</span>}
              </div>
              <div className="bia-intg-desc">{int.desc}</div>
            </div>
            <div className={`bia-intg-toggle ${int.enabled ? 'on' : 'off'}`} title={int.enabled ? 'enabled' : 'disabled'} />
          </div>
        ))}
      </div>
    </div>
  )
}
