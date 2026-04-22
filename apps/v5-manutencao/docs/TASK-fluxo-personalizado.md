# Tarefa — Integrar fluxo de catálogo + serviço personalizado no v5-manutencao

**Data**: 22 Abr 2026
**Objectivo**: Integrar no `src/App.jsx` o novo fluxo completo de catálogo de serviços (lista de categoria → detalhe → checkout) e serviço personalizado (landing → formulário → checkout), preservando tudo o que já existe (auth, chat, pipeline de ordens, admin, prestador).

---

## Antes de começar

1. Lê `CLAUDE.md` na raiz da app para contexto do projecto.
2. Lê o ficheiro de referência **`docs/v5-complete-flow-reference.jsx`** — é um demo standalone que mostra todo o fluxo novo com componentes, paleta, estados e modais. **É a única fonte da verdade visual e de UX**.
3. Lê a migração **`supabase/migrations/20260422_catalogo_canalizacao.sql`** — é o schema BD a aplicar.
4. Faz `grep` no `src/App.jsx` actual para mapear:
   - Onde está o click handler da categoria **Canalização** na Home do cliente
   - Onde está o actual formulário de criação de ordem do cliente
   - Onde está o ecrã de checkout actual (se existir) e o fluxo de submit
   - Que campos da tabela `ordens` são usados hoje

---

## Workflow exigido

**Fase 1 — Plano**: apresenta um plano estruturado com:
- Lista de secções do `App.jsx` que vão ser modificadas (com intervalos de linhas aproximados)
- Lista de componentes novos a adicionar
- Lista de campos BD novos a usar na criação da ordem
- Quaisquer conflitos que detectes entre o fluxo novo e o actual

**Aguarda confirmação antes de escrever código.**

**Fase 2 — Execução incremental**. Faz em 4 passos discretos, com build e commit entre cada um:

1. Aplicar a migração SQL na Supabase (via CLI ou painel) e verificar com a query de verificação
2. Adicionar as constantes (`C`, `PERSONALIZADO`, `SUBCATEGORIES`, `TIMESLOTS`), helpers (`eur`, `fmtDate`, `getDays`, `isSlotBookable`) e componentes utilitários (`BottomSheet`, `PrimaryButton`, `Chip`, `ValueRow`, `PriceTag`, `JaFaltaPouco`, modais) no `App.jsx` em local apropriado (antes do root `App()`)
3. Adicionar os 6 ecrãs novos (`ServiceListScreen`, `PersonalizadoLanding`, `PersonalizadoForm`, `ServiceDetailScreen`, `FinalizarPedido`, `ConfirmadoScreen`)
4. Ligar o fluxo novo à Home do cliente: substituir o click handler da categoria **Canalização** para navegar para `ServiceListScreen`, e o submit final do checkout para criar a ordem na Supabase com os campos novos

**Fase 3 — Verificação**: correr `npm run dev`, testar os 4 caminhos e listar tudo o que foi alterado.

---

## O que tem de funcionar

### Caminho A — Serviço personalizado
1. Cliente abre Home → toca em Canalização
2. Vê lista com Personalizado hero no topo + 30 serviços agrupados
3. Toca no hero Personalizado → Landing ("Ideal para")
4. Toca Continuar → Formulário (descrição ≥30 chars, horas estimadas, fotos)
5. Toca Continuar → Finalizar pedido (mapa, morada, Agendar/Imediato, resumo, pagamento, dados faturação, "Já falta pouco!")
6. Selecciona horário + pagamento → Agendar serviço
7. Ecrã de confirmação, e é criada uma linha em `ordens` com `is_personalizado = TRUE`, `descricao_cliente`, `horas_estimadas`, `fotos_cliente`, `slots_flexiveis` (JSONB), `schedule_mode`, etc.

### Caminho B — Serviço fixo do catálogo
1. Cliente abre Home → toca em Canalização
2. Vê lista → toca num serviço qualquer (ex: "Reparação de autoclismo")
3. Vê detalhe compacto (preço fixo + 90 dias garantia + 3 valores)
4. Toca Continuar → Finalizar pedido (igual ao caminho A mas sem ecrãs intermédios)
5. Ordem criada em `ordens` com `is_personalizado = FALSE`, `servico_id` preenchido

