/* ═══════════════════════════════════════════════════════════════════════
 *  PROPTECH · V2 CONDOMÍNIOS · Command Centre Dashboard
 *  ───────────────────────────────────────────────────────────────────
 *  Stack   : React 19 · Vite 6 · mock data (sem Supabase)
 *  Design  : replicado do v1-core (Inter + JetBrains Mono, design tokens)
 *  Ecrãs   : Command Centre · Edifícios · Financeiro · Operações
 *            Seguros & Energia · Condóminos · Marketing
 *  Nota    : CSS injectado via <style> tag (sem ficheiros CSS externos)
 * ═══════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';

/* ─── HELPERS ─────────────────────────────────────────────────────── */

const eur = (v, d = 0) =>
  Number(v || 0).toLocaleString('pt-PT', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: d, maximumFractionDigits: d,
  });

const fdate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fdateShort = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
};

/* ─── MOCK DATA ───────────────────────────────────────────────────── */

const EDIFICIOS = [
  {
    id: 'edf-a', nome: 'Edf. Alameda', morada: 'Av. Almirante Reis 45, Lisboa',
    fracoes: 12, saude: 'green',
    financeiro: { emitido: 2340, cobrado: 2120, mora: 220, saldo: 8430, moraPct: 9.4 },
    seguro: { seguradora: 'Fidelidade', premio: 1240, vence: '2026-09-30', diasRestantes: 148 },
    energia: { comercializador: 'EDP Comercial', precoKwh: 0.182, vence: null, poupancaPot: 0 },
    ots: 1, assembleiaProx: '2026-06-15',
  },
  {
    id: 'edf-b', nome: 'Edf. Marquês', morada: 'R. Alexandre Herculano 12, Lisboa',
    fracoes: 8, saude: 'gold',
    financeiro: { emitido: 1560, cobrado: 1340, mora: 220, saldo: 4210, moraPct: 14.1 },
    seguro: { seguradora: 'Tranquilidade', premio: 980, vence: '2026-06-15', diasRestantes: 41 },
    energia: { comercializador: 'Endesa', precoKwh: 0.164, vence: '2027-03-01', poupancaPot: 0 },
    ots: 0, assembleiaProx: null,
  },
  {
    id: 'edf-c', nome: 'Edf. Restelo', morada: 'R. de Belém 78, Lisboa',
    fracoes: 6, saude: 'red',
    financeiro: { emitido: 900, cobrado: 720, mora: 180, saldo: 2180, moraPct: 20.0 },
    seguro: { seguradora: 'Generali', premio: 1100, vence: '2026-05-10', diasRestantes: 5 },
    energia: { comercializador: 'Iberdrola', precoKwh: 0.189, vence: '2027-01-01', poupancaPot: 380 },
    ots: 2, assembleiaProx: '2026-05-20',
  },
];

const APROVACOES = [
  { id: 'ap-1', urgencia: 'red', employee: 'Marco', titulo: 'Adjudicar OT — elevador Edf. Alameda', detalhe: 'Empresa: Lift Express Lda. Custo: €380. Prazo: 3 dias úteis.', recomendacao: 'Lift Express (rating 4.8, taxa prazo 92%)', valor: 380, tipo: 'manutencao' },
  { id: 'ap-2', urgencia: 'red', employee: 'Sofia', titulo: 'Participar sinistro — Edf. Restelo', detalhe: 'Infiltração cobertura. Data ocorrência: 07 Mai. Prazo legal: 15 Mai (8 dias).', recomendacao: 'Participar via Generali — prazo a 3 dias', valor: null, tipo: 'seguro' },
  { id: 'ap-3', urgencia: 'gold', employee: 'Fina', titulo: '18 avisos de mora — rever e aprovar envio', detalhe: 'Edf. Alameda: 4 | Edf. Marquês: 8 | Edf. Restelo: 6. Total em mora: €620.', recomendacao: 'Todos os drafts dentro dos parâmetros normais', valor: null, tipo: 'financeiro' },
  { id: 'ap-4', urgencia: 'gold', employee: 'Assie', titulo: 'Convocatória assembleia — Edf. Restelo', detalhe: 'Data proposta: 20 Mai 2026, 21h00. Ordem do dia: aprovação contas 2025, quotas 2026.', recomendacao: 'Prazo convocatória OK (13 dias)', valor: null, tipo: 'assembleia' },
  { id: 'ap-5', urgencia: 'none', employee: 'Gabi', titulo: 'Escalar budget campanha V5 +20%', detalhe: 'Campanha Meta Ads. ROAS actual: 3.2 (7 dias). Budget actual: €14/dia.', recomendacao: 'ROAS ≥ 3 — critérios cumpridos para escalar', valor: null, tipo: 'marketing' },
];

const INBOX = [
  { id: 'ib-1', employee: 'Fina', avatar: 'F', color: '#2d6a4f', ts: '08h12', msg: 'Geradas 42 quotas Maio 2026 — €4.800 emitidos em 3 edifícios', tipo: 'ok' },
  { id: 'ib-2', employee: 'Enzo', avatar: 'E', color: '#8c6508', ts: '08h05', msg: 'Simulação tarifária Edf. Restelo: poupança potencial €380/ano com Endesa Green+', tipo: 'alert' },
  { id: 'ib-3', employee: 'Dora', avatar: 'D', color: '#1a5296', ts: '07h55', msg: '3 faturas OCR processadas (100%) — 1 pendente revisão (confiança 78%): Fatura EDP Restelo', tipo: 'warn' },
  { id: 'ib-4', employee: 'Leo', avatar: 'L', color: '#6b4fa0', ts: '07h30', msg: '2 leads quentes V2 (score 82 e 78) encaminhados — 1 lead V5 em nurturing D+0', tipo: 'ok' },
  { id: 'ib-5', employee: 'Cami', avatar: 'C', color: '#1a6b6b', ts: '07h20', msg: 'Enviados 6 avisos mora (4 email, 2 carta) — 0 bounces. Resend IDs registados.', tipo: 'ok' },
  { id: 'ib-6', employee: 'Sofia', avatar: 'S', color: '#8b1a1a', ts: 'ontem', msg: 'Seguro Edf. Marquês vence em 41 dias — simulação de mercado iniciada (3 seguradoras)', tipo: 'warn' },
];

const RECEBIMENTOS = [
  { id: 'r-1', edificio: 'Edf. Alameda', fracao: '3B', condomino: 'João Silva', valor: 195, vencimento: '2026-04-08', diasMora: 47, estado: 'mora', aviso: '2º aviso' },
  { id: 'r-2', edificio: 'Edf. Marquês', fracao: '1A', condomino: 'Maria Costa', valor: 220, vencimento: '2026-03-08', diasMora: 91, estado: 'mora_grave', aviso: 'GRAVE' },
  { id: 'r-3', edificio: 'Edf. Marquês', fracao: '2C', condomino: 'António Pereira', valor: 220, vencimento: '2026-04-08', diasMora: 47, estado: 'mora', aviso: '2º aviso' },
  { id: 'r-4', edificio: 'Edf. Restelo', fracao: '1D', condomino: 'Carla Mendes', valor: 150, vencimento: '2026-04-08', diasMora: 47, estado: 'mora', aviso: '1º aviso' },
  { id: 'r-5', edificio: 'Edf. Restelo', fracao: '2A', condomino: 'Rui Ferreira', valor: 150, vencimento: '2026-03-08', diasMora: 91, estado: 'mora_grave', aviso: 'GRAVE' },
];

