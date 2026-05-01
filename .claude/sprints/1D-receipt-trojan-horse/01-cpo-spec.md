# Sprint 1D — CPO Product Spec

> **Versão:** 1.0 · **Data:** 2026-05-01
> **Sprint window:** 2026-05-01 → 2026-05-15
> **Dependências:** Charter `00-charter.md` · Master Plan snapshot (D-07, D-09, D-20)
> **Scope:** Receipt Trojan Horse flow end-to-end + UX 1C-lite (Casa+Início merge)

---

## User personas (alpha cohort)

### Persona A — "Amélia, a dona que não quer surpresas"

- **Nome fictício:** Amélia Ferreira
- **Idade:** 58 anos
- **Imóveis:** 2 — apartamento T3 em Almada (habitação própria) + T1 em Setúbal (arrendado)
- **Comportamento digital:** WhatsApp daily, entra no MB Way para pagar, usa Gmail no telemóvel. Nunca instalou uma app de casa. Tem o número do "seu" canalizador guardado como "Zé Canaliz" no telemóvel.
- **Dor concreta:** Quando tem um serviço feito, paga em dinheiro ou MB Way. Não tem recibo. Na altura do IRS fica sem provar a despesa. Diz "tenho tudo em papéis mas nunca encontro nada".
- **Willingness-to-pay signal:** Paga €20/ano de seguro para o carro porque "fica tudo registado". Pagaria o equivalente se a casa "ficasse registada" da mesma forma.
- **WhatsApp nativity:** Partilharia um link pelo WhatsApp sem hesitar se o Mário lhe dissesse "manda isto ao Zé antes de ele ir embora".

### Persona B — "Rodrigo, o proprietário racional"

- **Nome fictício:** Rodrigo Pinto
- **Idade:** 44 anos
- **Imóveis:** 3 — moradia em Cascais (habitação própria) + 2 apartamentos em Lisboa (arrendados via plataforma)
- **Comportamento digital:** usa Notion para listas, Google Calendar, lê newsletters de finanças pessoais. Já tentou manter uma folha de Excel com despesas da casa mas abandonou em 3 meses.
- **Dor concreta:** Não tem histórico dos prestadores que usou. Quando a caldeira avaria de novo, não sabe se foi o mesmo técnico que veio em 2022 ou outro, nem quanto pagou. "Perco dinheiro porque não tenho prova das despesas de manutenção para o IRS."
- **Willingness-to-pay signal:** Já paga €12.90/mês por uma ferramenta SaaS para gerir os arrendamentos. Ficaria no free tier até ver valor; subiria para Home+ (€6.90) no momento em que emitisse o 1º recibo guardado.
- **WhatsApp nativity:** Prefere copiar o link e enviar ele próprio. Não quer que a app envie "em nome dele" — quer controlo.

---

## User flows (markdown step-by-step)

### Flow 1: Owner cria e partilha link

**Happy path:** Amélia ou Rodrigo acabou de pagar um serviço ao canalizador. Abre a app, cria o link, partilha.

| # | Acção do utilizador | Screen name | Notas para dev |
|---|---|---|---|
| 1 | Owner abre a app e aterra na tab Casa (default tab pós-login) | `CasaScreen` | Tab Casa é o novo ponto de entrada único (UX 1C-lite) |
| 2 | Owner vê o card "Registar serviço" (secção "Meus Prestadores") e toca nele | `CasaScreen` | Card com ícone de recibo + texto "Registar serviço pago" sempre visível; não precisa de scroll para ver no viewport inicial |
| 3 | App abre inline form (expandido no próprio ecrã, não modal separado): owner preenche 3 campos — tipo de serviço (picker de 8 categorias), valor pago (teclado numérico, formato €), data do serviço (date picker, default hoje) | `CasaScreen › ReceiptForm` | Form inline, não navega para novo ecrã. Campos mínimos: `tipo_servico` (enum), `valor` (decimal), `data` (date). Imóvel activo já está seleccionado — não pedir de novo. |
| 4 | Owner toca em "Gerar link para prestador" | `CasaScreen › ReceiptForm` | Chama edge function `generate-receipt-link` → cria registo em `v5_manutencao.recibos` com `status = 'link_gerado'` + token único. Retorna URL curta. |
| 5 | App mostra o link gerado com botão "Partilhar" (usa Web Share API) e botão "Copiar link" | `CasaScreen › LinkGeradoCard` | Web Share API abre folha nativa do sistema operativo (WhatsApp, SMS, etc). Fallback: copiar para clipboard. Copy confirm: "Link copiado!" por 2s. |
| 6 | Owner toca em "Partilhar" ou "Copiar link" e entrega ao prestador (fora da app) | — | Owner pode fechar a app. Link fica guardado. |
| 7 | Owner regressa a Casa e vê o serviço em estado "Pendente" na secção "Meus Prestadores" | `CasaScreen` | Card com nome do tipo de serviço, valor, data, badge "Aguarda prestador" |

