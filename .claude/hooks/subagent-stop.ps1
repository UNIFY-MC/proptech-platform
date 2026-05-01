# .claude/hooks/subagent-stop.ps1 (V3 — non-blocking stdin)
# Hook: SubagentStop
# Quando dispara: sub-agente termina o trabalho
# Accao: appenda 1 linha ao recent-activity.md, corta para 20 entradas
#
# V3 changes:
# - IsInputRedirected check (V2 bloqueava em invocacao manual)

$ErrorActionPreference = 'Stop'

try {
    # 1. Ler stdin SO se redirecionado
    $payload = $null
    if ([Console]::IsInputRedirected) {
        try {
            $stdin = [Console]::In.ReadToEnd()
            if ($stdin) {
                $payload = $stdin | ConvertFrom-Json -ErrorAction Stop
            }
        } catch {}
    }

    # 2. Extrair info util
    $agentName = 'subagent'
    if ($payload) {
        if ($payload.subagent_type) { $agentName = $payload.subagent_type }
        elseif ($payload.agent_type) { $agentName = $payload.agent_type }
        elseif ($payload.subagent) { $agentName = $payload.subagent }
    }

    $sessionId = 'unknown'
    if ($payload -and $payload.session_id) {
        $len = [Math]::Min(8, $payload.session_id.Length)
        $sessionId = $payload.session_id.Substring(0, $len)
    }

    # 3. Worktree
    $projectDir = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }
    $worktree = Split-Path $projectDir -Leaf

    # 4. Timestamp ISO UTC
    $ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mmZ")

    # 5. Linha
    $line = "[$ts] $agentName @ $worktree`: subagent stopped [session:$sessionId]"

    # 6. Caminho
    $activityFile = Join-Path $projectDir ".claude\state\recent-activity.md"
    if (-not (Test-Path $activityFile)) { exit 0 }

    # 7. Ler com UTF-8
    $content = Get-Content $activityFile -Raw -Encoding UTF8
    $parts = $content -split '(?m)^---\s*$', 2

    if ($parts.Count -ne 2) {
        Add-Content -Path $activityFile -Value $line -Encoding UTF8
        exit 0
    }

    $header = $parts[0].TrimEnd() + "`r`n`r`n---`r`n`r`n"
    $entries = @($parts[1].Trim() -split "`r?`n" | Where-Object { $_ -match '^\[' })

    # 8. Insert no topo, max 20
    $newEntries = @($line) + $entries
    if ($newEntries.Count -gt 20) {
        $newEntries = $newEntries[0..19]
    }

    # 9. Reescrever (UTF-8 sem BOM)
    $output = $header + ($newEntries -join "`r`n") + "`r`n"
    [System.IO.File]::WriteAllText($activityFile, $output, [System.Text.UTF8Encoding]::new($false))

    exit 0
}
catch {
    Write-Error ("subagent-stop hook error: {0}" -f $_.Exception.Message)
    exit 1
}
