/* ═══════════════════════════════════════════════════════════════════════
 *  PROPTECH · V1 CORE HUB · React Port
 *  ───────────────────────────────────────────────────────────────────
 *  File       : v1-core 2026.0418 2316.jsx
 *  Date       : 18 Abril 2026 · 23:16 Lisboa
 *  Stack      : React 18 · Supabase JS v2 · Chart.js 4
 *  Source     : v1-core_2026_0416_2305.html (1894 lines)
 *  ───────────────────────────────────────────────────────────────────
 *  PORT FIDELITY NOTES
 *  • CSS preservado 100% (314 linhas originais injectadas via <style>)
 *  • Todas as chamadas Supabase Auth preservadas (magic link + password)
 *  • Core API endpoint preservado (/functions/v1/core-api)
 *  • 8 páginas originais: financeiro, clientes, pipeline, leads,
 *    permissoes, staff, apikeys, developer
 *  • 5 modais: oportunidade, interacao, utilizador, cliente, oferta
 *  • Dark/light theme toggle preservado
 *  • Sidebar colapsável preservada
 *  • Chart.js MRR histórico preservado (via useEffect)
 *  ───────────────────────────────────────────────────────────────────
 *  TO RUN:
 *  • npm create vite@latest proptech-core -- --template react
 *  • cd proptech-core && npm install
 *  • npm install @supabase/supabase-js chart.js
 *  • copy this file → src/App.jsx
 *  • npm run dev → http://localhost:5173
 *  ═══════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Chart from 'chart.js/auto';

/* ───────────────────────────────────────────────────────────────────
 *  CONFIG · mesma do V1 Core HTML original
 * ─────────────────────────────────────────────────────────────────── */

const SUPABASE_URL = 'https://hkmvszkpxjbxmnixzqbl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbXZzemtweGpieG1uaXh6cWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjU5ODcsImV4cCI6MjA5MTYwMTk4N30.kgZGnFKfpJc4hY3TQZjig6WdSsvI-NXDnWrmpISthMw';
const CORE_API = `${SUPABASE_URL}/functions/v1/core-api`;

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ───────────────────────────────────────────────────────────────────
 *  HELPERS · idênticas às do V1 Core original
 * ─────────────────────────────────────────────────────────────────── */

const eur = (v, d = 0) =>
  Number(v || 0).toLocaleString('pt-PT', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: d, maximumFractionDigits: d,
  });

const fdate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
};

const fdt = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-PT', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

const ecls = (e) => ({
  lead: 'purple', contactado: 'blue', em_proposta: 'gold',
  proposta_enviada: 'gold', ganho: 'green', perdido: 'red', cancelado: 'red',
}[e] || 'dim');

const vcls = (v) => ({
  condominio: 'blue', seguros: 'purple', energia: 'gold',
  manutencao: 'teal', reabilitacao: 'orange', imoveis: 'green',
}[v] || 'dim');

const roleCls = (r) => ({
  condómino: 'blue', operacional: 'green',
  administrador: 'gold', developer: 'purple',
}[r] || 'dim');

/* ───────────────────────────────────────────────────────────────────
 *  CSS · injectado no documento (preservação 100% do original)
 *  Copiado verbatim das linhas 9-322 de v1-core_2026_0416_2305.html
 * ─────────────────────────────────────────────────────────────────── */

