import { useNavigate } from 'react-router-dom'

export default function BiaHeader({ meta, isEditing }) {
  const navigate = useNavigate()

  return (
    <div className={`bsc-header${isEditing ? ' editing' : ''}`}>
      <button className="bsc-back" onClick={() => navigate(-1)} title="Voltar">←</button>

      <div className="bsc-avatar">{meta.avatarInitial}</div>

      <div className="bsc-title-group">
        <div className="bsc-title-row">
          <span className="bsc-name">{meta.name}</span>
          <span className="bsc-sep">·</span>
          <span className="bsc-role">{meta.role}</span>
          <span className="bsc-vertical">{meta.vertical}</span>
        </div>
        <div className="bsc-subline">
          <span>{meta.model}</span>
          <span className="sep">·</span>
          <span>replies pt-pt</span>
          <span className="sep">·</span>
          <span>last check —</span>
          <span className="sep">·</span>
          <span className="bsc-version-chip">v{meta.version}</span>
        </div>
      </div>

      <div className="bsc-right">
        <span className={`bsc-status-pill ${isEditing ? 'editing' : meta.status}`}>
          {isEditing ? 'editing' : meta.status}
        </span>
        <button
          className="bsc-menu"
          title="Detalhes (Phase 5.1)"
          onClick={() => console.log('[BiaHeader] ⋯ stub — BiaDetailsDrawer Phase 5.1')}
        >
          ⋯
        </button>
      </div>
    </div>
  )
}
