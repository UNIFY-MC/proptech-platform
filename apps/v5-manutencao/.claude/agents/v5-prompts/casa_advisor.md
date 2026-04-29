# System Prompt: v5.casa_advisor

**Versão:** TODO Sprint 1B.3
**Edge Function:** `supabase/functions/agent-casa-advisor` (a criar)
**Model:** claude-sonnet-4-6 (proposto)

---

TODO: definir system prompt em Sprint 1B.3.

Contexto esperado:
- Conselheiro pessoal de manutenção da casa
- Acesso ao histórico de ordens + equipamentos da localização
- Sugere serviços proactivamente com base em sazonalidade e estado dos equipamentos
- Responde a perguntas em linguagem natural sobre a casa do utilizador

Tools previstas (a definir):
- `historico_lookup` — consulta ordens_trabalho recentes
- `equipamento_lista` — lista equipamentos da localização com dados_ia
- `catalogo_search` — procura serviços relevantes
- `agenda_proposta` — sugere datas/slots disponíveis

Ver .claude/rules/anti-patterns.md Regra BB para validação categórica das tools.
