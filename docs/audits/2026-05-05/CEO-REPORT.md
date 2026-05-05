# CEO-REPORT · PropTech Platform · 2026-05-05

> Síntese executiva da auditoria completa. Produzido por ceo-agent a partir de AUDIT-RAW, AUDIT-architecture, AUDIT-data, AUDIT-frontend, AUDIT-quality e AUDIT-ops.

---

## Estado em uma frase

A plataforma tem fundações sólidas e um produto activo em Vercel, mas acumulou débito técnico suficiente — uma chave de API exposta, doze edge functions sem código fonte em git, e um monolito de 11 mil linhas com fallbacks para dados demo — para que qualquer expansão para utilizadores reais seja arriscada sem primeiro resolver três ou quatro itens concretos.

---

## O que está bem

- **V5 Manutenção está em produção real.** O projecto Supabase `hkmvszkpxjbxmnixzqbl` tem 74 pessoas reais, 7 contratos de energia, 205 mil códigos postais importados e sessões activas no advisor. Não é uma maqueta — é um produto a funcionar.

- **Command Center (dashboard) deployado e funcional.** O ADR-010 foi aceite, implementado em menos de duas semanas e está a correr no Vercel (`proptech-agentic-ops`). Inbox, aprovações, scorecard Bia — tudo com dados reais do Supabase. Ritmo de entrega impressionante para um solo founder.

- **Disciplina de commits impecável.** 30 dos últimos 30 commits seguem convenções. Nenhum commit tocou nos ficheiros de produção proibidos (`admin/`, `netlify.toml`, `index.html`). Nenhuma credencial commitada. Isto é raro e importa para manutenção a longo prazo.

- **Arquitectura de schemas correcta desde o início.** A decisão de ter um único projecto Supabase com schemas por vertical (Opção C) foi a certa para esta fase. O schema `core` já tem helpers de RLS maduros (`is_staff()`, `current_pessoa_id()`, `current_organization_ids()`) com `SECURITY DEFINER` correctamente configurado — este tipo de infraestrutura de segurança é difícil de introduzir depois.

- **Custos de infra operacional baixíssimos.** Os quatro watchers automáticos (competitor monitor, daily brief, healthcheck, weekly recap) custam menos de €0.65/mês em API Anthropic. GitHub Actions a 9% do plano gratuito. Há margem de crescimento enorme antes de qualquer pressão de custos.

---

## O que dói

- **`VITE_ANTHROPIC_API_KEY` exposta no browser — P0 de segurança.** O `App.jsx` do V5 contém chamadas directas à API Anthropic com a chave exposta em `import.meta.env`, o que significa que qualquer utilizador com DevTools aberto vê a chave. Está documentado como blocker no CLAUDE.md do V5 mas ainda não foi corrigido. A solução existe (o `image_inspector` já usa edge function como proxy) — falta executar. Não é catástrofe enquanto a app não estiver em produção com utilizadores reais, mas é o item mais urgente antes de qualquer expansão.

- **12 edge functions activas em Supabase sem código fonte em git.** O Supabase tem 15 funções deployadas; apenas 3 estão versionadas no repositório. As críticas `prestador-onboarding`, `agent-casa-advisor`, `agent-image-inspector`, `core-api` (versão 16 — a mais iterada do projecto) existem apenas na cloud. Se houver necessidade de rollback ou de recriar o projecto Supabase, estas funções estão perdidas. É o equivalente a ter código de produção sem backup.

- **3 migrations de schemas aplicadas em Supabase sem ficheiro SQL em git.** Os schemas `v2_condominios`, `v3_seguros` e `v4_energia` foram criados via MCP directamente, sem guardar o SQL fonte no repositório. O Supabase confirma as migrations, o git não tem os ficheiros. Usando a analogia contabilística: são lançamentos sem documento de suporte — viola o princípio básico de rastreabilidade.

- **Fallbacks para dados demo coexistem com auth real.** O `App.jsx` do V5 usa `DEMO_PESSOA_ID` e `DEMO_ORGANIZATION_ID` como fallback quando `authUser` não existe. A auth real está activa desde a Fase 3.4A, mas o `demo.js` não foi removido. Em produção, uma falha silenciosa de auth pode fazer com que operações de um utilizador real sejam escritas na conta demo — corrupção de dados sem aviso.

- **`apps/v2-condominios/` existe sem ADR, sem documentação, e sem decisão formal sobre que Supabase usa.** Há um rebuild do frontend V2 em React 19 com os packages `@proptech/auth` e `@proptech/db` que não consta em nenhuma decisão registada. A questão central não respondida: vai ligar-se ao Supabase de produção V2 (`eozklslwfaqujaijvdnl`, com 5k linhas de clientes reais) ou ao V1 Core Hub? Sem resposta a esta pergunta, qualquer desenvolvimento neste app é um risco.

