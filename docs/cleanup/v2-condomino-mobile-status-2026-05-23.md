# v2-condomino-mobile — Status & Carry-Forward

**Data:** 2026-05-23
**Story:** 019.5
**Debt:** FE-007 (Medium)

## Resumo

`apps/v2-condomino-mobile/` existe no filesystem mas **não tem source code**. Apenas `dist/` (built) + `.env.local` + `node_modules/`. Foi confirmado que o source nunca esteve em git e não está presente em nenhum worktree ou backup local conhecido.

## Estado actual

```
apps/v2-condomino-mobile/
├── .env.local              (tracked? não — gitignored)
├── dist/
│   ├── index.html
│   └── assets/
│       ├── index-B_iO69uY.css
│       └── index-CSNQrCwX.js
└── node_modules/           (gitignored)
```

`git log -- apps/v2-condomino-mobile/` retorna **0 commits**. Source nunca foi versionado.

## Worktrees verificados (2026-05-23)

| Worktree | Tem `src/`? |
|----------|-------------|
| `proptech-platform` (canonical) | NÃO |
| `proptech-v5-1b3` | NÃO (directório nem existe) |
| `proptech-v4-scaffold` | NÃO (directório nem existe) |
| `proptech-docs` | NÃO (directório nem existe) |
| `proptech-archive-2026-05-02` | NÃO (directório nem existe) |
| `proptech-discovery-bf` | NÃO (directório nem existe) |
| `v2-condominios-prata` | NÃO (directório nem existe) |

## Produção

`dist/` parece estar a ser servido (provavelmente via Netlify ou route do Vite em dev port 5182, conforme contexto da story 019.5). Confirmar com Mário se algum cliente acede ao portal mobile do condómino actualmente.

**Implicação:** remover o directório quebra produção. NÃO REMOVER.

## Opções de remediação (Mário decide)

### Opção A — Recuperar source de backup externo

- Verificar OneDrive backup
- Verificar Antigravity sync remoto (`.antigravity/`)
- Verificar disco de backup, Time Machine equivalente, etc.
- Verificar se algum colaborador ou ferramenta de IA passada (ex: Cursor/Windsurf) tinha cache

**Risco:** Source pode não existir em lado nenhum.
**Esforço:** Baixo se encontrar, alto se não.

### Opção B — Engenharia inversa do dist

`dist/assets/index-CSNQrCwX.js` é minified. Possível tentar:
- Source maps (`*.map`) — não presentes
- React DevTools profile + manual reconstruction
- LLM reconstruction a partir do JS minificado

**Risco:** Resultado pode não bater bit-a-bit; bugs subtis.
**Esforço:** Alto (1-2 semanas dev sénior).

### Opção C — Reescrever do zero

Partir do dist como referência visual + comportamental e reescrever:
- Vite + React 18 (igual a `apps/v2-condominios/`)
- Reutilizar `packages/ui` (futuro 019.6) quando existir
- Componentes mobile-first (Tailwind responsive)
- Auth via Supabase token (mesma stack que portal staff)

**Risco:** Funcionalidades não documentadas podem ser perdidas se não houver pessoa a validar.
**Esforço:** Médio-alto (2-3 semanas dev sénior).

### Opção D — Deprecate permanente

- Substituir por redirect/landing dizendo "Portal mobile temporariamente indisponível"
- Mover funcionalidade crítica para portal staff (`apps/v2-condominios/`)
- Documentar decisão em ADR

**Risco:** Cliente final perde acesso mobile.
**Esforço:** Baixo (1 dia).

## Recomendação técnica

**Opção D + Opção A em paralelo**:
1. **Hoje** — Confirmar com Mário se há clientes activos a usar o portal mobile (analytics, logs Supabase).
2. **Se SIM** — Tentar Opção A primeiro (1-2 dias). Se falhar → Opção C.
3. **Se NÃO** — Opção D (deprecate) e migrar funcionalidade essencial para portal staff.

## Carry-forward

- [ ] Mário confirma uso real do portal mobile do condómino em produção
- [ ] Decidir Opção A/B/C/D
- [ ] Se Opção A — verificar OneDrive, Antigravity, backups
- [ ] Se Opção C/D — abrir story própria com effort estimado
- [ ] Adicionar ADR com decisão final em `.claude/strategy/adrs/`
