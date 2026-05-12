/* ═══════════════════════════════════════════════════════════════════════
 *  PROPTECH · V4 ENERGIA · React App
 *  ─────────────────────────────────────────────────────────────────────
 *  File  : App.jsx
 *  Stack : React 19 · Supabase JS v2 · Vite
 *  Auth  : Supabase Auth (email + password)
 *  DB    : V1 Core Hub · hkmvszkpxjbxmnixzqbl · schema v4_energia
 *  ─────────────────────────────────────────────────────────────────────
 *  V1 SCOPE
 *  • Login email/password via Supabase Auth
 *  • Dashboard com 4 KPIs ligados a v4_energia.contratos_energia
 *  • Toggle light/dark persistido em localStorage.v1theme (chave partilhada com v1-core)
 *  ═══════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ClienteSimulator from './components/ClienteSimulator.jsx';
import StaffLeads from './components/StaffLeads.jsx';

/* ─────────────────────────────────────────────────────────────────────
 *  CONFIG · Supabase V1 Core Hub
 *  Lê env vars injectadas pelo Vite em build time.
 *  Em dev local: cria apps/v4-energia/.env com as chaves reais.
 * ───────────────────────────────────────────────────────────────────── */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Client para auth (schema público)
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Client apontado ao schema v4_energia para queries de dados
const sbV4 = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'v4_energia' },
});

/* ─────────────────────────────────────────────────────────────────────
 *  HELPERS
 * ───────────────────────────────────────────────────────────────────── */

// Formata número inteiro sem decimais (ex: 1234 → "1 234")
function fNum(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('pt-PT', { maximumFractionDigits: 0 });
}