**Estados do card após link gerado:**
- `link_gerado` → badge cinzento "Aguarda prestador"
- `prestador_onboard` → badge laranja "Prestador a completar"
- `recibo_emitido` → badge verde "Recibo arquivado" com link para ver o recibo

---

### Flow 2: Prestador recebe link e faz onboarding

**Happy path:** Zé Canaliz recebe link pelo WhatsApp, clica, preenche dados, confirma.

| # | Acção do utilizador | Screen name | Notas para dev |
|---|---|---|---|
| 1 | Prestador clica no link partilhado (URL tipo `app.casa/r/{token}`) | `ReceiptLandingScreen` | Página pública (sem auth). Mostra: nome do owner (apenas primeiro nome), tipo de serviço, valor declarado, data. Título: "O/A [Nome] quer enviar-lhe um recibo digital". CTA único: "Aceitar e preencher dados" |
| 2 | Prestador toca em "Aceitar e preencher dados" | `PrestadorOnboardingScreen` | Step 1 de 3. Campo: Nome completo (texto). Campo: NIF (9 dígitos, validação mod11). Campo: Telefone (formato PT). Teclado aparece automaticamente no campo Nome. |
| 3 | Prestador avança para Step 2 | `PrestadorOnboardingScreen` | Step 2 de 3. Campo: Morada (texto livre, opcional mas recomendado para recibo legal). Campo: Email (opcional — para receber cópia). Copy: "Precisa de email para receber uma cópia do seu recibo." |
| 4 | Prestador avança para Step 3 | `PrestadorOnboardingScreen` | Step 3 de 3. Mostra resumo: "Vai emitir recibo de €[valor] por [tipo_servico] a [data]". Checkbox obrigatório: "Confirmo que recebi este valor." Botão "Confirmar e emitir recibo". |
| 5 | Prestador toca em "Confirmar e emitir recibo" | `PrestadorOnboardingScreen` | Chama edge function `confirm-receipt` → actualiza `v5_manutencao.recibos` com dados do prestador, `status = 'recibo_emitido'` + cria registo em `core.servicos_ativos`. Dispara notificação push/email ao owner. |
| 6 | Prestador vê ecrã de confirmação | `ReceiptConfirmadoScreen` | Mensagem: "Recibo emitido. O/A [Nome] recebeu uma notificação." Opção: "Criar conta de prestador" (link para registo completo — estado `onboarding_deferido`, não bloqueia o flow). |

**Dados mínimos capturados no onboarding:**
- `nome_completo` (obrigatório)
- `nif` (obrigatório, validação mod11 PT)
- `telefone` (obrigatório — número PT)
- `morada` (opcional)
- `email` (opcional)
- `confirmacao_valor` (boolean, obrigatório — checkbox)

---

### Flow 3: Owner vê prestador confirmado na app

