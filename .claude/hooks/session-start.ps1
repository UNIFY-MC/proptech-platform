# .claude/hooks/session-start.ps1 (V3 — non-blocking stdin)
# Hook: SessionStart
# Quando dispara: arranque de sessao (startup, resume, clear, compact)
# Accao: imprime briefing do estado para stdout — Claude Code injecta no context
#
# V3 changes:
# - IsInputRedirected check (V2 bloqueava em invocacao manual)
# - UTF-8 encoding mantido
# - ASCII matchers mantidos

$ErrorActionPreference = 'Stop'

# Forcar UTF-8 no output
try {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
    $OutputEncoding = [System.Text.UTF8Encoding]::new()
} catch {}

try {
    # 1. Identificar contexto
    $projectDir = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }
    $worktree = Split-Path $projectDir -Leaf
    $statePath = Join-Path $projectDir ".claude\state"

    # 2. Ler stdin SO se for redirecionado (evita bloqueio em invocacao manual)
    $source = 'unknown'
    if ([Console]::IsInputRedirected) {
        try {
            $stdin = [Console]::In.ReadToEnd()
            if ($stdin) {
                $payload = $stdin | ConvertFrom-Json -ErrorAction Stop
                if ($payload.source) { $source = $payload.source }
            }
        } catch {}
    } else {
        $source = 'manual-test'
    }

    # 3. Branch actual
    $branch = 'unknown'
    try {
        $b = git -C $projectDir rev-parse --abbrev-ref HEAD 2>$null
        if ($b) { $branch = $b.Trim() }
    } catch {}

    # 4. Cabecalho
    Write-Output ""
    Write-Output "## Agentic Ops Briefing"
    Write-Output ""
    Write-Output ("**Worktree:** ``{0}`` | **Branch:** ``{1}`` | **Session:** {2}" -f $worktree, $branch, $source)
    Write-Output ""

    # 5. Recent activity — ultimas 5
    $activityFile = Join-Path $statePath "recent-activity.md"
    if (Test-Path $activityFile) {
        $content = Get-Content $activityFile -Raw -Encoding UTF8
        $parts = $content -split '(?m)^---\s*$', 2
        if ($parts.Count -eq 2) {
            $entries = @($parts[1].Trim() -split "`r?`n" | Where-Object { $_ -match '^\[' }) | Select-Object -First 5
            if ($entries.Count -gt 0) {
                Write-Output "### Ultimas accoes"
                Write-Output ""
                foreach ($e in $entries) { Write-Output "- $e" }
                Write-Output ""
            }
        }
    }

    # 6. Triggers activos
    $triggersFile = Join-Path $statePath "triggers.md"
    if (Test-Path $triggersFile) {
        $tcontent = Get-Content $triggersFile -Raw -Encoding UTF8
        if ($tcontent -match '(?ms)##\s+Activos\s*\r?\n(.*?)(?=^##|\Z)') {
            $active = $matches[1].Trim()
            $activeLines = @($active -split "`r?`n" | Where-Object { $_ -match '^\[' })
            if ($activeLines.Count -gt 0) {
                Write-Output ("### Triggers pendentes ({0})" -f $activeLines.Count)
                Write-Output ""
                foreach ($t in ($activeLines | Select-Object -First 5)) { Write-Output "- $t" }
                if ($activeLines.Count -gt 5) {
                    Write-Output ("- ... + {0} mais (ver triggers.md)" -f ($activeLines.Count - 5))
                }
                Write-Output ""
            }
        }
    }

    # 7. Stack health — [WARN] / [FAIL] / [DOWN]
    $stackFile = Join-Path $statePath "stack-health.md"
    if (Test-Path $stackFile) {
        $stack = Get-Content $stackFile -Raw -Encoding UTF8
        $issues = @($stack -split "`r?`n" | Where-Object { $_ -match '\[(WARN|FAIL|DOWN)\]' })
        if ($issues.Count -gt 0) {
            Write-Output "### Stack issues"
            Write-Output ""
            foreach ($i in ($issues | Select-Object -First 5)) { Write-Output "- $i" }
            Write-Output ""
        }
    }

    # 8. Lembrete de protocolo
    Write-Output "---"
    Write-Output ""
    Write-Output "**Protocolo:** antes de agir, le ``.claude/state/agents/<self>.md``. Apos agir, actualiza-o + escreve trigger se aplicavel."
    Write-Output ""

    exit 0
}
catch {
    Write-Error ("session-start hook error: {0}" -f $_.Exception.Message)
    exit 1
}
