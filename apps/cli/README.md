# Property007 CLI

TUI Ink-based para gerir Property007 sem sair do terminal.

## Setup

```bash
cd apps/cli
pnpm install
pnpm build
pnpm link --global  # ou: npm link
```

## Primeira utilização

```bash
property007 login
# 1. Cola Supabase URL (default: V1 Core Hub)
# 2. Cola anon key (Supabase dashboard → Settings → API)
# Grava ~/.property007/config.json
```

## Comandos

| Comando | O que faz |
|---|---|
| `property007` | TUI completa com tabs Tasks/Recipes/Inbox/Chat |
| `property007 tasks` | Abre tab Tasks directamente |
| `property007 recipes` | Lista recipes activas |
| `property007 inbox` | Items inbox activos |
| `property007 chat [agent]` | Chat directo com agent (default: auto) |
| `property007 run <slug>` | (TODO) Executar recipe |

## Navegação TUI

- `T` / `R` / `I` / `C` — mudar tab
- `↑` `↓` — navegar tasks
- `Space` — Run task seleccionada
- `R` — Reload lista
- `Q` ou `Esc` — sair

## Env vars override

Sem precisar de `~/.property007/config.json`:

```bash
PROPERTY007_SUPABASE_URL=https://xxx.supabase.co \
PROPERTY007_ANON_KEY=eyJ... \
property007
```

## Stack

- TypeScript + React 18
- Ink 5 (React-for-CLI)
- Supabase JS 2
- Commander 12
