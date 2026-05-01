# R1 Decision — Schema para registo de serviço confirmado

**Decisão:** Opção B
**Data:** 2026-05-01
**Owner:** CTO

## Justificação

V5 Manutenção corre no MESMO projecto Supabase que `core` (V1 Core Hub `hkmvszkpxjbxmnixzqbl`). Criar `core.servicos_ativos` em V1 com schema diferente do V2 introduz dívida técnica: futura consolidação de dados V2→V1 colidirá em nome com semântica diferente (subscrição financeira recorrente vs. one-shot job). `v5_manutencao` já existe (39 tabelas) e é o schema vertical correcto para "recibo de serviço executado" — conceito naturalmente de manutenção, não horizontal. CPO spec já referenciava `v5_manutencao.recibos`; renomeio para `recibos_servico` evita também colisão futura com uma tabela genérica `recibos` (factura emitida pela plataforma a um owner subscritor) que provavelmente nascerá em Fase 5.

## Impacto no charter

Charter `00-charter.md` linha 18 e 27 mede actualmente `v5_manutencao.recibos`. Final plan `06-final-plan.md` Decisão 1 prescreveu `core.servicos_ativos` + eliminação de `v5_manutencao.recibos`. Esta R1 substitui ambos por `v5_manutencao.recibos_servico`.

**Success criterion 2 (charter) reescrito:** "≥1 owner completa o fluxo end-to-end — gera link, entrega ao prestador (mock ou real), recibo aparece arquivado em Casa screen. Sim/Não medido por linha em `v5_manutencao.recibos_servico` com `owner_pessoa_id ≠ Mário` (`mariocarvalho.biz+v5test`) E `magic_links.used_at IS NOT NULL`."

Final plan `06-final-plan.md` Decisão 1 e linhas 79, 84, 91, 104, 188, 195, 240, 265, 282 ficam desactualizadas — referências a `core.servicos_ativos` devem ler `v5_manutencao.recibos_servico` daqui em diante. CEO deve assinalar este desvio quando ler este ficheiro Day 0.

## Tabela criada

`v5_manutencao.recibos_servico` em V1 Core Hub (`hkmvszkpxjbxmnixzqbl`).

Colunas-chave: `owner_pessoa_id`, `prestador_id` (FK `prestadores_parceiros`, não `auth.users`), `localizacao_id` (FK `v5_manutencao.localizacoes`), `tipo_servico`, `valor_eur`, `data_servico`, `magic_link_id` (FK `magic_links`), `notas`, `status` (`recibo_emitido`), `created_at`.
