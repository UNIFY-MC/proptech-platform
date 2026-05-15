import React, { useState, useEffect } from "react"
import { Box, Text } from "ink"
import TextInput from "ink-text-input"
import Spinner from "ink-spinner"
import { chatWithAgent } from "../lib/api.js"

interface Message {
  role: "user" | "assistant"
  content: string
  agent_id?: string
}

export default function Chat({ initialAgent = "auto", onActiveChange }: { initialAgent?: string; onActiveChange?: (active: boolean) => void }) {
  const [agent, setAgent] = useState(initialAgent)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [pending, setPending] = useState(false)
  const [threadId, setThreadId] = useState<string | undefined>()

  useEffect(() => {
    onActiveChange?.(true)
    return () => onActiveChange?.(false)
  }, [])

  async function send() {
    if (!input.trim() || pending) return
    const text = input
    setInput("")
    setMessages(m => [...m, { role: "user", content: text }])
    setPending(true)
    try {
      const res: any = await chatWithAgent(text, agent, threadId)
      if (res?.thread_id) setThreadId(res.thread_id)
      setMessages(m => [...m, {
        role: "assistant",
        content: res?.reply || res?.error || "(sem resposta)",
        agent_id: res?.agent_id,
      }])
    } catch (e: any) {
      setMessages(m => [...m, { role: "assistant", content: `⚠ ${String(e)}` }])
    } finally {
      setPending(false)
    }
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="gray" dimColor>Agent: </Text>
        <Text color="cyan">{agent}</Text>
        <Text color="gray" dimColor> · escreve pergunta + Enter · [Ctrl+C] sair</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {messages.length === 0 && (
          <Text color="gray" dimColor>Em que te posso ajudar?</Text>
        )}
        {messages.slice(-8).map((m, i) => (
          <Box key={i} flexDirection="column" marginBottom={1}>
            <Text color={m.role === "user" ? "yellow" : "cyan"} bold>
              {m.role === "user" ? "M:" : `${m.agent_id || "agent"}:`}
            </Text>
            <Text>{m.content.slice(0, 600)}</Text>
          </Box>
        ))}
        {pending && <Text color="cyan"><Spinner /> A pensar…</Text>}
      </Box>

      <Box>
        <Text color="green">{">"} </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={send}
          placeholder="Pergunta ao agent…"
        />
      </Box>
    </Box>
  )
}
