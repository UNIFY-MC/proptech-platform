import { useNavigate } from 'react-router-dom'

export default function BiaHeader({ meta, isEditing }) {
  const navigate = useNavigate()
  const modelShort = meta.model?.replace('claude-', '') || '—'

  return (
    <div className={`bsc-header${isEditing ? ' editing' : ''}`}>
      <button className="bsc-back" onClick={() => navigate(-1)} title="Voltar">←</button>

      <div className="bsc-avatar">{meta.avatarInitial}</div>

      <div className="bsc-title-group">
        <div className="bsc-title-row">
          <span className="bsc-name">{meta.name}</span>
        </div>
        <div className="bsc-desc-row">
          {meta.role} · {meta.vertical}
        </div>
        <div className="bsc-subline">
          <span>Model: {modelShort}</span>
          <span className="sep">·</span>
          <span>Replies: pt-pt</span>
          <span className="sep">·</span>
          <span>v{meta.version}</span>
          <span className="sep">·</span>
          <span>Last check: —</span>
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
