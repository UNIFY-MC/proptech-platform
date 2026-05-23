#!/usr/bin/env bash
# Story 019.4 AC-6 (debt DB-003)
# READ-ONLY schema-only dump de V2 Condo Hub PRODUÇÃO.
#
# CRÍTICO: V2 tem ~5000 linhas de dados reais. Este script só LÊ schema.
#
# Uso:
#   ./scripts/db/baseline-dump-v2.sh [--dry-run]

set -euo pipefail

PROJECT_REF="eozklslwfaqujaijvdnl"
OUTPUT_FILE="supabase/migrations/v2-production/00000000000000_baseline_2026_05_v2.sql"
SCHEMAS="public"
DRY_RUN=0

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

echo "V2 PRODUÇÃO Baseline Schema-Only Dump (READ-ONLY)"
echo "============================================================"
echo "Project ref:  ${PROJECT_REF}"
echo "Output file:  ${OUTPUT_FILE}"
echo "Schemas:      ${SCHEMAS}"
echo "============================================================"
echo ""
echo "AVISO CRITICO:"
echo "  V2 contem ~5000 linhas de dados reais de clientes (Property 007 LDA)."
echo "  Este script NAO altera dados — so le schema metadata."
echo ""

if [[ ${DRY_RUN} -eq 0 ]]; then
  read -r -p "Digita exactamente 'Sim, snapshot read-only V2' para continuar: " confirm
  if [[ "${confirm}" != "Sim, snapshot read-only V2" ]]; then
    echo "Aborted — confirmação não correspondeu."
    exit 0
  fi
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: Supabase CLI not found." >&2
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
echo "Linking to V2..."
supabase link --project-ref "${PROJECT_REF}" 2>/dev/null || true

echo "Executing dump..."
supabase db dump --linked --schema-only --schema "${SCHEMAS}" -f "${OUTPUT_FILE}"

if [[ ! -f "${OUTPUT_FILE}" ]]; then
  echo "ERROR: output file not created." >&2
  exit 1
fi

SIZE=$(wc -c < "${OUTPUT_FILE}")
LINES=$(wc -l < "${OUTPUT_FILE}")
TODAY=$(date +%Y-%m-%d)

echo ""
echo "SUCCESS"
echo "  File:  ${OUTPUT_FILE}"
echo "  Size:  ${SIZE} bytes"
echo "  Lines: ${LINES}"

# Prepend READ-ONLY header
TMPFILE=$(mktemp)
cat > "${TMPFILE}" <<EOF
-- =============================================================
-- Migration: 00000000000000_baseline_2026_05_v2
-- Story: 019.4 (debt DB-003) — AC-6
-- Author: Mário Carvalho (via supabase db dump)
-- Date: ${TODAY}
-- Scope: Schema-only READ-ONLY snapshot of V2 Condo Hub PRODUÇÃO (${PROJECT_REF})
-- Reversible: no — this file is reference only
-- Idempotent: n/a — DO NOT RUN
--
-- =============================================================
-- READ-ONLY BASELINE — DO NOT APPLY
-- =============================================================
--
-- Este ficheiro é um snapshot historico do schema de V2 produção em
-- ${TODAY}. NÃO é uma migration accionável.
--
-- supabase_migrations.schema_migrations de V2 NÃO foi tocado.
-- Não fazer INSERT em V2 sem aprovação explícita do Mário.
-- =============================================================

EOF

cat "${OUTPUT_FILE}" >> "${TMPFILE}"
mv "${TMPFILE}" "${OUTPUT_FILE}"

echo ""
echo "READ-ONLY header prepended."