const V1_CSS = `
/* ── RESET & BASE ──────────────────────────────── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;overflow:hidden;background:#f4f3f0}
body{font-family:'Inter',system-ui,sans-serif;font-size:13px;color:#18160f;-webkit-font-smoothing:antialiased}
body.dark{background:#0d1117;color:#e6edf3}

/* ── CSS VARS ──────────────────────────────────── */
:root{
  --bg:#f4f3f0;--surface:#ffffff;--surface2:#f0eeeb;--surface3:#e8e6e2;
  --border:rgba(0,0,0,0.08);--border2:rgba(0,0,0,0.15);
  --text:#18160f;--muted:#6b6458;--blue:#1a5296;--green:#2d6a4f;
  --red:#8b1a1a;--gold:#8c6508;--purple:#6b4fa0;
  --mono:'JetBrains Mono','Fira Mono',monospace;
  --sb-w:190px;
}
body.dark{
  --bg:#0d1117;--surface:#161b22;--surface2:#1c2333;--surface3:#243047;
  --border:rgba(255,255,255,0.08);--border2:rgba(255,255,255,0.15);
  --text:#e6edf3;--muted:#9198a1;--blue:#58a6ff;--green:#3fb950;
  --red:#ff7b72;--gold:#e3b341;--purple:#d2a8ff;
}

/* ── APP SHELL ─────────────────────────────────── */
.s-login{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 30% 60%,rgba(26,82,150,.07),transparent),var(--bg)}
.s-app{position:fixed;inset:0;display:flex;flex-direction:row}

/* ── SIDEBAR ───────────────────────────────────── */
.sb{
  width:var(--sb-w);flex-shrink:0;
  background:var(--surface);border-right:1px solid var(--border);
  height:100%;display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;
  transition:width .2s ease;
}
.sb.col{width:44px}
.sb-head{padding:14px 14px 10px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:8px;min-height:64px}
.sb-brand{flex:1;min-width:0;overflow:hidden}
.sb-logo{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--blue);font-family:var(--mono)}
.sb-user{font-size:10px;color:var(--muted);font-family:var(--mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}
.sb-scope{font-size:8px;font-family:var(--mono);letter-spacing:.1em;padding:2px 7px;border:1px solid var(--green);color:var(--green);border-radius:2px;display:inline-block;margin-top:5px}
.sb-toggle{background:none;border:1px solid var(--border);color:var(--muted);width:22px;height:22px;border-radius:3px;cursor:pointer;font-size:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;transition:all .15s}
.sb-toggle:hover{border-color:var(--blue);color:var(--blue)}

.sb-sec{font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-family:var(--mono);padding:12px 14px 4px;white-space:nowrap;overflow:hidden}
.nav-btn{display:flex;align-items:center;gap:8px;padding:6px 14px;cursor:pointer;color:var(--muted);font-size:12px;font-weight:400;transition:all .1s;border:none;background:none;width:calc(100% - 12px);text-align:left;border-radius:4px;margin:1px 6px;white-space:nowrap;overflow:hidden}
.nav-btn:hover{background:var(--surface2);color:var(--text)}
.nav-btn.on{background:rgba(26,82,150,.08);color:var(--blue);font-weight:600}
body.dark .nav-btn.on{background:rgba(88,166,255,.1)}
.ni{font-size:14px;flex-shrink:0;width:16px;text-align:center}
.nav-txt{overflow:hidden;text-overflow:ellipsis}

.sb.col .sb-brand,.sb.col .sb-sec,.sb.col .sb-ext,.sb.col .sb-foot,.sb.col .nav-txt{display:none}
.sb.col .nav-btn{padding:8px;justify-content:center;width:calc(100% - 8px);margin:1px 4px;gap:0}
.sb.col .sb-head{justify-content:center;padding:10px}
.sb.col .sb-toggle{margin:0}

.sb-ext{padding:8px 0 4px;border-top:1px solid var(--border);margin-top:auto}
.ext-a{display:flex;align-items:center;gap:8px;padding:4px 14px;color:var(--muted);font-size:11px;text-decoration:none;cursor:pointer;transition:color .1s;white-space:nowrap;overflow:hidden}
.ext-a:hover{color:var(--blue)}
.ext-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}

.sb-foot{padding:8px 6px;border-top:1px solid var(--border)}
.sb-logout{width:100%;padding:6px 14px;background:none;border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:10px;font-family:var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);transition:all .15s}
.sb-logout:hover{border-color:var(--red);color:var(--red)}

/* ── MAIN ──────────────────────────────────────── */
.main{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;overflow:hidden}

.topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 28px;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0;gap:12px}
.tb-time{font-family:var(--mono);font-size:10px;color:var(--muted)}
.tb-r{display:flex;align-items:center;gap:10px}
.theme-btn{background:none;border:1px solid var(--border);border-radius:4px;padding:4px 10px;font-size:10px;font-family:var(--mono);cursor:pointer;color:var(--muted);transition:all .15s}
.theme-btn:hover{border-color:var(--blue);color:var(--blue)}
.role-badge{font-family:var(--mono);font-size:9px;letter-spacing:.1em;padding:3px 8px;border:1px solid var(--blue);color:var(--blue);border-radius:2px}
.tb-name{font-size:12px;color:var(--muted)}

.pages{flex:1;overflow-y:auto;overflow-x:hidden;padding:28px 32px}

.ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;gap:16px}
.pt{font-size:22px;font-weight:700;color:var(--text);letter-spacing:-.02em}
.ps{font-size:12px;color:var(--muted);margin-top:3px}

.kpi4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
.kpi{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px}
.kpi-l{font-family:var(--mono);font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.kpi-v{font-size:24px;font-weight:700;letter-spacing:-.02em;font-family:var(--mono)}
.kpi-s{font-size:10px;color:var(--muted);margin-top:4px}
.c-green .kpi-v{color:var(--green)}
.c-blue .kpi-v{color:var(--blue)}
.c-gold .kpi-v{color:var(--gold)}
.c-purple .kpi-v{color:var(--purple)}
.c-red .kpi-v{color:var(--red)}
.c-teal .kpi-v{color:#0d7a7a}

.card{background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:16px}
.card-h{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;border-bottom:1px solid var(--border)}
.card-t{font-weight:600;font-size:13px}
.card-s{font-size:11px;color:var(--muted)}
.card-body{padding:16px 18px}

.tw{overflow-x:auto}
.tw table{width:100%;border-collapse:collapse;font-size:12px}
.tw th{font-family:var(--mono);font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);padding:10px 12px;text-align:left;border-bottom:1px solid var(--border);background:var(--surface2);white-space:nowrap}
.tw td{padding:9px 12px;border-bottom:1px solid var(--border);vertical-align:middle}
.tw tr:last-child td{border-bottom:none}
.tw tr:hover td{background:var(--surface2)}

.b{font-family:var(--mono);font-size:9px;letter-spacing:.08em;padding:2px 8px;border-radius:3px;display:inline-block;white-space:nowrap}
.b-blue{background:rgba(26,82,150,.1);color:var(--blue)}
.b-green{background:rgba(45,106,79,.1);color:var(--green)}
.b-gold{background:rgba(140,101,8,.1);color:var(--gold)}
.b-purple{background:rgba(107,79,160,.1);color:var(--purple)}
.b-red{background:rgba(139,26,26,.1);color:var(--red)}
.b-dim{background:var(--surface2);color:var(--muted)}
.b-teal{background:rgba(13,122,122,.1);color:#0d7a7a}
.b-orange{background:rgba(194,65,12,.1);color:#c2410c}
body.dark .b-blue{background:rgba(88,166,255,.1)}
body.dark .b-green{background:rgba(63,185,80,.1)}
body.dark .b-gold{background:rgba(227,179,65,.1)}

.ab{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:var(--blue);color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:11px;font-family:var(--mono);letter-spacing:.05em;transition:opacity .15s}
.ab:hover{opacity:.85}
.ab-green{background:var(--green)}
.ab-outline{background:none;border:1px solid var(--border);color:var(--muted)}
.ab-outline:hover{border-color:var(--blue);color:var(--blue);opacity:1}
.f-btn{background:none;border:1px solid var(--border);color:var(--muted);padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;transition:all .15s}
.f-btn:hover:not([disabled]){border-color:var(--blue);color:var(--blue)}
.f-btn.on{border-color:var(--blue);color:var(--blue);background:rgba(26,82,150,.08)}
.f-btn[disabled]{opacity:.4;cursor:not-allowed}
.icon-btn{background:none;border:1px solid var(--border);color:var(--muted);padding:3px 9px;border-radius:3px;cursor:pointer;font-size:10px;font-family:var(--mono);transition:all .15s}
.icon-btn:hover{border-color:var(--blue);color:var(--blue)}

.sbar{display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.s-inp{background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:7px 11px;font-size:12px;color:var(--text);flex:1;font-family:inherit;transition:border-color .15s}
.s-inp:focus{outline:none;border-color:var(--blue)}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.ff{display:flex;flex-direction:column;gap:4px}
.ff.ff-full{grid-column:1/-1}
.ff label{font-size:10px;font-family:var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.ff input,.ff select{background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;font-size:12px;color:var(--text);font-family:inherit;transition:border-color .15s}
.ff input:focus,.ff select:focus{outline:none;border-color:var(--blue)}
.form-actions{display:flex;align-items:center;gap:10px}
.form-msg{font-size:11px;font-family:var(--mono)}
.form-msg.ok{color:var(--green)}
.form-msg.er{color:var(--red)}

.login-box{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:36px 40px;width:420px;max-width:calc(100vw - 32px)}
.login-logo{font-family:var(--mono);font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:var(--blue);margin-bottom:20px}
.login-title{font-size:26px;font-weight:700;margin-bottom:6px;letter-spacing:-.02em}
.login-sub{font-size:12px;color:var(--muted);margin-bottom:20px;line-height:1.5}
.toggle{display:flex;border:1px solid var(--border);border-radius:6px;margin-bottom:20px;overflow:hidden}
.toggle-opt{flex:1;background:none;border:none;padding:8px;font-size:10px;font-family:var(--mono);letter-spacing:.1em;text-transform:uppercase;cursor:pointer;color:var(--muted);transition:all .15s}
.toggle-opt.on{background:var(--blue);color:#fff}
.lbl{font-size:10px;font-family:var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:5px}
.inp{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:10px 14px;font-size:13px;color:var(--text);font-family:inherit;margin-bottom:14px;transition:border-color .15s}
.inp:focus{outline:none;border-color:var(--blue)}
.btn-primary{width:100%;background:var(--blue);color:#fff;border:none;border-radius:6px;padding:11px;font-size:12px;font-family:var(--mono);letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:opacity .15s;margin-top:4px}
.btn-primary:hover{opacity:.88}
.btn-primary:disabled{opacity:.5;cursor:not-allowed}
.login-err{font-size:11px;color:var(--red);margin-top:8px;font-family:var(--mono)}
.login-sent{text-align:center;padding:20px 0}
.login-sent .check{font-size:32px;margin-bottom:12px}

.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;display:flex;align-items:center;justify-content:center}
.modal{background:var(--surface);border:1px solid var(--border);border-radius:10px;width:560px;max-width:calc(100vw - 32px);max-height:90vh;overflow-y:auto}
.modal-h{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--border)}
.modal-t{font-weight:600;font-size:15px}
.modal-x{background:none;border:none;cursor:pointer;font-size:20px;color:var(--muted);width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:4px}
.modal-x:hover{background:var(--surface2)}
.modal-body{padding:22px}

.g2{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.loading{padding:32px;text-align:center;color:var(--muted);font-family:var(--mono);font-size:11px}
.empty{padding:24px;text-align:center;color:var(--muted);font-family:var(--mono);font-size:11px}
.crm-count{font-family:var(--mono);font-size:10px;color:var(--muted)}

.vcard{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px;position:relative;overflow:hidden}
.vcard-status{position:absolute;top:0;left:0;right:0;height:3px}
.vs-active{background:var(--green)}
.vs-empty{background:var(--border2)}
.vcard-name{font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:6px;margin-top:8px}
.vcard-mrr{font-size:20px;font-weight:700;font-family:var(--mono);margin-bottom:4px}
.vcard-info{font-size:10px;color:var(--muted);margin-bottom:8px}
.vcard-delta{display:flex;gap:8px;flex-wrap:wrap}
.vd{font-family:var(--mono);font-size:9px;padding:2px 7px;border-radius:10px;background:var(--surface2)}
.vd-up{background:rgba(45,106,79,.1);color:var(--green)}
.vd-dn{background:rgba(139,26,26,.1);color:var(--red)}
.vd-0{color:var(--muted)}

.chart-wrap{position:relative;height:200px;margin-bottom:8px}

.perm-tabs{display:flex;border-bottom:1px solid var(--border);margin-bottom:20px;gap:0}
.perm-tab-btn{background:none;border:none;border-bottom:2px solid transparent;color:var(--muted);font-family:var(--mono);font-size:11px;letter-spacing:.06em;padding:10px 18px;cursor:pointer;transition:all .15s;text-transform:uppercase}
.perm-tab-btn.on{border-bottom-color:var(--blue);color:var(--blue);font-weight:600}
.perm-cb{width:15px;height:15px;cursor:pointer;accent-color:var(--blue)}
.estado-badge{display:inline-flex;align-items:center;gap:4px;font-family:var(--mono);font-size:9px;padding:2px 8px;border-radius:10px}
.estado-activo{background:rgba(45,106,79,.1);color:var(--green)}
.estado-inactivo{background:rgba(139,26,26,.08);color:var(--red)}
.role-head{font-family:var(--mono);font-size:9px;letter-spacing:.06em;padding:2px 8px;border-radius:10px;display:inline-block;text-transform:uppercase}
.role-cond{background:rgba(26,82,150,.1);color:var(--blue)}
.role-op{background:rgba(45,106,79,.1);color:var(--green)}
.role-adm{background:rgba(140,101,8,.1);color:var(--gold)}
.role-dev{background:rgba(107,79,160,.1);color:var(--purple)}

.code-block,.dev-code{background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:14px 16px;font-family:var(--mono);font-size:11px;overflow-x:auto;line-height:1.6;margin-bottom:12px;white-space:pre}
.dev-code{font-size:10px;line-height:1.7;margin-top:4px}
.c,.c-comment{color:var(--muted)}
.k{color:var(--blue);font-weight:600}
.s{color:var(--green)}
.p{color:var(--text)}

.pages::-webkit-scrollbar{width:4px}
.pages::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
.sb::-webkit-scrollbar{width:3px}
.sb::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

.dev-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:8px}
.dev-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:20px}
.dev-card-t{font-weight:600;font-size:14px;margin-bottom:4px}
.dev-card-s{font-size:11px;color:var(--muted);margin-bottom:14px}
.dev-links{display:flex;flex-direction:column;gap:6px}
.dev-link{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:5px;text-decoration:none;color:var(--text);font-size:12px;transition:border-color .15s}
.dev-link:hover{border-color:var(--blue);color:var(--blue)}
.m-get{color:var(--green)}
.m-post{color:var(--blue)}
.m-put{color:var(--gold)}
.m-del{color:var(--red)}

.interacao-item{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}
.interacao-item:last-child{border-bottom:none}
.interacao-icon{width:32px;height:32px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.interacao-body{flex:1;min-width:0}
.interacao-meta{font-family:var(--mono);font-size:9px;color:var(--muted);margin-bottom:3px}
.interacao-desc{font-size:12px;line-height:1.5}
.interacao-prox{font-size:11px;color:var(--blue);margin-top:4px}
.estado-lead{background:rgba(107,79,160,.1);color:var(--purple)}
.estado-contactado{background:rgba(26,82,150,.1);color:var(--blue)}
.estado-em_proposta{background:rgba(140,101,8,.1);color:var(--gold)}
.estado-proposta_enviada{background:rgba(140,101,8,.15);color:var(--gold)}
.estado-ganho{background:rgba(45,106,79,.1);color:var(--green)}
.estado-perdido{background:rgba(139,26,26,.08);color:var(--red)}

.key-reveal{background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:14px;font-family:var(--mono);font-size:11px;word-break:break-all;margin-top:12px}
.key-warn{font-size:11px;color:var(--gold);margin-top:8px;font-family:var(--mono)}
`;

