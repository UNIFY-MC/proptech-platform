// RecipeFlowChart — chart visual dos steps de uma recipe (Sprint E)
//
// Layout vertical: cada step é um nó, ligados por edges com seta.
// Cor verde para steps agent, âmbar para human. Click no nó abre detalhe.

import { useMemo, useCallback } from 'react'
import ReactFlow, {
  Background, Controls, MarkerType, Position, Handle,
} from 'reactflow'
import 'reactflow/dist/style.css'

// ─── Custom node: StepNode ─────────────────────────────────────────────────
function StepNode({ data, selected }) {
  const isHuman = data.type === 'human'
  const color = isHuman ? '#f59e0b' : '#10b981'
  const skills = data.skills || []
  return (
    <div style={{
      minWidth: 240, maxWidth: 280,
      background: 'var(--bg-card)',
      border: `2px solid ${selected ? 'var(--primary)' : color}`,
      borderRadius: 8, padding: '10px 12px',
      color: 'var(--text)', cursor: 'pointer',
      boxShadow: selected ? '0 0 0 3px rgba(107,79,160,0.15)' : 'none',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--primary)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>{data.idx + 1}.</span>
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{data.name}</span>
        <span style={{
          fontSize: 8, padding: '1px 5px', borderRadius: 3,
          background: `${color}22`, color: color,
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
          letterSpacing: '0.06em',
        }}>{isHuman ? 'HUMAN' : 'AGENT'}</span>
      </div>
      {data.input && (
        <div style={{
          fontSize: 10, color: 'var(--text-dim)',
          fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', marginBottom: 6,
        }}>{data.input}</div>
      )}
      {skills.length > 0 && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {skills.slice(0, 3).map((tag) => (
            <span key={tag} style={{
              fontSize: 8, padding: '1px 5px', borderRadius: 3,
              background: 'rgba(107,79,160,0.15)', color: 'var(--primary)',
              fontFamily: 'JetBrains Mono, monospace',
            }}>↪ {tag}</span>
          ))}
          {skills.length > 3 && (
            <span style={{ fontSize: 8, color: 'var(--text-dim)' }}>+{skills.length - 3}</span>
          )}
        </div>
      )}
      {data.retry_max > 0 && !isHuman && (
        <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
          retry: {data.retry_max}×
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  )
}

const nodeTypes = { stepNode: StepNode }

// ─── Main ──────────────────────────────────────────────────────────────────
export default function RecipeFlowChart({ steps, onStepClick }) {
  const nodes = useMemo(() => {
    return (steps || []).map((s, i) => ({
      id: `step-${i}`,
      type: 'stepNode',
      position: { x: 0, y: i * 160 },
      data: {
        idx: i,
        name: s.name,
        type: s.type || 'agent',
        input: s.input || '',
        skills: Array.isArray(s.skills) ? s.skills : (s.skill_tag ? [s.skill_tag] : []),
        retry_max: s.retry_max ?? 2,
      },
    }))
  }, [steps])

  const edges = useMemo(() => {
    if (!steps || steps.length < 2) return []
    return steps.slice(0, -1).map((_, i) => ({
      id: `edge-${i}`,
      source: `step-${i}`,
      target: `step-${i + 1}`,
      type: 'smoothstep',
      animated: false,
      style: { stroke: 'var(--border)', strokeWidth: 2, strokeDasharray: '4 4' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--text-dim)' },
    }))
  }, [steps])

  const handleNodeClick = useCallback((_e, node) => {
    if (onStepClick) onStepClick(node.data.idx)
  }, [onStepClick])

  if (!steps || steps.length === 0) {
    return (
      <div style={{
        padding: 24, textAlign: 'center',
        background: 'var(--bg-elevated)', borderRadius: 6,
        color: 'var(--text-dim)', fontSize: 12,
      }}>Sem steps para visualizar.</div>
    )
  }

  return (
    <div style={{
      height: Math.min(steps.length * 170, 600),
      minHeight: 320,
      border: '1px solid var(--border)', borderRadius: 8,
      background: 'var(--bg)',
    }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.1 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        zoomOnScroll={false}
        panOnDrag={true}
      >
        <Background color="var(--border)" gap={16} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
