# Watchers State

> Source canónica para `data.json → watchers[]`
> Parser: `scripts/dashboard-data-build.js`
> Actualizado pelos próprios watchers após cada execução.
> Última actualização manual: 2026-05-03

---

## Estrutura de parsing

O script Node parsa cada bloco `## <id>` como um watcher.
Campos `key: value` são extraídos como propriedades.
O campo `output` é a linha imediatamente após `### Último output`.
O bloco completo entre `### Último output` e o próximo `##` é o `outputFull`.

---

## competitor-monitor

cadence: Seg 9h
last:
next: 2026-05-04T09:00Z
status: never
link:

### Último output

Aguarda primeira execução completa.

### Output completo

Watcher configurado em Sprint B Lite (2026-05-01). Monitoriza: Hubbent, FIXO, Fixando, Jobber, AppFolio, Shipshape, OSCAR.

Cadência: todas as segundas-feiras às 9h UTC.
Workflow: `.github/workflows/competitor-monitor.yml`

Primeira execução programada para 2026-05-04T09:00Z.

---

## daily-brief

cadence: diário 8h
last:
next: 2026-05-04T08:00Z
status: never
link:

### Último output

Aguarda primeira execução completa.

### Output completo

Watcher configurado em Sprint B Lite (2026-05-01). Gera briefing diário com: estado do sprint actual, gates pendentes, alertas activos, próximas acções P0/P1.

Cadência: todos os dias às 8h UTC.
Workflow: `.github/workflows/daily-brief.yml`

Primeira execução programada para 2026-05-04T08:00Z.

---

## weekly-recap

cadence: Sex 17h
last:
next: 2026-05-09T17:00Z
status: never
link:

### Último output

Aguarda primeira execução completa.

### Output completo

Watcher configurado em Sprint B Lite (2026-05-01). Gera recap semanal com: progressos da semana, gates atingidos/falhados, decisões tomadas, oportunidades registadas, próxima semana.

Cadência: todas as sextas-feiras às 17h UTC.
Workflow: `.github/workflows/weekly-recap.yml`

Primeira execução programada para 2026-05-09T17:00Z.

---

## healthcheck

cadence: diário 6h30
last:
next: 2026-05-04T06:30Z
status: never
link:

### Último output

Aguarda primeira execução completa.

### Output completo

Watcher configurado em Sprint B Lite (2026-05-01). Verifica: V5 alpha Vercel (HTTP 200), V2 prataowners.pt (HTTP 200), Supabase V1 Edge Functions (gerar-magic-link ACTIVE), GitHub Actions (workflows activos).

Cadência: todos os dias às 6h30 UTC.
Workflow: `.github/workflows/healthcheck.yml`

Primeira execução programada para 2026-05-04T06:30Z.
