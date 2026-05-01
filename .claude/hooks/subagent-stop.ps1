# .claude/hooks/subagent-stop.ps1
# Hook: SubagentStop
# Quando dispara: sempre que um sub-agente termina o seu trabalho
# Acção: appenda 1 linha ao recent-activity.md (estado partilhado), corta para 20 entradas
#
# Recebe via stdin: JSON com info do sub-agent que terminou
# Output: nenhum (este hook não injecta context, só regista)

$ErrorActionPreference = 'Stop'

try {
    # 1. Ler payload do stdin
    $stdin = [Console]::In.ReadToEnd()
    $payload = if ($stdin) { $stdin | ConvertFrom-Json -ErrorAction SilentlyContinue } else { $null }

    # 2. Extrair info útil (best-effort — o schema pode mudar entre versões)
    $agentName = if ($payload.subagent_type) { $payload.subagent_type }
                 elseif ($payload.agent_type) { $payload.agent_type }
                 elseif ($payload.subagent) { $payload.subagent }
                 else { 'subagent' }

    $sessionId = if ($payload.session_id) { $payload.session_id.Substring(0, [Math]::Min(8, $payload.session_id.Length)) } else { 'unknown' }

    # 3. Identificar worktree (último segmento do CLAUDE_PROJECT_DIR)
    $projectDir = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }
    $worktree = Split-Path $projectDir -Leaf

    # 4. Timestamp ISO UTC
    $ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mmZ")

    # 5. Compor linha
    $line = "[$ts] $agentName @ $worktree: subagent stopped [session:$sessionId]"

    # 6. Caminho do ficheiro de actividade (junction → estado partilhado)
    $activityFile = Join-Path $projectDir ".claude\state\recent-activity.md"

    if (-not (Test-Path $activityFile)) {
        # Se ainda não existe, sair silencioso (estado não inicializado)
        exit 0
    }

    # 7. Ler conteúdo, separar header de entradas
    $content = Get-Content $activityFile -Raw
    $parts = $content -split '(?m)^---\s*$', 2

    if ($parts.Count -ne 2) {
        # Formato inesperado, fazer append simples
        Add-Content -Path $activityFile -Value $line
        exit 0
    }

    $header = $parts[0].TrimEnd() + "`n`n---`n`n"
    $entries = $parts[1].Trim() -split "`r?`n" | Where-Object { $_ -match '^\[' }

    # 8. Inserir nova linha no topo, manter máx 20
    $newEntries = @($line) + $entries
    if ($newEntries.Count -gt 20) {
        $newEntries = $newEntries[0..19]
    }

    # 9. Reescrever ficheiro
    $output = $header + ($newEntries -join "`n") + "`n"
    Set-Content -Path $activityFile -Value $output -NoNewline

    exit 0
}
catch {
    # Não-blocking: erros aqui não devem impedir o trabalho do Claude
    Write-Error "subagent-stop hook error: $_"
    exit 1
}
