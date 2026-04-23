# Tarefa — Integrar catálogo completo + fluxo de reserva no v5-manutencao

**Data**: 22 Abr 2026
**Objectivo**: Integrar no `src/App.jsx` o fluxo novo de catálogo de serviços — **as 8 categorias que já aparecem na Home** (Limpeza, Manutenção, Jardim, Piscina, Pintura, Elétrica, Canalização, Pós-Obra) — com listagem, detalhe, checkout unificado, e serviço personalizado por categoria. Preservar tudo o que existe (auth, chat, pipeline de ordens, admin, prestador).

---

## Antes de começar

1. Lê `CLAUDE.md` na raiz da app para contexto do projecto.
2. Lê o ficheiro de referência **`docs/v5-complete-flow-reference.jsx`** — é um demo standalone que mostra o fluxo (lista → detalhe/personalizado → checkout → modais), tokens de cor, e componentes. **É a fonte da verdade visual**.
3. Lê o **catálogo completo em `docs/CATALOGO-COMPLETO.md`** — 153 serviços detalhados em 8 categorias com IDs estáveis, preços e duração típica (100% com detalhe rico — tagline, inclui, não inclui, FAQ).
4. Lê a migração **`supabase/migrations/20260422_catalogo_completo.sql`** — é o schema + seed BD a aplicar.
5. Faz `grep` no `src/App.jsx` actual para mapear:
   - Onde está a Home do cliente e os click handlers de cada categoria
   - Onde está o actual formulário/fluxo de criação de ordem
   - Que campos da tabela `ordens` são usados hoje
   - Como é feita a submissão à Supabase

---

## Workflow exigido (4 fases com checkpoints)

### Fase 1 — Plano
Apresenta um plano estruturado com:
- Lista de secções do `App.jsx` a modificar (com intervalos de linhas)
- Lista de componentes novos a adicionar
- Como vai carregar o catálogo (opções: (a) hardcoded em constantes no `App.jsx`; (b) fetch à Supabase no arranque; **recomendo (b)** para o admin poder editar sem redeploy)
- Conflitos detectados entre fluxo novo e actual

**Aguarda confirmação.**

### Fase 2 — Execução incremental
Faz em 4 passos discretos, com `npm run build` e commit local entre cada um:

1. **Aplicar migração SQL** na Supabase e verificar (query de verificação no fim do ficheiro). Esperado: 153 serviços em 8 categorias, 100% com detalhe rico (`tagline`, `inclui`, `nao_inclui`, `duracao_tipica`, `faq`).
2. **Adicionar infraestrutura UI** ao `App.jsx`: paleta `C`, helpers (`eur`, `fmtDate`, `getDays`, `isSlotBookable`), primitivos (`BottomSheet`, `PrimaryButton`, `Chip`, `ValueRow`, `PriceTag`, `JaFaltaPouco`, `DetailSection`, `DetailItem`, `FaqItem`, modais Schedule/Photos/Billing).
3. **Adicionar os 7 ecrãs novos**: `ServiceListScreen(categoryId)`, `VariantPickerScreen`, `PersonalizadoLanding`, `PersonalizadoForm`, `ServiceDetailScreen`, `FinalizarPedido`, `ConfirmadoScreen`. **Todos parametrizados por categoria** — o mesmo `ServiceListScreen` serve as 8 categorias, só muda os serviços carregados. O `ServiceDetailScreen` carrega `inclui`/`nao_inclui`/`faq` directamente dos campos da tabela `servicos`. O `VariantPickerScreen` só aparece quando o serviço clicado tem `tipo='grupo'` — mostra as variantes filho (WHERE `servico_pai_id = <parentId>`) com a variante popular pré-seleccionada. O `ServiceDetailScreen` renderiza a secção **Opções** quando o serviço tem `hasProductsOption` (produtos) ou `frequency_template` preenchido (frequência) — as 8 templates (`cln_home`, `cln_occasional`, `cln_office`, `jardim_corte`, `sazonal_cut`, `plano_gradual`, `piscina_quimica`, `manutencao_anual`) estão na **tabela `frequency_templates`** (seed incluído no SQL) e são carregadas pelo frontend no arranque — o admin pode editá-las sem tocar em código. Aplica-se a 13 serviços individuais + 3 grupos (que afectam 10 variantes). Calcula preço dinâmico e guarda escolhas em `ordens.metadata` JSONB no checkout.
4. **Filtro na query da lista**: `ServiceListScreen` só mostra serviços com `servico_pai_id IS NULL` (ou seja, serviços-pai + serviços soltos, nunca filhos directamente). Cartões de serviços-pai mostram "desde €X" e o número de tipologias.
5. **Ligar à Home do cliente**: substituir o click handler de **cada uma das 8 categorias** para navegar para `ServiceListScreen` com o respectivo `categoryId`. Substituir o submit final do checkout para criar ordem na Supabase com os campos novos — incluindo `metadata` JSONB com as opções escolhidas (produtos, frequência, preço efectivo).

