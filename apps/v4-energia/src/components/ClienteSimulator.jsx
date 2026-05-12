import { useState, useEffect } from 'react';
import Btn from './Btn.jsx';
import Info from './Info.jsx';
import StepBar from './StepBar.jsx';
import { KVA_LIST, calcularPropostas } from '../lib/motor.js';
import { criarLead } from '../lib/queries.js';

const S = {
  card:  { background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius)', padding:'14px 16px', boxShadow:'var(--shadow)' },
  inp:   { width:'100%', padding:'8px 10px', fontSize:13, border:'0.5px solid var(--border2)', borderRadius:'var(--radius-sm)', background:'var(--bg2)', color:'var(--text)', outline:'none' },
  lbl:   { fontSize:12, color:'var(--text2)', marginBottom:4, display:'block' },
  row2:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 },
};

const SEG_LABEL = { particular:'Particular', empresa:'Empresa', condominio:'Condomínio' };
const STEPS = ['Segmento', 'Consumo', 'Contrato actual', 'Comparação'];

export default function ClienteSimulator() {
  const [step, setStep] = useState(1);
  const [seg, setSeg] = useState('particular');
  const [kwh, setKwh] = useState(210);
  const [kva, setKva] = useState(6.9);
  const [comercAtual, setComercAtual] = useState('EDP Comercial');
  const [valorAtual, setValorAtual] = useState(67.4);
  const [cpe, setCpe] = useState('');
  const [results, setResults] = useState([]);
  const [selIdx, setSelIdx] = useState(0);
  const [erroFetch, setErroFetch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [leadNome, setLeadNome] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadTel, setLeadTel] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');
  const [aCarregarMotor, setACarregarMotor] = useState(false);

  const escolhido = results[selIdx];

  const correrMotor = async () => {
    setACarregarMotor(true);
    setErroFetch('');
    try {
      // calcularPropostas lê tarifas de BD; usa fallback hardcoded se BD vazia
      const propostas = await calcularPropostas({ kwh_mensal: kwh, kva, segmento: seg });
      // Adicionar campo saving relativo ao valorAtual introduzido pelo utilizador
      const res = propostas.map((p) => ({
        ...p,
        saving: +(valorAtual - p.mensal).toFixed(2),
        annual: +((valorAtual - p.mensal) * 12).toFixed(0),
      }));
      setResults(res);
      setSelIdx(0);
      setStep(4);
    } catch (e) {
      setErroFetch('Erro ao calcular propostas: ' + e.message);
    } finally {
      setACarregarMotor(false);
    }
  };

  const submeter = async () => {
    if (!leadNome || !escolhido) return;
    setEnviando(true);
    setErroEnvio('');
    try {
      const valorNovo = escolhido.mensal;
      const comissao = Math.max(0, Math.round(escolhido.annual * 0.1));
      await criarLead({
        nome: leadNome,
        email: leadEmail || null,
        telefone: leadTel || null,
        segmento: seg,
        cpe: cpe || null,
        kva,
        kwh,
        comercializadora_atual: comercAtual,
        valor_atual: valorAtual,
        valor_novo: valorNovo,
        comissao,
      });
      setEnviado(true);
    } catch (e) {
      setErroEnvio(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const reset = () => {
    setStep(1); setResults([]); setSelIdx(0);
    setShowForm(false); setEnviado(false); setErroFetch('');
    setLeadNome(''); setLeadEmail(''); setLeadTel('');
  };

  return (
    <div>
      <StepBar step={step} steps={STEPS} />

      {erroFetch && <Info color="amber">{erroFetch}</Info>}

      {/* ── STEP 1 · Segmento ───────────────────────────── */}
      {step === 1 && (
        <div>
          <p style={{ fontSize:13, color:'var(--text2)', marginBottom:14 }}>
            Que tipo de cliente é?
          </p>
          <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
            {['particular','empresa','condominio'].map((s) => (
              <div key={s} style={{ flex:'1 1 30%', minWidth:140 }}>
                <Btn primary={seg === s} onClick={() => setSeg(s)} full>
                  {SEG_LABEL[s]}
                </Btn>
              </div>
            ))}
          </div>

          {seg === 'condominio' && (
            <Info color="green">
              <p style={{ fontSize:12, fontWeight:500, margin:0 }}>
                Desconto de grupo 5% aplicado automaticamente ao preço final.
              </p>
            </Info>
          )}

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Btn primary onClick={() => setStep(2)}>Seguinte →</Btn>
          </div>
        </div>
      )}

      {/* ── STEP 2 · Consumo + Potência ─────────────────── */}
      {step === 2 && (
        <div>
          <div style={{ marginBottom:16 }}>
            <label style={S.lbl}>Consumo médio mensal (kWh)</label>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <input
                type="range"
                min={50}
                max={seg === 'condominio' ? 3000 : seg === 'empresa' ? 5000 : 600}
                step={10}
                value={kwh}
                onChange={(e) => setKwh(+e.target.value)}
                style={{ flex:1 }}
              />
              <span style={{ fontSize:13, fontWeight:500, minWidth:80 }}>
                {kwh} kWh
              </span>
            </div>
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={S.lbl}>Potência contratada (kVA)</label>
            <select
              style={S.inp}
              value={kva}
              onChange={(e) => setKva(parseFloat(e.target.value))}
            >
              {KVA_LIST.map((k) => (
                <option key={k} value={k}>{k} kVA</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={S.lbl}>CPE (opcional)</label>
            <input
              style={S.inp}
              value={cpe}
              onChange={(e) => setCpe(e.target.value)}
              placeholder="PT00020000..."
            />
          </div>

          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <Btn onClick={() => setStep(1)}>← Voltar</Btn>
            <Btn primary onClick={() => setStep(3)}>Seguinte →</Btn>
          </div>
        </div>
      )}

      {/* ── STEP 3 · Contrato actual ────────────────────── */}
      {step === 3 && (
        <div>
          <div style={S.row2}>
            <div>
              <label style={S.lbl}>Comercializadora actual</label>
              <input
                style={S.inp}
                value={comercAtual}
                onChange={(e) => setComercAtual(e.target.value)}
              />
            </div>
            <div>
              <label style={S.lbl}>Valor mensal actual (€ c/ IVA)</label>
              <input
                style={S.inp}
                type="number"
                step="0.01"
                value={valorAtual}
                onChange={(e) => setValorAtual(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', marginTop:20 }}>
            <Btn onClick={() => setStep(2)}>← Voltar</Btn>
            <Btn primary onClick={correrMotor} disabled={aCarregarMotor}>
              {aCarregarMotor ? 'A calcular…' : 'Ver poupança possível →'}
            </Btn>
          </div>
        </div>
      )}

      {/* ── STEP 4 · Resultados + CTA ───────────────────── */}
      {step === 4 && results.length > 0 && !enviado && (
        <div>
          <div style={{
            ...S.card,
            background:'rgba(26,82,150,0.06)',
            borderColor:'var(--blue)', marginBottom:14,
          }}>
            <p style={{ fontSize:11, fontWeight:500, color:'var(--muted)', margin:'0 0 3px', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Melhor alternativa — motor próprio TAR 2026 ERSE
            </p>
            <p style={{ fontSize:20, fontWeight:600, color:'var(--blue)', margin:'0 0 3px' }}>
              {results[0].nome} · €{results[0].mensal.toFixed(2)}/mês
            </p>
            <p style={{ fontSize:13, color:'var(--text)', margin:0 }}>
              Poupança anual estimada: <strong style={{ color:'var(--green)' }}>€{Math.max(0, results[0].annual)}</strong>
              {seg === 'condominio' && (
                <span style={{
                  marginLeft:8, fontSize:11, padding:'2px 9px', borderRadius:5,
                  background:'rgba(45,106,79,0.1)', color:'var(--green)', fontWeight:600,
                  fontFamily:'var(--mono)',
                }}>desconto grupo 5% incluído</span>
              )}
            </p>
          </div>

          <div style={{ ...S.card, background:'var(--bg2)', marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ fontSize:11, color:'var(--muted)', margin:'0 0 2px', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  Contrato actual — {comercAtual}
                </p>
                <p style={{ fontSize:18, fontWeight:500, margin:0, fontFamily:'var(--mono)' }}>
                  €{valorAtual.toFixed(2)}/mês
                </p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:11, color:'var(--muted)', margin:'0 0 2px' }}>por ano</p>
                <p style={{ fontSize:16, fontWeight:500, margin:0, fontFamily:'var(--mono)' }}>
                  €{(valorAtual * 12).toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          {results.map((r, i) => (
            <div key={r.id || r.nome} onClick={() => setSelIdx(i)} style={{
              ...S.card, marginBottom:8, cursor:'pointer',
              display:'flex', alignItems:'center', gap:14,
              borderColor: selIdx === i ? 'var(--blue)' : 'var(--border)',
              borderWidth: selIdx === i ? 1.5 : 0.5,
              background: selIdx === i ? 'rgba(26,82,150,0.05)' : 'var(--bg)',
            }}>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:500, margin:'0 0 6px', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  {r.nome}
                  {i === 0 && (
                    <span style={{
                      fontSize:9, padding:'2px 8px', borderRadius:4,
                      background:'rgba(45,106,79,0.12)', color:'var(--green)', fontWeight:600,
                      fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.08em',
                    }}>Melhor preço</span>
                  )}
                  {r.tipo_oferta === 'verde' && (
                    <span style={{
                      fontSize:9, padding:'2px 8px', borderRadius:4,
                      background:'rgba(45,106,79,0.08)', color:'var(--green)', fontWeight:600,
                      fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.08em',
                    }}>Verde</span>
                  )}
                  {r.fonte && r.fonte !== 'manual' && (
                    <span style={{
                      fontSize:9, padding:'2px 8px', borderRadius:4,
                      background:'rgba(140,101,8,0.1)', color:'var(--gold)', fontWeight:600,
                      fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.08em',
                    }}>{r.fonte === 'fallback' ? 'Fallback' : r.fonte === 'erse_scraper' ? 'ERSE' : 'BD'}</span>
                  )}
                </p>
                <div style={{ height:4, background:'var(--surface2)', borderRadius:2 }}>
                  <div style={{
                    height:4,
                    width: Math.min(100, Math.round(r.mensal / valorAtual * 100)) + '%',
                    background: i === 0 ? 'var(--blue)' : 'var(--border)',
                    borderRadius:2,
                  }} />
                </div>
              </div>
              <div style={{ textAlign:'right', minWidth:110 }}>
                <p style={{ fontSize:19, fontWeight:600, margin:0, fontFamily:'var(--mono)' }}>
                  €{r.mensal.toFixed(2)}
                </p>
                {r.saving > 0 ? (
                  <>
                    <p style={{ fontSize:12, color:'var(--green)', margin:0, fontWeight:600, fontFamily:'var(--mono)' }}>
                      −€{r.saving.toFixed(2)}/mês
                    </p>
                    <p style={{ fontSize:11, color:'var(--muted)', margin:0, fontFamily:'var(--mono)' }}>
                      −€{Math.abs(r.annual)}/ano
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize:12, color:'var(--muted)', margin:0 }}>sem poupança</p>
                )}
              </div>
            </div>
          ))}

          <p style={{ fontSize:11, color:'var(--muted)', margin:'8px 0 14px', fontFamily:'var(--mono)' }}>
            Calculado com TAR 2026 ERSE + {results.length} tarifas de BD. Actualizado automaticamente.
          </p>

          {!showForm && (
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <Btn onClick={() => setStep(3)}>← Voltar</Btn>
              <Btn
                primary
                onClick={() => setShowForm(true)}
                disabled={!escolhido || escolhido.saving <= 0}
              >
                {escolhido && escolhido.saving > 0
                  ? 'Quero receber proposta →'
                  : 'Sem poupança nesta opção'}
              </Btn>
            </div>
          )}

          {showForm && (
            <div style={{ ...S.card, marginTop:14, borderColor:'var(--blue)' }}>
              <p style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>
                Os seus dados de contacto
              </p>
              <div style={{ marginBottom:10 }}>
                <label style={S.lbl}>Nome *</label>
                <input style={S.inp} value={leadNome} onChange={(e) => setLeadNome(e.target.value)} />
              </div>
              <div style={S.row2}>
                <div>
                  <label style={S.lbl}>Email</label>
                  <input style={S.inp} type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} />
                </div>
                <div>
                  <label style={S.lbl}>Telefone</label>
                  <input style={S.inp} value={leadTel} onChange={(e) => setLeadTel(e.target.value)} />
                </div>
              </div>
              {erroEnvio && <Info color="amber">{erroEnvio}</Info>}
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:10 }}>
                <Btn onClick={() => setShowForm(false)} disabled={enviando}>← Cancelar</Btn>
                <Btn primary onClick={submeter} disabled={enviando || !leadNome}>
                  {enviando ? 'A enviar…' : 'Enviar pedido'}
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Confirmação final ────────────────────────────── */}
      {enviado && escolhido && (
        <div>
          <div style={{
            ...S.card, borderColor:'var(--green)',
            background:'rgba(45,106,79,0.07)', marginBottom:16,
          }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--green)', margin:'0 0 4px', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Pedido submetido com sucesso
            </p>
            <p style={{ fontSize:19, fontWeight:600, color:'var(--green)', margin:'0 0 4px', fontFamily:'var(--mono)' }}>
              {escolhido.nome} · €{escolhido.mensal.toFixed(2)}/mês
            </p>
            <p style={{ fontSize:13, color:'var(--text)', margin:0 }}>
              Poupança estimada: <strong style={{ color:'var(--green)' }}>€{Math.abs(escolhido.annual)}/ano</strong> · Sem custo para si
            </p>
          </div>
          <div style={S.card}>
            <p style={{ fontSize:13, fontWeight:500, margin:'0 0 12px' }}>O que acontece agora</p>
            {[
              'Pedido recebido e validado — hoje',
              'Contactamos a comercializadora — 24h úteis',
              'Proposta + assinatura digital',
              'Mudança processada — 7–14 dias úteis, sem cortes',
              'Contrato activo — poupança começa',
            ].map((t, i) => (
              <p key={i} style={{ fontSize:12, color:'var(--text2)', margin:'4px 0' }}>
                {i + 1}. {t}
              </p>
            ))}
          </div>
          <div style={{ marginTop:16 }}>
            <Btn onClick={reset}>Nova simulação</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