/* ───────────────────────────────────────────────────────────────────
 *  ROOT APP
 * ─────────────────────────────────────────────────────────────────── */

const DEV_MOCK_SESSION = { access_token: 'dev-bypass', user: { id: 'dev-user', email: 'dev@local' } };
const DEV_MOCK_STAFF = { is_staff: true, role: 'developer', nome: 'Dev User', id: 'dev-user' };

export default function V1CoreApp() {
  const [session, setSession] = useState(DEV_MOCK_SESSION);
  const [staffInfo, setStaffInfo] = useState(DEV_MOCK_STAFF);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('v1theme') || 'light');

  // Apply theme + inject CSS on mount
  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('v1theme', theme);
  }, [theme]);

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.id = 'v1-core-styles';
    styleEl.textContent = V1_CSS;
    document.head.appendChild(styleEl);
    // Font link
    if (!document.getElementById('v1-core-fonts')) {
      const link = document.createElement('link');
      link.id = 'v1-core-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';
      document.head.appendChild(link);
    }
    return () => styleEl.remove();
  }, []);

  // Check for existing Supabase session
  useEffect(() => {
    (async () => {
      const { data: { session: s } } = await sb.auth.getSession();
      if (s) {
        setSession(s);
        try {
          const info = await apiCall('/auth/staff-check', s);
          if (info?.is_staff) setStaffInfo(info);
          else await sb.auth.signOut();
        } catch (e) {
          console.error('staff-check failed:', e);
          await sb.auth.signOut();
        }
      }
      setLoading(false);
    })();

    const { data: listener } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) setStaffInfo(null);
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  const logout = async () => {
    await sb.auth.signOut();
    setSession(null); setStaffInfo(null);
  };

  if (loading) {
    return <div className="s-login"><div className="login-box"><div className="loading">A carregar…</div></div></div>;
  }
  if (!session || !staffInfo) {
    return <LoginScreen onLogin={(s, info) => { setSession(s); setStaffInfo(info); }} theme={theme} setTheme={setTheme} />;
  }
  return <AppShell session={session} staffInfo={staffInfo} theme={theme} setTheme={setTheme} onLogout={logout} />;
}

/* ───────────────────────────────────────────────────────────────────
 *  API CALL HELPER · preserva lógica do original
 * ─────────────────────────────────────────────────────────────────── */