### Fase 3 — Verificação
Correr `npm run dev`, testar todas as 8 categorias, validar a checklist.

---

### Fase 4 — Botão Personalizado na Home (depois do core)

Inspirado no OSCAR. O objectivo é dar atalho ao cliente que não sabe classificar o problema.

Adicionar à Home, **imediatamente abaixo da grid de categorias**:
- Botão CTA com gradiente verde floresta, ícone `Sparkles`, texto "Não encontra o que procura? Descreva o trabalho — enviamos o técnico certo"
- Ao clicar, abre um `BottomSheet` com a pergunta "De que área é o trabalho?" e grid 2×4 das 8 categorias
- Depois do cliente escolher, encaminha directamente para `PersonalizadoLanding` dessa categoria (passando `isPersonalizado = true`)

Ver implementação de referência em `docs/v5-complete-flow-reference.jsx` (função `App` + `HomeScreen` + BottomSheet `personalizadoPicker`).

### Fase 5 — Assistente de IA na barra de pesquisa (futuro)

Preparação visual agora + implementação completa depois. Em cima do que já está:
- **Agora**: ícone `Sparkles` no fundo da barra de pesquisa da Home (gradiente verde→emerald). Ao clicar, `alert` "Assistente IA — em breve". Stub visual apenas.
- **Depois** (Fase 5 separada, quando v5 estiver em produção com feedback real): substituir o alert por modal de chat que chama endpoint próprio em Supabase Edge Functions, que por sua vez chama Anthropic API com system prompt contendo o catálogo estruturado. O sistema recomenda serviços do catálogo (nunca fora dele), pede fotos quando necessário, e desambigua entre serviços similares.

Custo estimado de desenvolvimento: 3-5 dias. Custo operacional: ~€0,01 por pergunta com Claude Sonnet.

### Fase 6 — UI de admin para templates de frequência

Módulo novo dentro do `AdminDash` para gerir a tabela `frequency_templates`. Permite ao Mario ajustar descontos, labels e hints sem tocar em código.

**CRUD simples**:
- Listar templates (8 linhas iniciais no seed)
- Editar opções de uma template: label, hint, multiplier, discount, suffix, flags `per_visit` / `includes_deep`
- Adicionar nova template (atribui a serviços via UI de edição de serviço)
- Desactivar template (coluna `activo`)

**UI sugerida**:
- Tabela principal: ID, Nome, Descrição, Nº de opções, Estado (activa/inactiva)
- Ao clicar numa linha, modal ou sub-página com editor visual das opções (sortable list com campos)
- Botão "Pré-visualizar impacto" que mostra quantos serviços usam esta template e o efeito da mudança nos preços

**Importante**: quando a template é editada, todas as ordens recorrentes em curso mantêm os valores antigos (guardados em `ordens.metadata`). Só novas ordens usam os valores novos. Esta é uma decisão importante que evita mudar o preço a clientes já com contrato.

### Fase 7 — Bottom nav com FAB central para Personalizado

Transformar a bottom nav da Home de 4 tabs iguais para 4 tabs + 1 FAB central elevado:

**Layout**: `Início · Explorar · [+ FAB] · Pedidos · Perfil`

O FAB é um botão circular de 56×56px, elevado −22px acima da barra, com:
- Gradiente verde `emerald → emeraldBright` + borda branca 4px (estilo floating)
- Ícone `Sparkles` branco
- Sombra difusa para destaque visual
- Label pequena "Personalizado" logo abaixo (dentro da barra)

Ao tocar, abre o mesmo `BottomSheet` do botão Personalizado da Home (picker de categoria).

Ver implementação em `docs/v5-complete-flow-reference.jsx` — função `HomeScreen` na secção "Bottom nav com FAB central".

**Onde renderizar**: o FAB deve aparecer em **todas as páginas principais do cliente** (Home, Explorar, Pedidos, Perfil) para dar acesso persistente. Não aparecer em ecrãs de fluxo (detalhe, checkout, etc.) que têm sticky CTAs próprios.

### Fase 8 — Serviços sazonais e campanhas
Inspirado no InstaService (USA). Para além dos novos serviços já no SQL (luzes de Natal, baby proofing, pendurar quadros), há três mecanismos que podem ser activados:

1. **Banner sazonal na Home** — abaixo do hero, quando estiver em época (Out-Jan): "🎄 Marque já as luzes de Natal — agendas abertas até 10 Dez. →". Feature flag na tabela `categorias` ou configuração global.
2. **Campanhas promocionais** — códigos promo específicos por época (`NATAL25`, `VERAO25`) com regras diferentes das actuais `CHEGUEI50_*`.
3. **Disponibilidade limitada por época** — campo `disponivel_de` / `disponivel_ate` na tabela `servicos` para servicos sazonais desaparecerem automaticamente fora da época.

