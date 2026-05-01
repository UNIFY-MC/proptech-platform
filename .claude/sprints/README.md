# Sprints — Multi-Agent Debate Outputs

Each sprint folder contains the outputs of a structured C-Suite debate before implementation begins.

## Structure per sprint

```
<sprint-id>-<name>/
├── 00-charter.md          ← CEO: objective, hypothesis, success/kill criteria
├── 01-cpo-spec.md         ← CPO: user flows, screens, UX scope
├── 02-cto-architecture.md ← CTO: schema, edge functions, security, day-by-day plan
├── 03-cfo-unit-economics.md ← CFO: build cost, per-user cost, LTV, cap status
├── 04-coo-operations.md   ← COO: recruitment, RGPD, support, feedback protocol
├── 05-auditor-redteam.md  ← Auditor: risks P×I, hidden assumptions, devil's advocate
├── 06-final-plan.md       ← CEO: consolidated decisions, approved scope, timeline, tasks
├── tasks/                 ← Actionable daily checklists generated from 06-final-plan
└── ux/                    ← UX sketches/flows from CPO spec
```

## Protocol

1. CEO writes charter (00) before any other agent starts
2. CPO writes spec (01) after reading charter
3. CTO writes architecture (02) after reading charter + CPO spec
4. CFO writes unit economics (03) after reading charter + CTO arch
5. COO writes operations (04) after reading charter + CPO spec
6. Auditor red-teams (05) after reading all 5 previous outputs
7. CEO consolidates (06) and creates tasks/ files

No implementation begins before 06-final-plan.md is signed off.