| # | Acção do utilizador | Screen name | Notas para dev |
|---|---|---|---|
| 1 | Owner recebe notificação (push ou email): "O seu recibo de [serviço] foi confirmado por [Nome do Prestador]" | — | Notificação via Resend (email) como fallback obrigatório. Push é best-effort. |
| 2 | Owner abre app, aterra em Casa. O card do serviço mudou de "Aguarda prestador" para "Recibo arquivado" (badge verde) | `CasaScreen` | Card actualizado via Supabase Realtime subscription na tabela `v5_manutencao.recibos` |
| 3 | Owner toca no card para ver o recibo completo | `ReciboDetalheScreen` | Ecrã com: nome prestador, NIF prestador, valor, data, tipo de serviço, imóvel associado. Botão "Partilhar recibo" (PDF ou share de imagem). Botão "Guardar em Drive" (futuro, desactivado com tooltip "Em breve"). |
| 4 | Owner vê a secção "Meus Prestadores" em Casa actualizada com o prestador adicionado à sua carteira | `CasaScreen` | Nova entrada na lista de prestadores com: nome, tipo de serviço, data do último serviço, botão "Contactar" (abre WhatsApp com número) |

---

## Screens needed (count + names)

**Total: 8 screens** (3 novos + 5 modificações de existentes)

### Novos (3)

| Screen | Ficheiro proposto | Descrição |
|---|---|---|
| `ReceiptLandingScreen` | `src/screens/ReceiptLandingScreen.jsx` | Página pública sem auth, acedida via link token. Mostra info do serviço + CTA onboarding prestador. |
| `PrestadorOnboardingScreen` | `src/screens/PrestadorOnboardingScreen.jsx` | 3 steps, dados mínimos prestador. Público (sem auth Supabase do owner). |
| `ReceiptConfirmadoScreen` | `src/screens/ReceiptConfirmadoScreen.jsx` | Ecrã final do flow do prestador. Confirmação + CTA soft para criar conta. |

### Modificações de existentes (5)

| Screen | Ficheiro | O que muda |
|---|---|---|
| `CasaScreen` | `src/CasaScreen.jsx` | Merge completo com conteúdo de `IniciaScreen`. Adiciona secção "Meus Prestadores" + card "Registar serviço" + inline ReceiptForm + LinkGeradoCard. |
| `IniciaScreen` | `src/IniciaScreen.jsx` | Deprecada — conteúdo migrado para CasaScreen. Ficheiro mantido mas componente não usado (não deletar ainda — segurança). |
| `App.jsx` | `src/App.jsx` | Tab "Início" removida da bottom nav. Tab "Casa" passa a ser tab 1. Routing actualizado. |
| `ReciboDetalheScreen` | `src/screens/ReciboDetalheScreen.jsx` | **Novo ficheiro** mas listado aqui como "modificação" porque é a versão de detalhe do recibo, acessível a partir de CasaScreen — não existe ainda, criar de raiz mas é feature de uma screen existente conceptualmente. |
| `DrawerMenu` | `src/components/DrawerMenu.jsx` | Remover link "Início" do drawer se existir. Confirmar que "Casa" aparece correctamente. |

> **Nota:** `ReciboDetalheScreen` é tecnicamente novo mas serve como detalhe de um card em CasaScreen. Criado em `src/screens/ReciboDetalheScreen.jsx`.

---

## UX 1C-lite scope (paralelo a Receipt Trojan Horse)

### Screen: Casa (Casa+Início merge)

**O que mantém de Início screen (vem primeiro, no topo):**
- Saudação personalizada: "Bom dia, [Nome]" com hora dinâmica
- Score card do imóvel activo (número + label + barra de progresso)
- Alertas predictivos activos (máx 2 visíveis, "Ver todos" → AlertaDetailScreen)
- Selector do imóvel activo (dropdown inline, só nesta tab — D-09 canónico)
- Widget meteorológico (dados Open-Meteo para o imóvel activo)

**O que mantém de Casa screen (vem depois, scroll abaixo):**
- Secção "Equipamentos" (lista resumida, máx 3 visíveis + "Ver todos")
- Secção "Documentos recentes" (máx 3 + "Ver todos")
- Secção "Histórico de serviços" (lista cronológica)

**Onde entra o botão/card Receipt Trojan Horse:**
Entre a zona "Início" (score + alertas + meteo) e a zona "Casa" (equipamentos + docs), entra uma secção nova chamada **"Meus Prestadores"**. Esta secção é o novo elemento desta sprint.

**Layout proposto (ASCII art — mobile 390px):**