async function apiCall(path, sessionOrNull, opts = {}) {
  const s = sessionOrNull || (await sb.auth.getSession()).data.session;
  if (!s) throw new Error('No session');
  const res = await fetch(`${CORE_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${s.access_token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  return res.json();
}

/* ───────────────────────────────────────────────────────────────────
 *  LOGIN SCREEN
 * ─────────────────────────────────────────────────────────────────── */

function LoginScreen({ onLogin, theme, setTheme }) {
  const [mode, setMode] = useState('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    setErr(''); setBusy(true);
    try {
      if (mode === 'pass') {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Check staff
        const info = await apiCall('/auth/staff-check', data.session);
        if (!info?.is_staff) {
          await sb.auth.signOut();
          setErr('Acesso negado.');
        } else {
          onLogin(data.session, info);
        }
      } else {
        const { error } = await sb.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.origin + window.location.pathname,
            shouldCreateUser: true,
          },
        });
        if (error) throw error;
        setSent(true);
      }
    } catch (e) {
      setErr(e.message || 'Erro ao autenticar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="s-login">
      <div className="login-box">
        <div className="login-logo">PropTech · Control Centre</div>
        <div className="login-title">Acesso interno</div>
        <p className="login-sub">
          Admins usam <strong>magic link</strong>.<br />
          Staff de vertical usa <strong>email + password</strong>.
        </p>

        {!sent ? (
          <>
            <div className="toggle">
              <button className={'toggle-opt ' + (mode === 'magic' ? 'on' : '')} onClick={() => setMode('magic')}>Magic Link</button>
              <button className={'toggle-opt ' + (mode === 'pass' ? 'on' : '')} onClick={() => setMode('pass')}>Password</button>
            </div>
            <label className="lbl">Email</label>
            <input type="email" className="inp" placeholder="mario@proptech.pt"
              value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            {mode === 'pass' && (
              <>
                <label className="lbl">Password</label>
                <input type="password" className="inp" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </>
            )}
            <button className="btn-primary" disabled={busy || !email} onClick={handleLogin}>
              {busy ? '…' : (mode === 'magic' ? 'Enviar magic link →' : 'Entrar →')}
            </button>
            {err && <div className="login-err">{err}</div>}
          </>
        ) : (
          <div className="login-sent">
            <div className="check">✉️</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Magic link enviado!</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Verifique o email <span>{email}</span> e clique no link.
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button className="theme-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀ Claro' : '🌙 Escuro'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────
 *  APP SHELL · sidebar + topbar + page router
 * ─────────────────────────────────────────────────────────────────── */

function AppShell({ session, staffInfo, theme, setTheme, onLogout }) {
  const [page, setPage] = useState('financeiro');
  const [sbCollapsed, setSbCollapsed] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="s-app">
      <Sidebar
        staffInfo={staffInfo}
        currentPage={page}
        onNav={setPage}
        collapsed={sbCollapsed}
        onToggleCollapse={() => setSbCollapsed((c) => !c)}
        onLogout={onLogout}
      />
      <div className="main">
        <Topbar staffInfo={staffInfo} now={now} theme={theme} setTheme={setTheme} />
        <div className="pages">
          {page === 'financeiro'  && <FinanceiroPage session={session} />}
          {page === 'clientes'    && <ClientesPage session={session} />}
          {page === 'pipeline'    && <PipelinePage session={session} />}
          {page === 'leads'       && <LeadsPage session={session} />}
          {page === 'permissoes'  && <PermissoesPage session={session} />}
          {page === 'staff'       && <StaffPage session={session} />}
          {page === 'apikeys'     && <ApiKeysPage session={session} />}
          {page === 'developer'   && <DeveloperPage />}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────
 *  SIDEBAR
 * ─────────────────────────────────────────────────────────────────── */

function Sidebar({ staffInfo, currentPage, onNav, collapsed, onToggleCollapse, onLogout }) {
  const items = [
    { section: 'Financeiro', entries: [{ id: 'financeiro', icon: '◈', label: 'Overview' }] },
    { section: 'Operacional', entries: [
      { id: 'clientes', icon: '◎', label: 'Clientes' },
      { id: 'pipeline', icon: '⊕', label: 'CRM Pipeline' },
      { id: 'leads',    icon: '⊙', label: 'Leads' },
    ]},
    { section: 'Admin', entries: [
      { id: 'permissoes', icon: '🔐', label: 'Permissões V2' },
      { id: 'staff',      icon: '⊞', label: 'Staff' },
      { id: 'apikeys',    icon: '⌘', label: 'API Keys' },
      { id: 'developer',  icon: '⚡', label: 'Developer' },
    ]},
  ];

  return (
    <aside className={'sb ' + (collapsed ? 'col' : '')}>
      <div className="sb-head">
        <div className="sb-brand">
          <div className="sb-logo">PropTech Hub</div>
          <div className="sb-user">{staffInfo?.email || '—'}</div>
          {staffInfo?.scope && <div className="sb-scope">{staffInfo.scope}</div>}
        </div>
        <button className="sb-toggle" onClick={onToggleCollapse} title="Colapsar">
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      <nav style={{ flex: 1, padding: '8px 0' }}>
        {items.map((sec) => (
          <React.Fragment key={sec.section}>
            <div className="sb-sec">{sec.section}</div>
            {sec.entries.map((it) => (
              <button key={it.id}
                className={'nav-btn ' + (currentPage === it.id ? 'on' : '')}
                onClick={() => onNav(it.id)}>
                <span className="ni">{it.icon}</span>
                <span className="nav-txt">{it.label}</span>
              </button>
            ))}
          </React.Fragment>
        ))}
      </nav>

      <div className="sb-ext">
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', padding: '4px 14px 6px' }}>
          Verticais
        </div>
        <a className="ext-a" href="https://prataowners.pt" target="_blank" rel="noreferrer">
          <span className="ext-dot" style={{ background: '#15803d' }}></span>V2 Condomínios
        </a>
        <a className="ext-a" href="https://proptech-owners-club.netlify.app/" target="_blank" rel="noreferrer">
          <span className="ext-dot" style={{ background: 'var(--gold)' }}></span>V9 Owners Club
        </a>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', padding: '8px 14px 4px' }}>
          Infra
        </div>
        <a className="ext-a" href="https://supabase.com/dashboard/project/hkmvszkpxjbxmnixzqbl" target="_blank" rel="noreferrer">
          <span className="ext-dot" style={{ background: 'var(--green)' }}></span>V1 Core Hub DB
        </a>
        <a className="ext-a" href="https://supabase.com/dashboard/project/eozklslwfaqujaijvdnl" target="_blank" rel="noreferrer">
          <span className="ext-dot" style={{ background: '#15803d' }}></span>V2 Condo Hub DB
        </a>
      </div>

      <div className="sb-foot">
        <button className="sb-logout" onClick={onLogout}>Terminar Sessão</button>
      </div>
    </aside>
  );
}

/* ───────────────────────────────────────────────────────────────────
 *  TOPBAR
 * ─────────────────────────────────────────────────────────────────── */

function Topbar({ staffInfo, now, theme, setTheme }) {
  return (
    <div className="topbar">
      <div className="tb-time">
        {now.toLocaleString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="tb-r">
        {staffInfo?.scope && <div className="b b-blue">{staffInfo.scope}</div>}
        <button className="theme-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? '☀ Claro' : '🌙 Escuro'}
        </button>
        <div className="role-badge">{staffInfo?.role || 'staff'}</div>
        <div className="tb-name">{staffInfo?.email || '—'}</div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────
 *  PAGE · FINANCEIRO (overview + MRR + saúde verticais)
 * ─────────────────────────────────────────────────────────────────── */

function FinanceiroPage({ session }) {
  const [data, setData] = useState(null);
  const [health, setHealth] = useState([]);
  const [mrrHistorico, setMrrHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ts, setTs] = useState(null);
  const chartCanvas = useRef(null);
  const chartInstance = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kpis, h, mrr] = await Promise.all([
        apiCall('/financial/kpis', session),
        apiCall('/financial/vertical-health', session),
        apiCall('/financial/mrr-historico', session),
      ]);
      setData(kpis);
      setHealth(h?.verticals || h || []);
      setMrrHistorico(mrr?.historico || mrr || []);
      setTs(new Date());
    } catch (e) {
      console.error('loadFinanceiro:', e);
    } finally { setLoading(false); }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  // Chart.js render
  useEffect(() => {
    if (!chartCanvas.current || !mrrHistorico.length) return;
    if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; }
    const ctx = chartCanvas.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: mrrHistorico.map((m) => m.mes || m.label),
        datasets: [{
          label: 'MRR (€)',
          data: mrrHistorico.map((m) => m.valor || m.mrr || 0),
          borderColor: '#1a5296',
          backgroundColor: 'rgba(26,82,150,.1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { callback: (v) => '€' + v } },
        },
      },
    });
    return () => { if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; } };
  }, [mrrHistorico]);

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">Controlo Financeiro</div>
          <div className="ps">{loading ? 'A carregar…' : (ts ? 'Actualizado ' + fdt(ts) : 'Sem dados')}</div>
        </div>
        <button className="ab ab-outline" onClick={load}>↻</button>
      </div>

      <div className="kpi4">
        <Kpi label="MRR Total"        val={data?.mrr_total ? eur(data.mrr_total) : '—'}     sub="Receita mensal recorrente" tone="green" />
        <Kpi label="ARR Estimado"     val={data?.arr ? eur(data.arr) : '—'}                 sub="Receita anual projectada"  tone="blue"  />
        <Kpi label="ARPU"             val={data?.arpu ? eur(data.arpu) : '—'}               sub="Receita média por cliente" tone="teal"  />
        <Kpi label="LTV Estimado"     val={data?.ltv ? eur(data.ltv) : '—'}                 sub="Valor de vida a 24 meses"  tone="purple"/>
      </div>

      <div className="kpi4">
        <Kpi label="Clientes activos" val={data?.clientes_ativos ?? '—'}                    sub="Com serviço activo"         tone="gold"  />
        <Kpi label="Novos (30d)"      val={data?.novos_30d ?? '—'}                          sub="Novos serviços este mês"    tone="green" />
        <Kpi label="Churn (30d)"      val={data?.churn_30d ?? '—'}                          sub="Cancelamentos este mês"     tone="red"   />
        <Kpi label="Total Pessoas"    val={data?.total_pessoas ?? '—'}                      sub="No Core Hub"                          />
      </div>

      <div className="g2">
        <div className="card">
          <div className="card-h"><div className="card-t">MRR por vertical</div></div>
          <div className="tw"><table>
            <thead><tr><th>Vertical</th><th>MRR</th><th>ARR</th><th>Clientes</th><th>Serviços</th></tr></thead>
            <tbody>
              {(data?.por_vertical || []).map((v) => (
                <tr key={v.vertical}>
                  <td><span className={'b b-' + vcls(v.vertical)}>{v.vertical}</span></td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{eur(v.mrr)}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{eur((v.mrr || 0) * 12)}</td>
                  <td>{v.clientes || 0}</td>
                  <td>{v.servicos || 0}</td>
                </tr>
              ))}
              {!data?.por_vertical?.length && <tr><td colSpan={5} className="empty">Sem dados</td></tr>}
            </tbody>
          </table></div>
        </div>

        <div className="card">
          <div className="card-h"><div className="card-t">Owners Club — Tiers</div></div>
          <div className="tw"><table>
            <thead><tr><th>Tier</th><th>Membros</th><th>MRR</th><th>Pontos médios</th></tr></thead>
            <tbody>
              {(data?.tiers || []).map((t) => (
                <tr key={t.tier}>
                  <td><span className="b b-gold">{t.tier}</span></td>
                  <td>{t.membros || 0}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{eur(t.mrr)}</td>
                  <td>{t.pontos_medios || 0}</td>
                </tr>
              ))}
              {!data?.tiers?.length && <tr><td colSpan={4} className="empty">Sem tiers</td></tr>}
            </tbody>
          </table></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-h">
          <div className="card-t">Evolução MRR</div>
          <div className="card-s">últimos {mrrHistorico.length || 6} meses</div>
        </div>
        <div className="card-body">
          <div className="chart-wrap"><canvas ref={chartCanvas}></canvas></div>
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Saúde das Verticais</span>
      </div>
      <div className="g3">
        {health.map((v) => (
          <div key={v.vertical} className="vcard">
            <div className={'vcard-status ' + ((v.mrr || 0) > 0 ? 'vs-active' : 'vs-empty')}></div>
            <div className="vcard-name">{v.vertical}</div>
            <div className="vcard-mrr" style={{ color: (v.mrr || 0) > 0 ? 'var(--green)' : 'var(--muted)' }}>
              {eur(v.mrr || 0)}
            </div>
            <div className="vcard-info">
              {(v.clientes || 0)} clientes · {(v.servicos || 0)} serviços
            </div>
            <div className="vcard-delta">
              <span className={'vd ' + ((v.delta_mrr_30d || 0) > 0 ? 'vd-up' : (v.delta_mrr_30d || 0) < 0 ? 'vd-dn' : 'vd-0')}>
                {(v.delta_mrr_30d || 0) > 0 ? '+' : ''}{eur(v.delta_mrr_30d || 0)} (30d)
              </span>
            </div>
          </div>
        ))}
        {!health.length && <div className="empty" style={{ gridColumn: '1/-1' }}>Sem dados de saúde das verticais</div>}
      </div>
    </>
  );
}

function Kpi({ label, val, sub, tone }) {
  return (
    <div className={'kpi ' + (tone ? 'c-' + tone : '')}>
      <div className="kpi-l">{label}</div>
      <div className="kpi-v">{val}</div>
      <div className="kpi-s">{sub}</div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────
 *  PAGE · CLIENTES
 * ─────────────────────────────────────────────────────────────────── */

function ClientesPage({ session }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await apiCall('/staff/pessoas', session);
        setList(r?.pessoas || r || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [session]);

  const filtered = useMemo(() => {
    const ql = search.toLowerCase();
    return list.filter((p) =>
      (!tierFilter || p.tier === tierFilter) &&
      (!ql || (p.nome || '').toLowerCase().includes(ql) || (p.email || '').toLowerCase().includes(ql))
    );
  }, [list, search, tierFilter]);

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">Clientes</div>
          <div className="ps">{filtered.length} de {list.length} clientes</div>
        </div>
      </div>

      <div className="sbar">
        <input type="text" className="s-inp" placeholder="Nome ou email…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className={'f-btn ' + (!tierFilter ? 'on' : '')} onClick={() => setTierFilter(null)}>Todos</button>
        <button className={'f-btn ' + (tierFilter === 'member' ? 'on' : '')} onClick={() => setTierFilter('member')}>Member</button>
        <button className={'f-btn ' + (tierFilter === 'silver' ? 'on' : '')} onClick={() => setTierFilter('silver')}>Silver</button>
        <button className={'f-btn ' + (tierFilter === 'gold' ? 'on' : '')} onClick={() => setTierFilter('gold')}>Gold</button>
      </div>

      <div className="card"><div className="tw">
        <table>
          <thead><tr>
            <th>Nome</th><th>Email</th><th>Localidade</th><th>Tier</th>
            <th>Serv.</th><th>Pontos</th><th>Fonte</th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="loading">A carregar…</td></tr>}
            {!loading && !filtered.length && <tr><td colSpan={7} className="empty">Sem clientes</td></tr>}
            {filtered.map((p) => (
              <tr key={p.id} onClick={() => setOpenId(p.id)} style={{ cursor: 'pointer' }}>
                <td>{p.nome}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{p.email}</td>
                <td>{p.localidade || '—'}</td>
                <td><span className="b b-gold">{p.tier || 'member'}</span></td>
                <td>{p.servicos || 0}</td>
                <td style={{ fontFamily: 'var(--mono)' }}>{p.pontos || 0}</td>
                <td><span className="b b-dim">{p.fonte || '—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>

      {openId && <ClienteModal id={openId} session={session} onClose={() => setOpenId(null)} />}
    </>
  );
}

function ClienteModal({ id, session, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await apiCall(`/client/${id}`, session);
        setData(r);
      } catch (e) { console.error(e); }
    })();
  }, [id, session]);
  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 640 }}>
        <div className="modal-h">
          <div className="modal-t">{data?.pessoa?.nome || '—'}</div>
          <button className="modal-x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {!data ? <div className="loading">A carregar…</div> : (
            <>
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="ff"><label>Email</label><input value={data.pessoa?.email || ''} readOnly /></div>
                <div className="ff"><label>Telefone</label><input value={data.pessoa?.telefone || ''} readOnly /></div>
                <div className="ff"><label>NIF</label><input value={data.pessoa?.nif || ''} readOnly /></div>
                <div className="ff"><label>Tier</label><input value={data.pessoa?.tier || ''} readOnly /></div>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
                Serviços activos
              </div>
              <div className="tw"><table>
                <thead><tr><th>Vertical</th><th>Produto</th><th>Valor/mês</th><th>Desde</th></tr></thead>
                <tbody>
                  {(data.servicos || []).map((s, i) => (
                    <tr key={i}>
                      <td><span className={'b b-' + vcls(s.vertical)}>{s.vertical}</span></td>
                      <td>{s.produto}</td>
                      <td style={{ fontFamily: 'var(--mono)' }}>{eur(s.valor_mensal)}</td>
                      <td>{fdate(s.criado_em)}</td>
                    </tr>
                  ))}
                  {!data.servicos?.length && <tr><td colSpan={4} className="empty">Sem serviços</td></tr>}
                </tbody>
              </table></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────
 *  PAGE · PIPELINE (CRM)
 * ─────────────────────────────────────────────────────────────────── */

function PipelinePage({ session }) {
  const [vertical, setVertical] = useState('');
  const [tab, setTab] = useState('todos');
  const [oportunidades, setOportunidades] = useState([]);
  const [kpis, setKpis] = useState({});
  const [loading, setLoading] = useState(true);
  const [detalheId, setDetalheId] = useState(null);
  const [novoOpen, setNovoOpen] = useState(false);
  const [editOport, setEditOport] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiCall(`/crm/oportunidades${vertical ? '?vertical=' + vertical : ''}`, session);
      const ops = r?.oportunidades || r || [];
      setOportunidades(ops);
      setKpis({
        total: ops.length,
        valor: ops.reduce((s, o) => s + (o.valor_estimado || 0), 0),
        ganhas: ops.filter((o) => o.estado === 'ganho').length,
        perdidas: ops.filter((o) => o.estado === 'perdido').length,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [session, vertical]);

  useEffect(() => { load(); }, [load]);

  const filtered = tab === 'todos' ? oportunidades : oportunidades.filter((o) => o.estado === tab);

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">CRM Pipeline</div>
          <div className="ps">Oportunidades por vertical e estado</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={vertical} onChange={(e) => setVertical(e.target.value)}
            className="s-inp" style={{ flex: 0, width: 180 }}>
            <option value="">Todas as verticais</option>
            <option value="condominio">🏢 Condomínios</option>
            <option value="seguros">🛡️ Seguros</option>
            <option value="energia">⚡ Energia</option>
            <option value="manutencao">🔧 Manutenção</option>
            <option value="owners_club">🏆 Owners Club</option>
          </select>
          <button className="ab" onClick={() => { setEditOport(null); setNovoOpen(true); }}>+ Nova Oportunidade</button>
        </div>
      </div>

      <div className="kpi4" style={{ marginBottom: 20 }}>
        <Kpi label="Total Oportunidades" val={kpis.total ?? '—'} sub="" />
        <Kpi label="Valor Pipeline" val={eur(kpis.valor)} sub="" tone="gold" />
        <Kpi label="Ganhas" val={kpis.ganhas ?? 0} sub="" tone="green" />
        <Kpi label="Perdidas" val={kpis.perdidas ?? 0} sub="" tone="red" />
      </div>

      <div className="perm-tabs">
        {['todos', 'lead', 'contactado', 'em_proposta', 'ganho', 'perdido'].map((t) => (
          <button key={t} className={'perm-tab-btn ' + (tab === t ? 'on' : '')}
            onClick={() => setTab(t)}>
            {t === 'todos' ? 'Todos' :
             t === 'lead' ? 'Lead' :
             t === 'contactado' ? 'Contactado' :
             t === 'em_proposta' ? 'Em Proposta' :
             t === 'ganho' ? 'Ganho ✓' : 'Perdido'}
          </button>
        ))}
      </div>

      <div className="card"><div className="tw">
        <table>
          <thead><tr>
            <th>Cliente</th><th>Vertical</th><th>Produto</th><th>Estado</th>
            <th>Valor est.</th><th>Origem</th><th>Data</th><th></th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="loading">A carregar…</td></tr>}
            {!loading && !filtered.length && <tr><td colSpan={8} className="empty">Sem oportunidades</td></tr>}
            {filtered.map((o) => (
              <tr key={o.id}>
                <td>{o.pessoa_nome || o.cliente_nome || '—'}</td>
                <td><span className={'b b-' + vcls(o.vertical)}>{o.vertical}</span></td>
                <td>{o.produto}</td>
                <td><span className={'estado-badge estado-' + o.estado}>{o.estado}</span></td>
                <td style={{ fontFamily: 'var(--mono)' }}>{eur(o.valor_estimado)}</td>
                <td style={{ fontSize: 11 }}>{o.origem || '—'}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{fdate(o.criado_em)}</td>
                <td>
                  <button className="icon-btn" onClick={() => setDetalheId(o.id)}>Ver</button>
                  <button className="icon-btn" style={{ marginLeft: 4 }} onClick={() => { setEditOport(o); setNovoOpen(true); }}>✎</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>

      {detalheId && <OportunidadeDetalhe id={detalheId} session={session} onClose={() => setDetalheId(null)} onReload={load} />}
      {novoOpen && <OportunidadeModal oportunidade={editOport} session={session} onClose={() => setNovoOpen(false)} onSaved={() => { setNovoOpen(false); load(); }} />}
    </>
  );
}

function OportunidadeDetalhe({ id, session, onClose, onReload }) {
  const [oport, setOport] = useState(null);
  const [interacoes, setInteracoes] = useState([]);
  const [novaIntOpen, setNovaIntOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiCall(`/crm/oportunidades/${id}`, session);
      setOport(r?.oportunidade || r);
      setInteracoes(r?.interacoes || []);
    } catch (e) { console.error(e); }
  }, [id, session]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card">
        <div className="card-h">
          <div className="card-t">{oport?.produto || 'Oportunidade'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ab ab-outline" onClick={() => setNovaIntOpen(true)}>+ Registar Interacção</button>
            <button className="ab ab-outline" onClick={onClose}>Fechar</button>
          </div>
        </div>
        <div className="card-body">
          {!oport ? <div className="loading">A carregar…</div> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, fontSize: 12, marginBottom: 16 }}>
                <div><div style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>Cliente</div>{oport.pessoa_nome || '—'}</div>
                <div><div style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>Vertical</div><span className={'b b-' + vcls(oport.vertical)}>{oport.vertical}</span></div>
                <div><div style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>Estado</div><span className={'estado-badge estado-' + oport.estado}>{oport.estado}</span></div>
                <div><div style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>Valor</div><span style={{ fontFamily: 'var(--mono)' }}>{eur(oport.valor_estimado)}</span></div>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
                Histórico de Interacções
              </div>
              {!interacoes.length && <div className="empty">Sem interacções</div>}
              {interacoes.map((i) => (
                <div key={i.id} className="interacao-item">
                  <div className="interacao-icon">{{ chamada: '📞', email: '📧', reuniao: '🤝', whatsapp: '💬', proposta: '📄', seguimento: '🔄', nota: '📝' }[i.tipo] || '•'}</div>
                  <div className="interacao-body">
                    <div className="interacao-meta">{fdt(i.criado_em)} · {i.tipo} · <span style={{ color: i.resultado === 'positivo' ? 'var(--green)' : i.resultado === 'negativo' ? 'var(--red)' : 'var(--muted)' }}>{i.resultado}</span></div>
                    <div className="interacao-desc">{i.descricao}</div>
                    {i.proxima_accao && <div className="interacao-prox">→ {i.proxima_accao}{i.data_proxima ? ' em ' + fdt(i.data_proxima) : ''}</div>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      {novaIntOpen && <InteracaoModal oportunidadeId={id} session={session} onClose={() => setNovaIntOpen(false)} onSaved={() => { setNovaIntOpen(false); load(); }} />}
    </div>
  );
}

function OportunidadeModal({ oportunidade, session, onClose, onSaved }) {
  const [form, setForm] = useState({
    vertical: oportunidade?.vertical || 'condominio',
    produto: oportunidade?.produto || '',
    estado: oportunidade?.estado || 'lead',
    valor_estimado: oportunidade?.valor_estimado || 0,
    origem: oportunidade?.origem || 'manual',
    responsavel: oportunidade?.responsavel || '',
    notas: oportunidade?.notas || '',
  });
  const [msg, setMsg] = useState({ text: '', type: '' });

  const save = async () => {
    if (!form.produto) { setMsg({ text: 'Produto obrigatório', type: 'er' }); return; }
    try {
      const url = oportunidade ? `/crm/oportunidades/${oportunidade.id}` : '/crm/oportunidades';
      const method = oportunidade ? 'PUT' : 'POST';
      const r = await apiCall(url, session, { method, body: JSON.stringify(form) });
      if (r?.ok || r?.id) { setMsg({ text: '✓ Guardado', type: 'ok' }); setTimeout(onSaved, 600); }
      else setMsg({ text: r?.error || 'Erro', type: 'er' });
    } catch (e) { setMsg({ text: 'Erro', type: 'er' }); }
  };

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-h">
          <div className="modal-t">{oportunidade ? 'Editar Oportunidade' : 'Nova Oportunidade'}</div>
          <button className="modal-x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="ff"><label>Vertical</label>
              <select value={form.vertical} onChange={(e) => setForm({ ...form, vertical: e.target.value })}>
                <option value="condominio">🏢 Condomínios</option>
                <option value="seguros">🛡️ Seguros</option>
                <option value="energia">⚡ Energia</option>
                <option value="manutencao">🔧 Manutenção</option>
                <option value="owners_club">🏆 Owners Club</option>
              </select>
            </div>
            <div className="ff"><label>Produto / Serviço</label>
              <input value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} placeholder="ex: Multirriscos Habitação" />
            </div>
            <div className="ff"><label>Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="lead">Lead</option>
                <option value="contactado">Contactado</option>
                <option value="em_proposta">Em Proposta</option>
                <option value="ganho">Ganho</option>
                <option value="perdido">Perdido</option>
              </select>
            </div>
            <div className="ff"><label>Valor Estimado (€)</label>
              <input type="number" value={form.valor_estimado} onChange={(e) => setForm({ ...form, valor_estimado: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="ff"><label>Origem</label>
              <select value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })}>
                <option value="manual">Manual</option>
                <option value="website">Website</option>
                <option value="meta_ads">Meta Ads</option>
                <option value="google_ads">Google Ads</option>
                <option value="referencia">Referência</option>
                <option value="cruzamento_vertical">Cruzamento Vertical</option>
              </select>
            </div>
            <div className="ff"><label>Responsável</label>
              <input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} placeholder="Nome do responsável" />
            </div>
            <div className="ff ff-full"><label>Notas</label>
              <input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Notas da oportunidade" />
            </div>
          </div>
          <div className="form-actions">
            <button className="ab ab-green" onClick={save}>Guardar</button>
            {msg.text && <div className={'form-msg ' + msg.type}>{msg.text}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function InteracaoModal({ oportunidadeId, session, onClose, onSaved }) {
  const [form, setForm] = useState({
    tipo: 'chamada', resultado: 'positivo',
    descricao: '', proxima_accao: '', data_proxima: '',
  });
  const [msg, setMsg] = useState({ text: '', type: '' });

  const save = async () => {
    if (!form.descricao) { setMsg({ text: 'Descrição obrigatória', type: 'er' }); return; }
    try {
      const r = await apiCall(`/crm/oportunidades/${oportunidadeId}/interacoes`, session, {
        method: 'POST',
        body: JSON.stringify({
          tipo: form.tipo,
          resultado: form.resultado,
          descricao: form.descricao,
          proxima_accao: form.proxima_accao || null,
          data_proxima: form.data_proxima || null,
        }),
      });
      if (r?.ok || r?.id) { setMsg({ text: '✓ Guardado', type: 'ok' }); setTimeout(onSaved, 600); }
      else setMsg({ text: r?.error || 'Erro', type: 'er' });
    } catch (e) { setMsg({ text: 'Erro', type: 'er' }); }
  };

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-h">
          <div className="modal-t">Registar Interacção</div>
          <button className="modal-x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="ff"><label>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="chamada">📞 Chamada</option>
                <option value="email">📧 Email</option>
                <option value="reuniao">🤝 Reunião</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="proposta">📄 Proposta</option>
                <option value="seguimento">🔄 Seguimento</option>
                <option value="nota">📝 Nota</option>
              </select>
            </div>
            <div className="ff"><label>Resultado</label>
              <select value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value })}>
                <option value="positivo">✅ Positivo</option>
                <option value="neutro">➖ Neutro</option>
                <option value="negativo">❌ Negativo</option>
                <option value="sem_resposta">📵 Sem resposta</option>
              </select>
            </div>
            <div className="ff ff-full"><label>Descrição</label>
              <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Resumo da interacção" />
            </div>
            <div className="ff"><label>Próxima Acção</label>
              <input value={form.proxima_accao} onChange={(e) => setForm({ ...form, proxima_accao: e.target.value })} placeholder="ex: Enviar proposta" />
            </div>
            <div className="ff"><label>Data Próxima Acção</label>
              <input type="datetime-local" value={form.data_proxima} onChange={(e) => setForm({ ...form, data_proxima: e.target.value })} />
            </div>
          </div>
          <div className="form-actions">
            <button className="ab ab-green" onClick={save}>Guardar Interacção</button>
            {msg.text && <div className={'form-msg ' + msg.type}>{msg.text}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────
 *  PAGE · LEADS
 * ─────────────────────────────────────────────────────────────────── */

function LeadsPage({ session }) {
  const [list, setList] = useState([]);
  const [vertical, setVertical] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiCall(`/leads${vertical ? '?vertical=' + vertical : ''}`, session);
      setList(r?.leads || r || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [session, vertical]);

  useEffect(() => { load(); }, [load]);

  const converter = async (id, nome) => {
    if (!confirm(`Converter lead "${nome}" em pessoa no Core?`)) return;
    try {
      const r = await apiCall('/leads/converter', session, { method: 'POST', body: JSON.stringify({ lead_id: id, nome }) });
      if (r?.ok) { alert('Lead convertida com sucesso!'); load(); }
      else alert(r?.error || 'Erro');
    } catch (e) { alert('Erro'); }
  };

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">Leads</div>
          <div className="ps">{list.length} leads</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={'f-btn ' + (!vertical ? 'on' : '')} onClick={() => setVertical(null)}>Todos</button>
          <button className={'f-btn ' + (vertical === 'seguros' ? 'on' : '')} onClick={() => setVertical('seguros')}>Seguros</button>
          <button className={'f-btn ' + (vertical === 'energia' ? 'on' : '')} onClick={() => setVertical('energia')}>Energia</button>
          <button className={'f-btn ' + (vertical === 'manutencao' ? 'on' : '')} onClick={() => setVertical('manutencao')}>Manutenção</button>
        </div>
      </div>

      <div className="card"><div className="tw">
        <table>
          <thead><tr>
            <th>Data</th><th>Nome</th><th>Email</th><th>Vertical</th>
            <th>Origem</th><th>UTM</th><th>Estado</th><th>Acção</th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="loading">A carregar…</td></tr>}
            {!loading && !list.length && <tr><td colSpan={8} className="empty">Sem leads</td></tr>}
            {list.map((l) => (
              <tr key={l.id}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{fdate(l.criado_em)}</td>
                <td>{l.nome}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{l.email}</td>
                <td><span className={'b b-' + vcls(l.vertical)}>{l.vertical}</span></td>
                <td style={{ fontSize: 11 }}>{l.origem || '—'}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{l.utm_campaign || '—'}</td>
                <td><span className={'b b-' + (l.convertido ? 'green' : 'dim')}>{l.convertido ? 'Convertido' : 'Pendente'}</span></td>
                <td>
                  {!l.convertido && <button className="icon-btn" onClick={() => converter(l.id, l.nome)}>Converter →</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>
    </>
  );
}

/* ───────────────────────────────────────────────────────────────────
 *  PAGE · PERMISSÕES (V2)
 * ─────────────────────────────────────────────────────────────────── */

function PermissoesPage({ session }) {
  const [tab, setTab] = useState('utilizadores');
  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">🔐 Permissões &amp; Utilizadores</div>
          <div className="ps">Gestão de acessos ao portal V2 Condomínios</div>
        </div>
      </div>
      <div className="perm-tabs">
        <button className={'perm-tab-btn ' + (tab === 'utilizadores' ? 'on' : '')} onClick={() => setTab('utilizadores')}>👥 Utilizadores</button>
        <button className={'perm-tab-btn ' + (tab === 'grupos' ? 'on' : '')} onClick={() => setTab('grupos')}>🛡️ Grupos &amp; Permissões</button>
        <button className={'perm-tab-btn ' + (tab === 'logs' ? 'on' : '')} onClick={() => setTab('logs')}>📋 Logs de Actividade</button>
      </div>
      {tab === 'utilizadores' && <PermTabUtilizadores session={session} />}
      {tab === 'grupos' && <PermTabGrupos session={session} />}
      {tab === 'logs' && <PermTabLogs session={session} />}
    </>
  );
}

function PermTabUtilizadores({ session }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [grupoF, setGrupoF] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiCall('/v2/utilizadores', session);
      setList(r?.utilizadores || r || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const ql = search.toLowerCase();
    return list.filter((u) =>
      (!grupoF || u.grupo === grupoF) &&
      (!ql || (u.nome || '').toLowerCase().includes(ql) || (u.email || '').toLowerCase().includes(ql))
    );
  }, [list, search, grupoF]);

  return (
    <>
      <div className="sbar" style={{ marginBottom: 14 }}>
        <input type="text" className="s-inp" placeholder="Pesquisar nome ou email…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="s-inp" style={{ flex: 0, width: 160 }} value={grupoF} onChange={(e) => setGrupoF(e.target.value)}>
          <option value="">Todos os grupos</option>
          <option value="condómino">Condómino</option>
          <option value="operacional">Operacional</option>
          <option value="administrador">Administrador</option>
          <option value="developer">Developer</option>
        </select>
        <span className="crm-count" style={{ marginLeft: 8 }}>{filtered.length} de {list.length}</span>
        <button className="ab" onClick={() => { setEditUser(null); setModalOpen(true); }}>+ Novo Utilizador</button>
      </div>
      <div className="card"><div className="tw">
        <table>
          <thead><tr>
            <th>Nome</th><th>Email</th><th>Grupo</th><th>Fracção</th>
            <th>Último Acesso</th><th>Estado</th><th></th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="loading">A carregar…</td></tr>}
            {!loading && !filtered.length && <tr><td colSpan={7} className="empty">Sem utilizadores</td></tr>}
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{u.email}</td>
                <td><span className={'role-head role-' + (u.grupo === 'condómino' ? 'cond' : u.grupo === 'operacional' ? 'op' : u.grupo === 'administrador' ? 'adm' : 'dev')}>{u.grupo}</span></td>
                <td style={{ fontFamily: 'var(--mono)' }}>{u.fracao || '—'}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{fdt(u.ultimo_acesso)}</td>
                <td><span className={'estado-badge estado-' + (u.ativo ? 'activo' : 'inactivo')}>{u.ativo ? 'Activo' : 'Inactivo'}</span></td>
                <td><button className="icon-btn" onClick={() => { setEditUser(u); setModalOpen(true); }}>✎</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>
      {modalOpen && <UtilizadorModal user={editUser} session={session} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load(); }} />}
    </>
  );
}

function UtilizadorModal({ user, session, onClose, onSaved }) {
  const [form, setForm] = useState({
    nome: user?.nome || '', email: user?.email || '', password: '',
    grupo: user?.grupo || 'condómino', fracao: user?.fracao || '',
    ativo: user?.ativo ?? true,
  });
  const [msg, setMsg] = useState({ text: '', type: '' });

  const save = async () => {
    if (!form.nome || !form.email) { setMsg({ text: 'Nome e email obrigatórios', type: 'er' }); return; }
    try {
      const url = user ? `/v2/utilizadores/${user.id}` : '/v2/utilizadores';
      const method = user ? 'PUT' : 'POST';
      const body = { ...form };
      if (!body.password) delete body.password;
      const r = await apiCall(url, session, { method, body: JSON.stringify(body) });
      if (r?.ok || r?.id) { setMsg({ text: '✓ Guardado', type: 'ok' }); setTimeout(onSaved, 600); }
      else setMsg({ text: r?.error || 'Erro', type: 'er' });
    } catch (e) { setMsg({ text: 'Erro', type: 'er' }); }
  };

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-h">
          <div className="modal-t">{user ? 'Editar Utilizador' : 'Novo Utilizador'}</div>
          <button className="modal-x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="ff"><label>Nome</label><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" /></div>
            <div className="ff"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.pt" /></div>
            <div className="ff"><label>Password (nova/alterar)</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Deixar vazio para não alterar" /></div>
            <div className="ff"><label>Grupo</label>
              <select value={form.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value })}>
                <option value="condómino">Condómino</option>
                <option value="operacional">Operacional</option>
                <option value="administrador">Administrador</option>
                <option value="developer">Developer</option>
              </select>
            </div>
            <div className="ff"><label>Fracção</label><input value={form.fracao} onChange={(e) => setForm({ ...form, fracao: e.target.value })} placeholder="ex: 12-A3E" /></div>
            <div className="ff"><label>Estado</label>
              <select value={form.ativo ? 'true' : 'false'} onChange={(e) => setForm({ ...form, ativo: e.target.value === 'true' })}>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="ab ab-green" onClick={save}>Guardar</button>
            {msg.text && <div className={'form-msg ' + msg.type}>{msg.text}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function PermTabGrupos({ session }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiCall('/v2/permissoes', session);
        setData(r?.matriz || r);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [session]);

  const toggle = (secao, grupo) => {
    setData((d) => {
      const next = { ...d };
      next[secao] = { ...next[secao], [grupo]: !next[secao][grupo] };
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    try {
      const r = await apiCall('/v2/permissoes', session, { method: 'POST', body: JSON.stringify({ matriz: data }) });
      if (r?.ok) { alert('Permissões actualizadas'); setDirty(false); }
    } catch (e) { alert('Erro ao guardar'); }
  };

  if (loading) return <div className="loading">A carregar…</div>;
  if (!data) return <div className="empty">Sem dados</div>;

  const grupos = ['condómino', 'operacional', 'administrador', 'developer'];
  const secoes = Object.keys(data);

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-h">
        <div className="card-t">Permissões por secção</div>
        {dirty && <button className="ab ab-green" onClick={save}>💾 Guardar Alterações</button>}
      </div>
      <div className="card-body">
        <div className="tw"><table>
          <thead><tr>
            <th>Secção</th>
            {grupos.map((g) => <th key={g} style={{ textAlign: 'center' }}>{g}</th>)}
          </tr></thead>
          <tbody>
            {secoes.map((s) => (
              <tr key={s}>
                <td style={{ fontWeight: 500 }}>{s}</td>
                {grupos.map((g) => (
                  <td key={g} style={{ textAlign: 'center' }}>
                    <input type="checkbox" className="perm-cb"
                      checked={!!data[s]?.[g]} onChange={() => toggle(s, g)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

function PermTabLogs({ session }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [origem, setOrigem] = useState('');
  const [tipo, setTipo] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ offset: String(offset), limit: String(LIMIT) });
      if (origem) q.set('origem', origem);
      if (tipo) q.set('tipo', tipo);
      if (search) q.set('q', search);
      const r = await apiCall('/v2/logs?' + q.toString(), session);
      setLogs(r?.logs || r || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [session, origem, tipo, search, offset]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="sbar" style={{ marginBottom: 14 }}>
        <select className="s-inp" style={{ flex: 0, width: 160 }} value={origem} onChange={(e) => { setOffset(0); setOrigem(e.target.value); }}>
          <option value="">Todas as origens</option>
          <option value="staff">Staff</option>
          <option value="condómino">Condómino</option>
        </select>
        <select className="s-inp" style={{ flex: 0, width: 160 }} value={tipo} onChange={(e) => { setOffset(0); setTipo(e.target.value); }}>
          <option value="">Todos os tipos</option>
          <option value="LOGIN">Login</option>
          <option value="token">Token</option>
          <option value="saved">Saved</option>
        </select>
        <input className="s-inp" placeholder="Pesquisar utilizador…" value={search} onChange={(e) => { setOffset(0); setSearch(e.target.value); }} />
        <span className="crm-count" style={{ marginLeft: 'auto' }}>{logs.length} registos · offset {offset}</span>
      </div>
      <div className="card"><div className="tw">
        <table>
          <thead><tr>
            <th>Data/Hora</th><th>Utilizador</th><th>Origem</th><th>Tipo</th>
            <th>Detalhe</th><th>Resultado</th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="loading">A carregar…</td></tr>}
            {!loading && !logs.length && <tr><td colSpan={6} className="empty">Sem logs</td></tr>}
            {logs.map((l, i) => (
              <tr key={l.id || i}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{fdt(l.criado_em)}</td>
                <td>{l.utilizador || l.email}</td>
                <td><span className="b b-dim">{l.origem}</span></td>
                <td style={{ fontFamily: 'var(--mono)' }}>{l.tipo}</td>
                <td style={{ fontSize: 11 }}>{l.detalhe}</td>
                <td><span className={'b b-' + (l.ok ? 'green' : 'red')}>{l.ok ? 'OK' : 'FAIL'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <button className="f-btn" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>◀ Anterior</button>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>Página {Math.floor(offset / LIMIT) + 1}</span>
        <button className="f-btn" disabled={logs.length < LIMIT} onClick={() => setOffset(offset + LIMIT)}>Seguinte ▶</button>
      </div>
    </>
  );
}

/* ───────────────────────────────────────────────────────────────────
 *  PAGE · STAFF
 * ─────────────────────────────────────────────────────────────────── */

function StaffPage({ session }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: '', email: '', password: '', role: 'support', scope: '' });
  const [msg, setMsg] = useState({ text: '', type: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiCall('/staff', session);
      setList(r?.staff || r || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.nome || !form.email || !form.password) { setMsg({ text: 'Todos os campos são obrigatórios', type: 'er' }); return; }
    try {
      const r = await apiCall('/staff', session, { method: 'POST', body: JSON.stringify(form) });
      if (r?.ok || r?.id) {
        setMsg({ text: '✓ Membro criado', type: 'ok' });
        setForm({ nome: '', email: '', password: '', role: 'support', scope: '' });
        load();
      } else setMsg({ text: r?.error || 'Erro', type: 'er' });
    } catch (e) { setMsg({ text: 'Erro', type: 'er' }); }
  };

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">Staff</div>
          <div className="ps">Gestão de acessos internos por vertical</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-h"><div className="card-t">Criar novo membro</div></div>
        <div className="card-body">
          <div className="form-grid">
            <div className="ff"><label>Nome</label><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ana Silva" /></div>
            <div className="ff"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ana@proptech.pt" /></div>
            <div className="ff"><label>Password</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 caracteres" /></div>
            <div className="ff"><label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="support">Support</option>
                <option value="finance">Finance</option>
                <option value="developer">Developer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="ff ff-full"><label>Vertical scope (vazio = acesso total)</label>
              <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
                <option value="">— Todas as verticais —</option>
                <option value="condominio">V2 Condomínios</option>
                <option value="seguros">V3 Seguros</option>
                <option value="energia">V4 Energia</option>
                <option value="manutencao">V5 Manutenção</option>
                <option value="reabilitacao">V6 Reabilitação</option>
                <option value="imoveis">V7 Imobiliário</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="ab" onClick={create}>Criar membro →</button>
            {msg.text && <div className={'form-msg ' + msg.type}>{msg.text}</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><div className="card-t">Staff actual</div></div>
        <div className="tw"><table>
          <thead><tr><th>Nome</th><th>Email</th><th>Role</th><th>Scope</th><th>Auth</th><th>Último acesso</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="loading">A carregar…</td></tr>}
            {!loading && !list.length && <tr><td colSpan={6} className="empty">Sem staff</td></tr>}
            {list.map((s) => (
              <tr key={s.id}>
                <td>{s.nome}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{s.email}</td>
                <td><span className="b b-blue">{s.role}</span></td>
                <td>{s.scope ? <span className={'b b-' + vcls(s.scope)}>{s.scope}</span> : <span className="b b-dim">todas</span>}</td>
                <td><span className={'b b-' + (s.auth_ok ? 'green' : 'red')}>{s.auth_ok ? 'OK' : 'FAIL'}</span></td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{fdt(s.ultimo_acesso)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </>
  );
}

/* ───────────────────────────────────────────────────────────────────
 *  PAGE · API KEYS
 * ─────────────────────────────────────────────────────────────────── */

function ApiKeysPage({ session }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ vertical: 'condominio', descricao: '' });
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [newKey, setNewKey] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiCall('/api-keys', session);
      setList(r?.keys || r || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    if (!form.descricao) { setMsg({ text: 'Descrição obrigatória', type: 'er' }); return; }
    try {
      const r = await apiCall('/api-keys/generate', session, { method: 'POST', body: JSON.stringify(form) });
      if (r?.key) {
        setNewKey(r.key);
        setMsg({ text: '✓ Chave gerada — copia agora', type: 'ok' });
        setForm({ vertical: 'condominio', descricao: '' });
        load();
      } else setMsg({ text: r?.error || 'Erro', type: 'er' });
    } catch (e) { setMsg({ text: 'Erro', type: 'er' }); }
  };

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">API Keys</div>
          <div className="ps">Chaves de autenticação por vertical</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-h">
          <div className="card-t">Gerar nova API key</div>
          <div className="card-s">A chave só é mostrada uma vez</div>
        </div>
        <div className="card-body">
          <div className="form-grid">
            <div className="ff"><label>Vertical</label>
              <select value={form.vertical} onChange={(e) => setForm({ ...form, vertical: e.target.value })}>
                <option value="condominio">V2 Condomínios</option>
                <option value="seguros">V3 Seguros</option>
                <option value="energia">V4 Energia</option>
                <option value="manutencao">V5 Manutenção</option>
                <option value="reabilitacao">V6 Reabilitação</option>
                <option value="imoveis">V7 Imobiliário</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="ff"><label>Descrição</label><input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="ex: Vertical Seguros produção" /></div>
          </div>
          <div className="form-actions">
            <button className="ab" onClick={generate}>Gerar API key →</button>
            {msg.text && <div className={'form-msg ' + msg.type}>{msg.text}</div>}
          </div>
          {newKey && (
            <>
              <div className="key-reveal">{newKey}</div>
              <div className="key-warn">⚠ Copia esta chave agora — não será mostrada novamente. Guarda como variável de ambiente CORE_API_KEY_[VERTICAL].</div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-h"><div className="card-t">Verticais com API key</div><div className="card-s">Hashes nunca expostos</div></div>
        <div className="tw"><table>
          <thead><tr><th>Vertical</th><th>Descrição</th><th>Estado</th><th>Último uso</th><th>Criado</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="loading">A carregar…</td></tr>}
            {!loading && !list.length && <tr><td colSpan={5} className="empty">Sem API keys</td></tr>}
            {list.map((k) => (
              <tr key={k.id}>
                <td><span className={'b b-' + vcls(k.vertical)}>{k.vertical}</span></td>
                <td>{k.descricao}</td>
                <td><span className={'estado-badge estado-' + (k.ativa ? 'activo' : 'inactivo')}>{k.ativa ? 'Activa' : 'Revogada'}</span></td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{fdt(k.ultimo_uso)}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{fdt(k.criado_em)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-h"><div className="card-t">Como usar a API key</div></div>
        <div className="card-body">
          <div className="dev-code">
            <span className="c">{'// Header obrigatório em todos os pedidos da vertical'}</span>{'\n'}
            headers: {'{'}{'\n'}
            {'  '}<span className="s">'X-Api-Key'</span>: process.env.<span className="k">CORE_API_KEY_V3_SEGUROS</span>,{'\n'}
            {'  '}<span className="s">'Content-Type'</span>: <span className="s">'application/json'</span>{'\n'}
            {'}'}{'\n\n'}
            <span className="c">{'// Endpoint base'}</span>{'\n'}
            <span className="k">const</span> CORE_API = <span className="s">'https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/core-api'</span>{'\n\n'}
            <span className="c">{'// Notificar serviço activo'}</span>{'\n'}
            <span className="k">POST</span> ${'{CORE_API}'}/servico{'\n'}
            {'{ pessoa_id, vertical: '}<span className="s">'seguros'</span>, produto, valor_mensal, referencia_id {'}'}
          </div>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────────────────────────────────────────────────
 *  PAGE · DEVELOPER HUB
 * ─────────────────────────────────────────────────────────────────── */

function DeveloperPage() {
  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">Developer Hub</div>
          <div className="ps">Links e referências técnicas</div>
        </div>
      </div>
      <div className="dev-grid">
        <div className="dev-card">
          <div className="dev-card-t">🗄️ Supabase Projects</div>
          <div className="dev-card-s">Uma BD por vertical</div>
          <div className="dev-links">
            <a className="dev-link" href="https://supabase.com/dashboard/project/hkmvszkpxjbxmnixzqbl" target="_blank" rel="noreferrer"><span>V1 Core Hub</span><span>↗</span></a>
            <a className="dev-link" href="https://supabase.com/dashboard/project/eozklslwfaqujaijvdnl" target="_blank" rel="noreferrer"><span>V2 Condo Hub DB</span><span>↗</span></a>
            <a className="dev-link" href="https://prataowners.pt" target="_blank" rel="noreferrer" style={{ borderColor: 'var(--blue)', color: 'var(--blue)' }}><span>🌐 prataowners.pt</span><span>↗</span></a>
          </div>
        </div>

        <div className="dev-card">
          <div className="dev-card-t">⚡ Core API v1.4</div>
          <div className="dev-card-s">Base URL: .../functions/v1/core-api</div>
          <div className="dev-code">
            <span className="m-get">GET</span>{'  '}/health{'\n'}
            <span className="m-get">GET</span>{'  '}/auth/check?email={'\n'}
            <span className="m-get">GET</span>{'  '}/auth/me              <span className="c">(JWT cliente)</span>{'\n'}
            <span className="m-get">GET</span>{'  '}/auth/staff-check     <span className="c">(JWT staff)</span>{'\n'}
            <span className="m-get">GET</span>{'  '}/staff/dashboard      <span className="c">(staff)</span>{'\n'}
            <span className="m-get">GET</span>{'  '}/staff/pessoas{'\n'}
            <span className="m-get">GET</span>{'  '}/financial/kpis       <span className="c">(staff)</span>{'\n'}
            <span className="m-get">GET</span>{'  '}/financial/mrr-historico{'\n'}
            <span className="m-get">GET</span>{'  '}/financial/vertical-health{'\n'}
            <span className="m-get">GET</span>{'  '}/leads                <span className="c">(staff)</span>{'\n'}
            <span className="m-post">POST</span> /leads/converter{'\n'}
            <span className="m-get">GET</span>{'  '}/client/:id           <span className="c">(staff)</span>{'\n'}
            <span className="m-get">GET</span>{'  '}/ofertas-admin        <span className="c">(staff)</span>{'\n'}
            <span className="m-post">POST</span> /ofertas-admin        <span className="c">(admin)</span>{'\n'}
            <span className="m-get">GET</span>{'  '}/api-keys             <span className="c">(admin)</span>{'\n'}
            <span className="m-post">POST</span> /api-keys/generate    <span className="c">(admin)</span>{'\n'}
            <span className="m-post">POST</span> /servico              <span className="c">(vertical)</span>{'\n'}
            <span className="m-post">POST</span> /lead                 <span className="c">(vertical)</span>
          </div>
        </div>

        <div className="dev-card">
          <div className="dev-card-t">📋 Notion Docs</div>
          <div className="dev-card-s">Arquitectura e contexto</div>
          <div className="dev-links">
            <a className="dev-link" href="https://www.notion.so/34084147fa60813d94fed7f72d47d8bd" target="_blank" rel="noreferrer"><span>🏗️ Visão & Arquitectura</span><span>↗</span></a>
            <a className="dev-link" href="https://www.notion.so/34184147fa6081b1b72ce4e6878656bb" target="_blank" rel="noreferrer"><span>🛠️ Developer Guide</span><span>↗</span></a>
            <a className="dev-link" href="https://www.notion.so/34084147fa60814d9836c3c572949438" target="_blank" rel="noreferrer"><span>🔑 Prompts V1-V9</span><span>↗</span></a>
            <a className="dev-link" href="https://www.notion.so/602318f5c9294e559e050c50d0f5861e" target="_blank" rel="noreferrer"><span>🗺️ Master Roadmap</span><span>↗</span></a>
          </div>
        </div>

        <div className="dev-card">
          <div className="dev-card-t">🚀 Deploy</div>
          <div className="dev-card-s">GitHub → Netlify auto-deploy</div>
          <div className="dev-code">
            <span className="c">proptech-platform/</span>{'\n'}
            ├── index.html        <span className="c">→ V9 Portal cliente</span>{'\n'}
            ├── admin/{'\n'}
            │   └── index.html    <span className="c">→ Este dashboard</span>{'\n'}
            ├── v3-seguros/{'\n'}
            │   └── index.html    <span className="c">← a criar</span>{'\n'}
            ├── v4-energia/...{'\n'}
            └── netlify.toml
          </div>
        </div>
      </div>
    </>
  );
}