// Formata valor monetário PT-PT (ex: 1234.5 → "1 235 €")
function fEur(n) {
  if (n == null) return '—';
  return (
    Number(n).toLocaleString('pt-PT', { maximumFractionDigits: 0 }) + ' €'
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  CSS · design system partilhado com v1-core
 *  Tokens idênticos; injetado via <style> no mount do componente raiz.
 * ───────────────────────────────────────────────────────────────────── */
const V4_CSS = `
/* ── RESET & BASE ────────────────────────────── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;background:#f4f3f0}
body{font-family:'Inter',system-ui,sans-serif;font-size:13px;color:#18160f;-webkit-font-smoothing:antialiased}
body.dark{background:#0d1117;color:#e6edf3}

/* ── TOKENS ──────────────────────────────────── */
:root{
  --bg:#f4f3f0;--surface:#ffffff;--surface2:#f0eeeb;--surface3:#e8e6e2;
  --border:rgba(0,0,0,0.08);--border2:rgba(0,0,0,0.15);
  --text:#18160f;--muted:#6b6458;
  --blue:#1a5296;--green:#2d6a4f;--red:#8b1a1a;--gold:#8c6508;--purple:#6b4fa0;
  --mono:'JetBrains Mono','Fira Mono',monospace;
}
body.dark{
  --bg:#0d1117;--surface:#161b22;--surface2:#1c2333;--surface3:#243047;
  --border:rgba(255,255,255,0.08);--border2:rgba(255,255,255,0.15);
  --text:#e6edf3;--muted:#9198a1;
  --blue:#58a6ff;--green:#3fb950;--red:#ff7b72;--gold:#e3b341;--purple:#d2a8ff;
}

/* ── LOGIN ───────────────────────────────────── */
.s-login{
  position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(ellipse at 30% 60%,rgba(26,82,150,.07),transparent),var(--bg);
}
.login-box{
  background:var(--surface);border:1px solid var(--border);border-radius:12px;
  padding:36px 40px;width:420px;max-width:calc(100vw - 32px);
}
.login-logo{font-family:var(--mono);font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:var(--blue);margin-bottom:20px}
.login-title{font-size:26px;font-weight:700;margin-bottom:6px;letter-spacing:-.02em}
.login-sub{font-size:12px;color:var(--muted);margin-bottom:24px;line-height:1.5}
.lbl{font-size:10px;font-family:var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:5px}
.inp{
  width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:6px;
  padding:10px 14px;font-size:13px;color:var(--text);font-family:inherit;margin-bottom:14px;
  transition:border-color .15s;
}
.inp:focus{outline:none;border-color:var(--blue)}
.btn-primary{
  width:100%;background:var(--blue);color:#fff;border:none;border-radius:6px;
  padding:11px;font-size:12px;font-family:var(--mono);letter-spacing:.1em;
  text-transform:uppercase;cursor:pointer;transition:opacity .15s;margin-top:4px;
}
.btn-primary:hover{opacity:.88}
.btn-primary:disabled{opacity:.5;cursor:not-allowed}
.login-err{font-size:11px;color:var(--red);margin-top:10px;font-family:var(--mono)}
.login-theme{
  background:none;border:1px solid var(--border);border-radius:4px;
  padding:4px 10px;font-size:10px;font-family:var(--mono);cursor:pointer;
  color:var(--muted);transition:all .15s;margin-bottom:20px;
}
.login-theme:hover{border-color:var(--blue);color:var(--blue)}

/* ── APP SHELL ───────────────────────────────── */
.s-app{position:fixed;inset:0;display:flex;flex-direction:column;background:var(--bg)}

/* ── HEADER ──────────────────────────────────── */
.hdr{
  display:flex;align-items:center;justify-content:space-between;
  padding:10px 28px;border-bottom:1px solid var(--border);
  background:var(--surface);flex-shrink:0;gap:12px;
}
.hdr-brand{font-family:var(--mono);font-size:9px;letter-spacing:.25em;text-transform:uppercase;color:var(--blue);font-weight:600}
.hdr-r{display:flex;align-items:center;gap:10px}
.theme-btn{
  background:none;border:1px solid var(--border);border-radius:4px;
  padding:4px 10px;font-size:10px;font-family:var(--mono);cursor:pointer;
  color:var(--muted);transition:all .15s;
}
.theme-btn:hover{border-color:var(--blue);color:var(--blue)}
.logout-btn{
  background:none;border:1px solid var(--border);border-radius:4px;
  padding:4px 12px;font-size:10px;font-family:var(--mono);letter-spacing:.06em;
  text-transform:uppercase;cursor:pointer;color:var(--muted);transition:all .15s;
}
.logout-btn:hover{border-color:var(--red);color:var(--red)}
.hdr-user{font-size:11px;color:var(--muted);font-family:var(--mono)}

/* ── TABS ────────────────────────────────────── */
.tabs{
  display:flex;gap:2px;background:var(--surface);border-bottom:1px solid var(--border);
  padding:0 28px;flex-shrink:0;
}
.tab{
  background:none;border:none;padding:10px 18px;cursor:pointer;
  font-size:11px;font-family:var(--mono);letter-spacing:.08em;text-transform:uppercase;
  color:var(--muted);border-bottom:2px solid transparent;transition:all .15s;
}
.tab:hover{color:var(--text)}
.tab.active{color:var(--blue);border-bottom-color:var(--blue)}

/* ── MAIN CONTENT ────────────────────────────── */
.main{flex:1;overflow-y:auto;padding:28px 32px}
.main::-webkit-scrollbar{width:4px}
.main::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

/* ── PAGE HEADER ─────────────────────────────── */
.ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px}
.pt{font-size:22px;font-weight:700;color:var(--text);letter-spacing:-.02em}
.ps{font-size:12px;color:var(--muted);margin-top:3px}

/* ── KPI GRID ────────────────────────────────── */
.kpi4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
@media(max-width:900px){.kpi4{grid-template-columns:repeat(2,1fr)}}
@media(max-width:500px){.kpi4{grid-template-columns:1fr}}

.kpi{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px}
.kpi-l{font-family:var(--mono);font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.kpi-v{font-size:24px;font-weight:700;letter-spacing:-.02em;font-family:var(--mono)}
.kpi-s{font-size:10px;color:var(--muted);margin-top:4px;font-family:var(--mono)}
.c-blue .kpi-v{color:var(--blue)}
.c-green .kpi-v{color:var(--green)}
.c-gold .kpi-v{color:var(--gold)}
.c-purple .kpi-v{color:var(--purple)}

/* ── LOADING ─────────────────────────────────── */
.loading{padding:32px;text-align:center;color:var(--muted);font-family:var(--mono);font-size:11px}
`;

/* ─────────────────────────────────────────────────────────────────────
 *  ROOT APP
 * ───────────────────────────────────────────────────────────────────── */
export default function V4EnergiaApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(
    () => localStorage.getItem('v1theme') || 'light'
  );

  // Aplica tema e persiste em localStorage.v1theme (chave partilhada com v1-core)
  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('v1theme', theme);
  }, [theme]);

  // Injeta CSS e fontes no mount
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.id = 'v4-energia-styles';
    styleEl.textContent = V4_CSS;
    document.head.appendChild(styleEl);

    if (!document.getElementById('v4-energia-fonts')) {
      const link = document.createElement('link');
      link.id = 'v4-energia-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';
      document.head.appendChild(link);
    }

    return () => styleEl.remove();
  }, []);

  // Verifica sessão Supabase existente
  useEffect(() => {
    (async () => {
      const { data: { session: s } } = await sb.auth.getSession();
      setSession(s || null);
      setLoading(false);
    })();

    const { data: listener } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  const logout = async () => {
    await sb.auth.signOut();
    setSession(null);
  };

  const toggleTheme = () =>
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  if (loading) {
    return (
      <div className="s-login">
        <div className="login-box">
          <div className="loading">A carregar…</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        onLogin={setSession}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <Dashboard
      session={session}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLogout={logout}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  LOGIN SCREEN
 *  Email + password via Supabase Auth.
 *  Toggle light/dark disponível antes do login.
 * ───────────────────────────────────────────────────────────────────── */
function LoginScreen({ onLogin, theme, onToggleTheme }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setBusy(true);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setErro('Credenciais inválidas. Verifica o e-mail e a palavra-passe.');
    } else {
      onLogin(data.session);
    }
    setBusy(false);
  };

  return (
    <div className="s-login">
      <div className="login-box">
        <button className="login-theme" onClick={onToggleTheme}>
          {theme === 'light' ? '◑ Modo escuro' : '◐ Modo claro'}
        </button>
        <div className="login-logo">PropTech · V4 Energia</div>
        <div className="login-title">Entrar</div>
        <div className="login-sub">
          Acesso restrito à equipa interna.<br />
          Introduz as tuas credenciais para continuar.
        </div>
        <form onSubmit={handleSubmit}>
          <label className="lbl" htmlFor="email">E-mail</label>
          <input
            id="email"
            className="inp"
            type="email"
            autoComplete="email"
            placeholder="utilizador@empresa.pt"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="lbl" htmlFor="password">Palavra-passe</label>
          <input
            id="password"
            className="inp"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className="btn-primary"
            type="submit"
            disabled={busy || !email || !password}
          >
            {busy ? 'A entrar…' : 'Entrar'}
          </button>
          {erro && <div className="login-err">{erro}</div>}
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  DASHBOARD
 *  4 KPIs ligados a v4_energia.contratos_energia via Supabase.
 *  Sem sidebar — layout flat: header + grid KPIs.
 *
 *  Queries:
 *    KPI 1 — count(*) WHERE estado = 'activo'
 *    KPI 2 — count(*) WHERE data_pedido >= início do mês actual
 *    KPI 3 — SUM(poupanca_anual) WHERE estado = 'activo'
 *    KPI 4 — SUM(comissao) WHERE estado IN ('a_analisar','proposta_enviada','assinado')
 *
 *  Estados loading: mostra '—' enquanto aguarda.
 *  Se query falhar: mantém '—' e regista erro na consola.
 *  Sem dados (BD vazia): mostra '0' / '0 €' (query bem-sucedida, resultado nulo).
 * ───────────────────────────────────────────────────────────────────── */
function Dashboard({ session, theme, onToggleTheme, onLogout }) {
  const email = session?.user?.email || '';

  // Tab activa — 'painel' | 'simulador' | 'leads'
  const [tab, setTab] = useState(
    () => localStorage.getItem('v4tab') || 'painel'
  );
  useEffect(() => { localStorage.setItem('v4tab', tab); }, [tab]);

  // Estado de cada KPI: null = loading, string = valor formatado
  const [kpiActivos, setKpiActivos] = useState(null);
  const [kpiLeads, setKpiLeads] = useState(null);
  const [kpiPoupanca, setKpiPoupanca] = useState(null);
  const [kpiComissao, setKpiComissao] = useState(null);

  useEffect(() => {
    carregarKpis();
  }, []);

  async function carregarKpis() {
    await Promise.all([
      carregarContratosActivos(),
      carregarLeadsEsteMes(),
      carregarPoupancaGerada(),
      carregarComissaoPipeline(),
    ]);
  }

  // KPI 1 — Contratos activos: count(*) WHERE estado = 'activo'
  async function carregarContratosActivos() {
    try {
      const { count, error } = await sbV4
        .from('contratos_energia')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'activo');

      if (error) throw error;
      setKpiActivos(fNum(count ?? 0));
    } catch (err) {
      console.error('[V4 KPI] contratos activos:', err.message);
      setKpiActivos('—');
    }
  }

  // KPI 2 — Leads este mês: count(*) WHERE data_pedido >= início do mês
  async function carregarLeadsEsteMes() {
    try {
      const agora = new Date();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
        .toISOString()
        .split('T')[0]; // YYYY-MM-DD

      const { count, error } = await sbV4
        .from('contratos_energia')
        .select('*', { count: 'exact', head: true })
        .gte('data_pedido', inicioMes);

      if (error) throw error;
      setKpiLeads(fNum(count ?? 0));
    } catch (err) {
      console.error('[V4 KPI] leads este mês:', err.message);
      setKpiLeads('—');
    }
  }

  // KPI 3 — Poupança gerada: SUM(poupanca_anual) WHERE estado = 'activo'
  async function carregarPoupancaGerada() {
    try {
      const { data, error } = await sbV4
        .from('contratos_energia')
        .select('poupanca_anual')
        .eq('estado', 'activo');

      if (error) throw error;

      const soma = (data || []).reduce(
        (acc, row) => acc + (row.poupanca_anual ?? 0),
        0
      );
      setKpiPoupanca(fEur(soma) + '/ano');
    } catch (err) {
      console.error('[V4 KPI] poupança gerada:', err.message);
      setKpiPoupanca('—');
    }
  }

  // KPI 4 — Comissão em pipeline: SUM(comissao) WHERE estado IN (...)
  async function carregarComissaoPipeline() {
    try {
      const { data, error } = await sbV4
        .from('contratos_energia')
        .select('comissao')
        .in('estado', ['a_analisar', 'proposta_enviada', 'assinado']);

      if (error) throw error;

      const soma = (data || []).reduce(
        (acc, row) => acc + (row.comissao ?? 0),
        0
      );
      setKpiComissao(fEur(soma));
    } catch (err) {
      console.error('[V4 KPI] comissão pipeline:', err.message);
      setKpiComissao('—');
    }
  }

  const kpis = [
    {
      label: 'Contratos activos',
      valor: kpiActivos,
      sub: 'contratos em vigor',
      cor: 'c-blue',
    },
    {
      label: 'Leads este mês',
      valor: kpiLeads,
      sub: 'novos contactos',
      cor: 'c-purple',
    },
    {
      label: 'Poupança gerada',
      valor: kpiPoupanca,
      sub: 'estimativa acumulada',
      cor: 'c-green',
    },
    {
      label: 'Comissão em pipeline',
      valor: kpiComissao,
      sub: 'receita estimada',
      cor: 'c-gold',
    },
  ];

  return (
    <div className="s-app">
      {/* HEADER */}
      <header className="hdr">
        <div className="hdr-brand">Energia</div>
        <div className="hdr-r">
          <span className="hdr-user">{email}</span>
          <button className="theme-btn" onClick={onToggleTheme}>
            {theme === 'light' ? '◑ Escuro' : '◐ Claro'}
          </button>
          <button className="logout-btn" onClick={onLogout}>
            Encerrar sessão
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="tabs">
        <button
          className={`tab ${tab === 'painel' ? 'active' : ''}`}
          onClick={() => setTab('painel')}
        >Painel</button>
        <button
          className={`tab ${tab === 'simulador' ? 'active' : ''}`}
          onClick={() => setTab('simulador')}
        >Simulador</button>
        <button
          className={`tab ${tab === 'leads' ? 'active' : ''}`}
          onClick={() => setTab('leads')}
        >Leads</button>
      </div>

      {/* CONTEÚDO */}
      <main className="main">
        {tab === 'painel' && (
          <>
            <div className="ph">
              <div>
                <div className="pt">Painel</div>
                <div className="ps">Visão geral da vertical Energia</div>
              </div>
            </div>
            <div className="kpi4">
              {kpis.map((k) => (
                <div key={k.label} className={`kpi ${k.cor}`}>
                  <div className="kpi-l">{k.label}</div>
                  <div className="kpi-v">{k.valor ?? '—'}</div>
                  <div className="kpi-s">{k.sub}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'simulador' && (
          <>
            <div className="ph">
              <div>
                <div className="pt">Simulador</div>
                <div className="ps">Compara tarifas de electricidade · 8 comercializadores</div>
              </div>
            </div>
            <ClienteSimulator />
          </>
        )}

        {tab === 'leads' && (
          <>
            <div className="ph">
              <div>
                <div className="pt">Leads</div>
                <div className="ps">Pipeline de contratos · gestão de estados</div>
              </div>
            </div>
            <StaffLeads />
          </>
        )}
      </main>
    </div>
  );
}
