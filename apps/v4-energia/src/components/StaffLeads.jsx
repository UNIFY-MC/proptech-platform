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

const ESTADO_COR = {
  novo:             { bg:'rgba(140,101,8,0.1)',  fg:'var(--gold)'   },
  a_analisar:       { bg:'rgba(26,82,150,0.1)',  fg:'var(--blue)'   },
  proposta_enviada: { bg:'rgba(107,79,160,0.1)', fg:'var(--purple)' },
  assinado:         { bg:'rgba(45,106,79,0.1)',  fg:'var(--green)'  },
  activo:           { bg:'rgba(0,0,0,0.06)',     fg:'var(--muted)'  },
};

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
  fontSize:9, fontFamily:'var(--mono)', color:'var(--muted)', fontWeight:600,
  padding:'10px 12px', textAlign:'left', whiteSpace:'nowrap',
  letterSpacing:'0.08em', textTransform:'uppercase',
  borderBottom:'1px solid var(--border)', background:'var(--surface2)',
};
const td = {
  fontSize:12, padding:'10px 12px',
  borderBottom:'1px solid var(--border)', whiteSpace:'nowrap',
};

// onRowClick: prop opcional — recebe o id do lead ao clicar "Ver detalhe"
export default function StaffLeads({ onRowClick }) {
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

  const mudarEstado = async (id, novo, e) => {
    // Impedir que o click na dropdown propague para o onRowClick da linha
    e.stopPropagation();
    const anterior = leads.find((l) => l.id === id)?.estado;
    setLeads((ls) => ls.map((l) => l.id === id ? { ...l, estado:novo } : l));
    setUpdatingId(id);
    try {
      await updateLeadEstado(id, novo);
    } catch (err) {
      setErro(err.message);
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
      {/* Mini KPIs da tabela */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))',
        gap:10, marginBottom:20,
      }}>
        {[
          { l:'Em pipeline',  v:totalPipeline },
          { l:'Activos',      v:totalActivos },
          { l:'Comissões',    v:fEur(totalComissao) },
          { l:'Poupança/ano', v:fEur(totalPoupanca) },
        ].map((m) => (
          <div key={m.l} style={{
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:8, padding:'12px 14px',
          }}>
            <p style={{ fontSize:9, fontFamily:'var(--mono)', letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--muted)', margin:'0 0 5px' }}>{m.l}</p>
            <p style={{ fontSize:20, fontWeight:700, margin:0, fontFamily:'var(--mono)' }}>{m.v}</p>
          </div>
        ))}
      </div>

      {erro && <Info color="red">{erro}</Info>}

      <div style={{
        border:'1px solid var(--border)', borderRadius:8,
        overflow:'hidden', overflowX:'auto', background:'var(--surface)',
      }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:1020 }}>
          <thead>
            <tr>
              <th style={th}>Cliente</th>
              <th style={th}>Segmento</th>
              <th style={th}>Consumo</th>
              <th style={th}>Comercializador</th>
              <th style={th}>Actual</th>
              <th style={th}>Proposto</th>
              <th style={th}>Poupança/ano</th>
              <th style={th}>Comissão</th>
              <th style={th}>Data</th>
              <th style={th}>Estado</th>
              {onRowClick && <th style={th}></th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td style={{ ...td, textAlign:'center', color:'var(--muted)', fontFamily:'var(--mono)', fontSize:11 }} colSpan={onRowClick ? 11 : 10}>
                  A carregar…
                </td>
              </tr>
            )}
            {!loading && leads.length === 0 && (
              <tr>
                <td style={{ ...td, textAlign:'center', color:'var(--muted)' }} colSpan={onRowClick ? 11 : 10}>
                  Sem leads. Submete um pedido pelo Simulador.
                </td>
              </tr>
            )}
            {leads.map((l) => {
              const poupAno = Math.max(0, ((l.valor_atual || 0) - (l.valor_novo || 0)) * 12);
              const cor = ESTADO_COR[l.estado] || ESTADO_COR.novo;
              return (
                <tr
                  key={l.id}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  onClick={onRowClick ? () => onRowClick(l.id) : undefined}
                  onMouseEnter={(e) => { if (onRowClick) e.currentTarget.style.background = 'var(--surface2)'; }}
                  onMouseLeave={(e) => { if (onRowClick) e.currentTarget.style.background = ''; }}
                >
                  <td style={td}>
                    <div style={{ fontWeight:600 }}>{l.nome}</div>
                    {l.pessoa?.email && (
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{l.pessoa.email}</div>
                    )}
                  </td>
                  <td style={td}>{l.segmento || '—'}</td>
                  <td style={{ ...td, fontFamily:'var(--mono)' }}>
                    {l.kwh_mensal_estimado ?? '—'} kWh · {l.kva ?? '—'} kVA
                  </td>
                  <td style={td}>{l.comercializadora_atual || '—'}</td>
                  <td style={{ ...td, fontFamily:'var(--mono)' }}>{fEur(l.valor_atual)}/mês</td>
                  <td style={{ ...td, fontFamily:'var(--mono)', color:'var(--blue)' }}>{fEur(l.valor_novo)}/mês</td>
                  <td style={{ ...td, fontFamily:'var(--mono)', color:'var(--green)', fontWeight:600 }}>{fEur(poupAno)}</td>
                  <td style={{ ...td, fontFamily:'var(--mono)', color:'var(--gold)' }}>{fEur(l.comissao)}</td>
                  <td style={{ ...td, fontFamily:'var(--mono)', fontSize:11 }}>{fData(l.data_pedido)}</td>
                  <td style={td} onClick={(e) => e.stopPropagation()}>
                    <select
                      value={l.estado || 'novo'}
                      disabled={updatingId === l.id}
                      onChange={(e) => mudarEstado(l.id, e.target.value, e)}
                      style={{
                        fontSize:10, padding:'3px 8px', borderRadius:4,
                        background:cor.bg, color:cor.fg, fontWeight:600,
                        border:'1px solid var(--border)', cursor:'pointer',
                        fontFamily:'var(--mono)',
                      }}
                    >
                      {ESTADOS.map((s) => (
                        <option key={s.id} value={s.id}>{s.l}</option>
                      ))}
                    </select>
                  </td>
                  {onRowClick && (
                    <td style={td} onClick={(e) => { e.stopPropagation(); onRowClick(l.id); }}>
                      <button style={{
                        background:'none', border:'1px solid var(--border)', borderRadius:4,
                        padding:'3px 10px', fontSize:10, fontFamily:'var(--mono)',
                        cursor:'pointer', color:'var(--blue)',
                      }}>
                        Ver
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
