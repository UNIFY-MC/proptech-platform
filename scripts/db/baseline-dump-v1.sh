#!/usr/bin/env bash
# Story 019.4 AC-1 (debt DB-003)
# Gera baseline schema-only dump de V1 Core Hub.
#
# Uso:
#   ./scripts/db/baseline-dump-v1.sh [--dry-run]
#
# Pré-requisitos:
#   - Supabase CLI v2.95+
#   - supabase login feito
#   - supabase link --project-ref hkmvszkpxjbxmnixzqbl (vai pedir password DB)

set -euo pipefail

PROJECT_REF="hkmvszkpxjbxmnixzqbl"
OUTPUT_FILE="supabase/migrations/00000000000000_baseline_2026_05_v1.sql"
SCHEMAS="public,core,iam,system,growth,marketing,v2_condominios,v3_seguros,v4_energia,v5_manutencao,v1_owners_club,v10_owners_club"
DRY_RUN=0

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

echo "V1 Baseline Schema-Only Dump"
echo "============================================================"
echo "Project ref:  ${PROJECT_REF}"
echo "Output file:  ${OUTPUT_FILE}"
echo "Schemas:      ${SCHEMAS}"
echo "============================================================"

if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: Supabase CLI not found." >&2
  echo "Install: https://supabase.com/docs/guides/cli/getting-started" >&2
  exit 1
fi

echo "Supabase CLI: $(supabase --version)"

mkdir -p "$(dirname "${OUTPUT_FILE}")"

CMD="supabase db dump --linked --schema-only --schema ${SCHEMAS} -f \"${OUTPUT_FILE}\""
echo ""
echo "Command:"
echo "  ${CMD}"

if [[ ${DRY_RUN} -eq 1 ]]; then
  echo ""
  echo "[DRY-RUN] Not executing."
  exit 0
fi

echo ""
read -r -p "Confirmar execução? (s/N) " confirm
if [[ "${confirm}" != "s" && "${confirm}" != "S" ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Executing..."
supabase db dump --linked --schema-only --schema "${SCHEMAS}" -f "${OUTPUT_FILE}"

if [[ ! -f "${OUTPUT_FILE}" ]]; then
  echo "ERROR: output file not created." >&2
  exit 1
fi

SIZE=$(wc -c < "${OUTPUT_FILE}")
LINES=$(wc -l < "${OUTPUT_FILE}")

echo ""
echo "SUCCESS"
echo "  File:  ${OUTPUT_FILE}"
echo "  Size:  ${SIZE} bytes"
echo "  Lines: ${LINES}"

# Prepend canonical header
TODAY=$(date +%Y-%m-%d)
TMPFILE=$(mktemp)

cat > "${TMPFILE}" <<EOF
-- =============================================================
-- Migration: 00000000000000_baseline_2026_05_v1
-- Story: 019.4 (debt DB-003)
-- Author: Mário Carvalho (via supabase db dump)
-- Date: ${TODAY}
-- Scope: Schema-only snapshot of V1 Core Hub (${PROJECT_REF})
-- Reversible: no (this is a sentinel — never executed)
-- Idempotent: n/a (do not run)
--
-- CRITICAL: Do NOT execute this file. It represents the state of V1
-- as of ${TODAY}. It must be registered as already-applied in
-- supabase_migrations.schema_migrations following the procedure in
-- docs/database/baseline-mark-as-applied.md.
--
-- Schemas included: ${SCHEMAS}
-- =============================================================

EOF

cat "${OUTPUT_FILE}" >> "${TMPFILE}"
mv "${TMPFILE}" "${OUTPUT_FILE}"

echo ""
echo "Canonical header prepended."
echo ""
echo "Next steps:"
echo "  1. Inspect ${OUTPUT_FILE}"
echo "  2. Follow docs/database/baseline-mark-as-applied.md"
echo "  3. git add ${OUTPUT_FILE} && git commit -m 'feat(db): baseline V1 dump [Story 019.4]'"