---

## Decisões que precisam do Mário esta semana

**1. Rotação da `SUPABASE_SERVICE_ROLE_KEY` do V1 — blocker para o alpha real**

Esta chave está marcada como P0 para rotação antes do primeiro outreach a utilizadores reais (R2 alpha outreach). A data do "novo prazo" para esse outreach não foi redefinida após o prazo anterior ter passado. Contexto: a chave actual pode estar exposta em variáveis de ambiente de agentes que já não existem ou em histórico de sessões. Opções: (a) rotar agora via Supabase dashboard e actualizar todas as variáveis de ambiente; (b) definir data concreta de R2 outreach e rotar 48h antes. Recomendação: rotar esta semana — demora 10 minutos e elimina um risco permanente.

**2. `apps/v2-condominios/` — o que é este projecto e a que Supabase se liga?**

Existe um rebuild do frontend V2 que ninguém documentou. Contexto: usa React 19 com os packages partilhados `@proptech/auth` e `@proptech/db`, porta 5176, mas está em scaffoldo (39 linhas no App.jsx). O código que o commit `b0cd052` referencia como "1346 linhas" ainda não chegou ao `main`. Opções: (a) confirmar que este app se liga ao `hkmvszkpxjbxmnixzqbl` (V1 Core Hub) e nunca ao Supabase de produção V2; (b) arquivar o app e iniciar V2 novo quando chegar a hora. Recomendação: confirmar a opção (a) e criar um ADR de uma página — sem isso nenhum agente pode trabalhar neste app com segurança.

**3. AuthGuard no Command Center — quando reintroduzir?**

O ADR-010 é explícito: auth obrigatória antes de Bia interagir com owners reais. O commit `6d4478d` removeu o AuthGuard "para uso interno". Enquanto o Command Center é só para o Mário, está bem. Quando Bia começar a submeter acções à `system.approvals_queue` com owners reais, a coluna `approval_decision_by` fica NULL e o audit trail fica inutilizável. Contexto: o Sprint 1E (prestador-app Camada 2) ainda não foi chariado. Opções: (a) reintroduzir AuthGuard antes de Sprint 1E Phase 2; (b) adiar até os primeiros owners reais estarem activos. Recomendação: decidir o gate explicitamente — "quando é que o primeiro owner real chega?" determina a urgência.

**4. ADR-003 V10 Owners Club — confirmar ou arquivar (>14 dias sem resposta)**

A proposta de reorganização do V10 Owners Club está aberta há mais de duas semanas. Contexto: o OwnersClubScreen no V5 tem dados completamente mock (streak, energia, progresso), e a decisão sobre a estrutura do V10 determina se essa ecrã se torna real ou se é removida. Opções: (a) aceitar ADR-003 e planear Sprint 1E com a nova estrutura; (b) rejeitar e manter V10 como placeholder sem investimento. Recomendação: rejeitar ou deferir formalmente — uma decisão em aberto há 14 dias é ruído que bloqueia o planeamento de Sprint 1E.

---

## Riscos a 30 dias

**Dados demo em produção (probabilidade média × impacto alto).** Se o V5 for aberto a utilizadores reais antes de remover os fallbacks `DEMO_PESSOA_ID` do `App.jsx`, há risco concreto de operações serem escritas na conta demo em vez do utilizador real. Com auth a falhar silenciosamente (ex: token expirado), o utilizador continua a navegar mas os seus dados vão para o lugar errado. Impacto: corrupção de dados real, difícil de detectar e reverter.

**Edge functions perdidas sem versionamento (probabilidade baixa × impacto muito alto).** Se o projecto Supabase `hkmvszkpxjbxmnixzqbl` for apagado, pausado ou migrado, 12 funções críticas (incluindo `core-api` na versão 16) desaparecem sem código fonte. A probabilidade é baixa no curto prazo, mas o impacto seria a perda de trabalho impossível de reconstruir sem reverse engineering. Uma sessão de 2 horas a versionar estas funções elimina este risco completamente.

**Netlify em estado crítico (87% dos build minutes consumidos) com causa desconhecida.** O stack-health.md regista Netlify a 87% do limite mensal, mas o audit não conseguiu determinar a causa — os watchers GitHub Actions não consomem Netlify. Se o limite for atingido, o deploy de `admin/` (V2 produção em prataowners.pt) pode parar de funcionar. Probabilidade média se o padrão continuar; impacto alto porque afecta produção real do cliente Property 007 LDA.

