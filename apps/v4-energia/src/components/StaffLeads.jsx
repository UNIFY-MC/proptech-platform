import { useState, useEffect } from 'react';
import Info from './Info.jsx';
import { getLeads, updateLeadEstado } from '../lib/queries.js';

const ESTADOS = [
  { id:'novo',              l:'Novo' },
  { id:'a_analisar',        l:'A analisar' },
  { id:'proposta_enviada',  l:'Proposta enviada' },
  { id:'assinado',          l:'Assinado' },
  { id:'activo',            l:'Activo' },
];

// Cores de estado — tokens canónicos v1-core (sem amber/teal/gray legados)
const ESTADO_COR = {
  novo:             { bg:'rgba(140,101,8,0.1)',  fg:'var(--gold)'  },
  a_analisar:       { bg:'rgba(26,82,150,0.1)',  fg:'var(--blue)'  },
  proposta_enviada: { bg:'rgba(107,79,160,0.1)', fg:'var(--purple)'},
  assinado:         { bg:'rgba(45,106,79,0.1)',  fg:'var(--green)' },
  activo:           { bg:'rgba(107,100,88,0.1)', fg:'var(--muted)' },
};

const SEG_ICON = { particular:'👤', empresa:'🏢', condominio:'🏗️' };

function fEur(n) {
  if (n == null) return '—';
  return '€' + Number(n).toLocaleString('pt-PT', { maximumFractionDigits: 0 });
}

function fData(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString('pt-PT', { day:'2-digit', month:'short' });
}

const th = {
  fontSize:11, color:'var(--text2)', fontWeight:500,
  padding:'10px 12px', textAlign:'left', whiteSpace:'nowrap',
  borderBottom:'0.5px solid var(--border)', background:'var(--bg2)',
};
const td = {
  fontSize:12, padding:'10px 12px',
  borderBottom:'0.5px solid var(--border)', whiteSpace:'nowrap',
};

export default function StaffLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    getLeads()
      .then((data) => setLeads(data))
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  const mudarEstado = async (id, novo) => {
    const anterior = leads.find((l) => l.id === id)?.estado;
    setLeads((ls) => ls.map((l) => l.id === id ? { ...l, estado:novo } : l));
    setUpdatingId(id);
    try {
      await updateLeadEstado(id, novo);
    } catch (e) {
      setErro(e.message);
      setLeads((ls) => ls.map((l) => l.id === id ? { ...l, estado:anterior } : l));
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPipeline = leads.filter((l) => l.estado !== 'activo').length;
  const totalActivos  = leads.filter((l) => l.estado === 'activo').length;
  const totalComissao = leads
    .filter((l) => ['assinado','activo'].includes(l.estado))
    .reduce((s, l) => s + (l.comissao || 0), 0);
  const totalPoupanca = leads.reduce(
    (s, l) => s + Math.max(0, ((l.valor_atual || 0) - (l.valor_novo || 0)) * 12),
    0
  );

  return (
    <div>
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))',
        gap:10, marginBottom:20,
      }}>
        {[
          { l:'Em pipeline',    v:totalPipeline },
          { l:'Activos',        v:totalActivos },
          { l:'Comissões',      v:fEur(totalComissao) },
          { l:'Poupança/ano',   v:fEur(totalPoupanca) },
        ].map((m) => (
          <div key={m.l} style={{
            background:'var(--bg2)', border:'0.5px solid var(--border)',
            borderRadius:'var(--radius-sm)', padding:'10px 12px',
          }}>
            <p style={{ fontSize:11, color:'var(--text2)', margin:'0 0 4px' }}>{m.l}</p>
            <p style={{ fontSize:20, fontWeight:500, margin:0 }}>{m.v}</p>
          </div>
        ))}
      </div>

      {erro && <Info color="amber">{erro}</Info>}

      <div style={{
        border:'0.5px solid var(--border)', borderRadius:'var(--radius)',
        overflow:'hidden', overflowX:'auto', background:'var(--bg)',
      }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:980 }}>
          <thead>
            <tr>
              <th style={th}>Cliente</th>
              <th style={th}>Segmento</th>
              <th style={th}>Consumo</th>
              <th style={th}>Comerz. actual</th>
              <th style={th}>Actual</th>
              <th style={th}>Proposto</th>
              <th style={th}>Poupança/ano</th>
              <th style={th}>Comissão</th>
              <th style={th}>Data</th>
              <th style={th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td style={{ ...td, textAlign:'center', color:'var(--text3)' }} colSpan={10}>A carregar…</td></tr>
            )}
            {!loading && leads.length === 0 && (
              <tr><td style={{ ...td, textAlign:'center', color:'var(--text3)' }} colSpan={10}>
                Sem leads. Submete um pedido pela vista Cliente.
              </td></tr>
            )}
            {leads.map((l) => {
              const poupAno = Math.max(0, ((l.valor_atual || 0) - (l.valor_novo || 0)) * 12);
              const cor = ESTADO_COR[l.estado] || ESTADO_COR.novo;
              return (
                <tr key={l.id}>
                  <td style={td}>
                    <div style={{ fontWeight:500 }}>{l.nome}</div>
                    {l.pessoa?.email && (
                      <div style={{ fontSize:11, color:'var(--text3)' }}>{l.pessoa.email}</div>
                    )}
                  </td>
                  <td style={td}>
                    {SEG_ICON[l.segmento] || ''} {l.segmento || '—'}
                  </td>
                  <td style={td}>{l.kwh_mensal_estimado ?? '—'} kWh · {l.kva ?? '—'} kVA</td>
                  <td style={td}>{l.comercializadora_atual || '—'}</td>
                  <td style={td}>{fEur(l.valor_atual)}/mês</td>
                  <td style={td}>{fEur(l.valor_novo)}/mês</td>
                  <td style={{ ...td, color:'var(--green)', fontWeight:600, fontFamily:'var(--mono)' }}>{fEur(poupAno)}</td>
                  <td style={td}>{fEur(l.comissao)}</td>
                  <td style={td}>{fData(l.data_pedido)}</td>
                  <td style={td}>
                    <select
                      value={l.estado || 'novo'}
                      disabled={updatingId === l.id}
                      onChange={(e) => mudarEstado(l.id, e.target.value)}
                      style={{
                        fontSize:11, padding:'3px 8px', borderRadius:5,
                        background:cor.bg, color:cor.fg, fontWeight:500,
                        border:'0.5px solid var(--border)', cursor:'pointer',
                      }}
                    >
                      {ESTADOS.map((s) => (
                        <option key={s.id} value={s.id}>{s.l}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
