# apps/v2-condomino-mobile — DIST-ONLY

**Status:** DIST-ONLY (source code missing)
**Documented:** 2026-05-23 (Story 019.5)

## O que existe aqui

- `dist/` — build estático servido em produção
- `.env.local` — configuração local
- `node_modules/` — dependencies instaladas

## O que NÃO existe

- `src/` — source code do React
- `package.json` — manifest da app
- `vite.config.js`, `index.html`, etc.

## Porquê

Source code nunca foi commitado a git. `git log -- apps/v2-condomino-mobile/` retorna vazio. Confirmado em 2026-05-23 que:

- Nenhum dos worktrees activos (`proptech-v5-1b3`, `proptech-v4-scaffold`, `proptech-docs`)
- Nenhum dos backups (`proptech-archive-2026-05-02`, `proptech-discovery-bf`, `v2-condominios-prata`)
- `.antigravity/` local

...contém o source.

## NÃO REMOVER

`dist/` está a ser servido em produção. Remover quebra o portal mobile do condómino.

## Carry-forward (Mário decide)

Ver `docs/cleanup/v2-condomino-mobile-status-2026-05-23.md` para opções:
- (a) recuperar de backup externo (OneDrive, Antigravity remoto)
- (b) reescrever source do zero a partir do `dist/` (engenharia inversa)
- (c) marcar como deprecated permanente e migrar para outra solução

Story 019.5 não resolve este debt (FE-007) — apenas o documenta.
