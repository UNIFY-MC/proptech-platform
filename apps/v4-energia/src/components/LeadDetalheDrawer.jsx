/* ═══════════════════════════════════════════════════════════════════════
 *  LeadDetalheDrawer — drawer lateral com ficha de cliente/lead
 *  ─────────────────────────────────────────────────────────────────────
 *  Props:
 *    leadId   — id do contrato_energia (lead)
 *    open     — boolean
 *    onClose  — callback para fechar
 *
 *  Secções:
 *    1. Cliente — nome, email, telefone, segmento
 *    2. Contrato — CPE, kVA, kWh, comercializador, valores, comissão
 *    3. Estado — dropdown para mudar estado do lead
 *    4. Facturas — lista de facturas carregadas com preview + apagar
 * ═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  getLeads,
  updateLeadEstado,
  getFacturasPorPessoa,
  apagarFactura,
} from '../lib/queries.js';

// Worker do react-pdf (necessário para renderização)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// ── Helpers ─────────────────────────────────────────────────────────────
function fEur(n) {
  if (n == null) return '—';
  return '€' + Number(n).toLocaleString('pt-PT', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function fData(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ESTADOS = [
  { id: 'novo',             l: 'Novo' },
  { id: 'a_analisar',       l: 'A analisar' },
  { id: 'proposta_enviada', l: 'Proposta enviada' },
  { id: 'assinado',         l: 'Assinado' },
  { id: 'activo',           l: 'Activo' },
];

const ESTADO_COR = {
  novo:             { bg: 'rgba(140,101,8,0.1)',  fg: 'var(--gold)' },
  a_analisar:       { bg: 'rgba(26,82,150,0.1)',  fg: 'var(--blue)' },
  proposta_enviada: { bg: 'rgba(107,79,160,0.1)', fg: 'var(--purple)' },
  assinado:         { bg: 'rgba(45,106,79,0.1)',  fg: 'var(--green)' },
  activo:           { bg: 'rgba(0,0,0,0.06)',     fg: 'var(--muted)' },
};

function confidenceBadge(confidence) {
  if (confidence == null) return null;
  const pct = Math.round(confidence * 100);
  let bg, fg;
  if (confidence >= 0.8) { bg = 'var(--green)'; fg = '#fff'; }
  else if (confidence >= 0.5) { bg = 'var(--gold)'; fg = '#fff'; }
  else { bg = 'var(--red)'; fg = '#fff'; }
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
      padding: '1px 6px', borderRadius: 3, background: bg, color: fg,
    }}>
      {pct}% OCR
    </span>
  );
}

function ocrStatusBadge(status) {
  const map = {
    pending:    { l: 'Pendente',   bg: 'rgba(140,101,8,0.1)',  fg: 'var(--gold)' },
    processing: { l: 'A processar',bg: 'rgba(26,82,150,0.1)',  fg: 'var(--blue)' },
    completed:  { l: 'Concluído',  bg: 'rgba(45,106,79,0.1)',  fg: 'var(--green)' },
    failed:     { l: 'Erro',       bg: 'rgba(139,26,26,0.1)',  fg: 'var(--red)' },
  };
  const c = map[status] || map.pending;
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
      padding: '1px 6px', borderRadius: 3, background: c.bg, color: c.fg,
    }}>
      {c.l}
    </span>
  );
}

// ── ModalConfirmacao ────────────────────────────────────────────────────
function ModalConfirmacao({ mensagem, onConfirmar, onCancelar }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '28px 32px', width: 380, maxWidth: 'calc(100vw - 32px)',
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--text)' }}>
          Confirmar apagamento
        </p>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.5 }}>
          {mensagem}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onCancelar}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              padding: '8px 18px', fontSize: 12, fontFamily: 'var(--mono)',
              cursor: 'pointer', color: 'var(--muted)',
            }}
          >Cancelar</button>
          <button
            onClick={onConfirmar}
            style={{
              background: 'var(--red)', border: 'none', borderRadius: 6,
              padding: '8px 18px', fontSize: 12, fontFamily: 'var(--mono)',
              cursor: 'pointer', color: '#fff', fontWeight: 600,
            }}
          >Apagar</button>
        </div>
      </div>
    </div>
  );
}

// ── PreviewFatura ────────────────────────────────────────────────────────
function PreviewFatura({ fatura }) {
  const [expandido, setExpandido] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [apagado, setApagado] = useState(false);
  const [erroApagar, setErroApagar] = useState('');
  const isPdf = fatura.mime_type === 'application/pdf';

  const handleApagar = async () => {
    setApagando(true);
    setErroApagar('');
    try {
      await apagarFactura(fatura.id);
      setApagado(true);
    } catch (e) {
      setErroApagar(e.message);
    } finally {
      setApagando(false);
      setConfirmando(false);
    }
  };

  if (apagado) {
    return (
      <div style={{
        fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)',
        padding: '8px 0', fontStyle: 'italic',
      }}>
        Fatura apagada.
      </div>
    );
  }

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 8,
      marginBottom: 10, overflow: 'hidden',
    }}>
      {/* Linha de resumo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', background: 'var(--surface2)',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
              {fData(fatura.created_at)}
            </span>
            <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {isPdf ? 'PDF' : 'IMG'}
            </span>
            {ocrStatusBadge(fatura.ocr_status)}
            {fatura.ocr_confidence != null && confidenceBadge(fatura.ocr_confidence)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {fatura.signed_url && (
            <button
              onClick={() => setExpandido((v) => !v)}
              style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 4,
                padding: '4px 10px', fontSize: 10, fontFamily: 'var(--mono)',
                cursor: 'pointer', color: 'var(--blue)',
              }}
            >
              {expandido ? 'Fechar' : 'Ver'}
            </button>
          )}
          <button
            onClick={() => setConfirmando(true)}
            disabled={apagando}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 4,
              padding: '4px 10px', fontSize: 10, fontFamily: 'var(--mono)',
              cursor: 'pointer', color: 'var(--red)',
            }}
          >
            {apagando ? '…' : 'Apagar'}
          </button>
        </div>
      </div>

      {/* Preview expandido */}
      {expandido && fatura.signed_url && (
        <div style={{ padding: 12, background: 'var(--surface)', overflowX: 'auto' }}>
          {isPdf ? (
            <Document
              file={fatura.signed_url}
              onLoadError={(e) => console.error('[PDF load]', e)}
              loading={
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', padding: 8 }}>
                  A carregar PDF…
                </div>
              }
            >
              <Page pageNumber={1} width={Math.min(560, window.innerWidth - 80)} />
            </Document>
          ) : (
            <img
              src={fatura.signed_url}
              alt="Fatura"
              style={{ maxWidth: '100%', borderRadius: 4 }}
            />
          )}
        </div>
      )}

      {erroApagar && (
        <div style={{ padding: '6px 14px', fontSize: 11, color: 'var(--red)', fontFamily: 'var(--mono)' }}>
          {erroApagar}
        </div>
      )}

      {confirmando && (
        <ModalConfirmacao
          mensagem="Esta fatura será apagada permanentemente. Esta acção não pode ser desfeita."
          onConfirmar={handleApagar}
          onCancelar={() => setConfirmando(false)}
        />
      )}
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────
export default function LeadDetalheDrawer({ leadId, open, onClose }) {
  const [lead, setLead] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLead, setErroLead] = useState('');
  const [updatingEstado, setUpdatingEstado] = useState(false);

  useEffect(() => {
    if (!open || !leadId) return;
    carregarDados();
  }, [open, leadId]);

  const carregarDados = async () => {
    setCarregando(true);
    setErroLead('');
    try {
      // Buscar todos os leads e filtrar pelo id (reutiliza getLeads que já junta pessoas)
      const todos = await getLeads();
      const encontrado = todos.find((l) => l.id === leadId);
      if (!encontrado) throw new Error('Lead não encontrado');
      setLead(encontrado);

      // Buscar facturas da pessoa associada
      if (encontrado.pessoa_id) {
        const fs = await getFacturasPorPessoa(encontrado.pessoa_id);
        setFacturas(fs);
      } else {
        setFacturas([]);
      }
    } catch (e) {
      setErroLead(e.message);
    } finally {
      setCarregando(false);
    }
  };

  const mudarEstado = async (novoEstado) => {
    if (!lead) return;
    const anterior = lead.estado;
    setLead((l) => ({ ...l, estado: novoEstado }));
    setUpdatingEstado(true);
    try {
      await updateLeadEstado(lead.id, novoEstado);
    } catch (e) {
      setLead((l) => ({ ...l, estado: anterior }));
      setErroLead(e.message);
    } finally {
      setUpdatingEstado(false);
    }
  };

  // ── Estilos ─────────────────────────────────────────────────────
  const drawerW = 720;

  const S = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(0,0,0,0.35)',
      opacity: open ? 1 : 0,
      pointerEvents: open ? 'auto' : 'none',
      transition: 'opacity .2s',
    },
    drawer: {
      position: 'fixed', top: 0, right: 0,
      width: drawerW, maxWidth: '100vw', height: '100vh',
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
      transform: open ? 'translateX(0)' : `translateX(${drawerW}px)`,
      transition: 'transform .2s ease',
      display: 'flex', flexDirection: 'column',
      zIndex: 950,
      overflowY: 'hidden',
    },
    hdr: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 24px', borderBottom: '1px solid var(--border)',
      flexShrink: 0, background: 'var(--surface)',
    },
    body: {
      flex: 1, overflowY: 'auto', padding: '24px',
    },
    secTitulo: {
      fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: '.12em',
      textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600,
      marginBottom: 12, marginTop: 20, paddingBottom: 6,
      borderBottom: '1px solid var(--border)',
    },
    grid2: {
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', marginBottom: 6,
    },
    labelMono: {
      fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: '.1em',
      textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2,
    },
    valor: {
      fontSize: 13, color: 'var(--text)', fontFamily: 'var(--mono)', fontWeight: 500,
    },
    fecharBtn: {
      background: 'none', border: '1px solid var(--border)', borderRadius: 4,
      padding: '5px 12px', fontSize: 10, fontFamily: 'var(--mono)',
      cursor: 'pointer', color: 'var(--muted)',
    },
  };

  const estadoCor = ESTADO_COR[lead?.estado] || ESTADO_COR.novo;

  return (
    <>
      {/* Overlay */}
      <div style={S.overlay} onClick={onClose} />

      {/* Drawer */}
      <div style={S.drawer}>
        {/* Header */}
        <div style={S.hdr}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              {carregando ? '…' : (lead?.nome || '(sem nome)')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              {lead?.estado && (
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
                  padding: '2px 8px', borderRadius: 4,
                  background: estadoCor.bg, color: estadoCor.fg,
                }}>
                  {ESTADOS.find((e) => e.id === lead.estado)?.l || lead.estado}
                </span>
              )}
            </div>
          </div>
          <button style={S.fecharBtn} onClick={onClose}>Fechar ×</button>
        </div>

        {/* Body */}
        <div style={S.body}>
          {carregando && (
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', padding: '16px 0' }}>
              A carregar…
            </div>
          )}

          {erroLead && (
            <div style={{
              background: 'rgba(139,26,26,0.07)', border: '1px solid var(--red)',
              borderRadius: 6, padding: '10px 14px', fontSize: 12, color: 'var(--red)',
              fontFamily: 'var(--mono)', marginBottom: 16,
            }}>
              {erroLead}
            </div>
          )}

          {!carregando && lead && (
            <>
              {/* ── Secção: Cliente ─────────────────────── */}
              <div style={{ ...S.secTitulo, marginTop: 0 }}>Cliente</div>
              <div style={S.grid2}>
                <div>
                  <div style={S.labelMono}>Nome</div>
                  <div style={S.valor}>{lead.nome}</div>
                </div>
                <div>
                  <div style={S.labelMono}>Segmento</div>
                  <div style={S.valor}>{lead.segmento || '—'}</div>
                </div>
                <div>
                  <div style={S.labelMono}>Email</div>
                  <div style={{ ...S.valor, fontFamily: 'inherit', fontSize: 12, wordBreak: 'break-all' }}>
                    {lead.pessoa?.email || '—'}
                  </div>
                </div>
                <div>
                  <div style={S.labelMono}>Telefone</div>
                  <div style={S.valor}>{lead.pessoa?.telefone || '—'}</div>
                </div>
              </div>

              {/* ── Secção: Contrato ─────────────────────── */}
              <div style={S.secTitulo}>Contrato actual</div>
              <div style={S.grid2}>
                <div>
                  <div style={S.labelMono}>CPE</div>
                  <div style={{ ...S.valor, fontSize: 11 }}>{lead.cpe || '—'}</div>
                </div>
                <div>
                  <div style={S.labelMono}>Potência</div>
                  <div style={S.valor}>{lead.kva != null ? `${lead.kva} kVA` : '—'}</div>
                </div>
                <div>
                  <div style={S.labelMono}>Consumo estimado</div>
                  <div style={S.valor}>{lead.kwh_mensal_estimado != null ? `${lead.kwh_mensal_estimado} kWh/mês` : '—'}</div>
                </div>
                <div>
                  <div style={S.labelMono}>Comercializador actual</div>
                  <div style={S.valor}>{lead.comercializadora_atual || '—'}</div>
                </div>
                <div>
                  <div style={S.labelMono}>Valor actual</div>
                  <div style={{ ...S.valor, color: 'var(--muted)' }}>{fEur(lead.valor_atual)}/mês</div>
                </div>
                <div>
                  <div style={S.labelMono}>Valor proposto</div>
                  <div style={{ ...S.valor, color: 'var(--blue)' }}>{fEur(lead.valor_novo)}/mês</div>
                </div>
                <div>
                  <div style={S.labelMono}>Poupança/ano</div>
                  <div style={{ ...S.valor, color: 'var(--green)' }}>
                    {lead.valor_atual && lead.valor_novo
                      ? fEur(Math.max(0, (lead.valor_atual - lead.valor_novo) * 12))
                      : '—'}
                  </div>
                </div>
                <div>
                  <div style={S.labelMono}>Comissão estimada</div>
                  <div style={{ ...S.valor, color: 'var(--gold)' }}>{fEur(lead.comissao)}</div>
                </div>
              </div>

              {/* ── Secção: Estado ─────────────────────── */}
              <div style={S.secTitulo}>Estado do lead</div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ ...S.labelMono, marginBottom: 8, display: 'block' }}>
                  Alterar estado
                </label>
                <select
                  value={lead.estado || 'novo'}
                  disabled={updatingEstado}
                  onChange={(e) => mudarEstado(e.target.value)}
                  style={{
                    fontSize: 12, padding: '7px 12px', borderRadius: 6,
                    border: '1px solid var(--border)', background: 'var(--surface2)',
                    color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit',
                    width: '100%', maxWidth: 300,
                  }}
                >
                  {ESTADOS.map((s) => (
                    <option key={s.id} value={s.id}>{s.l}</option>
                  ))}
                </select>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 5 }}>
                  Lead criado em {fData(lead.data_pedido)}
                </div>
              </div>

              {/* ── Secção: Facturas ─────────────────────── */}
              <div style={S.secTitulo}>Facturas carregadas</div>

              {facturas.length === 0 ? (
                <div style={{
                  fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)',
                  padding: '16px 0', textAlign: 'center',
                  border: '1px dashed var(--border)', borderRadius: 8,
                }}>
                  Sem facturas carregadas para este cliente
                </div>
              ) : (
                facturas.map((f) => (
                  <PreviewFatura key={f.id} fatura={f} />
                ))
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
