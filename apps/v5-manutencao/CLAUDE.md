# v5-manutencao — Contexto para Claude Code

Este ficheiro é lido automaticamente pelo Claude Code a cada invocação. Mantém-se curto e actual.

## Projecto

**v5-manutencao** é a vertical de Manutenção & Limpeza da plataforma PropTech. Uma app React + Vite + Supabase que serve três tipos de utilizador (cliente, prestador, admin) num único SPA.

- **Caminho local**: `C:\Users\mario\dev\proptech-platform\apps\v5-manutencao`
- **Dev server**: `npm run dev` (porta 5175)
- **Build**: `npm run build` → `dist/`
- **Deploy**: Netlify (push ao `main` faz deploy automático quando ligado)
- **BD**: Supabase (URL e ANON_KEY em `.env.local`)

## Stack e arquitectura

- **React 18** com Vite 5
- **Supabase** para auth + BD + storage
- **Single-file App.jsx** — `src/App.jsx` contém toda a lógica (>3000 linhas). Isto é intencional para facilitar leitura contextual; não refactorizar para múltiplos ficheiros sem pedido explícito.
- **Sem router externo** — o routing é feito por state (`ecra`, `role`, etc.) dentro do `App`.
- **Estilos inline** — usa `style={{...}}` com uma constante `C = {...}` no topo como design tokens. Não usar Tailwind.
- **Fontes**: Fraunces (display, serif) + Outfit (body, sans) via Google Fonts.
- **Ícones**: lucide-react.

## Paleta canónica (design tokens)

```js
const C = {
  forest: "#0B3D2E", forestDeep: "#072819", forestSoft: "#164E3A",
  emerald: "#10B981", emeraldDark: "#059669", emeraldBright: "#22C55E",
  emeraldSoft: "#D1FAE5", emeraldPale: "#ECFDF5",
  cream: "#FAFAF6", paper: "#FFFFFF",
  ink: "#0A1620", stone: "#6B7685", stoneLight: "#E5E7EB", line: "#ECE9E2",
  amber: "#F59E0B", amberSoft: "#FEF3C7",
};
```

## Estado do catálogo

- **177 serviços** em 8 categorias (limpeza, manutenção, jardim, piscina, pintura, elétrica, canalização, pós-obra)
- **11 grupos-pai** com variantes (tipologia/tamanho) — ex: `cln-home` tem t1/t2/t3/t4, `cln-move` tem t1/t2/t3/t4, `mnt-xmas-lights` tem interior/exterior/full
- **36 serviços variantes** ligados a grupos-pai via `servico_pai_id`
- **8 templates de frequência** configuráveis via admin (tabela `frequency_templates`)
- **166/166 com detalhe rico (100%)**: tagline, inclui, nao_inclui, duracao_tipica, faq (exclui os 11 grupos-pai — esses têm detalhe próprio orientado a ecrã de agrupamento, não a checkout)
- **45 subcategorias** incluindo a nova **Sazonal e festivo** (`mnt_sazonal` — Natal, decorações) e **Segurança doméstica** (`mnt_seguranca` — baby proofing)
- Ver `docs/CATALOGO-COMPLETO.md` para tabela completa

## Documentos de referência

- `docs/TASK-fluxo-completo.md` — 8 fases de implementação (Fase 1 a 8)
- `docs/CATALOGO-COMPLETO.md` — catálogo completo por categoria, com IDs e preços
- `docs/v5-complete-flow-reference.jsx` — demo visual de referência (3111 linhas, NÃO copiar para src/)
- `supabase/migrations/20260422_catalogo_completo.sql` — migração completa e idempotente (21 secções)

## Workflow preferido por fase

Sempre em sequência, com confirmação entre fases:

1. **Fase 1** — Aplicar SQL + verificar (cheque de contagens)
2. **Fase 2a** — Adicionar primitivos UI ao App.jsx (sem ecrãs)
2. **Fase 2b** — Adicionar os 7 ecrãs novos
2. **Fase 2c** — Ligar à Home + substituir checkout
3. **Fase 3** — Testar manualmente os 8 caminhos × 4 variações
4. **Fase 4** — Botão Personalizado CTA na Home (já na 2c)
5. **Fase 5** — Ícone sparkle AI (stub, só alert)
6. **Fase 6** — UI admin templates frequência
7. **Fase 7** — Bottom nav com FAB central
8. **Fase 8** — Sazonais e campanhas (opcional MVP)

