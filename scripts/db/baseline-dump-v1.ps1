#requires -Version 5.1
<#
.SYNOPSIS
  Gera o baseline schema-only dump de V1 Core Hub.

.DESCRIPTION
  Story 019.4 AC-1 (debt DB-003). Executa supabase db dump --schema-only contra
  o projecto hkmvszkpxjbxmnixzqbl (V1 Core Hub) e escreve o resultado em
  supabase/migrations/00000000000000_baseline_2026_05_v1.sql.

  Schemas incluídos: public, core, iam, system, growth, marketing, v2_condominios,
  v3_seguros, v4_energia, v5_manutencao, v1_owners_club. (Note: schemas que ainda
  não existem na BD são ignorados sem erro.)

.PARAMETER ProjectRef
  Ref do projecto Supabase. Default: hkmvszkpxjbxmnixzqbl (V1).

.PARAMETER OutputFile
  Caminho do output. Default: supabase/migrations/00000000000000_baseline_2026_05_v1.sql

.PARAMETER DryRun
  Mostra o comando que vai correr, sem executar.

.EXAMPLE
  .\scripts\db\baseline-dump-v1.ps1

.EXAMPLE
  .\scripts\db\baseline-dump-v1.ps1 -DryRun

.NOTES
  Pré-requisitos:
    - Supabase CLI instalado (v2.95+)
    - Login feito: supabase login
    - Projecto linked: supabase link --project-ref hkmvszkpxjbxmnixzqbl
      (pode pedir password do DB — usar a do dashboard)

  Se não tiver linked, o script tenta supabase link automaticamente
  (vai pedir confirmação interactivamente).
#>

[CmdletBinding()]
param(
  [string]$ProjectRef = 'hkmvszkpxjbxmnixzqbl',
  [string]$OutputFile = 'supabase/migrations/00000000000000_baseline_2026_05_v1.sql',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# Schemas que queremos no dump. Schemas inexistentes são ignorados pelo pg_dump.
$schemas = @(
  'public',
  'core',
  'iam',
  'system',
  'growth',
  'marketing',
  'v2_condominios',
  'v3_seguros',
  'v4_energia',
  'v5_manutencao',
  'v1_owners_club',
  'v10_owners_club'  # ADR-013 menciona v10; incluir por segurança
)

$schemaArg = $schemas -join ','

Write-Host "V1 Baseline Schema-Only Dump" -ForegroundColor Cyan
Write-Host ("=" * 60)
Write-Host "Project ref:  $ProjectRef"
Write-Host "Output file:  $OutputFile"
Write-Host "Schemas:      $schemaArg"
Write-Host ("=" * 60)

# Verificar supabase CLI
try {
  $version = & supabase --version 2>&1
  Write-Host "Supabase CLI: $version" -ForegroundColor Green
} catch {
  Write-Host "ERROR: Supabase CLI not found." -ForegroundColor Red
  Write-Host "Install: https://supabase.com/docs/guides/cli/getting-started"
  exit 1
}

# Verificar link
$configFile = Join-Path (Get-Location) 'supabase\.temp\project-ref'
if (-not (Test-Path $configFile)) {
  Write-Host ""
  Write-Host "WARNING: supabase project not linked locally." -ForegroundColor Yellow
  Write-Host "Run: supabase link --project-ref $ProjectRef" -ForegroundColor Yellow
  Write-Host "Will pedir password do DB (encontra no dashboard Supabase)."
  if (-not $DryRun) {
    $proceed = Read-Host "Linkar agora? (s/N)"
    if ($proceed -eq 's' -or $proceed -eq 'S') {
      & supabase link --project-ref $ProjectRef
      if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: supabase link failed." -ForegroundColor Red
        exit 1
      }
    } else {
      Write-Host "Aborted." -ForegroundColor Yellow
      exit 1
    }
  }
}

# Garantir diretório de output existe
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
$confirm = Read-Host "Confirmar execução? (s/N)"
if ($confirm -ne 's' -and $confirm -ne 'S') {
  Write-Host "Aborted." -ForegroundColor Yellow
  exit 0
}

# Executar
Write-Host ""
Write-Host "Executing..." -ForegroundColor Cyan

& supabase db dump --linked --schema-only --schema $schemaArg -f $OutputFile

if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: dump failed (exit code $LASTEXITCODE)." -ForegroundColor Red
  exit $LASTEXITCODE
}

# Validar output
if (-not (Test-Path $OutputFile)) {
  Write-Host "ERROR: output file not created at $OutputFile" -ForegroundColor Red
  exit 1
}

$fileInfo = Get-Item $OutputFile
$lineCount = (Get-Content $OutputFile | Measure-Object -Line).Lines

Write-Host ""
Write-Host "SUCCESS" -ForegroundColor Green
Write-Host ("  File:    {0}" -f $fileInfo.FullName)
Write-Host ("  Size:    {0:N0} bytes" -f $fileInfo.Length)
Write-Host ("  Lines:   {0:N0}" -f $lineCount)

# Prepend canonical header
$canonicalHeader = @"
-- =============================================================
-- Migration: 00000000000000_baseline_2026_05_v1
-- Story: 019.4 (debt DB-003)
-- Author: Mário Carvalho (via supabase db dump)
-- Date: $(Get-Date -Format 'yyyy-MM-dd')
-- Scope: Schema-only snapshot of V1 Core Hub ($ProjectRef)
-- Reversible: no (this is a sentinel — never executed)
-- Idempotent: n/a (do not run)
--
-- CRITICAL: Do NOT execute this file. It represents the state of V1
-- as of $(Get-Date -Format 'yyyy-MM-dd'). It must be registered as already-applied
-- in supabase_migrations.schema_migrations following the procedure in
-- docs/database/baseline-mark-as-applied.md.
--
-- Schemas included: $schemaArg
-- =============================================================

"@

$body = Get-Content $OutputFile -Raw
Set-Content -Path $OutputFile -Value ($canonicalHeader + $body) -NoNewline

Write-Host ""
Write-Host "Canonical header prepended." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Inspect $OutputFile"
Write-Host "  2. Follow docs/database/baseline-mark-as-applied.md"
Write-Host "  3. git add $OutputFile && git commit -m 'feat(db): baseline V1 dump [Story 019.4]'"
