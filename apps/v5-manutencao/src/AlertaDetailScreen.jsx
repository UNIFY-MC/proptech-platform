const V = {
  green:     '#1B4332',
  greenMid:  '#2D6A4F',
  greenLt:   '#52B788',
  greenXl:   '#D8F3DC',
  border:    '#e5e5e3',
  bg:        '#f5f5f3',
  text:      '#111',
  slate:     '#555',
  muted:     '#999',
  gold:      '#D4A72C',
  goldLt:    '#FFF4D6',
  coral:     '#E76F51',
  coralLt:   '#FDE4DC',
  purpleDk:  '#26215C',
  purple:    '#534AB7',
}

const ACOES = [
  {
    ic:    '🌊',
    t:     'Verificar caleiras e algerozes',
    sub:   'Telhado score 38/100 · risco alto de entupimento',
    tempo: '15 min self-check',
    pts:   200,
    alto:  true,
  },
  {
    ic:    '🚪',
    t:     'Fechar janelas do sótão',
    sub:   'Previsão de rajadas a Norte · baixa vedação registada',
    tempo: '5 min',
    pts:   50,
    alto:  false,
  },
  {
    ic:    '🔌',
    t:     'Desligar equipamentos ext. no jardim',
    sub:   'Iluminação exterior e bomba piscina',
    tempo: '2 min',
    pts:   50,
    alto:  false,
  },
]

export default function AlertaDetailScreen({ alerta, onBack, onPedirTecnico }) {
  const ic        = alerta?.ic        ?? '🌧️'
  const titulo    = alerta?.titulo    ?? 'Chuva forte próximas 48h'
  const descricao = alerta?.descricao ?? 'Acumulado esperado: 35–50mm · Vento 40 km/h'
  const local     = alerta?.local     ?? 'COIMBRA'

  return (
    <div style={{ minHeight: '100vh', background: V.bg, paddingBottom: 40 }}>

      {/* ── Section 1 — Header gradient azul ── */}
      <div style={{
        background: 'linear-gradient(145deg,#0C447C,#185FA5)',
        padding:    '12px 16px 18px',
        color:      '#fff',
      }}>
        {/* Back row */}
        <div
          style={{ fontSize: 10, opacity: .7, cursor: 'pointer', marginBottom: 10 }}
          onClick={onBack}
        >
          ← Início
        </div>

        {/* Hero row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 46 }}>{ic}</div>
          <div>
            <div style={{
              fontSize:      10,
              color:         'rgba(255,255,255,.7)',
              fontWeight:    700,
              letterSpacing: .5,
            }}>
              ALERTA IPMA · {local}
            </div>
            <div style={{
              fontSize:   18,
              fontWeight: 700,
              fontFamily: 'Georgia, serif',
              lineHeight: 1.2,
            }}>
              {titulo}
            </div>
            <div style={{ fontSize: 11, opacity: .8, marginTop: 2 }}>
              {descricao}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2 — Body title ── */}
      <div style={{
        padding:       '12px 12px 4px',
        fontSize:      9,
        color:         V.muted,
        textTransform: 'uppercase',
        letterSpacing: .4,
        fontWeight:    700,
      }}>
        A IA analisou a tua casa — 3 ações sugeridas
      </div>

      {/* ── Section 3 — Action cards ── */}
      <div style={{ padding: '0 12px' }}>
        {ACOES.map((a, i) => (
          <div key={i} style={{
            background:   '#fff',
            border:       `1px solid ${V.border}`,
            borderRadius: 12,
            padding:      '12px 13px',
            marginBottom: 8,
          }}>
            {/* Top row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 26 }}>{a.ic}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: V.text }}>
                  {a.t}
                </div>
                <div style={{ fontSize: 11, color: V.slate, marginTop: 3, lineHeight: 1.45 }}>
                  {a.sub}
                </div>
                {/* Chips */}
                <div style={{ display: 'flex', gap: 8, marginTop: 7, alignItems: 'center' }}>
                  <span style={{
                    fontSize:     9,
                    color:        V.muted,
                    background:   V.bg,
                    padding:      '2px 7px',
                    borderRadius: 5,
                  }}>
                    ⏱ {a.tempo}
                  </span>
                  <span style={{
                    fontSize:     9,
                    color:        V.gold,
                    background:   V.goldLt,
                    padding:      '2px 7px',
                    borderRadius: 5,
                    fontWeight:   700,
                  }}>
                    +{a.pts} pts
                  </span>
                  {a.alto && (
                    <span style={{
                      fontSize:     9,
                      color:        V.coral,
                      background:   V.coralLt,
                      padding:      '2px 7px',
                      borderRadius: 5,
                      fontWeight:   700,
                    }}>
                      IMPACTO ALTO
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Button row */}
            <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
              <button
                style={{
                  flex:         1,
                  background:   V.green,
                  color:        '#fff',
                  padding:      '8px',
                  borderRadius: 8,
                  fontSize:     11,
                  fontWeight:   700,
                  border:       'none',
                  cursor:       'pointer',
                }}
                onClick={() => alert(`Acção registada! +${a.pts} pontos`)}
              >
                ✓ Já fiz
              </button>
              <button
                style={{
                  flex:         1,
                  background:   V.bg,
                  color:        V.text,
                  padding:      '8px',
                  borderRadius: 8,
                  fontSize:     11,
                  fontWeight:   600,
                  border:       `1px solid ${V.border}`,
                  cursor:       'pointer',
                }}
                onClick={onPedirTecnico}
              >
                Pedir técnico
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Section 4 — Purple AI card ── */}
      <div
        style={{
          margin:       '12px 12px',
          background:   `linear-gradient(135deg,${V.purpleDk},${V.purple})`,
          borderRadius: 12,
          padding:      '12px 14px',
          color:        '#fff',
          cursor:       'pointer',
        }}
        onClick={() => alert('Chat IA disponível na Fase 4')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 26 }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>
              Pergunta à IA sobre tempestades
            </div>
            <div style={{
              fontSize:  10,
              color:     'rgba(255,255,255,.75)',
              marginTop: 2,
            }}>
              "O que devo proteger esta noite?" "A minha cobertura aguenta?"
            </div>
          </div>
          <span style={{ fontSize: 18 }}>💬</span>
        </div>
      </div>

    </div>
  )
}
