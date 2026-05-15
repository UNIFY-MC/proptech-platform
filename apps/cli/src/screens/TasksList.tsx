import React, { useEffect, useState } from "react"
import { Box, Text, useInput } from "ink"
import Spinner from "ink-spinner"
import { fetchTasks, runTask } from "../lib/api.js"

const STATUS_COLOR: Record<string, string> = {
  open: "yellow",
  in_progress: "cyan",
  blocked: "red",
  needs_human: "magenta",
  done: "green",
  failed: "red",
  cancelled: "gray",
}

export default function TasksList() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [running, setRunning] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const data = await fetchTasks({ limit: 30 })
    setTasks(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useInput((input, key) => {
    if (key.upArrow) setSelectedIdx(i => Math.max(0, i - 1))
    if (key.downArrow) setSelectedIdx(i => Math.min(tasks.length - 1, i + 1))
    if (input === "r") load()
    if (input === " " && tasks[selectedIdx]) {
      const t = tasks[selectedIdx]
      setRunning(t.id)
      setMessage(`▶ Running ${t.title.slice(0, 60)}…`)
      runTask(t.id).then((res) => {
        setMessage(res?.ok ? `✓ ${res.status} · ${res.summary?.slice(0, 80) || ""}` : `✗ ${res?.error || "failed"}`)
        setRunning(null)
        setTimeout(load, 500)
      })
    }
  })

  if (loading) return <Box><Text color="cyan"><Spinner /> A carregar tasks…</Text></Box>

  if (tasks.length === 0) {
    return <Text color="gray">Sem tasks. Cria uma no dashboard ou via API.</Text>
  }

  return (
    <Box flexDirection="column">
      <Text color="gray" dimColor>↑↓ navegar · [Space] run · [R] reload</Text>
      <Box marginTop={1} flexDirection="column">
        {tasks.slice(0, 15).map((t, i) => {
          const sel = i === selectedIdx
          const color = STATUS_COLOR[t.status] || "white"
          return (
            <Box key={t.id}>
              <Text color={sel ? "cyan" : "white"} inverse={sel}>
                {sel ? "▸ " : "  "}
                <Text color={color}>[{(t.status || "open").padEnd(11)}]</Text>
                {" "}
                <Text>{t.title.slice(0, 60)}</Text>
                {t.owner_agent_id && <Text color="gray" dimColor> · {t.owner_agent_id}</Text>}
              </Text>
            </Box>
          )
        })}
      </Box>
      {message && (
        <Box marginTop={1}>
          <Text color={message.startsWith("✓") ? "green" : message.startsWith("✗") ? "red" : "yellow"}>
            {running && <Spinner />} {message}
          </Text>
        </Box>
      )}
    </Box>
  )
}