### Regras transversais
- Slots de "Hoje" dentro das próximas 90 minutos aparecem riscados e não-clicáveis
- Se "Hoje" não tiver slots disponíveis, tab "Hoje" esbatida + banner a sugerir Imediato
- Multi-select até 5 horários. Botão Imediato é alternativa mutuamente exclusiva com +€6,90
- Surcharge de +€3,90 só se todos os slots seleccionados forem de "Hoje"
- Campo `slots_flexiveis` na BD guarda array JSON dos horários escolhidos

---

## Preservação — **NÃO TOCAR**

- Login e botões de demo (Cliente/Prestador/Admin)
- Rotas de role — o cliente continua a cair no `CHome`, prestador no `PDash`, admin no `AdminDash`
- Outras categorias da Home além de Canalização — só alterar o click de Canalização. Limpeza, Manutenção, Jardim, etc., mantêm o fluxo antigo até serem migradas em tarefas futuras
- Chat cliente↔prestador, pipeline de estados da ordem, pagamentos SEPA, admin dashboard
- Nomes de tabelas existentes, tipos de colunas existentes, políticas RLS existentes
- Textos do admin e do prestador

---

## Critérios de aceitação

Antes de declarar feito, verifica manualmente (ou com screenshots):

- [ ] A migração SQL aplicou-se sem erros e a verificação devolveu **30 serviços**, **2 populares**, **3 eco** em Canalização
- [ ] `npm run build` corre sem erros nem warnings novos
- [ ] A Home do cliente ainda mostra todas as categorias como antes
- [ ] Clicar Canalização abre a nova `ServiceListScreen` com Personalizado hero
- [ ] A pesquisa "torneira" filtra correctamente
- [ ] As pills Todos/Autoclismo/Torneiras/… fazem scroll às secções
- [ ] Clicar no hero Personalizado → Landing → Form → Checkout
- [ ] Clicar num serviço fixo → Detail → Checkout
- [ ] No Checkout, os 3 modais (Schedule / Photos&Notes / Billing) abrem e guardam estado
- [ ] Slots passados de Hoje estão riscados
- [ ] Botão Imediato fica bloqueado com +€6,90 ao ser seleccionado, sem abrir modal
- [ ] "Já falta pouco!" aparece antes do bloco de pagamento
- [ ] Submeter uma ordem de teste (modo cliente-demo) cria linha em `ordens` com todos os campos novos preenchidos
- [ ] As outras categorias da Home (Limpeza, etc.) continuam a abrir o fluxo antigo sem regressões
- [ ] Login, demo buttons, admin dashboard, prestador dashboard continuam a funcionar

---

## Limites e guard-rails

- **Não criar** ficheiros novos em `src/` — tudo dentro do `App.jsx` existente
- **Não alterar** `package.json` nem adicionar dependências novas (os ícones `lucide-react` e `react` já devem existir; se algum faltar, flag no plano antes de continuar)
- **Não fazer `git push`**. Commit local apenas. O Mario decide quando empurrar
- **Não aplicar** a migração em produção sem confirmação expressa — aplica primeiro no branch de dev/staging da Supabase se existir
- Se detectares um conflito entre o schema actual da `ordens` e os `ADD COLUMN` da migração (ex: tipo diferente), **para e reporta** antes de avançar

---

## Dúvidas que deves fazer antes de começar

Se alguma das seguintes não estiver clara depois de leres o `App.jsx`, pergunta ao Mario antes de planear:

1. Qual é o nome exacto da função/componente que renderiza a Home do cliente hoje? (Provavelmente `CHome` ou similar)
2. Qual é o nome da função que cria ordens na Supabase hoje? (Para eu substituir por uma versão expandida)
3. Existe algum código de promoção implementado ou é só visual? (Se só visual, mantenho só visual.)
4. O Supabase tem ambiente separado dev/prod, ou é instância única?

---

## Referências

- Demo standalone: `docs/v5-complete-flow-reference.jsx` (1811 linhas) — **fonte da verdade visual**
- Migração SQL: `supabase/migrations/20260422_catalogo_canalizacao.sql`
- Contexto do projecto: `CLAUDE.md`
- Página Notion com a sessão de design: <https://www.notion.so/34a84147fa6081048cdff2c3444ccf9c>
