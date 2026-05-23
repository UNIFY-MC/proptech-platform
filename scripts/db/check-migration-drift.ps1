#requires -Version 5.1
<#
.SYNOPSIS
  Detecta drift entre ficheiros locais em supabase/migrations e chamadas a apply_migration
  recentes (logs de agentes / handoffs).

.DESCRIPTION
  Story 019.4 (debt DB-003) — pré-push check para garantir que nenhum apply_migration MCP
  ficou sem ficheiro .sql correspondente.

  O script não acede à BD remota. Compara apenas:
    1. Ficheiros .sql em supabase/migrations/ e supabase/migrations/v2-production/
    2. Menções a "apply_migration" nos últimos handoffs / logs

  Resultado:
    - "OK — no drift detected" se todos os apply_migration têm ficheiro local.
    - Lista de drift sinalizado caso contrário.

.EXAMPLE
  .\scripts\db\check-migration-drift.ps1

.EXAMPLE
  .\scripts\db\check-migration-drift.ps1 -Verbose

.NOTES
  Não bloqueante. Output informativo. Mário/agent decide se age.
#>

[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path,
  [int]$LookbackDays = 14
)

$ErrorActionPreference = 'Stop'

Write-Host "Migration drift check — $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot"
Write-Host "Lookback: $LookbackDays days"
Write-Host ("-" * 70)

# ---- 1. Inventariar ficheiros locais -----------------------------------
$v1Dir = Join-Path $RepoRoot 'supabase\migrations'
$v2Dir = Join-Path $RepoRoot 'supabase\migrations\v2-production'

$localFiles = @()
if (Test-Path $v1Dir) {
  $localFiles += Get-ChildItem -Path $v1Dir -Filter '*.sql' -File | Where-Object {
    $_.Directory.Name -eq 'migrations'  # exclude subfolders
  }
}
if (Test-Path $v2Dir) {
  $localFiles += Get-ChildItem -Path $v2Dir -Filter '*.sql' -File
}

Write-Host ("Local migration files: {0}" -f $localFiles.Count) -ForegroundColor Green
$localFiles | ForEach-Object { Write-Verbose ("  " + $_.FullName) }

# Extrair "versions" inferidos do filename (prefixo antes do primeiro _)
$localVersions = $localFiles | ForEach-Object {
  if ($_.Name -match '^(\d{8,14})_') {
    [pscustomobject]@{
      File    = $_.Name
      Version = $matches[1]
      Path    = $_.FullName
    }
  }
}

# ---- 2. Procurar menções a apply_migration -----------------------------
# Locais onde apply_migration pode aparecer:
#   .aiox/handoffs/*.yaml
#   .claude/state/**/*.md
#   docs/stories/**/*.md (logs de implementação)
$searchPaths = @(
  Join-Path $RepoRoot '.aiox\handoffs'
  Join-Path $RepoRoot '.claude\state'
  Join-Path $RepoRoot 'docs\stories'
)

$cutoff = (Get-Date).AddDays(-$LookbackDays)
$mentions = @()

foreach ($p in $searchPaths) {
  if (-not (Test-Path $p)) {
    Write-Verbose ("Skipping (not found): $p")
    continue
  }
  $files = Get-ChildItem -Path $p -Recurse -File -Include *.md, *.yaml, *.yml, *.json -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -ge $cutoff }

  foreach ($f in $files) {
    $matches = Select-String -Path $f.FullName -Pattern 'apply_migration' -SimpleMatch -ErrorAction SilentlyContinue
    foreach ($m in $matches) {
      $mentions += [pscustomobject]@{
        Source = $f.FullName
        Line   = $m.LineNumber
        Text   = $m.Line.Trim()
      }
    }
  }
}

Write-Host ("apply_migration mentions in last {0}d: {1}" -f $LookbackDays, $mentions.Count) -ForegroundColor Green

# ---- 3. Extrair version strings dos mentions ---------------------------
# Padroes esperados:
#   apply_migration({version: "20260520143000", name: ...})
#   apply_migration(version="20260520143000", name=...)
#   "version": "20260520143000"
$versionRegex = '\b(\d{14})\b'

$mentionedVersions = @{}
foreach ($m in $mentions) {
  $regexMatches = [regex]::Matches($m.Text, $versionRegex)
  foreach ($mm in $regexMatches) {
    $v = $mm.Value
    if (-not $mentionedVersions.ContainsKey($v)) {
      $mentionedVersions[$v] = @()
    }
    $mentionedVersions[$v] += $m.Source
  }
}

# ---- 4. Comparar ---------------------------------------------------
$drift = @()
foreach ($v in $mentionedVersions.Keys) {
  $hasFile = $localVersions | Where-Object { $_.Version -eq $v }
  if (-not $hasFile) {
    # Tentar também match parcial (caso o ficheiro tenha 8 digits e mention 14)
    $shortV = $v.Substring(0, 8)
    $partialMatch = $localVersions | Where-Object { $_.Version -eq $shortV }
    if (-not $partialMatch) {
      $drift += [pscustomobject]@{
        Version   = $v
        Sources   = $mentionedVersions[$v] -join ', '
        ShortV    = $shortV
      }
    } else {
      Write-Host ("  ⚠ Version $v has only 8-digit local match ($shortV) — non-canonical naming") -ForegroundColor Yellow
    }
  }
}

# ---- 5. Reportar ---------------------------------------------------
Write-Host ("-" * 70)
if ($drift.Count -eq 0) {
  Write-Host "OK — no drift detected." -ForegroundColor Green
  Write-Host ("  Local files: {0}" -f $localFiles.Count)
  Write-Host ("  Mentioned versions covered: {0}" -f $mentionedVersions.Count)
  exit 0
} else {
  Write-Host ("DRIFT DETECTED: {0} version(s) referenced but no local .sql file" -f $drift.Count) -ForegroundColor Red
  foreach ($d in $drift) {
    Write-Host ""
    Write-Host ("  Version: {0}" -f $d.Version) -ForegroundColor Red
    Write-Host ("  Sources: {0}" -f $d.Sources)
    Write-Host ("  Action:  Create supabase/migrations/{0}_descricao.sql" -f $d.Version) -ForegroundColor Yellow
  }
  Write-Host ""
  Write-Host "See docs/database/pre-push-checklist.md step 5 for resolution." -ForegroundColor Yellow
  exit 1
}
