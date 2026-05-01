# .claude/hooks/session-start.ps1
# Hook: SessionStart
# Quando dispara: arranque de sessão (startup, resume, clear, compact)
# Acção: imprime briefing do estado para stdout — Claude Code injecta isto no context
#
# Recebe via stdin: JSON com source (startup/resume/clear/compact) + model + agent_type
# Output: stdout vai para o context do Claude (visível na sessão)
#
# Princípio: ser rápido (<200ms) e curto (não inundar context)

$ErrorActionPreference = 'Stop'

try {
    # 1. Identificar contexto
    $projectDir = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }
    $worktree = Split-Path $projectDir -Leaf
    $statePath = Join-Path $projectDir ".claude\state"

    # Tentar ler source do payload (startup/resume/clear/compact)
    $stdin = [Console]::In.ReadToEnd()
    $source = 'unknown'
    if ($stdin) {
        $payload = $stdin | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($payload.source) { $source = $payload.source }
    }

    # 2. Branch actual
    $branch = try { (git -C $projectDir rev-parse --abbrev-ref HEAD 2>$null).Trim() } catch { 'unknown' }

    # 3. Imprimir cabeçalho (vai para context do Claude)
    Write-Output ""
    Write-Output "## 🛰️ Agentic Ops Briefing"
    Write-Output ""
    Write-Output "**Worktree:** ``$worktree`` · **Branch:** ``$branch`` · **Session:** $source"
    Write-Output ""

    # 4. Recent activity — últimas 5 entradas
    $activityFile = Join-Path $statePath "recent-activity.md"
    if (Test-Path $activityFile) {
        $content = Get-Content $activityFile -Raw
        $parts = $content -split '(?m)^---\s*$', 2
        if ($parts.Count -eq 2) {
            $entries = $parts[1].Trim() -split "`r?`n" | Where-Object { $_ -match '^\[' } | Select-Object -First 5
            if ($entries.Count -gt 0) {
                Write-Output "### Últimas acções (5)"
                Write-Output ""
                foreach ($e in $entries) { Write-Output "- $e" }
                Write-Output ""
            }
        }
    }

    # 5. Triggers activos
    $triggersFile = Join-Path $statePath "triggers.md"
    if (Test-Path $triggersFile) {
        $tcontent = Get-Content $triggersFile -Raw
        # Extrair secção Activos (entre ## Activos e próximo ##)
        if ($tcontent -match '(?ms)##\s+Activos\s*\r?\n(.*?)(?=^##|\Z)') {
            $active = $matches[1].Trim()
            $activeLines = $active -split "`r?`n" | Where-Object { $_ -match '^\[' }
            if ($activeLines.Count -gt 0) {
                Write-Output "### ⚡ Triggers pendentes ($($activeLines.Count))"
                Write-Output ""
                foreach ($t in $activeLines | Select-Object -First 5) { Write-Output "- $t" }
                if ($activeLines.Count -gt 5) {
                    Write-Output "- _… + $($activeLines.Count - 5) mais — ver triggers.md_"
                }
                Write-Output ""
            }
        }
    }

    # 6. Stack health — só linhas com 🔴 ou 🟡
    $stackFile = Join-Path $statePath "stack-health.md"
    if (Test-Path $stackFile) {
        $stack = Get-Content $stackFile -Raw
        $issues = $stack -split "`r?`n" | Where-Object { $_ -match '🔴|🟡' }
        if ($issues.Count -gt 0) {
            Write-Output "### ⚠️ Stack issues"
            Write-Output ""
            foreach ($i in $issues | Select-Object -First 5) { Write-Output "- $i" }
            Write-Output ""
        }
    }

    # 7. Lembrete de protocolo
    Write-Output "---"
    Write-Output ""
    Write-Output "**Protocolo:** antes de agir, lê ``.claude/state/agents/<self>.md``. Após agir, actualiza-o + escreve trigger se aplicável."
    Write-Output ""

    exit 0
}
catch {
    # Não-blocking
    Write-Error "session-start hook error: $_"
    exit 1
}