const CONDOMINOS = [
  { id: 'c-1', nome: 'João Silva', email: 'joao.silva@gmail.com', tel: '912 345 678', edificio: 'Edf. Alameda', fracoes: ['3B'], quota: 195, estado: 'mora', portal: true },
  { id: 'c-2', nome: 'Maria Costa', email: 'maria.costa@gmail.com', tel: '913 456 789', edificio: 'Edf. Marquês', fracoes: ['1A', '2C'], quota: 440, estado: 'mora_grave', portal: true },
  { id: 'c-3', nome: 'António Pereira', email: 'ant.pereira@sapo.pt', tel: '914 567 890', edificio: 'Edf. Marquês', fracoes: ['2C'], quota: 220, estado: 'mora', portal: false },
  { id: 'c-4', nome: 'Carla Mendes', email: 'cmendes@outlook.pt', tel: '915 678 901', edificio: 'Edf. Restelo', fracoes: ['1D'], quota: 150, estado: 'mora', portal: true },
  { id: 'c-5', nome: 'Rui Ferreira', email: 'rui.ferreira@gmail.com', tel: '916 789 012', edificio: 'Edf. Restelo', fracoes: ['2A'], quota: 150, estado: 'mora_grave', portal: false },
  { id: 'c-6', nome: 'Ana Rodrigues', email: 'ana.rodrigues@gmail.com', tel: '917 890 123', edificio: 'Edf. Alameda', fracoes: ['1A'], quota: 195, estado: 'ok', portal: true },
  { id: 'c-7', nome: 'Pedro Santos', email: 'pedro.santos@gmail.com', tel: '918 901 234', edificio: 'Edf. Alameda', fracoes: ['2B'], quota: 195, estado: 'ok', portal: true },
];

const FATURAS = [
  { fornecedor: 'Lift Express Lda.', desc: 'Manutenção elevador', valor: 380, vence: '2026-05-15', estado: 'aprovada', edificio: 'Edf. Alameda' },
  { fornecedor: 'EDP Comercial', desc: 'Energia partes comuns', valor: 312, vence: '2026-05-20', estado: 'pendente', edificio: 'Edf. Restelo' },
  { fornecedor: 'CleanPro', desc: 'Limpeza Abril', valor: 180, vence: '2026-05-10', estado: 'paga', edificio: 'Edf. Marquês' },
];

const OTS = [
  { edificio: 'Edf. Alameda', desc: 'Reparação elevador', prestador: 'Lift Express', custo: 380, estado: 'pendente_aprovacao', urgencia: 'urgente' },
  { edificio: 'Edf. Restelo', desc: 'Infiltração cobertura', prestador: '—', custo: null, estado: 'aberta', urgencia: 'urgente' },
  { edificio: 'Edf. Restelo', desc: 'Torneira jardim avariada', prestador: 'FixIt Lda.', custo: 85, estado: 'em_curso', urgencia: 'normal' },
];

const DOCS_RECENTES = [
  { edificio: 'Edf. Restelo', tipo: 'Fatura', titulo: 'Fatura EDP Mai 2026', data: '2026-05-04', ocr: 'pendente' },
  { edificio: 'Edf. Alameda', tipo: 'Contrato', titulo: 'Contrato Lift Express', data: '2026-05-03', ocr: 'ok' },
  { edificio: 'Edf. Marquês', tipo: 'Fatura', titulo: 'Fatura CleanPro Abr', data: '2026-05-02', ocr: 'ok' },
  { edificio: 'Edf. Restelo', tipo: 'Acta', titulo: 'Acta Assembleia Mar 2026', data: '2026-03-20', ocr: 'n/a' },
  { edificio: 'Edf. Alameda', tipo: 'Seguro', titulo: 'Apólice Fidelidade 2026', data: '2026-01-10', ocr: 'n/a' },
];

const EV = [
  { fracao: '3B', posto: 'EV-01', kwh: 124, valor: 22.8, faturado: false },
  { fracao: '1C', posto: 'EV-02', kwh: 89, valor: 16.4, faturado: false },
];

const PIPELINE = [
  { cliente: 'Gestora XYZ', vertical: 'V2', produto: 'Gestão condomínios', estado: 'em_proposta', valor: 3600 },
  { cliente: 'João Proprietário', vertical: 'V5', produto: 'Home+', estado: 'lead', valor: 180 },
  { cliente: 'Edifício Beta', vertical: 'V2', produto: 'Gestão condomínios', estado: 'contactado', valor: 2400 },
];

const CAMPANHAS = [
  { vertical: 'V5', canal: 'Meta Ads', budget: 14, roas: 3.2, estado: 'ok' },
  { vertical: 'V2', canal: 'LinkedIn', budget: 8, roas: 1.8, estado: 'atencao' },
];

/* ─── CSS ─────────────────────────────────────────────────────────── */

