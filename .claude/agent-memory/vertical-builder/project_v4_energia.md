---
name: V4 Energia — Estado do Scaffold
description: Scaffold inicial de V4 Energia criado em 2026-04-19, decisões tomadas e próximos passos
type: project
---

Scaffold criado em 2026-04-19 em `apps/v4-energia/`.

**Why:** Missão actual da plataforma é construir V4 Energia. Schema `v4_energia` já aplicado no Supabase V1 Core Hub (`hkmvszkpxjbxmnixzqbl`) pelo Mário antes deste scaffold.

**Estado V1:**
- Login email/password via Supabase Auth (PT-PT)
- Dashboard com 4 KPIs zerados: Contratos activos, Leads este mês, Poupança gerada (€/ano), Comissão em pipeline (€)
- Toggle light/dark com `localStorage.v4theme` (chave distinta de `v1theme` do v1-core)
- Design system idêntico ao v1-core: mesmos tokens CSS, Inter + JetBrains Mono
- Supabase client via `import.meta.env.VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- `.env.example` no repo; `.env` real ignorado pelo .gitignore da raiz

**Decisão de arquitectura:** Dashboard V1 sem sidebar — layout flat (header + KPI grid). O sidebar complexo do v1-core não foi copiado por ser desnecessário neste scope mínimo.

**Nota:** v1-core usa React 19 e Vite 8 (não React 18 como o template menciona) — v4-energia mantém as mesmas versões para consistência.

**Próximos passos (V2+):**
- Ligar KPIs a queries reais (`v4_energia.contratos_energia`, etc.)
- Simulador de tarifas
- Pipeline de contratos (tabela + form)
- Formulário mudança de comercializador
- Sidebar de navegação quando houver mais páginas

**How to apply:** Ao retomar V4, lembrar que o schema já existe e o scaffold está funcional. V2 começa por ligar os KPIs e adicionar a tabela de contratos.
