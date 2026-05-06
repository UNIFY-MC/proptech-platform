# DIAGNÓSTICO · employees vazios após Cook.ai v2 commit
**Data:** 2026-05-06  
**Branch:** feat/command-center  
**Commit afectado:** `867e940`

---

## 1. Estado de data.json

| Campo | Valor |
|---|---|
| Ficheiro | `apps/dashboard/public/data.json` |
| Tamanho | 50 920 bytes (~50 KB) |
| Schema version | 3.0 |
| Chave `employees` presente? | **NÃO** |
| `"id":` entries | 83 (são de agents, decisions, roadmap, competitors…) |
| Chave `employees` no commit anterior (`aca1418`) | **SIM** — 16 employees |

Secções que **existem** em data.json actual:
`meta, sprint, verticals, alerts, nextActions, techStack, stackHealth, watchers, agents, recentActivity, decisions, roadmap, competitors, ourProduct, featureMatrix`

Secção **ausente**: `employees`

---

## 2. Hook que carrega employees

`apps/dashboard/src/hooks/useData.js` — fetch polling de `/data.json` a cada 60s.  
Nenhuma transformação: devolve o JSON tal-qual como `data`.

```js
// useData.js:15-17
const res = await fetch('/data.json?t=' + Date.now())
const json = await res.json()
setData(json)
```

**EmployeesPage** acede a `data?.employees || []` (linha 78).  
Quando `employees` não existe no JSON → array vazio → linha 95-97:

```jsx
if (employees.length === 0) {
  return <div className="empty">Sem dados de employees</div>
}
```

**Sidebar** acede a `data?.employees || []` (linha 46 de Sidebar.jsx) para o bloco TASKS·CHATS → array vazio → secção não renderiza.

---

## 3. Filtro "Todas as verticais" — não é causa do problema

O select na Sidebar passa `value="all"` ao `useVerticalStore`. Os hooks Supabase (`useInboxItems`, `useApprovals`) recebem esse valor — mas employees vêm de `data.employees` (data.json), não do Zustand store. O filtro de vertical não afecta a renderização de employees.

**Conclusão:** filtro não é causa. Problema é ausência total de `employees` no JSON.

---

## 4. TASKS·CHATS section

Mesmo hook que `/employees` — lê `data?.employees` directamente de `data.json` via `useData`. Array vazio → `employees.length > 0` falso → bloco não renderiza.

---

## 5. Build script

`scripts/dashboard-data-build.js` — **não tem qualquer código para employees**.

Grep confirmado: 0 referências a `employee`, `employees`, `.claude/employees`, `meta.json`.

O script lê:
- `.claude/current/current-sprint-state.md` → sprint
- `.claude/strategy/verticals-state.md` → verticals
- `.claude/agents/*.md` → agents (lê pasta `.claude/agents/`)
- outros ficheiros de estado para decisions, roadmap, etc.

**Não lê** `.claude/employees/*.meta.json`.

Output do último run confirmou:
```
[✓] Agents  live  n=30
```
(sem linha de Employees)

---

## 6. Como os employees existiam antes

Commit `aca1418` ("feat(command-center): bring 16 employees + Equipa tab from sprint/v5-1b3"):
- Adicionou 16 ficheiros `.claude/employees/*.meta.json`
- Escreveu **manualmente** a secção `employees` em `data.json` (2407 linhas no diff)
- O script nunca foi actualizado para gerar esta secção

---

## HIPÓTESE ÚNICA

> O commit `867e940` (Cook.ai parity v2) correu `node scripts/dashboard-data-build.js` para aplicar as correções de vertical (Sofia/Enzo/Marco). O script regenerou data.json **sem a secção employees**, porque nunca teve código para a ler. A secção employees que existia em `aca1418` foi sobrescrita.

**Causa raiz:** `dashboard-data-build.js` desconhece `.claude/employees/*.meta.json`.  
**Não é corrupção** — é lacuna de cobertura no script de build.

---

## FIX PROPOSTO (não executar sem OK)

Adicionar ao `scripts/dashboard-data-build.js` uma função `parseEmployees()` que:

1. Lê todos os ficheiros `.claude/employees/*.meta.json`  
2. Para cada um, lê o `.claude/employees/<id>.md` correspondente (se existir) como `_mdRaw`  
3. Devolve array ordenado por `department` + `name`  
4. Inclui o campo `secondary_verticals` já presente nos meta.json de Marco/Enzo/Sofia

Resultado esperado: regenerar data.json passa a incluir `employees: [16 items]` com os dados actualizados (incluindo os fixes de vertical do T7 já aplicados nos meta.json).

**Alternativa mais rápida (sem tocar no script):** restaurar employees do `aca1418` + aplicar patch dos 3 meta.json actualizados. Mas cria dependência manual: qualquer novo `npm run build` voltaria a apagar employees.

**Recomendação:** fix no script (permanente) → nunca mais se perde.