const APP_CSS = `
/* RESET & BASE */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;overflow:hidden}
body{font-family:'Inter',system-ui,sans-serif;font-size:13px;color:#18160f;-webkit-font-smoothing:antialiased;background:#f4f3f0}
body.dark{background:#0d1117;color:#e6edf3}

/* CSS VARS */
:root{
  --bg:#f4f3f0;--surface:#ffffff;--surface2:#f0eeeb;--surface3:#e8e6e2;
  --border:rgba(0,0,0,0.08);--border2:rgba(0,0,0,0.15);
  --text:#18160f;--muted:#6b6458;
  --blue:#1a5296;--green:#2d6a4f;--red:#8b1a1a;--gold:#8c6508;--purple:#6b4fa0;--teal:#1a6b6b;
  --mono:'JetBrains Mono','Fira Mono',monospace;
  --sb-w:190px;
}
body.dark{
  --bg:#0d1117;--surface:#161b22;--surface2:#1c2333;--surface3:#243047;
  --border:rgba(255,255,255,0.08);--border2:rgba(255,255,255,0.15);
  --text:#e6edf3;--muted:#9198a1;
  --blue:#58a6ff;--green:#3fb950;--red:#ff7b72;--gold:#e3b341;--purple:#d2a8ff;--teal:#39d353;
}

/* APP SHELL */
.s-app{position:fixed;inset:0;display:flex;flex-direction:row;background:var(--bg)}

/* SIDEBAR */
.sb{width:var(--sb-w);flex-shrink:0;background:var(--surface);border-right:1px solid var(--border);height:100%;display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;transition:width .18s ease}
.sb.col{width:44px}
.sb-head{padding:14px 14px 10px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:8px;min-height:64px}
.sb-brand{flex:1;min-width:0;overflow:hidden}
.sb-logo{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--blue);font-family:var(--mono)}
.sb-user{font-size:10px;color:var(--muted);font-family:var(--mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}
.sb-toggle{background:none;border:1px solid var(--border);color:var(--muted);width:22px;height:22px;border-radius:3px;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;transition:all .15s}
.sb-toggle:hover{border-color:var(--blue);color:var(--blue)}
.sb-sec{font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-family:var(--mono);padding:12px 14px 4px;white-space:nowrap;overflow:hidden}
.nav-btn{display:flex;align-items:center;gap:8px;padding:6px 14px;cursor:pointer;color:var(--muted);font-size:12px;font-weight:400;transition:all .1s;border:none;background:none;width:calc(100% - 12px);text-align:left;border-radius:4px;margin:1px 6px;white-space:nowrap;overflow:hidden}
.nav-btn:hover{background:var(--surface2);color:var(--text)}
.nav-btn.on{background:rgba(26,82,150,.08);color:var(--blue);font-weight:600}
body.dark .nav-btn.on{background:rgba(88,166,255,.1)}
.ni{font-size:14px;flex-shrink:0;width:16px;text-align:center}
.nav-txt{overflow:hidden;text-overflow:ellipsis}
.sb.col .sb-brand,.sb.col .sb-sec,.sb.col .nav-txt{display:none}
.sb.col .nav-btn{padding:8px;justify-content:center;width:calc(100% - 8px);margin:1px 4px;gap:0}
.sb.col .sb-head{justify-content:center;padding:10px}
.sb.col .sb-toggle{margin:0}

/* MAIN */
.main{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;overflow:hidden}

/* TOPBAR */
.topbar{padding:0 20px;height:52px;border-bottom:1px solid var(--border);background:var(--surface);display:flex;align-items:center;gap:12px;flex-shrink:0}
.topbar-title{font-size:14px;font-weight:600;flex:1;color:var(--text)}
.topbar-time{font-family:var(--mono);font-size:11px;color:var(--muted)}
.topbar-badge{font-family:var(--mono);font-size:9px;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:3px 8px;border-radius:4px}
.theme-btn{background:none;border:1px solid var(--border);border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;color:var(--muted);transition:all .15s;font-family:'Inter',sans-serif}
.theme-btn:hover{border-color:var(--blue);color:var(--blue)}

/* CONTENT */
.content{flex:1;overflow-y:auto;padding:20px 24px;background:var(--bg)}

/* CRITICAL STRIP */
.strip{background:var(--surface2);border-bottom:1px solid var(--border);padding:7px 24px;display:flex;gap:24px;align-items:center;flex-shrink:0}
.strip-item{font-family:var(--mono);font-size:11px;cursor:pointer;color:var(--text);transition:color .1s;display:flex;align-items:center;gap:5px;padding:2px 0}
.strip-item:hover{color:var(--blue)}
.strip-sep{color:var(--border2);font-size:14px}

/* KPI */
.kpi-grid{display:grid;gap:12px}
.kpi-grid-2{grid-template-columns:repeat(2,1fr)}
.kpi-grid-4{grid-template-columns:repeat(4,1fr)}
.kpi{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px 16px}
.kpi-l{font-family:var(--mono);font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.kpi-v{font-family:var(--mono);font-size:24px;font-weight:700;color:var(--text);line-height:1.1}
.kpi-s{font-family:var(--mono);font-size:10px;color:var(--muted);margin-top:4px}
.kpi-s.up{color:var(--green)}
.kpi-s.down{color:var(--red)}

/* BADGE */
.badge{font-family:var(--mono);font-size:9px;padding:2px 7px;border-radius:4px;display:inline-flex;align-items:center;font-weight:500;letter-spacing:.03em}
.badge.green{background:rgba(45,106,79,.12);color:var(--green)}
.badge.red{background:rgba(139,26,26,.12);color:var(--red)}
.badge.gold{background:rgba(140,101,8,.12);color:var(--gold)}
.badge.blue{background:rgba(26,82,150,.12);color:var(--blue)}
.badge.purple{background:rgba(107,79,160,.12);color:var(--purple)}
.badge.teal{background:rgba(26,107,107,.12);color:var(--teal)}
.badge.dim{background:var(--surface2);color:var(--muted)}
body.dark .badge.green{background:rgba(63,185,80,.12)}
body.dark .badge.red{background:rgba(255,123,114,.12)}
body.dark .badge.gold{background:rgba(227,179,65,.12)}
body.dark .badge.blue{background:rgba(88,166,255,.12)}
body.dark .badge.purple{background:rgba(210,168,255,.12)}
body.dark .badge.teal{background:rgba(57,211,83,.12)}

/* TABLE */
.tbl-wrap{overflow-x:auto;border-radius:8px;border:1px solid var(--border)}
.tbl{width:100%;border-collapse:collapse}
.tbl th{font-family:var(--mono);font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);padding:8px 12px;text-align:left;background:var(--surface);border-bottom:1px solid var(--border);white-space:nowrap}
.tbl td{font-size:12px;padding:9px 12px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tbody tr:hover td{background:var(--surface2)}

/* CARD */
.card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px}
.card-t{font-size:13px;font-weight:600;color:var(--text)}
.card-sub{font-size:11px;color:var(--muted);margin-top:2px}

/* BUTTONS */
.btn{padding:6px 14px;border-radius:4px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid transparent;transition:all .12s;font-family:'Inter',sans-serif}
.btn-green{background:var(--green);color:#fff;border-color:var(--green)}
.btn-green:hover{opacity:.85}
.btn-outline{background:none;border:1px solid var(--border2);color:var(--text)}
.btn-outline:hover{border-color:var(--blue);color:var(--blue)}
.btn-red-text{background:none;border:none;color:var(--red);cursor:pointer;font-size:12px;padding:6px 8px;font-family:'Inter',sans-serif}
.btn-red-text:hover{text-decoration:underline}
.btn-blue{background:var(--blue);color:#fff;border-color:var(--blue)}
.btn-blue:hover{opacity:.85}

/* APPROVAL CARD */
.ap-card{border-radius:8px;padding:14px;margin-bottom:10px;border:1px solid var(--border);background:var(--surface)}
.ap-card.red{border-left:3px solid var(--red);background:rgba(139,26,26,.04)}
.ap-card.gold{border-left:3px solid var(--gold);background:rgba(140,101,8,.04)}
body.dark .ap-card.red{background:rgba(255,123,114,.05)}
body.dark .ap-card.gold{background:rgba(227,179,65,.05)}
.ap-title{font-size:13px;font-weight:600;color:var(--text);margin:6px 0 4px}
.ap-detail{font-size:11px;color:var(--muted);margin-bottom:6px;line-height:1.5}
.ap-rec{font-size:11px;color:var(--text);margin-bottom:10px;padding:6px 8px;background:var(--surface2);border-radius:4px}
.ap-rec strong{font-weight:600;color:var(--blue)}
.ap-actions{display:flex;gap:8px;align-items:center}
.ap-approved{color:var(--green);font-family:var(--mono);font-size:11px;font-weight:600}
.ap-group-title{font-family:var(--mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:16px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--border)}

/* INBOX */
.inbox-item{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)}
.inbox-item:last-child{border-bottom:none}
.avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:12px;font-weight:600;color:#fff;flex-shrink:0}
.inbox-body{flex:1;min-width:0}
.inbox-meta{display:flex;gap:8px;align-items:center;margin-bottom:3px}
.inbox-name{font-size:12px;font-weight:600;color:var(--text)}
.inbox-ts{font-family:var(--mono);font-size:10px;color:var(--muted)}
.inbox-msg{font-size:12px;color:var(--muted);line-height:1.5}

/* EDIFICIO CARD */
.edf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.edf-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px;cursor:pointer;transition:box-shadow .15s}
.edf-card:hover{box-shadow:0 2px 12px rgba(0,0,0,.08)}
.edf-saude{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px;flex-shrink:0}
.edf-saude.green{background:var(--green)}
.edf-saude.gold{background:var(--gold)}
.edf-saude.red{background:var(--red)}
.edf-name{font-size:14px;font-weight:600;color:var(--text);display:flex;align-items:center}
.edf-addr{font-size:11px;color:var(--muted);margin:3px 0 10px}
.edf-stats{font-family:var(--mono);font-size:10px;color:var(--muted);margin-bottom:12px}
.edf-row{display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid var(--border)}
.edf-row:last-of-type{border-bottom:none}
.edf-row-l{color:var(--muted)}
.edf-row-r{font-family:var(--mono);font-size:11px;font-weight:500}

/* HEALTH CARDS */
.health-card{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:box-shadow .15s;margin-bottom:8px}
.health-card:hover{box-shadow:0 2px 8px rgba(0,0,0,.06)}
.health-info{flex:1;min-width:0}
.health-name{font-size:13px;font-weight:600;color:var(--text)}
.health-sub{font-size:11px;color:var(--muted);margin-top:2px}

/* TABS */
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:20px}
.tab-btn{padding:8px 16px;font-size:12px;cursor:pointer;background:none;border:none;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .12s;font-family:'Inter',sans-serif}
.tab-btn.on{color:var(--blue);border-bottom-color:var(--blue);font-weight:600}
.tab-btn:hover{color:var(--text)}

/* SECTION HEADER */
.sec-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.sec-hd-l{display:flex;align-items:center;gap:10px}
.pt{font-size:18px;font-weight:700;color:var(--text)}
.pt-sm{font-size:15px;font-weight:700;color:var(--text)}

/* TWO COL LAYOUT */
.two-col{display:grid;grid-template-columns:60% 40%;gap:20px;align-items:start}

/* DRAWER */
.drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:200;display:flex;justify-content:flex-end}
.drawer{width:420px;max-width:95vw;height:100%;background:var(--surface);border-left:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
.drawer-head{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.drawer-title{font-size:14px;font-weight:600;color:var(--text)}
.drawer-close{background:none;border:1px solid var(--border);border-radius:4px;width:26px;height:26px;cursor:pointer;font-size:14px;color:var(--muted);display:flex;align-items:center;justify-content:center}
.drawer-body{flex:1;overflow-y:auto;padding:20px}
.drawer-field{margin-bottom:14px}
.drawer-field-l{font-family:var(--mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
.drawer-field-v{font-size:13px;color:var(--text)}

/* FILTER BAR */
.filter-bar{display:flex;gap:8px;align-items:center;margin-bottom:16px;flex-wrap:wrap}
.filter-input{flex:1;min-width:180px;max-width:280px;padding:7px 12px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:12px;font-family:'Inter',sans-serif;outline:none}
.filter-input:focus{border-color:var(--blue)}
.filter-btn{padding:6px 12px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--muted);font-size:11px;cursor:pointer;font-family:'Inter',sans-serif;transition:all .12s}
.filter-btn.on{background:var(--blue);color:#fff;border-color:var(--blue)}
.filter-btn:hover:not(.on){border-color:var(--blue);color:var(--blue)}

/* SECTION COLLAPSE */
.sec-collapse{margin-bottom:20px}
.sec-collapse-hd{display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;user-select:none;transition:background .12s}
.sec-collapse-hd:hover{background:var(--surface2)}
.sec-collapse-title{font-size:13px;font-weight:600;flex:1;color:var(--text)}
.sec-collapse-body{padding-top:12px}

/* BACK BTN */
.back-btn{background:none;border:none;color:var(--blue);cursor:pointer;font-size:12px;font-family:'Inter',sans-serif;padding:0;display:flex;align-items:center;gap:4px;margin-bottom:12px}
.back-btn:hover{text-decoration:underline}

/* EMPTY STATE */
.empty{text-align:center;padding:40px 20px;color:var(--muted);font-size:13px}

/* SPINNER */
.spinner{display:inline-block;width:16px;height:16px;border:2px solid var(--border2);border-top-color:var(--blue);border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* SCROLLBAR */
.content::-webkit-scrollbar,.drawer-body::-webkit-scrollbar,.sb::-webkit-scrollbar{width:5px}
.content::-webkit-scrollbar-track,.drawer-body::-webkit-scrollbar-track,.sb::-webkit-scrollbar-track{background:transparent}
.content::-webkit-scrollbar-thumb,.drawer-body::-webkit-scrollbar-thumb,.sb::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
`;