Fase 8 é opcional para MVP — pode começar só com os serviços novos e adicionar os banners/campanhas quando entrar no período.

---

## O que tem de funcionar

### Caminhos que o utilizador deve poder fazer (para cada uma das 8 categorias)

**A. Serviço fixo do catálogo**
1. Home → toca numa categoria (ex: Pintura)
2. Vê `ServiceListScreen` com:
   - Hero do Personalizado no topo
   - Pesquisa e pills de subcategoria
   - Grid de serviços agrupados por subcategoria, com preço promo + preço riscado, badges ⭐ Popular e 🌿 Eco
3. Toca num serviço (ex: "Pintar casa T2 completa")
4. Vê `ServiceDetailScreen` com preço fixo + garantia 90 dias + secções expandíveis (**O que está incluído** / **O que não está incluído** / **Perguntas frequentes**) carregadas dos campos `inclui` / `nao_inclui` / `faq` / `tagline` / `duracao_tipica` da tabela `servicos`
5. Toca Continuar → `FinalizarPedido` (mapa, morada, Agendar/Imediato, resumo, pagamento, faturação, "Já falta pouco!")
6. Submete → ordem criada com `servico_id = 'pnt-apt-t2'`, `is_personalizado = false`, etc.

**B. Serviço personalizado (existe um por categoria)**
1. Home → toca numa categoria
2. Na lista, toca no hero "Personalizado"
3. Vê `PersonalizadoLanding` adaptada (títulos e bullets contextualizados à categoria)
4. Continuar → `PersonalizadoForm` (descrição ≥30 chars, horas estimadas, fotos)
5. Continuar → `FinalizarPedido`
6. Submete → ordem criada com `servico_id = 'pnt_personalizado'`, `is_personalizado = true`, `descricao_cliente`, `horas_estimadas`, etc.

### Regras transversais
- **Slots passados de Hoje ficam riscados** (buffer de 90 min)
- Se "Hoje" não tem slots disponíveis, tab esbatida + sugestão para usar **Imediato** (+€6,90)
- Multi-select até 5 horários em Agendar
- Surcharge de +€3,90 só se **todos** os slots selecionados forem de Hoje
- Botão Imediato é mutuamente exclusivo com Agendar
- Campos BD: `slots_flexiveis` (JSONB), `schedule_mode` ('agendar'|'imediato'), `notas_cliente`, `fotos_cliente` (JSONB), `faturacao_*`, `metodo_pagamento`, `promo_code`

---

## Preservação — **NÃO TOCAR**

- Login e botões de demo (Cliente/Prestador/Admin)
- Rotas de role — cliente em `CHome`, prestador em `PDash`, admin em `AdminDash`
- Chat cliente↔prestador, pipeline de estados da ordem, pagamentos SEPA
- Nomes e tipos de colunas existentes, políticas RLS existentes
- Textos e fluxos do admin e do prestador
- **A Home deve continuar a mostrar as 8 categorias tal como hoje** — só os click handlers mudam, a grelha visual fica. O utilizador não deve notar disrupção na navegação inicial; só quando clica numa categoria, é que entra no novo fluxo.

---

## Critérios de aceitação

- [ ] Migração SQL aplicada sem erros. Query de verificação devolve **153 serviços em 8 categorias**, 8 personalizados, 18 populares, 6 eco, **153 com detalhe rico** (todos)
- [ ] `npm run build` sem erros nem warnings novos
- [ ] Home do cliente mostra as 8 categorias exactamente como antes + botão CTA "Personalizado" por baixo da grid + ícone sparkle na barra de pesquisa
- [ ] Clicar **cada uma das 8 categorias** abre a nova `ServiceListScreen` com o Personalizado hero da categoria e os serviços correctos
- [ ] Pesquisa e pills funcionam em qualquer categoria
- [ ] Serviço fixo → Detail → Checkout funciona
- [ ] Serviço personalizado → Landing → Form → Checkout funciona (com form validando ≥30 caracteres)
- [ ] No Checkout, os 3 modais (Schedule/Photos/Billing) abrem e guardam estado
- [ ] Slots passados de Hoje riscados e não-clicáveis
- [ ] Botão Imediato mutuamente exclusivo com Agendar; aplica +€6,90
- [ ] Submeter ordem de teste (modo cliente-demo) cria linha em `ordens` com todos os campos novos preenchidos correctamente — para serviço fixo e para personalizado
- [ ] Login, botões de demo, admin dashboard, prestador dashboard **continuam a funcionar exactamente como antes**

---

## Detalhes de implementação

### Como adaptar o Personalizado por categoria

O demo de referência mostra o Personalizado para Canalização. Para cada categoria, o texto adapta-se:

