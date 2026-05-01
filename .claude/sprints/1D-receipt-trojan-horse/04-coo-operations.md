# Sprint 1D — COO Operations Playbook

> **Versão:** 1.0 · **Data:** 2026-05-01
> **Sprint window:** 2026-05-01 → 2026-05-15
> **Owner:** COO (Mário faz tudo — sem equipa)
> **Dependências:** Charter `00-charter.md` · CPO Spec `01-cpo-spec.md`

---

## Alpha owner recruitment

### Target profiles (5 candidatos)

Mário preenche os nomes reais numa lista off-record (papel ou nota privada no telemóvel). Os perfis abaixo são tipos, não pessoas.

| # | Perfil genérico | Porque é bom candidato alpha |
|---|---|---|
| Owner A | Mulher, 50-60 anos, Lisboa/Setúbal, 2 imóveis (própria + arrendado). Paga serviços em MB Way ou dinheiro. Diz sempre "nunca tenho os papéis quando preciso" no IRS. | Dor concreta com recibos. WhatsApp daily. Confia em Mário. |
| Owner B | Homem, 40-50 anos, área grande Lisboa, 3 imóveis arrendados. Já tentou Excel para gerir despesas mas abandonou. | Racional, vê o valor do arquivo. Willingness-to-pay confirmada em conversa. |
| Owner C | Homem, 55-65 anos, zona suburbana PT (Almada, Barreiro, Setúbal). 1 imóvel próprio, faz pequenas obras frequentes. Usa WhatsApp mas não usa apps. | Volume de serviços alto. Caso de uso simples — 1 imóvel. Sem ruído de gestão de portfólio. |
| Owner D | Mulher, 45-55 anos, Porto ou arredores. 1-2 imóveis. Conhecida de Mário há mais de 5 anos. Faz IRS pela contabilidade do Mário (TOC angle — relação de confiança máxima). | TOC angle: Mário pode ligar despesas de manutenção directamente ao IRS. Argumento concreto e imediato. |
| Owner E | Mário próprio (owner #1 obrigatório pelo charter). Usa a app no contexto real dos seus imóveis para validar o flow antes de apresentar a mais alguém. | Acesso imediato, sem fricção de onboarding, valida bugs antes de os outros verem. |

**Nota operacional:** Owner E = Mário é o primeiro a correr o flow completo. Se alguma coisa partir, parte em privado. Só depois recrutar A-D.

---

### Outreach script (WhatsApp — mensagem de Mário)

**Regra:** ≤200 chars. Soa a Mário, não a empresa. Sem emojis de empresa. Sem pitch corporativo.

**Versão curta (WhatsApp preview — 160 chars):**

> Olá [Nome]! Estou a testar uma coisa nova para guardar recibos de obras em casa. Posso pedir-te 15 min esta semana para experimentares comigo?

**Versão ligeiramente mais longa (corpo da mensagem — se o preview for clicado):**

> Estou a construir uma forma de registar os serviços da casa (canalizador, electricista, etc.) e ter tudo guardado para o IRS. Queria que fosses dos primeiros a experimentar. É uma chamada de 15 min, eu guio-te. Funciona já?

**Call-to-action específico:** resposta binária (sim/não + horário). Mário não explica o produto na mensagem — explica na chamada.

**Nota:** se o owner responder com perguntas ("o que é?", "tem custo?"), Mário responde: "Ainda é alpha, sem custo nenhum por agora. Só quero saber se faz sentido para quem tem imóveis. 15 min chega."

---

### Onboarding playbook (Mário guia pessoalmente o 1º alpha)

Checklist para chamada de 15 min. Mário tem este guião aberto no telemóvel ou num papel à frente durante a chamada.

**Antes da chamada (2 min):**
- [ ] Mário faz o flow completo ele próprio (Owner E) pelo menos uma vez antes desta chamada
- [ ] Confirmar que o link de produção está acessível: abrir `app.casa` no browser e verificar que carrega
- [ ] Ter pronto um exemplo de serviço para demonstrar: "canalizador, €80, 28 de Abril"

**Durante a chamada (15 min):**

1. **Contexto rápido (2 min):** "Estou a construir uma forma de guardar recibos de obras em casa para o IRS. Quero que vejas se funciona para ti. Não precisas de saber nada de tecnologia — só segues o que te digo."

2. **Login (2 min):** Mário envia o magic link por WhatsApp durante a chamada. Aguardar que o owner abra o email e clique. Se houver problema com o email, Mário tenta pelo browser directamente com o link de convite.

3. **Escolher o imóvel (1 min):** "Vês o selector no topo? Escolhe a tua casa." Confirmar que o imóvel activo está certo.

4. **Criar o primeiro link (5 min):** "Agora imagina que pagaste ao canalizador. Toca em 'Registar serviço'. Preenche: tipo = Canalização, valor = o que pagaste da última vez (ou um número qualquer para testar), data = hoje." Aguardar sem pressão. Observar onde hesitam — isso é dado qualitativo.

5. **Gerar e partilhar o link (3 min):** "Toca em 'Gerar link'. Vês o link? Agora copia e envia-me a mim pelo WhatsApp — só para testares o fluxo." (Mário simula ser o prestador nesta chamada.)

6. **Fechar e marcar entrevista (2 min):** "Ficou guardado. Quando o prestador preencher os dados, aparece aqui com o nome dele. Posso marcar uma conversa de 30 min contigo daqui a 5-7 dias para perceber o que achaste?" — marcar data imediatamente.

**Após a chamada (5 min Mário):**
- [ ] Registar na lista off-record: nome, data da chamada, observações de fricção observada, data da entrevista marcada
- [ ] Enviar mensagem de follow-up: "Obrigado! Se precisares de ajuda ou encontrares algum problema, manda mensagem directa."

---

## Prestador outreach (fora-app, Sprint 1D)

### Target profiles (5 candidatos prestadores)

Prestadores são recrutados por referência directa (de owners alpha ou rede de Mário) — não frio. Sprint 1D permite prestadores mockados (Mário simula o flow dele próprio), mas recrutar 1-2 reais é preferível para validação genuína.

| # | Perfil genérico | Porque é bom candidato |
|---|---|---|
| Prestador A | Canalizador local, 40-55 anos, recomendado pelo Owner A. Já trabalhou no imóvel dela. Aceita MB Way. Não tem app de gestão. | Relação existente com owner alpha. Confiança de segunda ordem (Mário via Amélia). |
| Prestador B | Electricista, zona Lisboa/Setúbal, 35-50 anos. Referenciado por Mário ou familiar directo. Usa WhatsApp profissionalmente para marcar serviços. | Habituado a receber links e PDFs pelo WhatsApp. Mais confortável com digital. |
| Prestador C | Pintor ou multi-serviços ("faz tudo em casa"), informal, sem empresa registada. Trabalha por indicação boca-a-boca. | Caso de uso onde o NIF é de pessoa singular — testa validação mod11 em cenário real. |
| Prestador D | Jardineiro ou limpeza exterior, zona suburbana. Cliente de Mário (TOC angle — Mário conhece o NIF e situação fiscal). | Mário pode confirmar NIF a priori, elimina risco de dados errados no primeiro teste real. |
| Prestador E | Mock (Mário faz o papel do prestador usando outro dispositivo ou browser). Usado obrigatoriamente no primeiro ciclo de testes antes de envolver prestadores reais. | Zero risco de dados errados. Valida o flow end-to-end sem depender de disponibilidade de terceiros. |

---

### Pitch script (WhatsApp/chamada)

**Mensagem WhatsApp (≤150 chars):**

> Olá [Nome], sou o Mário. A [Owner] deu-me o teu contacto. Tenho uma forma de enviar recibos digitais pelos serviços. Posso explicar em 5 min?

**Versão longa para chamada (3 parágrafos):**

Parágrafo 1 — contexto e credibilidade:
"Estou a construir uma plataforma para proprietários de imóveis gerirem a casa. A [Nome do owner] usa e foi ela que me deu o teu contacto. Sei que fazes serviços a vários clientes — canalizações, electricidade, o que for."

Parágrafo 2 — o que muda para o prestador:
"A ideia é simples: quando fizeres um serviço, o owner envia-te um link pelo WhatsApp. Tu abres, confirmas o valor que recebeste, e fica um registo para ambos — tu tens prova que recebeste, o cliente tem o recibo guardado. Sem papel, sem chamadas extra. Demora 2 minutos a fazer."

Parágrafo 3 — o que pedimos agora:
"Estou na fase de testes com pessoas reais. Não tens de instalar nada, não tem custo nenhum. Só precisava que experimentasses uma vez comigo. A [Owner] já fez. Se correr bem, mais clientes teus vão começar a usar o mesmo sistema."

---

### Compensação alpha

O que Mário pode oferecer ao prestador para participar no alpha. Sem pagamento monetário (seria complicado fiscalmente e não está no scope).

| Opção | O que é | Prós | Contras | Recomendação |
|---|---|---|---|---|
| A — Visibilidade futura | "Quando a plataforma estiver aberta ao público, apareces na lista de prestadores recomendados na tua área." | Valor real quando a plataforma crescer. Não tem custo. | Promessa futura — prestador pode não valorizar algo abstracto. | Segunda opção |
| B — Acesso gratuito vitalício ao tier base | "Quando houver subscrição para prestadores, ficas com acesso gratuito para sempre por teres sido dos primeiros." | Tangível e real. Cria lealdade. | Compromisso de manter esse acesso (gerir lista de alphas). | Terceira opção |
| C — Recomendação directa de Mário | "Posso recomendar-te directamente a outros owners que me peçam referências na tua área." | Valor imediato e concreto. Mário como TOC tem rede de clientes. | Compromisso de Mário (não escalável além de 3-4 prestadores). | **Recomendação principal** |
| D — Recibo digital grátis para eles próprios | "Podes usar a plataforma para emitires os teus recibos e teres um historial organizado." | Autointeresse imediato. Resolve dor real do prestador informal. | Ainda em alpha — produto pode não estar estável. | Complemento à opção C |

**Recomendação COO:** usar opção C como principal + D como complemento. Script: "Tenho clientes que me pedem referências de bons prestadores. Se o teu trabalho for bom, começo a recomendar-te. E usas a plataforma à vontade para os teus próprios registos." Simples, honesto, tangível.

---

## RGPD/legal pre-launch checklist

Estado em 2026-05-01. Mário valida cada item antes de convidar owners reais (antes de Day 3).

| # | Item | Estado | Responsável | Notas |
|---|---|---|---|---|
| 1 | Magic link expiry ≤24h configurado no Supabase | Pendente | CTO valida, COO confirma | CNPD PT: sessão temporária não pode ser permanente. Confirmar `GOTRUE_MAILER_OTP_EXP` |
| 2 | Data minimization no onboarding 3-min: só campos obrigatórios pedidos | Pendente | CPO spec confirma mínimos (nome, NIF, telefone) — CTO implementa | NIF é necessário para recibo legal. Email é opcional — não tornar obrigatório |
| 3 | Right to delete implementado (owner pode apagar a sua conta e dados) | Pendente | CTO implementa edge function ou processo manual documentado | Para alpha: processo manual aceitável se documentado. SOP necessário antes de Day 1 alpha |
| 4 | Política de privacidade mínima acessível no link público (`/r/{token}`) | Não feito | COO redige texto mínimo, CTO coloca no footer da ReceiptLandingScreen | Ver texto proposto abaixo |
| 5 | Termos de uso alpha (disclaimer simples) visível no onboarding | Não feito | COO redige, CPO coloca no Step 3 do PrestadorOnboardingScreen | Ver texto proposto abaixo |
| 6 | Consentimento explícito do prestador para guardar dados (checkbox Step 3) | Especificado no CPO spec | CTO implementa, COO verifica que texto do checkbox é claro | Checkbox: "Aceito que os meus dados (nome, NIF, telefone) sejam guardados para emissão do recibo." — não pode ser pre-checked |
| 7 | Consentimento do owner recolhido no momento de registo (magic link) | Depende de implementação existente | COO verifica se Supabase Auth já pede consentimento ou se é necessário adicionar | Se não existir: adicionar checkbox no primeiro login |
| 8 | Dados de prestadores não visíveis a outros owners (RLS isolamento) | Crítico — P0 | Auditor agent valida, CTO confirma antes de deploy em prod | CNPD PT: cruzamento de dados entre titulares é violação grave |
| 9 | NIF do prestador não exposto em URL, logs, ou client-side | Crítico | CTO confirma que token na URL não contém PII | Token deve ser opaco (UUID v4), não derivado de NIF |
| 10 | Resend (email transaccional) — DPA em vigor com cláusulas EU? | Sim (charter confirma, não renegociar neste sprint) | Manter como está — COO confirma que DPA existente cobre dados de email de prestadores | Se não cobrir: usar notificação só in-app neste sprint, diferir email de prestadores |
| 11 | Prazo de retenção de dados definido e documentado | Não feito | COO define prazo mínimo razoável (ver abaixo) | Para alpha: 24 meses é defensável para fins fiscais (IRS) |
| 12 | Nenhuma transferência de dados fora da EU (Supabase região eu-west-3 Paris) | Sim | Manter configuração existente — COO confirma região antes de Day 1 | Confirmar via Supabase Dashboard > Settings > Infrastructure |

**Prazo de retenção (item 11):** recibos de manutenção têm relevância fiscal para IRS em Portugal (Artigo 74 CIRS — despesas de conservação de imóveis arrendados). Retenção mínima defensável: **5 anos** (alinhado com prazo de caducidade da AT). Documentar na política de privacidade.

**Texto da política de privacidade mínima (para colocar no footer de ReceiptLandingScreen):**

> "Os seus dados (nome, NIF, telefone) são recolhidos exclusivamente para emissão de recibo de serviço e guardados por um período máximo de 5 anos. Pode solicitar a eliminação dos seus dados em qualquer momento através de [email de Mário]. Responsável pelo tratamento: Mário Carvalho, NIF [NIF Mário], Portugal."

**Texto dos termos de uso alpha (Step 3 do onboarding):**

> "Esta plataforma está em fase de testes (alpha). Ao confirmar, aceita que os seus dados sejam utilizados para emissão do recibo acima descrito. Versão alpha — podem existir imperfeições. Sem custo para o prestador."

---

## Support strategy (alpha)

### Canal de suporte

**Decisão: número pessoal de Mário, WhatsApp directo.** Não criar número separado. Em alpha de 5 owners, overhead de um canal separado é zero e a intimidade do número pessoal aumenta a taxa de reporte de bugs (os owners não hesitam em mandar mensagem se for o Mário mesmo).

Quando o volume superar 10 owners activos, reavaliar (1E ou 1F): criar grupo WhatsApp "Testers Casa" ou usar Telegram com bot.

### SLA response time (alpha)

| Severidade | Definição | SLA Mário | Como responder |
|---|---|---|---|
| P0 — Crítico | Data loss, RLS leak (owner vê dados de outro owner), NIF errado num recibo, login impossível para todos os users | 2 horas (qualquer hora, incluindo fim de semana) | Resposta imediata por WhatsApp + isolar problema + activar CTO agent + postmortem |
| P1 — Alto | Flow bloqueado (não consegue gerar link, prestador não consegue completar onboarding), email não chega | 4 horas em horário laboral | WhatsApp de confirmação + workaround se existir + CTO agent |
| P2 — Médio | UX confusa, texto errado, botão que não funciona mas tem alternativa, badge a mostrar estado errado | 24 horas | WhatsApp de confirmação + bug registado + fix na próxima sessão de dev |
| P3 — Baixo | Sugestão de melhoria, preferência estética, pergunta de "como funciona?" | 48 horas ou na próxima entrevista | Registar como dado qualitativo + agradecer |

### Template de resposta a bug reports (WhatsApp)

**Recepção imediata (enviar dentro de minutos):**
> "Obrigado [Nome]! Recebi. Vou ver o que aconteceu. Entretanto, podes tentar [workaround se existir / "entrar de novo" como fallback genérico]? Dou-te novidades ainda hoje."

**Resolução confirmada:**
> "Já corrigi [o problema]. Podes tentar de novo? Se continuar a dar erro, diz-me."

**Problema não replicável (Mário não consegue reproduzir):**
> "Não consigo reproduzir aqui. Podes fazer um screenshot ou gravação de ecrã e enviar-me? Ajuda muito a perceber o que aconteceu."

### O que constitui P0 durante alpha

Um P0 justifica parar tudo o que Mário está a fazer e activar o CTO agent imediatamente, mesmo às 23h:

1. **RLS leak confirmado:** qualquer owner consegue ver dados (nome, NIF, recibos) de outro owner na app.
2. **Auth bypass:** acesso a dados de owner sem magic link válido.
3. **NIF errado num recibo já emitido:** recibo com NIF de terceiro que não o prestador real — implicação fiscal e RGPD simultâneas.
4. **Data loss:** recibos desaparecidos do `v5_manutencao.recibos` sem acção do owner.
5. **ReceiptLandingScreen expõe dados sem autenticação além do necessário:** ex., link de token expirado que ainda mostra dados do owner.

**Protocolo P0:**
1. Mário responde ao owner afectado: "Vou resolver agora. Não uses a app por enquanto."
2. Mário activa CTO agent com contexto completo.
3. CTO agent investiga e propõe fix.
4. Auditor agent valida fix antes de deploy.
5. Mário confirma resolução ao owner.
6. Postmortem dentro de 24h (5 Whys + timeline + prevenção).
7. P0 activo = critério de kill do sprint (ver charter).

---

## Feedback capture protocol

### Interview script (30 min)

**Configuração:** chamada de vídeo ou voz (não presencial — mais fácil de gravar com consentimento). Mário conduz. Pedir autorização para gravar no início: "Posso gravar esta conversa para não ter de tomar notas? Fica só comigo, não partilho."

**Abertura (2 min):**
"Obrigado por teres participado. Vou fazer-te umas perguntas sobre a experiência. Não há respostas certas ou erradas — o que me interessa é perceber o que funcionou e o que não funcionou para ti."

**Bloco 1 — Comportamento antes (contexto real) (8 min):**

1. "Quando tens um serviço feito em casa — canalizador, electricista, o que for — o que fazes normalmente com o recibo? Tens algum sistema?"
2. "Já alguma vez perdeste dinheiro ou tiveste problema por não ter um recibo de um serviço de casa? Conta-me o que aconteceu."
3. "Na altura do IRS, como tratas as despesas de manutenção dos teus imóveis? Consegues deduzir alguma coisa?"

**Bloco 2 — Experiência com a app (observação) (10 min):**

4. "Quando abriste a app pela primeira vez, o que esperavas encontrar? E o que encontraste?"
5. "Quando chegaste ao momento de gerar o link para o prestador, o que passou pela tua cabeça? Hesitaste em alguma coisa?"
6. "Imagina que fizeste um serviço real agora mesmo e querias registar. Consegues fazer isso sozinho, sem eu estar aqui?"

**Bloco 3 — Avaliação (0-10 + porquê) (5 min):**

7. "De 0 a 10, qual a probabilidade de usares isto da próxima vez que tiveres um serviço em casa? Porquê esse número e não mais alto?"
8. "De 0 a 10, recomendarias a um amigo teu que tem imóveis? O que dirias a esse amigo em 1 frase?"

**Bloco 4 — Pricing e willingness-to-pay (5 min):**

9. "Se isto custasse €6.90 por mês, com recibos ilimitados e histórico de todos os teus prestadores — faria sentido para ti?"
10. "O que teria de estar na app para valeres €12.90 por mês? O que falta agora?"

**Encerramento (2 min):**
"Mais alguma coisa que queiras dizer sobre a experiência? Alguma coisa que eu não te perguntei e que aches importante?"

---

### Storage

Gravar cada entrevista num ficheiro próprio imediatamente após a chamada:

```
.claude/sprints/1D-receipt-trojan-horse/feedback/YYYY-MM-DD-<owner-initials>.md
```

Exemplo: `2026-05-08-af.md` (Amélia Ferreira, 8 de Maio).

**Estrutura de cada ficheiro de entrevista:**

```markdown
# Entrevista alpha — [Iniciais] — [Data]

**Owner:** [Iniciais apenas — sem nome completo em ficheiros de texto]
**Data:** YYYY-MM-DD
**Duração:** XX min
**Canal:** WhatsApp call / Zoom / Presencial
**Gravação:** Sim (consentimento dado) / Não (notas manuais)

## Comportamento antes (Bloco 1)
[Notas livres por pergunta]

## Experiência com a app (Bloco 2)
[Notas livres + momentos de hesitação observados]

## Avaliação (Bloco 3)
- NPS uso próprio: X/10 — "[razão dada]"
- NPS recomendação: X/10 — "[frase que diria ao amigo]"

## Pricing (Bloco 4)
- €6.90/mês: Sim / Não / Talvez — "[condição]"
- Para €12.90: "[o que precisaria]"

## Observações livres
[Qualquer coisa fora do script que seja relevante]

## Acções identificadas
- [ ] [Bug ou fricção a corrigir]
- [ ] [Feature request a avaliar]
```

**Nota RGPD:** não guardar nome completo, número de telefone, NIF, morada ou qualquer PII nestes ficheiros — só iniciais. Os dados reais ficam off-record com Mário.

---

### Synthesis trigger

Quando Mário tiver 3 ou mais entrevistas feitas (ficheiros em `feedback/`), criar:

```
.claude/sprints/1D-receipt-trojan-horse/feedback/synthesis.md
```

**Estrutura do synthesis.md:**

```markdown
# Synthesis — Sprint 1D Alpha Feedback

**Data:** YYYY-MM-DD
**Entrevistas incluídas:** [iniciais], [iniciais], [iniciais]

## Padrões (aparecem em ≥2 entrevistas)
[Lista de comportamentos ou opiniões recorrentes]

## Surpresas (não esperávamos isto)
[O que contradiz hipóteses iniciais]

## Fricções top 3 (por frequência)
1. [Fricção + impacto estimado]
2.
3.

## Sinais de willingness-to-pay
- €6.90: X/3 disseram sim
- €12.90: X/3 disseram sim / condições [...]

## NPS médio
- Uso próprio: X.X/10
- Recomendação: X.X/10

## Acções recomendadas para Sprint 1E
- [ ] [Fix ou melhoria prioritária]
- [ ] [Feature a avaliar]
- [ ] [Hipótese a retescar]
```

---

## Day-by-day ops calendar (Days 10-14)

**Contexto CTO:** por Day 10-11, o produto deve estar em produção (flow end-to-end funcional: owner cria link, prestador faz onboarding, recibo aparece em Casa screen). O CTO agent terá completado as edge functions `generate-receipt-link` e `confirm-receipt`, as screens novas (ReceiptLandingScreen, PrestadorOnboardingScreen, ReceiptConfirmadoScreen) e o merge Casa+Início. Os Days 10-14 são 100% operações de Mário — o código está feito.

| Dia | Data | Acção COO | Deliverable |
|-----|------|-----------|-------------|
| Day 10 | 2026-05-10 (Sab) | Mário faz o flow completo como Owner E (ele próprio). Testa: criar link, abrir link em browser anónimo, simular prestador, confirmar recibo, ver em Casa screen. Regista todos os problemas encontrados. | Lista de bugs/fricções em `feedback/2026-05-10-mc.md` (Mário como owner #1). |
| Day 11 | 2026-05-11 (Dom) | Se Day 10 não tiver P0s: contactar Owner A (o mais próximo de Mário). Marcar onboarding para Day 12 manhã. Rever RGPD checklist — confirmar itens 1, 4, 5, 6 feitos antes de Owner A entrar. | Confirmação de onboarding Owner A agendado. RGPD checklist validada. |
| Day 12 | 2026-05-12 (Seg) | Onboarding Owner A (chamada 15 min — guião acima). Onboarding Owner B se A correu bem. Registar observações de fricção em tempo real durante as chamadas. | 2 owners com flow iniciado. Notas em `feedback/2026-05-12-[iniciais].md`. |
| Day 13 | 2026-05-13 (Ter) | Onboarding Owners C e D. Seguir o mesmo guião. À tarde: contactar Prestador A (o canalizador recomendado pelo Owner A) — pitch de 5 min, recrutar para completar o onboarding de um recibo real. | 4 owners activos. 1 prestador real recrutado (se conseguir). |
| Day 14 | 2026-05-15 (Qui) — hard deadline | Verificar success criteria do charter: contar owners com flow completo, confirmar linha em `core.servicos_ativos`, confirmar 0 P0s. Se ≥1 owner completou: sprint passou no critério 2. Contar entrevistas feitas (critério 4: ≥3). Escrever `feedback/synthesis.md` se ≥3 entrevistas. Preparar brief para CEO decision: continuar para 1E (escalar) ou kill (pivotar). | Documento de decisão CEO em `tasks/sprint-1D-outcome.md` com: success criteria estado, aprendizagens top 3, recomendação go/no-go 1E. |

**Nota sobre entrevistas qualitativas:** as entrevistas (30 min) devem acontecer 3-5 dias após o onboarding — não no mesmo dia. Se onboardings são Day 12-13, entrevistas naturais serão Day 14-15 (mas Day 15 está fora do sprint). Mário pode fazer 1-2 entrevistas em Day 13 à noite se o owner estiver disponível, ou marcar para Day 14. O critério 4 do charter exige ≥3 entrevistas — é o item mais em risco no calendário. Recrutar owners A e B primeiro precisamente para ter mais margem de entrevista.

**Kill criteria watch:**
- Day 10 — se o próprio flow de Mário (Owner E) tiver P0 bloqueante: parar, chamar CTO agent, não avançar para owners reais até resolvido.
- Day 13 — se nenhum owner aceitou o convite (além de Mário): activar kill criteria Day 7 (tardio mas aplicável). Rever pitch antes de continuar.
- Day 14 — avaliação final de success criteria e decisão go/no-go para Sprint 1E.

---

*Playbook COO Sprint 1D — versão 1.0 — 2026-05-01*
*Próxima revisão: Day 10 (2026-05-10) com base em feedback de produção.*