```
┌─────────────────────────────────┐
│  Bom dia, Amélia          [⚙]  │  ← saudação + settings icon
│                                 │
│  [🏠 Apartamento Almada    ▼]  │  ← selector imóvel (inline, esta tab only)
│                                 │
│  ┌─────────────────────────┐   │
│  │ Score  78/100  ████░░  │   │  ← score card
│  │ "Bom estado"            │   │
│  └─────────────────────────┘   │
│                                 │
│  ⚠ Caldeira sem revisão há 14m │  ← alerta predictivo (1-2 max)
│                                 │
│  🌤 Lisboa · 22°C · Sem chuva  │  ← weather widget
│                                 │
│ ─────── MEUS PRESTADORES ─────  │  ← secção nova (divider + label)
│                                 │
│  ┌─────────────────────────┐   │
│  │ [+] Registar serviço   │   │  ← card CTA (sempre visível)
│  │ Envie link ao prestador │   │
│  └─────────────────────────┘   │
│                                 │
│  Zé Canaliz · Canalização      │  ← prestador confirmado (se existir)
│  Último: 28 Abr · €80 · [WA]   │
│                                 │
│  João Elect. · Electricidade   │
│  Último: 12 Mar · €120 · [WA]  │
│                                 │
│ ──────── A SUA CASA ─────────  │  ← secção existente de Casa screen
│                                 │
│  Equipamentos (3)        [>]   │
│  Documentos (7)          [>]   │
│  Histórico serviços      [>]   │
│                                 │
└─────────────────────────────────┘
```

---

### Receipt flow em Casa screen

**Trigger visual:** Card permanente "Registar serviço" na secção "Meus Prestadores". Não é FAB, não é botão flutuante. É um card com bordas tracejadas (dashed border `--border`) e ícone `+` à esquerda — sinaliza "adicionar".

**Flow: inline no screen** (não modal, não nova página).

Quando o owner toca no card "Registar serviço", o card expande-se in-place para mostrar o ReceiptForm. O resto do ecrã faz scroll para cima (o form fica visível no centro do viewport). Não há navegação para nova página. Botão "Cancelar" colapsa de volta ao card original.

**Estados do card ao longo do flow:**

```
IDLE
┌─────────────────────────────┐
│ [+] Registar serviço       │  ← dashed border, cinzento claro
│ Envie link ao prestador    │
└─────────────────────────────┘
         ↓ (toque)
FORM EXPANDED (inline)
┌─────────────────────────────┐
│ Tipo de serviço  [picker ▼]│
│ Valor pago       [€ ___]   │
│ Data             [28/04 ▼] │
│                             │
│ [Gerar link]  [Cancelar]   │
└─────────────────────────────┘
         ↓ (toque "Gerar link" → loading 1-2s)
LINK GERADO
┌─────────────────────────────┐
│ ✓ Link pronto              │
│ app.casa/r/abc123          │
│ [Partilhar]  [Copiar link] │
│ Serviço: Canalização · €80 │
└─────────────────────────────┘
         ↓ (partilha feita)
PRESTADOR PENDENTE (card na lista)
┌─────────────────────────────┐
│ Canalização · €80 · 28 Abr │
│ ⏳ Aguarda prestador        │  ← badge cinzento
└─────────────────────────────┘
         ↓ (prestador completa onboarding — Realtime update)
PRESTADOR ONBOARD (card actualizado)
┌─────────────────────────────┐
│ Zé Canaliz · Canalização   │
│ ✓ Recibo arquivado · €80   │  ← badge verde
│ [Ver recibo]  [Contactar]  │
└─────────────────────────────┘
```

**Estados do inline form:**
- `idle` — card estático
- `form_open` — card expandido com 3 campos
- `loading` — botão "Gerar link" em loading state (spinner), campos disabled
- `link_ready` — mostra URL + 2 botões de partilha
- `pending` — card colapsado com badge "Aguarda prestador"
- `confirmed` — card colapsado com badge "Recibo arquivado" + nome do prestador

---

## Component reuse inventory

