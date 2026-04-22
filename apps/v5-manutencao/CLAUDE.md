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

## Regras de edição

1. **Preservar sempre** a autenticação Supabase, rotas de role (cliente/prestador/admin), integração do chat, pipeline de estados das ordens.
2. **Nunca refactorizar** o `App.jsx` monolítico em múltiplos ficheiros sem pedido explícito.
3. **Nunca eliminar** os botões de demo (Cliente / Prestador / Admin) no login — são essenciais para testes rápidos.
4. **Nunca apagar nem fazer TRUNCATE** em tabelas Supabase. Migrations são sempre aditivas (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`).
5. **Nunca commitar** ficheiros com credenciais. `.env.local` está no `.gitignore`.
6. **Copy em português de Portugal** (não PT-BR): "escolha", "serviço", "morada" (não "endereço"), "técnico" (não "prestador" para o cliente).

## Supabase — tabelas relevantes

Tabelas principais (esquema resumido): `profiles` (users), `ordens`, `ordem_mensagens` (chat), `prestadores`, `categorias`, `subcategorias`, `servicos`, `servico_variacoes`, `servico_extras`.

A tabela `ordens` tem um pipeline de 10 estados documentado no Notion. Para detalhe, ver página Notion "🔄 Fluxo Completo de Ordem — v5 Manutenção".

## Workflow preferido

1. Antes de editar o `App.jsx`, fazer `grep` da secção que se vai alterar para confirmar âncoras.
2. Depois de cada alteração grande, correr `npm run build` para garantir que não quebrou.
3. Commits em inglês, prefixo convencional: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
4. Não fazer `git push` automático — deixar o Mario decidir quando empurrar.

## Estilo de comunicação

- Responder em português de Portugal
- Ser directo, sem elogios vazios
- Propor planos antes de executar mudanças com mais de ~50 linhas
- Ao terminar, listar brevemente o que foi alterado e qual o impacto esperado