| Categoria | Título landing | Preço/hora | Bullets "Ideal para" |
|---|---|---|---|
| Limpeza | "Limpeza à medida?" | €26,91 (base €29,90) | Limpezas específicas que não estão no catálogo; várias casas de banho em sequência; limpezas recorrentes customizadas |
| Manutenção | "Reparação à medida?" | €39,90 (base €44,91) | Tarefas múltiplas numa só visita; reparações fora do standard; ajuste de várias peças |
| Jardim | "Jardim à medida?" | €34,90 (base €38,90) | Combinação de tarefas; trabalhos sazonais; plantação de ervas aromáticas |
| Piscina | "Serviço de piscina à medida?" | €49,90 (base €54,90) | Problemas específicos com equipamento; intervenção mista; abertura complexa |
| Pintura | "Pintura à medida?" | €44,91 (base €49,90) | Pequenos trabalhos combinados; acabamentos especiais; retoques em várias divisões |
| Elétrica | "Intervenção elétrica à medida?" | €44,91 (base €49,90) | Várias pequenas reparações; diagnóstico + fix no mesmo dia; trabalhos combinados |
| Canalização | "Procura um serviço à medida?" | €44,91 (base €49,90) | Várias pequenas tarefas numa visita; problema difícil de explicar |
| Pós-Obra | "Acabamento à medida?" | €49,90 (base €54,90) | Limpeza + acabamentos; entulho específico; vistoria + correção |

A tabela acima já está reflectida na BD — cada personalizado tem o seu `tagline` próprio. Carrega o tagline da BD em vez de hardcode.

### Como carregar o catálogo (recomendado)

No arranque da app (ou ao entrar numa categoria pela primeira vez), fazer um fetch único à Supabase:

```js
const { data: cats }     = await sb.from('categorias').select('*').eq('activo', true).order('ordem');
const { data: subs }     = await sb.from('subcategorias').select('*').order('ordem');
const { data: servicos } = await sb.from('servicos').select('*').eq('activo', true).order('ordem');
```

Guardar no state do `App` e passar por props. Alternativa: cache global simples em `useMemo`.

### Estrutura do `ServiceListScreen`

Aceita prop `categoryId`. Filtra dados da categoria, organiza por `subcategoria_id`, renderiza:
1. Personalizado no topo (serviço com `tipo = 'personalizado'`)
2. Pesquisa
3. Pills com "Todos" + cada subcategoria que tenha pelo menos 1 serviço
4. Grid por subcategoria

### ServiceDetailScreen

Para serviços com `tipo = 'fixo'`. Apresenta o serviço, preço, garantia, 3 valores core. Para serviços muito caros (ex: pintura de fachada €805, banheira→duche €2084), **adicionar aviso de visita técnica prévia** em vez de CTA directo de reserva:

```js
const HIGH_VALUE_THRESHOLD = 500;
if (service.preco > HIGH_VALUE_THRESHOLD) {
  // Mostrar: "Este trabalho requer visita técnica prévia. Vamos enviar alguém para avaliar antes de confirmar."
  // CTA: "Pedir visita técnica" → cria ordem com status 'orcamento_solicitado'
}
```

---

## Limites e guard-rails

- **Não criar** ficheiros novos em `src/` — tudo dentro do `App.jsx` existente
- **Não alterar** `package.json` nem adicionar dependências novas
- **Não fazer `git push`**. Commit local apenas
- **Não aplicar** a migração em produção sem confirmação expressa
- Se detectares conflito entre schema actual da `ordens` e os `ADD COLUMN` da migração, **para e reporta**
- Se o `App.jsx` ficar com mais de 5000 linhas depois da integração, isso é normal — não refactorizar para múltiplos ficheiros

---

## Dúvidas a fazer ao Mario antes de planear

Se alguma das seguintes não estiver clara depois de leres o `App.jsx`, pergunta:

1. Nome exacto da função que renderiza a Home do cliente (`CHome`? outro?)
2. Nome da função que cria ordens na Supabase actualmente (para substituir por uma versão expandida)
3. Os promo codes (`CHEGUEI50_`) já estão implementados na BD ou são só visuais?
4. Existe ambiente Supabase separado dev/prod ou é instância única?
5. O storage de fotografias cliente deve ficar em Supabase Storage (bucket `ordens-fotos`)? Se sim, o bucket já existe ou criar?

---

## Referências

- Demo standalone: `docs/v5-complete-flow-reference.jsx` — fonte da verdade visual
- Catálogo completo: `docs/CATALOGO-COMPLETO.md` — 153 serviços com IDs, preços, subcategorias
- Migração SQL: `supabase/migrations/20260422_catalogo_completo.sql`
- Contexto do projecto: `CLAUDE.md`
- Sessão de design no Notion: <https://www.notion.so/34a84147fa6081048cdff2c3444ccf9c>