| Componente | Ficheiro | Como reusar neste sprint |
|---|---|---|
| `EscolherImovelSheet` | `components/EscolherImovelSheet.jsx` | Reusar lógica de selecção de imóvel activo no novo selector inline de CasaScreen. Não usar o sheet completo — extrair só o hook de selecção. |
| `ImovelAtivoContext` | `lib/ImovelAtivoContext.jsx` | Context já existente para imóvel activo. ReceiptForm usa `imovelAtivo.id` automaticamente — sem picker adicional no form. |
| `States` | `components/States.jsx` | Estados de loading/error/empty já padronizados. Usar no loading state de "Gerar link" e nos estados do PrestadorOnboardingScreen. |
| `PhoneInput` | `components/PhoneInput.jsx` | Campo telefone PT já com máscara e validação. Usar no Step 1 do PrestadorOnboardingScreen. |
| `PasswordInput` | `components/PasswordInput.jsx` | Padrão de input com validação visual. Reusar o padrão (não o componente em si) para o campo NIF — validação em tempo real com feedback visual. |
| `PerfilFiscalForm` | `components/PerfilFiscalForm.jsx` | Contém lógica de validação de NIF PT (mod11). Extrair a função de validação para `lib/` e reusar no PrestadorOnboardingScreen. |
| `ui.jsx` | `components/ui.jsx` | Todos os primitivos de UI (botões, inputs, badges, dividers). Usar `.ab`, `.ab-outline`, badges com classes existentes. |
| `HeroHeader` | `src/HeroHeader.jsx` | Header com saudação e selector de imóvel. Reusar como ponto de partida para o topo de CasaScreen merged. Verificar se o selector inline já está aqui ou precisa de ser adicionado. |
| `AuthContext` | `lib/AuthContext.jsx` | `useAuth()` para obter `user.id` e `profile.nome` nas screens de owner. ReceiptLandingScreen é pública — NÃO usar AuthContext nessa screen. |
| `useWeatherForecast` | `hooks/useWeatherForecast.js` | Hook já funcional. Mantém-se em CasaScreen merged sem alterações — só garantir que o import não quebra com o merge. |

---

## Out of scope (UX)

Os seguintes items **não são discutidos, especificados, nem tocados** neste sprint. Qualquer PR que inclua trabalho nestes items é motivo para rejeição imediata pelo Auditor.

1. **Owners Club tab** — tab dedicada e schema `v10_owners_club` diferidos para Sprint 1E (D-09 mantém-se, mas a implementação da tab é 1E).
2. **Pedidos rework** — `PedidosScreen.jsx` não recebe alterações. Wishlist como hub de pedidos pendentes é funcionalidade separada, não tocada neste sprint.
3. **Weather "Todos os imóveis" bug (Modo A global)** — bloqueador conhecido, deferido desde Sprint 1B.4. Não tocar em `useWeatherForecast.js` além do estritamente necessário para o merge.
4. **Stripe Connect ou qualquer pagamento in-app** — pagamentos continuam fora-app. O campo `valor` no ReceiptForm é informacional, não trigger de transacção.
5. **Prestador app dedicada ou mode switcher** — Q4 2026. Prestadores neste sprint são contactados fora da app após onboarding.
6. **Score rework ou Home Intelligence features novas** — score card mantém-se como está. Nenhuma nova lógica de scoring neste sprint.
7. **Gamification / missões / pontos** — `MissoesScreen.jsx` e `lib/gamification.js` não recebem alterações.
8. **V4 Energia, V3 Seguros, V2 Condomínios** — zero work em outras verticais.
9. **Notificações push nativas (Capacitor)** — notificações são email via Resend. Push é best-effort via browser Notification API apenas se o user já deu permissão.
10. **PDF gerado server-side** — ReciboDetalheScreen mostra dados em HTML. Botão "Partilhar recibo" usa Web Share API com texto formatado. PDF real é Sprint 1E+.
11. **Selector de imóvel centralizado / global** — selector mantém-se apenas na tab Casa, conforme D-09. Nenhuma mudança ao routing global nem à bottom nav além de remover a tab "Início".
12. **Smart Inbox (email + WhatsApp bidirecional)** — apenas link partilhável manual neste sprint. Nenhum webhook de WhatsApp, nenhuma integração de inbox.
