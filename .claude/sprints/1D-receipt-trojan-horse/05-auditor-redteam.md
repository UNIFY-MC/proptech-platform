# Sprint 1D — Auditor Red Team

> **Versão:** 1.0 · **Data:** 2026-05-01
> **Auditor:** devil's advocate agent
> **Inputs:** 00-charter.md · 01-cpo-spec.md · 02-cto-architecture.md · 03-cfo-unit-economics.md · 04-coo-operations.md
> **Modo:** céptico profissional. Encontrar furos antes que custem 14 dias.

---

## Top 10 risks (ranked by P × I)

| # | Risco | Probabilidade (1-5) | Impacto (1-5) | P×I | Mitigação owner |
|---|-------|---------------------|----------------|-----|-----------------|
| 1 | **Schema mismatch entre CPO e CTO**: CPO spec referencia `v5_manutencao.recibos` em 4 sítios (charter critério 2, flow 1 passo 4, flow 2 passo 5, charter strategic alignment) mas CTO architecture cria `v5_manutencao.magic_links` e `v5_manutencao.prestadores_parceiros` — **a tabela `recibos` não existe nem está no plano**. Success criteria 2 é literalmente `linha em v5_manutencao.recibos com owner_id ≠ Mário` e não há migration que crie essa tabela. Sprint pode terminar Day 14 com flow funcional mas critério 2 marcado FAIL por inexistência da tabela. | 5 | 5 | **25** | CTO + CPO reconciliar Day 0/1: ou criar tabela `recibos` na migration ou actualizar charter para usar `prestadores_parceiros`. Decisão CEO antes de Day 1. |
| 2 | **Critério 4 (3 entrevistas qualitativas) matematicamente inviável no calendário COO**: COO calendar prevê onboardings Day 12-13. Entrevistas devem ser 3-5 dias após onboarding. 3-5 dias após Day 12 = Day 15-17 (FORA do sprint, hard deadline Day 14). COO até admite isto: "é o item mais em risco no calendário". Se 3 entrevistas não acontecerem dentro de 14 dias, sprint falha success criteria 4 mesmo com critério 2 verde. | 5 | 4 | **20** | Antecipar onboarding de Owner A para Day 8-9 (não Day 12). Aceitar entrevista em Day 12-13 mesmo a 3 dias do uso (perde algum sinal qualitativo mas salva o critério). Alternativa: CEO renegocia critério 4 em charter para "≥3 entrevistas dentro de 21 dias após sprint start". |
| 3 | **Edge function `confirm-receipt` (CPO Flow 2 passo 5) não está no plano CTO**: CPO spec chama edge function `confirm-receipt` que actualiza estado e cria registo em `core.servicos_ativos`. CTO architecture só lista `gerar-magic-link` e `prestador-onboarding`. A função `prestador-onboarding` faz INSERT em `prestadores_parceiros` mas NÃO escreve em `core.servicos_ativos` — que é exactamente o que charter critério 2 mede. | 4 | 5 | **20** | CTO confirmar Day 1: ou `prestador-onboarding` também escreve `core.servicos_ativos` (e charter mede esta tabela), ou criar 3ª edge function. Schema `core.servicos_ativos` precisa de existir (ver risco #6). |
| 4 | **Schema `core` não existe no Supabase V1 Core Hub**: CLAUDE.md diz "V1 Core Hub está VAZIO (só tabela file_deploy)". Charter critério 2 mede `core.servicos_ativos`, mas não há migration nem menção em CTO architecture para criar schema `core` ou tabela `servicos_ativos`. Day 14 cabeça-de-vento: tabela não existe, success criteria não-mensurável. | 5 | 4 | **20** | CTO Day 1: criar migration que cria schema `core` + tabela `servicos_ativos` com campos mínimos (`owner_id`, `imovel_id`, `prestador_id`, `tipo_servico`, `valor`, `data`). 30 min de trabalho mas crítico. |
| 5 | **Magic link TTL 7 dias colide com RGPD checklist item 1**: CTO architecture diz `expires_at = now() + INTERVAL '7 days'`. COO RGPD checklist item 1 diz "Magic link expiry ≤24h configurado no Supabase" e cita CNPD PT como fundamento. Conflito directo entre dois documentos. Se Auditor (eu) flag isto como P0 RGPD em Day 11, sprint pára. | 4 | 4 | **16** | Distinguir: o magic link em CTO é para onboarding de PRESTADOR (one-time, partilhável). O magic link em COO RGPD checklist é magic link de AUTH do Supabase (login owner). São coisas diferentes. CTO + COO reconciliar terminologia Day 1. Mesmo assim, 7 dias para link de partilha pode ser questionável — propor 48h. |
| 6 | **Mário simula prestador no Day 11-12 com mesmo browser/device — invalida critério 2**: COO playbook Day 10: "Mário faz o flow completo como Owner E". Day 12: "Mário simula ser o prestador nesta chamada". Se Mário usa mesma sessão/device, RLS pode permitir mas charter critério 2 exige `owner_id ≠ Mário`. Se o "owner" é Mário e o "prestador" também é Mário, critério 2 falha mesmo com flow funcional. | 4 | 4 | **16** | Onboarding de Owner A em Day 8-9 com prestador real ou mock que NÃO é Mário. Mário-as-prestador só conta para teste técnico, não para success criteria 2. |
| 7 | **Netlify SPA redirect para `/join/:token` não testado em produção até Day 11**: CTO risco #3 identifica isto mas mitigação é "adicionar regra em netlify.toml antes de deploy". CLAUDE.md regra invioável #3: "NUNCA editar netlify.toml sem confirmação humana dupla". Edição de netlify.toml é necessária mas regulada. Se a regra de redirect quebra rotas existentes (admin/, V9 portal raíz), tem-se P0 em produção viva. | 3 | 5 | **15** | CTO testa `netlify.toml` em branch staging com smoke test completo de admin/index.html + index.html raíz + nova rota antes de merge. Mário valida pessoalmente. Regra de catch-all `[[redirects]] from = "/*"` é particularmente perigosa — usar prefix específico `/join/*`. |
| 8 | **0 owners alpha aceitam (kill criteria Day 7) com lista nominal nunca verificada**: COO oferece 5 perfis genéricos mas charter exige "lista nominal em tasks/alpha-owners.md". Não está confirmado que Mário tem 5 nomes reais com probabilidade alta de aceitar. CTO risco #5 identifica isto: "Mário não consegue 5 alpha owners em Day 13-14". Se Mário só conseguir nomes em Day 10+, kill criteria Day 7 já passou silenciosamente. | 3 | 5 | **15** | CEO escreve `tasks/alpha-owners.md` com 7-8 nomes reais hoje (Day 0). Se em Day 0 Mário não consegue listar 5 nomes com >70% probabilidade de aceitar, hipótese de recrutamento já está falsificada antes do build. |
| 9 | **NIF mod11 PT — bug subtil em pessoas colectivas + pessoas singulares cruzadas**: CTO risco #4 identifica mas mitigação é vaga ("implementar ambas as variações"). PerfilFiscalForm.jsx tem validação mas pode estar específica para singular. Se prestador real é empresa (sociedade unipessoal de canalizador), validação rejeita NIF válido. Owner partilha link, prestador clica, é rejeitado, owner perde confiança. | 4 | 3 | **12** | Antes de Day 4 (rota /join/:token), testar com 5 NIFs reais: 1 singular Mário, 1 singular conhecido, 1 empresa Mário (TOC), 1 sociedade unipessoal, 1 cooperativa. Se ≥1 falha sendo válido, fix imediato. |
| 10 | **Resend free tier + envio do email "owner notificado" pode não chegar (spam, deliverability)**: CFO assume "free tier não excedido" mas não menciona deliverability. Owner espera notificação que prestador completou. Email de Resend pode cair em spam (domínio app, pouco aquecido). Owner não sabe que recibo está pronto, nunca volta à app, sprint passa critério 2 mas fica zero engagement. | 3 | 4 | **12** | Backup obrigatório: Mário envia WhatsApp manual ao owner quando vê push de prestador-onboarding completo. Não automático mas seguro para alpha de 5. Domínio email transaccional aquecido em paralelo (fora de scope mas low cost). |

---

## Hidden assumptions (challenge each)

### Assumption 1: "Owners alpha confiam suficiente em Mário para partilhar nome+NIF do seu prestador habitual com uma plataforma alpha"

- **Assumption:** A relação pessoal Mário↔owner é suficientemente forte para owner expor a sua rede de prestadores habituais (que é capital social que ele protege) numa app instável.
- **O que acontece se for falso:** Owner aceita o convite (15 min), faz o flow uma vez com prestador mock ou recusa-se a entregar link a prestador real. Critério 2 falha ou cumpre-se artificialmente com Mário-as-prestador (ver risco #6). Hipótese central D-07 não-validada apesar do flow funcionar tecnicamente.
- **Como verificar antes de Day 1:** CEO faz pergunta directa em conversa preliminar a 2 owners da lista candidata: "Se eu te der uma forma de enviar recibo digital ao teu canalizador, partilhavas o link com ele ou preferias usar tu próprio o sistema?" Se a resposta dominante é "uso eu próprio", a hipótese muda — é arquivo pessoal, não viral acquisition.

### Assumption 2: "O prestador habitual de cada owner está disponível no fim-de-semana (Day 11-12 = Sáb/Dom) ou pode ser contactado pessoalmente em Day 13-14"

- **Assumption:** Calendário COO tem onboardings em Sáb/Dom (Day 10/11) e prestador real em Day 13. Assume que prestador (canalizador, electricista) responde a WhatsApp de número desconhecido (Mário) no fim-de-semana ou na 3ª-feira útil dele.
- **O que acontece se for falso:** Prestador real nunca responde. Mário só consegue prestador-mock (ele próprio noutro browser). Critério "prestador onboarded" cumpre-se mas é cosmético — não testou comportamento real.
- **Como verificar antes de Day 1:** CEO contacta 1 prestador em Day 0-1 (canalizador conhecido, sem pitch ainda — só "tens 2 min para uma pergunta?") e mede tempo de resposta. Se >24h, plano B mock-only assumido.

### Assumption 3: "5 entrevistas qualitativas dão sinal estatístico para decisão go/no-go Sprint 1E"

- **Assumption:** Charter critério 4 + COO synthesis trigger assumem que 3 entrevistas de 30 min dão sinal accionável para "continuar para 1E (escalar) ou kill (pivotar)" (COO Day 14).
- **O que acontece se for falso:** N=3 owners, todos PT, todos da rede pessoal de Mário, todos pré-validados como interessados (selection bias), dão respostas socialmente desejáveis. Mário interpreta como "validação" e investe Sprint 1E + 1F em direcção errada. Failure mode clássico Hormozi: "we listened to customers but they were our friends".
- **Como verificar antes de Day 1:** Auditor flag agora — adicionar critério qualitativo no synthesis: "≥1 entrevista deve ter NPS recomendação ≤5 ou crítica concreta não-genérica para que synthesis seja aceite como sinal." Se 3/3 são 8-10 NPS com elogios genéricos, synthesis é declarado inconclusivo e CEO precisa de owners fora-rede em Sprint 1E antes de qualquer escala.

### Assumption 4: "Stripe deferral até Sprint 1E não cria fricção retroactiva nos alpha owners convertidos"

- **Assumption:** CFO recomenda iniciar Stripe Day 10. Implícito: alpha owners aceitam testar grátis em Sprint 1D e voltam para pagar quando billing estiver activo em 1E (3-5 semanas depois).
- **O que acontece se for falso:** Owner alpha completa flow em Day 12, recebe email de "Sprint 1E está aberto, paga €6.90/mês" em Day 30+. Já esqueceu, já perdeu o entusiasmo, churn antes de pagar. Conversão alpha→pagante = 0%, número que fica gravado em retrospectivas.
- **Como verificar antes de Day 1:** CPO + CEO definir o follow-up message agora: "exactamente que mensagem o owner alpha recebe em Sprint 1E e quando." Se não há plano, conversão será 0%. Plano = email Day 14+5 ("o teu recibo continua guardado, quando quiseres adicionar mais X faz Y").

### Assumption 5: "Tabela `core.servicos_ativos` e tabela `v5_manutencao.recibos` são parte do schema actual ou criadas implicitamente"

- **Assumption:** Charter critério 2 e CPO spec referenciam estas tabelas como se existissem ou fossem trivialmente criadas. CTO architecture só cria `magic_links` e `prestadores_parceiros`. Assunção implícita: alguém algures cria as outras.
- **O que acontece se for falso:** Day 14 chega, flow funciona, mas Auditor diz "mostra-me a linha em `core.servicos_ativos` com owner_id ≠ Mário". CTO responde "essa tabela não existe". Sprint marcado FAIL mesmo com produto funcional.
- **Como verificar antes de Day 1:** CEO + CTO fazem inventário das tabelas mencionadas em qualquer dos 5 documentos. Cada tabela ou (a) já existe e é confirmada via Supabase MCP, ou (b) tem migration scheduled em Day 1-2, ou (c) é removida do success criteria. Sem zona ambígua.

---

## Gaps nos outputs dos outros agents

### Charter (00)
- **Gap C1**: Critério 2 mede `linha em core.servicos_ativos + linha em v5_manutencao.recibos`. CTO architecture não cria nem `core.servicos_ativos` nem `v5_manutencao.recibos`. Charter está a medir tabelas fantasma.
- **Gap C2**: Kill criteria Day 7 ("zero owners aceitam") não tem checkpoint formal — quem activa a paragem? COO Day 13 calendar diz "se nenhum owner aceitou: activar kill criteria Day 7 (tardio)". Day 7 já passou, sprint já queimou 7 dias. Não há ritual entre Day 7 e Day 13 para detectar isto a tempo.
- **Gap C3**: "0 incidentes P0" como critério é binário e definido por "audit log + Auditor agent review final". Mas audit log não está garantido a existir nas tabelas novas (`magic_links`, `prestadores_parceiros`) — não há trigger de auditoria mencionado em CTO architecture.

### CPO Spec (01)
- **Gap P1**: O que acontece se o owner gera o link, copia, e nunca chega a partilhar (fecha app, distrai-se)? Card fica em "Aguarda prestador" eternamente. Spec não define cleanup, prazo, ou prompt para owner reenviar.
- **Gap P2**: Flow 2 passo 1 diz "Página pública (sem auth). Mostra: nome do owner (apenas primeiro nome)". Se prestador é mau actor, recebe link reencaminhado por terceiro, vê "Amélia" + valor + tipo de serviço. É mínimo PII mas é PII. Não há análise de threat model para link partilhado em chat de grupo.
- **Gap P3**: Receipt card estados "link_gerado" / "prestador_onboard" / "recibo_emitido" mas onboarding em CTO só tem status "pendente"/"activo"/"inactivo" em `prestadores_parceiros` e nada equivalente em magic_links. Mapping CPO→CTO é ambíguo.
- **Gap P4**: "Realtime subscription na tabela v5_manutencao.recibos" (CPO Flow 3 passo 2). Tabela não existe (gap C1). Subscription falha silenciosamente.
- **Gap P5**: Botão "Partilhar recibo" usa Web Share API. iOS Safari Web Share API requer HTTPS + user gesture + tem quirks com share de URL+texto. Não há fallback definido para browsers que rejeitam.
- **Gap P6**: PrestadorOnboardingScreen pede "morada (opcional mas recomendado)". "Recomendado" como copy não é especificado — se está em texto cinzento abaixo do campo, ninguém preenche, recibos saem sem morada, validade fiscal questionável.

### CTO Architecture (02)
- **Gap T1**: Não testou rota `/join/:token` com Netlify SPA redirect — é o risco #3 dele próprio mas mitigação é "adicionar regra antes de deploy", não "testar a regra em staging branch isolado". Netlify redirects são notoriously fáceis de partir.
- **Gap T2**: Edge function `prestador-onboarding` é PÚBLICA (sem JWT). Rate limiting? CTO só menciona rate limit em `gerar-magic-link` (10 links/owner/dia). `prestador-onboarding` está exposta sem rate limit — bot scraper pode hammer com tokens random.
- **Gap T3**: Token UNIQUE constraint em `magic_links.token` mas não há análise de what happens em INSERT race condition (improvável mas presente). Token collision = 1/2^256, ok. Mas se Deno scheduler reordena inserts no mesmo ms, pode haver UNIQUE violation que retorna erro 500 ao owner.
- **Gap T4**: `expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')` — mas CTO não verifica `expires_at` na função `prestador-onboarding`. Diz "buscar token em magic_links — validar existe, não expirado, não usado" mas SQL não está escrito. Se implementação esquece o filtro, token expirado funciona.
- **Gap T5**: `prestador_id UUID REFERENCES auth.users(id)` em `magic_links` — mas prestador no fluxo descrito NÃO cria conta auth.users (registo completo é "deferido"). FK aponta sempre para NULL. Confusão de modelo: ou prestador cria user (e fluxo é mais longo), ou FK não faz sentido.
- **Gap T6**: Service role key gestão. Edge functions usam service_role para INSERT em `prestadores_parceiros`. Onde está a key armazenada? Supabase secret? Se é em código fonte, vaza para git.
- **Gap T7**: Migration sequencing. Day 1 "Schema migration: aplicar via Supabase MCP". Mas qual projeto? V1 Core Hub `hkmvszkpxjbxmnixzqbl` ou V2 Condo Hub `eozklslwfaqujaijvdnl`? CLAUDE.md regra inviolável #4: "NUNCA alterar dados em V2". CTO não especifica destino. Risco de migration aplicada em V2 por engano.

### CFO Unit Economics (03)
- **Gap F1**: LTV calculation usa `LTV = ARPU × (1 - retention^N) / churn` que está matematicamente correcta para steady-state mas assume conversion happens em Mês 1 (timeline real é Sprint 1E+). Time-to-revenue não está modelado. LTV dos alpha owners deve descontar 1-2 meses de delay.
- **Gap F2**: Churn assumption 3%/mês "conservador para SaaS <€15" não tem fonte. PT residential prosumer SaaS para imóveis tem zero benchmark público — CFO está a usar nº de SaaS B2B. Pode ser optimista por 2x. Se churn real = 6%/mês, LTV 24m cai de €167 para €98.
- **Gap F3**: Stripe Connect deferral analysis assume que processo Day 10 "1-2h de Mário". Mas KYC PT pode pedir docs adicionais (comprovativo morada da empresa, IBAN PT vinculado a NIF empresa, certidão de actividade) — pode ser 4-6h se Mário não tem tudo organizado.
- **Gap F4**: "Custo Anthropic API €1.50-€4.00 nos 14 dias" assume 3-8 sessões C-suite. Esta sessão (5 docs gerados em paralelo) já consumiu sessão equivalente. Sprint 1D vai ter retrospectiva, syntheses, possíveis pivots — pode ir para 10-15 sessões. €8-€15 mais provável.
- **Gap F5**: Não há análise de "cost per owner se Sprint 1D falhar e tivermos de repetir". Sunk cost dos 14 dias + €4 + 17-28h Mário = se sprint falha por gap C1 (tabela não existe), tudo recomeça em Sprint 1E. CFO deveria modelar custo de redo.

### COO Operations (04)
- **Gap O1**: Day 13 "contactar Prestador A" — só 1 dia para recrutar prestador real, fazer pitch, dar-lhe link, esperar onboarding. Prestadores reais não respondem em <24h tipicamente. Plano é frágil.
- **Gap O2**: Plano B se 5 owners candidatos recusarem o convite — não existe. COO assume aceitação. CTO risco #5 menciona "buffer 7-8 candidatos" mas COO playbook só lista 5 perfis.
- **Gap O3**: "Mário simula ser o prestador nesta chamada" (Day 12, passo 5) — mesma device/browser que owner. Cookies, localStorage, RLS scope podem cruzar. Ou Mário usa browser anónimo (incognito), ou device separado. Não está especificado.
- **Gap O4**: Suporte SLA P0 "2 horas qualquer hora". Se Mário está em jantar de família 21h-23h, não vê WhatsApp. SLA contratual com owners alpha não foi assinado mas se Mário falha SLA, perde-se a confiança que é o ÚNICO asset do alpha (não há produto para os reter).
- **Gap O5**: Texto da política de privacidade tem placeholder `[email de Mário]` e `[NIF Mário]`. Se este placeholder vai para produção, falha imediata RGPD compliance.
- **Gap O6**: Não está definido quem cancela onboarding/recibo se um owner alpha desistir após gerar link mas antes de prestador onboardar. Token fica "live" 7 dias no estado pendente — risco residual.
- **Gap O7**: Entrevistas sob gravação. Consentimento dito verbalmente "Posso gravar?" — não há consentimento escrito. RGPD exige forma demonstrável. Para 3 entrevistas pode passar despercebido mas é uma vulnerabilidade.

### Cross-document gaps
- **Gap X1**: Não há documento que defina a tabela `recibos` em `v5_manutencao` apesar de 4 referências em charter+CPO. Schema fantasma.
- **Gap X2**: Não há documento que defina `core.servicos_ativos`. Schema fantasma.
- **Gap X3**: Não há reconciliação de quem é "owner" vs "user" em auth — owner alpha já tem conta no V1 Core Hub? Charter assume sim, CTO assume sim (FK para `auth.users`), mas COO playbook Day 12 passo 2 diz "Mário envia magic link por WhatsApp durante a chamada" — significa que owner ainda não tem conta. Migration de criação de owner não está em lado nenhum.

---

## "Why this will fail" — devil's advocate case (top 3)

### Cenário 1: "Day 14, success criteria 2 marcado FAIL por tabela inexistente"

Mário, exausto após Day 13 de recrutar prestador real e Day 14 manhã a tentar fechar success criteria, abre o Supabase MCP em frente do Auditor agent. "Mostra-me a linha em `core.servicos_ativos`". Auditor responde: "schema `core` não existe, tabela `servicos_ativos` não existe". Mário olha para o flow funcional no telemóvel — recibo arquivado bonito, prestador onboarded, owner notificado. Mas não há linha na tabela que charter exige. Critério 2 = FAIL. 14 dias de build, €4 cash, 25h de tempo, e o sprint é tecnicamente um falhanço por gap entre charter (CEO) e architecture (CTO) que nenhum dos agents sinalizou. Mário sente humilhação fundadora — "construí a coisa certa para o critério errado, ou o critério errado para a coisa certa, e nem sei qual".

### Cenário 2: "Owner A diz sim em Day 12, faz flow, mas nunca volta — ghost"

Day 12 às 14:30, Owner A (a Amélia da persona) faz a chamada de 15 min com Mário. Tudo corre bem. Ela gera link, envia para Mário-as-prestador, vê o badge verde. Diz "que giro!". Marca entrevista para Day 17 (já fora do sprint). Day 13 Mário tenta contactar Prestador A real — canalizador da Amélia. Ele responde "ah ok mas agora estou ocupado, mando depois mensagem". Nunca manda. Day 14 chega: 1 owner com flow completo (Mário), 1 owner-mock-prestador (Mário+Amélia), 0 prestadores reais, 0 entrevistas (todas marcadas fora do sprint). Critério 2 cumpre artificialmente, critério 4 falha (0/3 entrevistas dentro do sprint), kill criteria Day 14 borderline. Mário escreve no `synthesis.md`: "tecnicamente passou, mas sinto que não validei nada". Decide ir para Sprint 1E mas com fundação de areia. Sprint 1E falha por motivo que veio do 1D: hipótese D-07 nunca foi testada com prestador real.

### Cenário 3: "Day 11 P0 RLS leak descoberto pelo Mário-owner-#1, sprint termina"

Day 11 Mário faz smoke test pessoal como owner. Cria link, abre noutro browser anónimo (a fazer de prestador), completa onboarding, volta a sessão original. No path de teste, abre URL de outro magic link de teste antigo gerado em Day 10 (um link que não usou). Surpresa: o token expirou mas a página `/join/:token` ainda mostra `nome do owner: Mário, valor: €80`. Bug: a edge function `prestador-onboarding` valida expiração no POST mas a landing page (`ReceiptLandingScreen`) faz GET para mostrar info SEM validar `expires_at`. Mário pensa "se eu vejo isto, qualquer pessoa que recebe link expirado pode ver dados". Activa CTO agent, Auditor confirma P0 (link expirado expõe owner_nome + valor + tipo_servico). Charter kill criterion #3: "P0 incident não-trivial → CTO + Auditor decidem se sprint continua ou termina aqui". Sprint termina Day 11. 11 dias de build, hipótese central nunca testada com owner real, postmortem doloroso.

---

## Recommendations to CEO (5 acções específicas)

| # | Acção | Urgência | Owner |
|---|-------|----------|-------|
| 1 | **Reconciliação de schemas Day 0**: CEO convoca CTO + CPO numa sessão de 30 min. Output: lista definitiva de tabelas que existem em Day 14 (incluindo `core.servicos_ativos`, `v5_manutencao.recibos` ou eliminação destas referências). Migration plan documentado. Sem ambiguidade. **Sem isto, success criteria do charter são não-mensuráveis.** | **Day 0 (HOJE)** | CEO + CTO + CPO |
| 2 | **REMOVE FROM SCOPE: prestador real em Sprint 1D**. Aceitar que Sprint 1D testa o owner-side com prestador mock (Mário noutro device) e diferir prestador real para Sprint 1E. Razão: prestador real em Day 13 tem probabilidade <40% de funcionar no calendário e o failure mode mascarra outros sinais. Adicionar critério Sprint 1E: "1 prestador real onboarded antes de Day 7 do 1E". | **Day 0** | CEO (decisão), COO (actualiza playbook) |
| 3 | **ADD TO CHARTER: tasks/alpha-owners.md com 7-8 nomes reais antes de Day 1**. Se CEO em Day 0 não consegue listar 5 nomes com >70% probabilidade de aceitar, sprint não começa — kill criteria pre-build accionado. Custo de descobrir isto em Day 7 (depois de 7 dias de build) >> custo de descobrir em Day 0. Esta é a verificação da Assumption 1 (recruitment pull). | **Day 0 (antes de Day 1)** | CEO exclusivamente |
| 4 | **Antecipar onboarding Owner A para Day 8-9** (vs Day 12 actual). Razão: critério 4 (≥3 entrevistas) precisa de 3-5 dias entre uso e entrevista. Para entrevista cair antes de Day 14, uso tem de ser <Day 11. Day 8-9 dá margem. Trade-off: produto em Day 8 pode ainda ter bugs P1 — aceitável para owner #1 (Amélia, alta confiança em Mário) mas não para owner #5. Onboardings escalonados Day 8, 10, 12, 13, 14. | **Day 5** (revisar plano) | COO |
| 5 | **Auditor checkpoint Day 7 obrigatório**. Adicionar ao charter: "Day 7 às 18h, CEO + Auditor agent fazem review de 30 min. Se 0 owners aceitaram convite (kill criteria Day 7), sprint pára. Se ≥1 owner aceitou, sprint continua mas com risco identificado." Sem este ritual formal, Day 7 passa silenciosamente e descobre-se Day 13 que não havia tracção. | **Day 0 (adicionar ao charter)** | CEO + Auditor |

---

## Veredicto provisório

**CONDITIONAL GO.**

O sprint tem hipótese sólida (D-07 validada noutros documentos), competitive timing válido (FIXO/Hubbent janela), custo cash desprezível (€4) e custo de oportunidade aceitável (25h Mário). A abordagem é correcta: validar demand-pull antes de Stripe.

Mas tem **3 gaps críticos** que tornam success criteria não-mensuráveis (Risk #1, #3, #4 — schemas fantasma) e **1 gap operacional** que torna critério 4 matematicamente improvável de atingir no calendário actual (Risk #2 — entrevistas).

**Condições para mover de CONDITIONAL para GO:**
1. Recommendation #1 (schemas reconciled) executada Day 0.
2. Recommendation #3 (alpha-owners.md com 5+ nomes reais) executada Day 0. Se Mário não consegue, sprint pára aqui — é a verificação mais barata possível da hipótese de recrutamento.
3. Recommendation #5 (Day 7 checkpoint formal) adicionada ao charter.

Se as 3 condições forem cumpridas em Day 0, GO confiante.
Se 1 ou mais não for cumprida, NO-GO até resolvido.

O custo de fazer estas 3 verificações em Day 0 é ~2h. O custo de NÃO fazer é descobrir Day 14 que sprint falhou por motivo evitável.

---

*Auditor agent · 2026-05-01 · Devil's advocate honesto. Sprint pode ser salvo. As ferramentas estão todas no charter — falta apertá-las antes de Day 1.*