**RLS aberta no schema `system` antes de exposição externa (probabilidade média × impacto médio).** A migration `20260505_system_open_internal.sql` deixou as 3 tabelas de `system.approvals_queue`, `system.inbox_items` e `system.inbox_reads` com policies abertas (`USING (true)`). Qualquer pessoa que conheça a anon key e o URL do Supabase pode aprovar ou rejeitar acções de agentes. Enquanto o Command Center for genuinamente privado, o risco é contido. Se o URL for partilhado antes de reverter as policies, o risco materializa-se.

---

## Recomendação de foco próximos 7 dias

**Resolver os dois blockers de segurança antes de qualquer outro trabalho de feature.**

Primeiro, remover `VITE_ANTHROPIC_API_KEY` do `App.jsx` do V5 — mover as chamadas Anthropic para uma edge function. Segundo, eliminar os fallbacks `DEMO_PESSOA_ID` e `DEMO_ORGANIZATION_ID` do código de produção. Terceiro (pode ser feito em paralelo), versionar em git as 4-5 edge functions mais críticas que estão deployed mas sem código fonte (`core-api`, `prestador-onboarding`, `agent-casa-advisor`, `agent-image-inspector`).

A razão é simples: estes três itens são os únicos que podem causar dano irreversível — dados escritos no lugar errado, chave de API comprometida, ou código de produção perdido. Todos os outros itens (apps/core duplicado, CLAUDE.md desactualizado, naming conventions, testes) são débito de qualidade que não bloqueia nada de imediato. Um Sprint de 7 dias dedicado a limpeza de segurança fecha os P0 e P1 e liberta a V5 para crescimento sem medo.

---

## Gaps que encontrei nos audits

**Três agentes substituídos sem documentação formal.** Esta sessão de auditoria envolveu três agentes que constam em state files mas não existem como sub-agents invocáveis: `frontend-builder` (substituído pelo vertical-builder para o AUDIT-frontend), `code-reviewer` (substituído por general-purpose para o AUDIT-quality) e `ops-builder` (substituído por general-purpose para o AUDIT-ops). Estes três têm ficheiros `.claude/state/agents/<nome>.md` mas não têm `.md` correspondente em `.claude/agents/`. São agentes-fantasma — existem no registo histórico mas não são invocáveis. O mesmo acontece com mais 16 agentes (assembleia-condo, atendimento-condo, notion-librarian, e outros de domínio V2). No total, 19 dos 29 state files não correspondem a agentes reais.

**Supabase V1 não está "vazio" como o CLAUDE.md declara.** O CLAUDE.md diz "Estado: VAZIO (só tabela `file_deploy` sem dados)". A realidade é 74 pessoas, 62 serviços activos, 205 mil códigos postais, 87 entradas no audit log de agentes, 7 contratos de energia. O CLAUDE.md está desactualizado neste ponto — não é crítico mas pode confundir agentes que tomam a documentação à letra.

**Healthcheck não verifica o que diz verificar.** O `watchers-state.md` descreve o healthcheck como verificando "V5 alpha Vercel, V2 prataowners.pt, Supabase edge functions". A implementação real verifica apenas a API key Anthropic. Prataowners.pt, o endpoint V5 e as edge functions não são monitorizados por nenhum workflow activo.

**Nenhum watcher produziu output desde que foram activados.** Os directórios `competitor-watches/`, `daily-briefs/` e `weekly-recaps/` em `.claude/outputs/` estão todos vazios. Os workflows têm schedule activo desde finais de Abril 2026 — ou estão a falhar silenciosamente, ou há algo que impede a execução (repo privado sem billing activo para GitHub Actions cron, por exemplo). Este gap não foi resolvido no audit — requer inspecção directa da consola GitHub Actions.

**O audit não cobre custos reais do Supabase.** O stack-health.md regista o plano como estimado. Não foi possível confirmar se o projecto `hkmvszkpxjbxmnixzqbl` está em Free ou Pro. Com 2 GB de uso estimado, o Free tier (500 MB de base de dados) seria insuficiente — o que sugere Pro ($25/mês), mas não foi confirmado. Dado registado: gap a fechar.

**`v4_energia` schema serve dois contextos de negócio diferentes.** O schema tem 2 tabelas com dados reais que são de contexto V5/manutenção (energia do imóvel do owner), e 6 tabelas vazias de contexto V2/condomínios (energia dos edifícios geridos). Estão no mesmo schema com o mesmo nome, sem separação clara. Não está documentado em nenhum ADR e pode causar confusão quando V4 Energia for activado como vertical própria.

---

*CEO-REPORT produzido por ceo-agent em 2026-05-05 · Síntese de 6 audits · Read-only · Sem commits · Sem edições de código*
