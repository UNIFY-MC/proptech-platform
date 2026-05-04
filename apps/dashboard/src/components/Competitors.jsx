import { Badge } from './shared/Badge.jsx'
import { SourceTag } from './shared/SourceTag.jsx'
import { DrawerSection } from './Drawer.jsx'
import { useDrawer } from '../context/DrawerContext.jsx'

const TIER_LABELS = {
  1: 'Tier 1 — PT Direct',
  2: 'Tier 2 — PT Established',
  3: 'Tier 3 — International Ref',
  4: 'Tier 4 — Silent Watch',
}

const TIER_COLORS = {
  1: 'var(--danger)',
  2: 'var(--warning)',
  3: 'var(--info)',
  4: 'var(--text-dim)',
}

function renderFeature(val) {
  if (val === true)      return <span style={{ color: 'var(--success)' }}>✓</span>
  if (val === false)     return <span style={{ color: 'var(--text-dim)' }}>—</span>
  if (val === 'partial') return <span style={{ color: 'var(--warning)' }}>◐</span>
  return <span style={{ color: 'var(--text-dim)' }}>?</span>
}

export default function Competitors({ data }) {
  const { competitors = [], featureMatrix = [], ourProduct } = data
  const { openDrawer } = useDrawer()

  return (
    <div>
      {/* Cards por tier */}
      {[1, 2, 3, 4].map(tier => {
        const comps = competitors.filter(c => c.tier === tier)
        if (comps.length === 0) return null
        return (
          <div key={tier} style={{ marginBottom: 24 }}>
            <h3 style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 12,
            }}>
              {TIER_LABELS[tier]}
            </h3>
            <div className="grid">
              {comps.map(c => (
                <div
                  key={c.id}
                  className="card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => openDrawer(
                    c.name,
                    `Tier ${c.tier} · ${c.country}`,
                    <div>
                      <DrawerSection label="Descrição">{c.desc}</DrawerSection>
                      <DrawerSection label="Metadata">
                        <pre style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                          {[
                            `País: ${c.country}`,
                            `Fundado: ${c.founded}`,
                            `Funding: ${c.funding}`,
                            `Threat: ${c.threatLevel}`,
                          ].join('\n')}
                        </pre>
                      </DrawerSection>
                      {c.strengths && c.strengths.length > 0 && (
                        <DrawerSection label="Pontos fortes">
                          {c.strengths.map((s, i) => (
                            <div key={i} style={{ padding: '3px 0', fontSize: '0.875rem' }}>+ {s}</div>
                          ))}
                        </DrawerSection>
                      )}
                      {c.weaknesses && c.weaknesses.length > 0 && (
                        <DrawerSection label="Pontos fracos">
                          {c.weaknesses.map((w, i) => (
                            <div key={i} style={{ padding: '3px 0', fontSize: '0.875rem' }}>− {w}</div>
                          ))}
                        </DrawerSection>
                      )}
                      {featureMatrix.length > 0 && (
                        <DrawerSection label="Features vs nós">
                          <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left', padding: '4px 0', color: 'var(--text-dim)', fontWeight: 500, fontSize: '0.7rem' }}>Feature</th>
                                <th style={{ textAlign: 'center', padding: '4px 8px', color: 'var(--text-dim)', fontWeight: 500, fontSize: '0.7rem' }}>{c.name}</th>
                                <th style={{ textAlign: 'center', padding: '4px 8px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.7rem' }}>Nós</th>
                              </tr>
                            </thead>
                            <tbody>
                              {featureMatrix.map(f => (
                                <tr key={f.key} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '4px 0', color: 'var(--text-dim)' }}>{f.label}</td>
                                  <td style={{ textAlign: 'center', padding: '4px 8px' }}>
                                    {renderFeature(c.features?.[f.key])}
                                  </td>
                                  <td style={{ textAlign: 'center', padding: '4px 8px', color: 'var(--primary)' }}>
                                    {renderFeature(ourProduct?.features?.[f.key])}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </DrawerSection>
                      )}
                    </div>
                  )}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: `${TIER_COLORS[c.tier]}22`,
                      color: TIER_COLORS[c.tier],
                    }}>
                      T{c.tier}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 6 }}>
                    {c.country} · {c.threatLevel}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.5 }}>
                    {c.desc ? c.desc.substring(0, 100) + (c.desc.length > 100 ? '…' : '') : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {competitors.length === 0 && (
        <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.875rem', padding: '12px 0' }}>
          Sem dados de competitors.
        </div>
      )}

      <SourceTag source=".claude/strategy/competitors.md" status="live" />

      {/* Feature matrix tabela full */}
      {competitors.length > 0 && featureMatrix.length > 0 && (
        <div className="card" style={{ marginTop: 24, overflowX: 'auto' }}>
          <div className="card-title">Matriz de features</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{
                  textAlign: 'left', padding: '8px',
                  color: 'var(--text-dim)',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                }}>
                  Feature
                </th>
                {competitors.map(c => (
                  <th key={c.id} style={{
                    textAlign: 'center', padding: '8px',
                    color: 'var(--text-dim)',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '0.7rem',
                    whiteSpace: 'nowrap',
                  }}>
                    {c.name}
                  </th>
                ))}
                <th style={{
                  textAlign: 'center', padding: '8px',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  borderBottom: '1px solid var(--border)',
                  fontSize: '0.7rem',
                  whiteSpace: 'nowrap',
                }}>
                  Nós
                </th>
              </tr>
            </thead>
            <tbody>
              {featureMatrix.map(f => (
                <tr key={f.key} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px', fontWeight: 500 }}>{f.label}</td>
                  {competitors.map(c => (
                    <td key={c.id} style={{ textAlign: 'center', padding: '8px' }}>
                      {renderFeature(c.features?.[f.key])}
                    </td>
                  ))}
                  <td style={{ textAlign: 'center', padding: '8px', color: 'var(--primary)' }}>
                    {renderFeature(ourProduct?.features?.[f.key])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