Entre cada fase, apresenta o plano ou o resultado e espera confirmação.

## Guard-rails absolutos (NÃO TOCAR)

1. **Preservar sempre** a autenticação Supabase, rotas de role (cliente/prestador/admin), integração do chat, pipeline de estados das ordens.
2. **Nunca refactorizar** o `App.jsx` monolítico em múltiplos ficheiros sem pedido explícito.
3. **Nunca eliminar** os botões de demo (Cliente / Prestador / Admin) no login — são essenciais para testes rápidos.
4. **Nunca apagar nem fazer TRUNCATE** em tabelas Supabase. Migrations são sempre aditivas (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO UPDATE`).
5. **Nunca commitar** ficheiros com credenciais. `.env.local` está no `.gitignore`.
6. **Nunca fazer `git push`** — deixar ao Mario decidir quando empurrar.
7. **Não tocar** nos textos e fluxos do admin e do prestador (só adicionar módulo novo na Fase 6, sem alterar o existente).
8. **Copy em português de Portugal** (não PT-BR): "escolha", "serviço", "morada" (não "endereço"), "técnico".

## Auth dos botões demo (DÉBITO TÉCNICO)

Os botões Cliente/Prestador/Admin no login mudam state local sem fazer
signin real no Supabase. Consequências e workarounds actuais:

1. **RLS de ordens** tem policy temporária permitindo INSERT a role `anon`
   (`temp_anon_insert_ordens`, migração `20260423_temp_anon_insert_ordens.sql`).
2. **`auth.uid()` retorna null** em todos os fluxos demo.
3. Os IDs dos demos (`demo-cli`, `demo-pro`, `demo-adm`) são strings
   não-UUID. INSERT em colunas UUID com estes IDs falha (erro `22P02:
   invalid input syntax for type uuid`). Workaround: no payload de
   `ordens`, `cliente_id` fica NULL quando `authUser.user.id.startsWith('demo-')`
   (ver `addCatalogOrder` em `App.jsx`). O `prestador_id` já é NULL por
   padrão até ser atribuído.

### Consequências conhecidas do workaround

- Ordens criadas em modo demo têm `cliente_id = NULL`.
- A listagem "Meus Pedidos" V2 (quando implementada) vai precisar de
  tratar este caso — ou a implementação de auth real virá antes.

### Plano de resolução (Fase futura — "Auth real para botões demo")

1. Criar 3 contas mock no Supabase (`cliente@demo.v5`, `prestador@demo.v5`,
   `admin@demo.v5`) via `POST /auth/v1/admin/users` com service_role key.
2. Botões demo passam a fazer `signInWithPassword` com password fixa.
3. Substituir policies permissivas por `cliente_id = auth.uid()` em `ordens`.
4. Remover o check `startsWith('demo-')` em `addCatalogOrder`.
5. `DROP POLICY "temp_anon_insert_ordens"` em `ordens`.

**Prioridade**: alta antes de qualquer teste externo ou convite a clientes reais.

## Supabase — tabelas

Tabelas principais:
- `profiles` (users), `prestadores`
- `ordens` (com pipeline de 10 estados), `ordem_mensagens` (chat)
- `categorias`, `subcategorias`
- `servicos` (com `servico_pai_id` para grupos e `frequency_template` para recorrência)
- `servico_variacoes`, `servico_extras`
- `frequency_templates` (nova — 8 templates configuráveis)

Colunas novas em `ordens`:
- `metadata` JSONB — guarda opções dinâmicas escolhidas pelo cliente (produtos, frequência, preço efectivo)
- `slots_flexiveis` JSONB, `schedule_mode` TEXT, `notas_cliente`, `fotos_cliente`, `faturacao_*`, `metodo_pagamento`, `promo_code`

## Workflow técnico

1. Antes de editar `App.jsx`, fazer `grep` da secção que se vai alterar para confirmar âncoras.
2. Depois de cada alteração grande, correr `npm run build` para garantir que não quebrou.
3. Commits em inglês, prefixo convencional: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
4. Não fazer `git push` automático.

## Estilo de comunicação

- Responder em português de Portugal
- Ser directo, sem elogios vazios
- Propor planos antes de executar mudanças com mais de ~50 linhas
- Parar e esperar confirmação entre fases
- Ao terminar, listar brevemente o que foi alterado e qual o impacto esperado
