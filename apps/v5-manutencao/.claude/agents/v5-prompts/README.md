# V5 Agent System Prompts

System prompts dos agents V5 versionados em git.

## Pattern

Os prompts vivem aqui em Markdown. A BD (`core.agent_policies`) guarda
o `model` e `enabled`, mas **não** o prompt — esse vem do código da Edge Function.

Cada Edge Function lê o seu prompt de uma constante `SYSTEM_PROMPT` em `index.ts`.
Este directório é a referência canónica para revisão, histórico e diff entre versões.

## Ficheiros

| Ficheiro | Agent | Edge Function | Estado |
|---|---|---|---|
| `image_inspector.md` | `v5.image_inspector` | `agent-image-inspector` | ✅ Activo (1B.2.2) |
| `casa_advisor.md` | `v5.casa_advisor` | `agent-casa-advisor` | TODO Sprint 1B.3 |

## Como actualizar um prompt

1. Edita o `.md` aqui
2. Copia o conteúdo para a constante `SYSTEM_PROMPT` na Edge Function correspondente
3. Redeploy: `npx supabase functions deploy <fn> --project-ref hkmvszkpxjbxmnixzqbl`
4. Commit ambos os ficheiros no mesmo commit

Nunca actualizar apenas um dos dois — ficam dessincronizados.