/* ─── SMALL COMPONENTS ────────────────────────────────────────────── */

function Badge({ cls, children }) {
  return <span className={`badge ${cls || 'dim'}`}>{children}</span>;
}

function Kpi({ label, value, sub, subCls }) {
  return (
    <div className="kpi">
      <div className="kpi-l">{label}</div>
      <div className="kpi-v">{value}</div>
      {sub && <div className={`kpi-s ${subCls || ''}`}>{sub}</div>}
    </div>
  );
}

function Spinner() {
  return <span className="spinner" />;
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 40 }}>
      <Spinner /> <span style={{ color: 'var(--muted)', fontSize: 13 }}>A carregar...</span>
    </div>
  );
}

function estadoBadge(estado) {
  const map = {
    mora: ['gold', 'Em mora'],
    mora_grave: ['red', 'Mora grave'],
    ok: ['green', 'OK'],
    pendente_aprovacao: ['gold', 'Pend. aprovação'],
    aberta: ['red', 'Aberta'],
    em_curso: ['blue', 'Em curso'],
    aprovada: ['green', 'Aprovada'],
    pendente: ['gold', 'Pendente'],
    paga: ['dim', 'Paga'],
    em_proposta: ['gold', 'Em proposta'],
    lead: ['purple', 'Lead'],
    contactado: ['blue', 'Contactado'],
  };
  const [cls, label] = map[estado] || ['dim', estado];
  return <Badge cls={cls}>{label}</Badge>;
}

function useLoadSim() {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);
  return ready;
}

/* ─── DRAWER CONDÓMINO ────────────────────────────────────────────── */

