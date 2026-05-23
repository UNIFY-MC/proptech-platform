#requires -Version 5.1
<#
.SYNOPSIS
  Gera o baseline schema-only dump de V2 Condo Hub (PRODUÇÃO).

.DESCRIPTION
  Story 019.4 AC-6 (debt DB-003).

  READ-ONLY snapshot do projecto eozklslwfaqujaijvdnl (V2 Condo Hub PRODUÇÃO).

  CRÍTICO:
    - V2 tem ~5000 linhas de dados reais de clientes (Property 007 LDA).
    - Este script faz APENAS schema-only dump — nunca toca em dados.
    - O ficheiro resultante NUNCA é aplicado — é registo histórico read-only.
    - supabase_migrations.schema_migrations de V2 NÃO é tocado por este script.

.PARAMETER ProjectRef
  Ref do projecto Supabase. Default: eozklslwfaqujaijvdnl (V2).

.PARAMETER OutputFile
  Caminho do output.
  Default: supabase/migrations/v2-production/00000000000000_baseline_2026_05_v2.sql

.PARAMETER DryRun
  Mostra o comando que vai correr, sem executar.

.EXAMPLE
  .\scripts\db\baseline-dump-v2.ps1 -DryRun

.EXAMPLE
  .\scripts\db\baseline-dump-v2.ps1

.NOTES
  Pré-requisitos:
    - Mário aprovou explicitamente a execução
    - Supabase CLI v2.95+
    - supabase login feito
    - supabase link --project-ref eozklslwfaqujaijvdnl
#>

[CmdletBinding()]
param(
  [string]$ProjectRef = 'eozklslwfaqujaijvdnl',
  [string]$OutputFile = 'supabase/migrations/v2-production/00000000000000_baseline_2026_05_v2.sql',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# Schemas custom do V2. Identificados a partir do DB-AUDIT 2026-05-05.
$schemas = @(
  'public'  # V2 historicamente vive em public — confirmar com Mário
)

$schemaArg = $schemas -join ','

Write-Host "V2 PRODUÇÃO Baseline Schema-Only Dump (READ-ONLY)" -ForegroundColor Magenta
Write-Host ("=" * 60)
Write-Host "Project ref:  $ProjectRef" -ForegroundColor Yellow
Write-Host "Output file:  $OutputFile"
Write-Host "Schemas:      $schemaArg"
Write-Host ("=" * 60)

Write-Host ""
Write-Host "AVISO CRITICO:" -ForegroundColor Red
Write-Host "  Este script vai correr schema-only dump da BD V2 PRODUÇÃO."
Write-Host "  V2 contém ~5000 linhas de dados reais de clientes (Property 007 LDA)."
Write-Host "  Este script NÃO altera nada — só lê metadata de schema."
Write-Host "  Mas dependências do CLI podem variar — REVER COM CALMA."
Write-Host ""

# Confirmação explícita
if (-not $DryRun) {
  $confirm = Read-Host "Digita exactamente 'Sim, snapshot read-only V2' para continuar"
  if ($confirm -ne 'Sim, snapshot read-only V2') {
    Write-Host "Aborted — confirmação não correspondeu." -ForegroundColor Yellow
    exit 0
  }
}

# Verificar supabase CLI
try {
  $version = & supabase --version 2>&1
  Write-Host "Supabase CLI: $version" -ForegroundColor Green
} catch {
  Write-Host "ERROR: Supabase CLI not found." -ForegroundColor Red
  exit 1
}

# Garantir diretório
$outputDir = Split-Path $OutputFile -Parent
if (-not (Test-Path $outputDir)) {
  New-Item -Path $outputDir -ItemType Directory -Force | Out-Null
}

# Build command
$cmd = "supabase db dump --linked --schema-only --schema $schemaArg -f `"$OutputFile`""

Write-Host ""
Write-Host "Command:" -ForegroundColor Cyan
Write-Host "  $cmd"

if ($DryRun) {
  Write-Host ""
  Write-Host "[DRY-RUN] Not executing." -ForegroundColor Yellow
  exit 0
}

Write-Host ""
Write-Host "Linking to V2 (if not yet linked)..." -ForegroundColor Cyan
& supabase link --project-ref $ProjectRef 2>&1 | Out-Null
# Note: continua mesmo se link falha (pode já estar linked)

Write-Host "Executing dump..." -ForegroundColor Cyan
& supabase db dump --linked --schema-only --schema $schemaArg -f $OutputFile

if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: dump failed (exit code $LASTEXITCODE)." -ForegroundColor Red
  exit $LASTEXITCODE
}

if (-not (Test-Path $OutputFile)) {
  Write-Host "ERROR: output file not created at $OutputFile" -ForegroundColor Red
  exit 1
}

$fileInfo = Get-Item $OutputFile
$lineCount = (Get-Content $OutputFile | Measure-Object -Line).Lines

Write-Host ""
Write-Host "SUCCESS" -ForegroundColor Green
Write-Host ("  File:  {0}" -f $fileInfo.FullName)
Write-Host ("  Size:  {0:N0} bytes" -f $fileInfo.Length)
Write-Host ("  Lines: {0:N0}" -f $lineCount)

# Prepend READ-ONLY header
$canonicalHeader = @"
-- =============================================================
-- Migration: 00000000000000_baseline_2026_05_v2
-- Story: 019.4 (debt DB-003) — AC-6
-- Author: Mário Carvalho (via supabase db dump)
-- Date: $(Get-Date -Format 'yyyy-MM-dd')
-- Scope: Schema-only READ-ONLY snapshot of V2 Condo Hub PRODUÇÃO ($ProjectRef)
-- Reversible: no — this file is reference only
-- Idempotent: n/a — DO NOT RUN
--
-- =============================================================
-- READ-ONLY BASELINE — DO NOT APPLY
-- =============================================================
--
-- Este ficheiro é um snapshot historico do schema de V2 produção em
-- $(Get-Date -Format 'yyyy-MM-dd'). NÃO é uma migration accionável.
--
-- Razões para existir:
--   1. Documentar o estado de V2 em ponto fixo no tempo.
--   2. Comparar mudanças futuras com a baseline.
--   3. Servir de base de discussão se V2 for migrado para
--      forward-only mais tarde (story futura).
--
-- supabase_migrations.schema_migrations de V2 NÃO foi tocado.
-- Não fazer INSERT em V2 sem aprovação explícita do Mário.
-- =============================================================

"@

$body = Get-Content $OutputFile -Raw
Set-Content -Path $OutputFile -Value ($canonicalHeader + $body) -NoNewline

Write-Host ""
Write-Host "READ-ONLY header prepended." -ForegroundColor Green
Write-Host ""
Write-Host "Lembrar:" -ForegroundColor Yellow
Write-Host "  - Este ficheiro NÃO é uma migration accionável"
Write-Host "  - supabase_migrations de V2 não foi tocado"
Write-Host "  - V2 produção continua intocada"