function DrawerCondomino({ cond, onClose }) {
  const historico = [
    { mes: 'Abril 2026', estado: 'mora', valor: cond.quota },
    { mes: 'Março 2026', estado: cond.estado === 'mora_grave' ? 'mora' : 'ok', valor: cond.quota },
    { mes: 'Fevereiro 2026', estado: 'ok', valor: cond.quota },
  ];
  const [portalActive, setPortalActive] = React.useState(cond.portal);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-head">
          <span className="drawer-title">{cond.nome}</span>
          <button className="drawer-close" onClick={onClose}>×</button>
        </div>
        <div className="drawer-body">
          <div className="drawer-field">
            <div className="drawer-field-l">Email</div>
            <div className="drawer-field-v">{cond.email}</div>
          </div>
          <div className="drawer-field">
            <div className="drawer-field-l">Telefone</div>
            <div className="drawer-field-v">{cond.tel}</div>
          </div>
          <div className="drawer-field">
            <div className="drawer-field-l">Edifício / Fracções</div>
            <div className="drawer-field-v">{cond.edificio} · {cond.fracoes.join(', ')}</div>
          </div>
          <div className="drawer-field">
            <div className="drawer-field-l">Quota mensal</div>
            <div className="drawer-field-v" style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{eur(cond.quota)}</div>
          </div>
          <div className="drawer-field">
            <div className="drawer-field-l">Estado</div>
            <div className="drawer-field-v">{estadoBadge(cond.estado)}</div>
          </div>

          <div style={{ margin: '20px 0 8px', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Histórico pagamentos (últimos 3 meses)
          </div>
          <div className="tbl-wrap" style={{ marginBottom: 16 }}>
            <table className="tbl">
              <thead><tr><th>Mês</th><th>Valor</th><th>Estado</th></tr></thead>
              <tbody>
                {historico.map((h, i) => (
                  <tr key={i}>
                    <td>{h.mes}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{eur(h.valor)}</td>
                    <td>{estadoBadge(h.estado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ margin: '0 0 8px', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Pedidos abertos
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>Nenhum pedido aberto.</div>

          <div style={{ margin: '0 0 8px', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Acesso ao portal
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Badge cls={portalActive ? 'green' : 'dim'}>{portalActive ? 'Activo' : 'Inactivo'}</Badge>
            {portalActive && (
              <button className="btn btn-red-text" onClick={() => setPortalActive(false)}>
                Desactivar portal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ECRÃ 1: COMMAND CENTRE ──────────────────────────────────────── */

function ApCard({ ap, state, onAprovar, onRejeitar }) {
  return (
    <div className={`ap-card ${ap.urgencia === 'red' ? 'red' : ap.urgencia === 'gold' ? 'gold' : ''}`}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Badge cls={ap.urgencia === 'none' ? 'dim' : ap.urgencia === 'red' ? 'red' : 'gold'}>
          {ap.employee}
        </Badge>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{ap.tipo}</span>
      </div>
      <div className="ap-title">{ap.titulo}</div>
      <div className="ap-detail">{ap.detalhe}</div>
      <div className="ap-rec"><strong>Recomendação:</strong> {ap.recomendacao}</div>
      <div className="ap-actions">
        {state === 'pending' && (
          <>
            <button className="btn btn-green" onClick={() => onAprovar(ap.id)}>Aprovar</button>
            <button className="btn btn-outline">Ver detalhes</button>
            <button className="btn-red-text" onClick={() => onRejeitar(ap.id)}>Rejeitar</button>
          </>
        )}
        {state === 'approved' && <span className="ap-approved">✓ Aprovado</span>}
        {state === 'rejected' && <span style={{ color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 11 }}>✗ Rejeitado</span>}
      </div>
    </div>
  );
}

function CommandCentre({ onNavigate }) {
  const ready = useLoadSim();
  const [states, setStates] = React.useState(
    APROVACOES.reduce((acc, a) => ({ ...acc, [a.id]: 'pending' }), {})
  );

  const handleAprovar = id => setStates(prev => ({ ...prev, [id]: 'approved' }));
  const handleRejeitar = id => setStates(prev => ({ ...prev, [id]: 'rejected' }));

  const urgentes = APROVACOES.filter(a => a.urgencia === 'red');
  const hoje = APROVACOES.filter(a => a.urgencia === 'gold');
  const semPrazo = APROVACOES.filter(a => a.urgencia === 'none');
  const pendingCount = APROVACOES.filter(a => states[a.id] === 'pending').length;

  if (!ready) return <LoadingState />;

  return (
    <div>
      <div className="two-col" style={{ marginBottom: 28 }}>
        {/* Coluna esquerda: Aprovações */}
        <div>
          <div className="sec-hd">
            <div className="sec-hd-l">
              <span className="pt-sm">A aguardar aprovação</span>
              <Badge cls={pendingCount > 0 ? 'red' : 'green'}>{pendingCount}</Badge>
            </div>
          </div>

          {urgentes.length > 0 && (
            <>
              <div className="ap-group-title">🔴 URGENTE</div>
              {urgentes.map(ap => (
                <ApCard key={ap.id} ap={ap} state={states[ap.id]} onAprovar={handleAprovar} onRejeitar={handleRejeitar} />
              ))}
            </>
          )}
          {hoje.length > 0 && (
            <>
              <div className="ap-group-title">🟡 HOJE</div>
              {hoje.map(ap => (
                <ApCard key={ap.id} ap={ap} state={states[ap.id]} onAprovar={handleAprovar} onRejeitar={handleRejeitar} />
              ))}
            </>
          )}
          {semPrazo.length > 0 && (
            <>
              <div className="ap-group-title">○ SEM PRAZO</div>
              {semPrazo.map(ap => (
                <ApCard key={ap.id} ap={ap} state={states[ap.id]} onAprovar={handleAprovar} onRejeitar={handleRejeitar} />
              ))}
            </>
          )}
        </div>

        {/* Coluna direita: KPIs + Saúde */}
        <div>
          <div className="sec-hd">
            <span className="pt-sm">Métricas globais</span>
          </div>
          <div className="kpi-grid kpi-grid-2" style={{ marginBottom: 20 }}>
            <Kpi label="MRR" value={eur(4800)} sub="▲ 2.1% vs mês ant." subCls="up" />
            <Kpi label="Em mora" value={eur(620)} sub="9.6% do emitido" subCls="down" />
            <Kpi label="OTs abertas" value="3" sub="2 urgentes" subCls="down" />
            <Kpi label="Docs pendentes" value="1" sub="OCR confiança 78%" />
          </div>

          <div className="card">
            <div className="card-t" style={{ marginBottom: 12 }}>Saúde por edifício</div>
            {EDIFICIOS.map(e => (
              <div key={e.id} className="health-card" onClick={() => onNavigate('edificios', e.id)}>
                <span className={`edf-saude ${e.saude}`} />
                <div className="health-info">
                  <div className="health-name">{e.nome}</div>
                  <div className="health-sub">
                    {e.fracoes} fracções ·{' '}
                    {e.saude === 'red'
                      ? `seguro ${e.seguro.diasRestantes} dias · mora ${e.financeiro.moraPct}%`
                      : e.saude === 'gold'
                      ? `seguro ${e.seguro.diasRestantes} dias`
                      : `mora ${e.financeiro.moraPct}%`}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>→</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inbox */}
      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <div className="card-t">Inbox — O que os employees fizeram</div>
          <div className="card-sub">últimas 24h</div>
        </div>
        {INBOX.map(item => (
          <div key={item.id} className="inbox-item">
            <div className="avatar" style={{ background: item.color }}>{item.avatar}</div>
            <div className="inbox-body">
              <div className="inbox-meta">
                <span className="inbox-name">{item.employee}</span>
                <span className="inbox-ts">{item.ts}</span>
                <Badge cls={item.tipo === 'ok' ? 'green' : item.tipo === 'warn' ? 'gold' : 'red'}>
                  {item.tipo}
                </Badge>
              </div>
              <div className="inbox-msg">{item.msg}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── ECRÃ 2: EDIFÍCIOS ───────────────────────────────────────────── */

function Edificios({ filtroId, onClear }) {
  const [detalheId, setDetalheId] = React.useState(filtroId || null);
  const [tab, setTab] = React.useState('financeiro');
  const ready = useLoadSim();

  const edf = detalheId ? EDIFICIOS.find(e => e.id === detalheId) : null;
  const recEdf = edf ? RECEBIMENTOS.filter(r => r.edificio === edf.nome) : [];

  const fracoesMock = [
    { codigo: '1A', condomino: 'Ana Rodrigues', permilagem: '83.3‰', quota: 195, estado: 'ok', portal: true },
    { codigo: '2B', condomino: 'Pedro Santos', permilagem: '83.3‰', quota: 195, estado: 'ok', portal: true },
    { codigo: '3B', condomino: 'João Silva', permilagem: '83.4‰', quota: 195, estado: 'mora', portal: true },
  ];

  if (!ready) return <LoadingState />;

  if (edf) {
    return (
      <div>
        <button className="back-btn" onClick={() => { setDetalheId(null); if (onClear) onClear(); }}>
          ← Voltar a edifícios
        </button>
        <div className="sec-hd">
          <div className="sec-hd-l">
            <span className={`edf-saude ${edf.saude}`} />
            <span className="pt">{edf.nome}</span>
          </div>
          <Badge cls={edf.saude}>{edf.saude === 'green' ? 'Saudável' : edf.saude === 'gold' ? 'Atenção' : 'Crítico'}</Badge>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>{edf.morada} · {edf.fracoes} fracções</div>

        <div className="tabs">
          {['financeiro', 'fracções', 'assembleias', 'documentos', 'seguros', 'energia'].map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'financeiro' && (
          <div>
            <div className="kpi-grid kpi-grid-4" style={{ marginBottom: 20 }}>
              <Kpi label="Emitido" value={eur(edf.financeiro.emitido)} />
              <Kpi label="Cobrado" value={eur(edf.financeiro.cobrado)} sub={`${Math.round(edf.financeiro.cobrado / edf.financeiro.emitido * 100)}%`} subCls="up" />
              <Kpi label="Em mora" value={eur(edf.financeiro.mora)} sub={`${edf.financeiro.moraPct}%`} subCls="down" />
              <Kpi label="Saldo caixa" value={eur(edf.financeiro.saldo)} />
            </div>
            {recEdf.length > 0 ? (
              <>
                <div className="pt-sm" style={{ marginBottom: 10 }}>Recebimentos em mora</div>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead><tr><th>Fracção</th><th>Condómino</th><th>Valor</th><th>Vencimento</th><th>Dias mora</th><th>Estado</th><th>Aviso</th></tr></thead>
                    <tbody>
                      {recEdf.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{r.fracao}</td>
                          <td>{r.condomino}</td>
                          <td style={{ fontFamily: 'var(--mono)' }}>{eur(r.valor)}</td>
                          <td>{fdateShort(r.vencimento)}</td>
                          <td><Badge cls={r.diasMora > 60 ? 'red' : 'gold'}>{r.diasMora}d</Badge></td>
                          <td>{estadoBadge(r.estado)}</td>
                          <td><Badge cls={r.aviso === 'GRAVE' ? 'red' : 'gold'}>{r.aviso}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="empty">Sem recebimentos em mora neste edifício.</div>
            )}
          </div>
        )}

        {tab === 'fracções' && (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Código</th><th>Condómino</th><th>Permilagem</th><th>Quota/mês</th><th>Pagamento</th><th>Portal</th></tr></thead>
              <tbody>
                {fracoesMock.map((f, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{f.codigo}</td>
                    <td>{f.condomino}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{f.permilagem}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{eur(f.quota)}</td>
                    <td>{estadoBadge(f.estado)}</td>
                    <td><Badge cls={f.portal ? 'green' : 'dim'}>{f.portal ? 'Sim' : 'Não'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'assembleias' && (
          <div className="card">
            <div style={{ marginBottom: 14, fontSize: 13 }}>
              <strong>Última assembleia:</strong> <span style={{ color: 'var(--muted)' }}>15 Mar 2026 (Ordinária)</span>
            </div>
            <div style={{ marginBottom: 20, fontSize: 13 }}>
              <strong>Próxima:</strong> <span style={{ color: 'var(--muted)' }}>{edf.assembleiaProx ? fdate(edf.assembleiaProx) : '—'}</span>
            </div>
            <button className="btn btn-blue">Convocar nova assembleia</button>
          </div>
        )}

        {tab === 'documentos' && (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Tipo</th><th>Título</th><th>Data</th><th>OCR</th></tr></thead>
              <tbody>
                {DOCS_RECENTES.filter(d => d.edificio === edf.nome).length === 0
                  ? <tr><td colSpan={4}><div className="empty">Sem documentos registados.</div></td></tr>
                  : DOCS_RECENTES.filter(d => d.edificio === edf.nome).map((d, i) => (
                    <tr key={i}>
                      <td><Badge cls="dim">{d.tipo}</Badge></td>
                      <td>{d.titulo}</td>
                      <td>{fdateShort(d.data)}</td>
                      <td><Badge cls={d.ocr === 'ok' ? 'green' : d.ocr === 'pendente' ? 'gold' : 'dim'}>{d.ocr}</Badge></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}

        {tab === 'seguros' && (
          <div className="card">
            <div className="drawer-field"><div className="drawer-field-l">Seguradora</div><div className="drawer-field-v">{edf.seguro.seguradora}</div></div>
            <div className="drawer-field"><div className="drawer-field-l">Prémio anual</div><div className="drawer-field-v" style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{eur(edf.seguro.premio)}</div></div>
            <div className="drawer-field"><div className="drawer-field-l">Vencimento</div><div className="drawer-field-v">{fdate(edf.seguro.vence)}</div></div>
            <div className="drawer-field">
              <div className="drawer-field-l">Dias restantes</div>
              <div className="drawer-field-v">
                <Badge cls={edf.seguro.diasRestantes <= 30 ? 'red' : edf.seguro.diasRestantes <= 90 ? 'gold' : 'green'}>{edf.seguro.diasRestantes}d</Badge>
              </div>
            </div>
          </div>
        )}

        {tab === 'energia' && (
          <div className="card">
            <div className="drawer-field"><div className="drawer-field-l">Comercializador</div><div className="drawer-field-v">{edf.energia.comercializador}</div></div>
            <div className="drawer-field"><div className="drawer-field-l">Preço €/kWh</div><div className="drawer-field-v" style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>€{edf.energia.precoKwh.toFixed(3)}</div></div>
            <div className="drawer-field"><div className="drawer-field-l">Vencimento contrato</div><div className="drawer-field-v">{edf.energia.vence ? fdate(edf.energia.vence) : '—'}</div></div>
            {edf.energia.poupancaPot > 0 && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(140,101,8,.06)', borderRadius: 6, border: '1px solid rgba(140,101,8,.2)', fontSize: 12, color: 'var(--gold)' }}>
                Enzo simulou alternativa — poupança potencial <strong>{eur(edf.energia.poupancaPot)}/ano</strong> com Endesa Green+
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="sec-hd" style={{ marginBottom: 20 }}>
        <span className="pt">Edifícios</span>
        <Badge cls="dim">{EDIFICIOS.length} edifícios</Badge>
      </div>
      <div className="edf-grid">
        {EDIFICIOS.map(e => (
          <div key={e.id} className="edf-card" onClick={() => setDetalheId(e.id)}>
            <div className="edf-name"><span className={`edf-saude ${e.saude}`} />{e.nome}</div>
            <div className="edf-addr">{e.morada}</div>
            <div className="edf-stats">{e.fracoes} fracções · {eur(e.financeiro.saldo)} saldo</div>
            <div className="edf-row"><span className="edf-row-l">Cobrado</span><span className="edf-row-r">{Math.round(e.financeiro.cobrado / e.financeiro.emitido * 100)}%</span></div>
            <div className="edf-row"><span className="edf-row-l">Mora</span><span className="edf-row-r" style={{ color: e.financeiro.moraPct > 15 ? 'var(--red)' : 'var(--gold)' }}>{e.financeiro.moraPct}%</span></div>
            <div className="edf-row"><span className="edf-row-l">Seguro</span><span className="edf-row-r">{e.seguro.seguradora} · {fdateShort(e.seguro.vence)}</span></div>
            <div className="edf-row" style={{ borderBottom: 'none' }}><span className="edf-row-l">Energia</span><span className="edf-row-r">€{e.energia.precoKwh.toFixed(3)}/kWh</span></div>
            <div style={{ marginTop: 14 }}>
              <button className="btn btn-outline" style={{ width: '100%' }} onClick={ev => { ev.stopPropagation(); setDetalheId(e.id); }}>Ver detalhes →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── ECRÃ 3: FINANCEIRO ──────────────────────────────────────────── */

function Financeiro() {
  const ready = useLoadSim();
  const [filtroMora, setFiltroMora] = React.useState('todos');

  const totalEmitido = EDIFICIOS.reduce((s, e) => s + e.financeiro.emitido, 0);
  const totalCobrado = EDIFICIOS.reduce((s, e) => s + e.financeiro.cobrado, 0);
  const totalMora = EDIFICIOS.reduce((s, e) => s + e.financeiro.mora, 0);
  const totalPagar = FATURAS.filter(f => f.estado !== 'paga').reduce((s, f) => s + f.valor, 0);

  const recFiltrado = filtroMora === 'todos' ? RECEBIMENTOS : RECEBIMENTOS.filter(r => r.estado === filtroMora);

  if (!ready) return <LoadingState />;

  return (
    <div>
      <div className="sec-hd" style={{ marginBottom: 20 }}><span className="pt">Financeiro</span></div>

      <div className="kpi-grid kpi-grid-4" style={{ marginBottom: 24 }}>
        <Kpi label="Emitido (mês)" value={eur(totalEmitido)} />
        <Kpi label="Cobrado" value={eur(totalCobrado)} sub={`${Math.round(totalCobrado / totalEmitido * 100)}% do emitido`} subCls="up" />
        <Kpi label="Em mora" value={eur(totalMora)} sub="3 edifícios" subCls="down" />
        <Kpi label="A pagar" value={eur(totalPagar)} sub="2 faturas pendentes" />
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="sec-hd" style={{ marginBottom: 12 }}>
          <span className="pt-sm">Mora por edifício</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['todos', 'mora', 'mora_grave'].map(f => (
              <button key={f} className={`filter-btn ${filtroMora === f ? 'on' : ''}`} onClick={() => setFiltroMora(f)}>
                {f === 'todos' ? 'Todos' : f === 'mora' ? 'Em mora' : 'Mora grave'}
              </button>
            ))}
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Edifício</th><th>Fracção</th><th>Condómino</th><th>Valor</th><th>Vencimento</th><th>Dias mora</th><th>Estado</th><th>Aviso</th></tr></thead>
            <tbody>
              {recFiltrado.length === 0
                ? <tr><td colSpan={8}><div className="empty">Sem registos.</div></td></tr>
                : recFiltrado.map(r => (
                  <tr key={r.id}>
                    <td>{r.edificio}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{r.fracao}</td>
                    <td>{r.condomino}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{eur(r.valor)}</td>
                    <td>{fdateShort(r.vencimento)}</td>
                    <td><Badge cls={r.diasMora > 60 ? 'red' : 'gold'}>{r.diasMora}d</Badge></td>
                    <td>{estadoBadge(r.estado)}</td>
                    <td><Badge cls={r.aviso === 'GRAVE' ? 'red' : 'gold'}>{r.aviso}</Badge></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="sec-hd" style={{ marginBottom: 12 }}><span className="pt-sm">Faturas a pagar</span></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Fornecedor</th><th>Descrição</th><th>Edifício</th><th>Valor</th><th>Vence</th><th>Estado</th></tr></thead>
            <tbody>
              {FATURAS.map((f, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{f.fornecedor}</td>
                  <td style={{ color: 'var(--muted)' }}>{f.desc}</td>
                  <td>{f.edificio}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{eur(f.valor)}</td>
                  <td>{fdateShort(f.vence)}</td>
                  <td>{estadoBadge(f.estado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── ECRÃ 4: OPERAÇÕES ───────────────────────────────────────────── */

function Operacoes() {
  const ready = useLoadSim();
  const [open, setOpen] = React.useState({ ots: true, assembleias: true, docs: true });
  const toggle = sec => setOpen(prev => ({ ...prev, [sec]: !prev[sec] }));

  if (!ready) return <LoadingState />;

  return (
    <div>
      <div className="sec-hd" style={{ marginBottom: 20 }}><span className="pt">Operações</span></div>

      <div className="sec-collapse">
        <div className="sec-collapse-hd" onClick={() => toggle('ots')}>
          <span className="sec-collapse-title">🔧 Manutenção</span>
          <Badge cls="red">{OTS.length} OTs</Badge>
          <span style={{ color: 'var(--muted)', marginLeft: 8, fontSize: 11 }}>{open.ots ? '▲' : '▼'}</span>
        </div>
        {open.ots && (
          <div className="sec-collapse-body">
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Edifício</th><th>Descrição</th><th>Prestador</th><th>Custo est.</th><th>Estado</th><th>Urgência</th></tr></thead>
                <tbody>
                  {OTS.map((o, i) => (
                    <tr key={i}>
                      <td>{o.edificio}</td>
                      <td>{o.desc}</td>
                      <td style={{ color: 'var(--muted)' }}>{o.prestador}</td>
                      <td style={{ fontFamily: 'var(--mono)' }}>{o.custo ? eur(o.custo) : '—'}</td>
                      <td>{estadoBadge(o.estado)}</td>
                      <td><Badge cls={o.urgencia === 'urgente' ? 'red' : 'dim'}>{o.urgencia}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="sec-collapse">
        <div className="sec-collapse-hd" onClick={() => toggle('assembleias')}>
          <span className="sec-collapse-title">📋 Assembleias</span>
          <Badge cls="gold">2 agendadas</Badge>
          <span style={{ color: 'var(--muted)', marginLeft: 8, fontSize: 11 }}>{open.assembleias ? '▲' : '▼'}</span>
        </div>
        {open.assembleias && (
          <div className="sec-collapse-body">
            {[
              { nome: 'Edf. Restelo', data: '20 Mai 2026', estado: 'pendente_aprovacao', nota: 'convocatória pendente aprovação' },
              { nome: 'Edf. Alameda', data: '15 Jun 2026', estado: 'ok', nota: 'agendada' },
            ].map((a, i) => (
              <div key={i} className="health-card" style={{ cursor: 'default', marginBottom: 8 }}>
                <div className="health-info">
                  <div className="health-name">{a.nome}</div>
                  <div className="health-sub">{a.data} · {a.nota}</div>
                </div>
                {estadoBadge(a.estado)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sec-collapse">
        <div className="sec-collapse-hd" onClick={() => toggle('docs')}>
          <span className="sec-collapse-title">📄 Documentos recentes</span>
          <Badge cls="gold">1 pendente</Badge>
          <span style={{ color: 'var(--muted)', marginLeft: 8, fontSize: 11 }}>{open.docs ? '▲' : '▼'}</span>
        </div>
        {open.docs && (
          <div className="sec-collapse-body">
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Edifício</th><th>Tipo</th><th>Título</th><th>Data</th><th>OCR</th></tr></thead>
                <tbody>
                  {DOCS_RECENTES.map((d, i) => (
                    <tr key={i}>
                      <td>{d.edificio}</td>
                      <td><Badge cls="dim">{d.tipo}</Badge></td>
                      <td>{d.titulo}</td>
                      <td>{fdateShort(d.data)}</td>
                      <td><Badge cls={d.ocr === 'ok' ? 'green' : d.ocr === 'pendente' ? 'gold' : 'dim'}>{d.ocr}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ECRÃ 5: SEGUROS & ENERGIA ───────────────────────────────────── */

function SegurosEnergia() {
  const ready = useLoadSim();
  if (!ready) return <LoadingState />;

  return (
    <div>
      <div className="sec-hd" style={{ marginBottom: 20 }}><span className="pt">Seguros & Energia</span></div>

      <div style={{ marginBottom: 28 }}>
        <div className="pt-sm" style={{ marginBottom: 12 }}>🛡️ Seguros</div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Edifício</th><th>Seguradora</th><th>Prémio/ano</th><th>Vencimento</th><th>Dias restantes</th><th>Estado</th></tr></thead>
            <tbody>
              {EDIFICIOS.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 500 }}>{e.nome}</td>
                  <td>{e.seguro.seguradora}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{eur(e.seguro.premio)}</td>
                  <td>{fdate(e.seguro.vence)}</td>
                  <td><Badge cls={e.seguro.diasRestantes <= 30 ? 'red' : e.seguro.diasRestantes <= 90 ? 'gold' : 'green'}>{e.seguro.diasRestantes}d</Badge></td>
                  <td>
                    {e.id === 'edf-c' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Badge cls="red">Crítico</Badge>
                        <button className="btn btn-outline" style={{ fontSize: 11, padding: '3px 8px' }}>Ver simulação</button>
                      </div>
                    ) : e.seguro.diasRestantes <= 90 ? (
                      <Badge cls="gold">Renovar em breve</Badge>
                    ) : (
                      <Badge cls="green">OK</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(139,26,26,.05)', borderRadius: 6, border: '1px solid rgba(139,26,26,.15)', fontSize: 12, color: 'var(--red)' }}>
          Sofia simulou alternativa para Edf. Marquês — poupança potencial €180/ano
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div className="pt-sm" style={{ marginBottom: 12 }}>⚡ Energia</div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Edifício</th><th>Comercializador</th><th>€/kWh</th><th>Vencimento</th><th>Poupança potencial</th></tr></thead>
            <tbody>
              {EDIFICIOS.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 500 }}>{e.nome}</td>
                  <td>{e.energia.comercializador}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>€{e.energia.precoKwh.toFixed(3)}</td>
                  <td>{e.energia.vence ? fdate(e.energia.vence) : '—'}</td>
                  <td>
                    {e.energia.poupancaPot > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Badge cls="gold">{eur(e.energia.poupancaPot)}/ano</Badge>
                        <button className="btn btn-outline" style={{ fontSize: 11, padding: '3px 8px' }}>Ver simulação</button>
                      </div>
                    ) : <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="pt-sm" style={{ marginBottom: 12 }}>🔌 Carregadores EV — Edf. Alameda</div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Fracção</th><th>Posto</th><th>kWh (mês)</th><th>Valor</th><th>Faturado</th></tr></thead>
            <tbody>
              {EV.map((ev, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{ev.fracao}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{ev.posto}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{ev.kwh} kWh</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{eur(ev.valor, 2)}</td>
                  <td><Badge cls={ev.faturado ? 'green' : 'gold'}>{ev.faturado ? 'Sim' : 'Pendente'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── ECRÃ 6: CONDÓMINOS ──────────────────────────────────────────── */

function Condominos() {
  const ready = useLoadSim();
  const [search, setSearch] = React.useState('');
  const [filtro, setFiltro] = React.useState('todos');
  const [drawer, setDrawer] = React.useState(null);

  const filtered = CONDOMINOS.filter(c => {
    const matchSearch = !search || c.nome.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchFiltro = filtro === 'todos' || c.estado === filtro;
    return matchSearch && matchFiltro;
  });

  if (!ready) return <LoadingState />;

  return (
    <div>
      <div className="sec-hd" style={{ marginBottom: 16 }}>
        <span className="pt">Condóminos</span>
        <Badge cls="dim">{CONDOMINOS.length} registos</Badge>
      </div>

      <div className="filter-bar">
        <input
          className="filter-input"
          placeholder="Pesquisar por nome ou email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {['todos', 'mora', 'mora_grave', 'ok'].map(f => (
          <button key={f} className={`filter-btn ${filtro === f ? 'on' : ''}`} onClick={() => setFiltro(f)}>
            {f === 'todos' ? 'Todos' : f === 'mora' ? 'Em mora' : f === 'mora_grave' ? 'Mora grave' : 'OK'}
          </button>
        ))}
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Nome</th><th>Edifício</th><th>Fracções</th><th>Quota/mês</th><th>Estado</th><th>Portal</th><th>Acções</th></tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={7}><div className="empty">Sem resultados para o filtro actual.</div></td></tr>
              : filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.nome}</td>
                  <td>{c.edificio}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{c.fracoes.join(', ')}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{eur(c.quota)}</td>
                  <td>{estadoBadge(c.estado)}</td>
                  <td><Badge cls={c.portal ? 'green' : 'dim'}>{c.portal ? 'Sim' : 'Não'}</Badge></td>
                  <td>
                    <button className="btn btn-outline" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setDrawer(c)}>
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {drawer && <DrawerCondomino cond={drawer} onClose={() => setDrawer(null)} />}
    </div>
  );
}

/* ─── ECRÃ 7: MARKETING ───────────────────────────────────────────── */

function Marketing() {
  const ready = useLoadSim();
  if (!ready) return <LoadingState />;

  return (
    <div>
      <div className="sec-hd" style={{ marginBottom: 20 }}><span className="pt">Marketing</span></div>

      <div style={{ marginBottom: 8, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Leo — Gestor de Leads</div>
      <div className="kpi-grid kpi-grid-4" style={{ marginBottom: 24 }}>
        <Kpi label="Leads (semana)" value="12" sub="+4 vs semana ant." subCls="up" />
        <Kpi label="Leads quentes" value="3" sub="score ≥ 75" />
        <Kpi label="CPL V5" value="€18" sub="Meta Ads" />
        <Kpi label="CPL V2" value="€62" sub="LinkedIn" />
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="pt-sm" style={{ marginBottom: 12 }}>Pipeline</div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Cliente</th><th>Vertical</th><th>Produto</th><th>Estado</th><th>Valor/ano</th></tr></thead>
            <tbody>
              {PIPELINE.map((p, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{p.cliente}</td>
                  <td><Badge cls={p.vertical === 'V2' ? 'blue' : 'purple'}>{p.vertical}</Badge></td>
                  <td style={{ color: 'var(--muted)' }}>{p.produto}</td>
                  <td>{estadoBadge(p.estado)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{eur(p.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div style={{ marginBottom: 8, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Gabi — Campanhas</div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Vertical</th><th>Canal</th><th>Budget/dia</th><th>ROAS (7d)</th><th>Estado</th></tr></thead>
            <tbody>
              {CAMPANHAS.map((c, i) => (
                <tr key={i}>
                  <td><Badge cls={c.vertical === 'V5' ? 'purple' : 'blue'}>{c.vertical}</Badge></td>
                  <td>{c.canal}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>€{c.budget}/dia</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: c.roas >= 3 ? 'var(--green)' : 'var(--gold)' }}>{c.roas.toFixed(1)}x</td>
                  <td><Badge cls={c.estado === 'ok' ? 'green' : 'gold'}>{c.estado === 'ok' ? 'OK' : 'Atenção'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── APP ROOT ────────────────────────────────────────────────────── */

const NAV = [
  { id: 'home', icon: '🏠', label: 'Command Centre' },
  { id: 'edificios', icon: '🏢', label: 'Edifícios' },
  { id: 'financeiro', icon: '💰', label: 'Financeiro' },
  { id: 'operacoes', icon: '🔧', label: 'Operações' },
  { id: 'seguros-energia', icon: '🛡️', label: 'Seguros & Energia' },
  { id: 'condominos', icon: '👥', label: 'Condóminos' },
  { id: 'marketing', icon: '📈', label: 'Marketing' },
];

const PAGE_TITLES = {
  home: 'Command Centre',
  edificios: 'Edifícios',
  financeiro: 'Financeiro',
  operacoes: 'Operações',
  'seguros-energia': 'Seguros & Energia',
  condominos: 'Condóminos',
  marketing: 'Marketing',
};

function useCurrentTime() {
  const fmt = () => new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  const [t, setT] = React.useState(fmt);
  React.useEffect(() => {
    const id = setInterval(() => setT(fmt()), 60000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export default function App() {
  const [dark, setDark] = React.useState(() => localStorage.getItem('v2theme') === 'dark');
  const [collapsed, setCollapsed] = React.useState(false);
  const [page, setPage] = React.useState('home');
  const [edificioFiltro, setEdificioFiltro] = React.useState(null);
  const time = useCurrentTime();

  React.useEffect(() => {
    document.body.classList.toggle('dark', dark);
    localStorage.setItem('v2theme', dark ? 'dark' : 'light');
  }, [dark]);

  const navigate = (target, filtroId) => {
    setPage(target);
    if (target === 'edificios' && filtroId) setEdificioFiltro(filtroId);
  };

  const totalCaixa = EDIFICIOS.reduce((s, e) => s + e.financeiro.saldo, 0);
  const urgentesCount = APROVACOES.filter(a => a.urgencia === 'red').length;
  const avisosCount = APROVACOES.filter(a => a.urgencia !== 'none').length;

  return (
    <>
      <style>{APP_CSS}</style>
      <div className="s-app">
        {/* SIDEBAR */}
        <nav className={`sb${collapsed ? ' col' : ''}`}>
          <div className="sb-head">
            {!collapsed && (
              <div className="sb-brand">
                <div className="sb-logo">V2 Condo</div>
                <div className="sb-user">Mário Carvalho</div>
              </div>
            )}
            <button className="sb-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expandir' : 'Colapsar'}>
              {collapsed ? '→' : '←'}
            </button>
          </div>
          {!collapsed && <div className="sb-sec">Navegação</div>}
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-btn${page === item.id ? ' on' : ''}`}
              onClick={() => setPage(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <span className="ni">{item.icon}</span>
              <span className="nav-txt">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* MAIN */}
        <div className="main">
          {/* TOPBAR */}
          <div className="topbar">
            <span className="topbar-title">{PAGE_TITLES[page]}</span>
            <span className="topbar-time">{time}</span>
            <button className="theme-btn" onClick={() => setDark(!dark)}>
              {dark ? '☀ Claro' : '☾ Escuro'}
            </button>
            <span className="topbar-badge">Mário</span>
          </div>

          {/* CRITICAL STRIP */}
          <div className="strip">
            <span className="strip-item" onClick={() => setPage('home')}>
              🔴 {urgentesCount} urgentes
            </span>
            <span className="strip-sep">|</span>
            <span className="strip-item" onClick={() => setPage('financeiro')}>
              💶 {eur(totalCaixa)} total caixa
            </span>
            <span className="strip-sep">|</span>
            <span className="strip-item" onClick={() => setPage('home')}>
              🟡 {avisosCount} avisos activos
            </span>
          </div>

          {/* CONTENT */}
          <div className="content">
            {page === 'home' && <CommandCentre onNavigate={navigate} />}
            {page === 'edificios' && (
              <Edificios filtroId={edificioFiltro} onClear={() => setEdificioFiltro(null)} />
            )}
            {page === 'financeiro' && <Financeiro />}
            {page === 'operacoes' && <Operacoes />}
            {page === 'seguros-energia' && <SegurosEnergia />}
            {page === 'condominos' && <Condominos />}
            {page === 'marketing' && <Marketing />}
          </div>
        </div>
      </div>
    </>
  );
}
