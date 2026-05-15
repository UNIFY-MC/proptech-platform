// Dashboard.tsx — Tabs: Tasks / Recipes / Inbox / Chat
// Sprint Q4

import React, { useState, useEffect } from "react"
import { Box, Text, useInput } from "ink"
import Spinner from "ink-spinner"
import TasksList from "./TasksList.js"
import RecipesList from "./RecipesList.js"
import InboxList from "./InboxList.js"
import Chat from "./Chat.js"

type Tab = "tasks" | "recipes" | "inbox" | "chat"

const TABS: Array<{ id: Tab; label: string; key: string }> = [
  { id: "tasks",   label: "Tasks",   key: "t" },
  { id: "recipes", label: "Recipes", key: "r" },
  { id: "inbox",   label: "Inbox",   key: "i" },
  { id: "chat",    label: "Chat",    key: "c" },
]

export default function Dashboard({ initialTab = "tasks", onQuit }: { initialTab?: Tab; onQuit?: () => void }) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [chatActive, setChatActive] = useState(false)

  useInput((input, key) => {
    // Não capturar inputs quando chat está em modo de input activo
    if (chatActive && tab === "chat") return

    if (input === "q" || key.escape) {
      if (onQuit) onQuit()
      return
    }
    const match = TABS.find(t => t.key === input.toLowerCase())
    if (match) setTab(match.id)
  })

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="magentaBright">Property007</Text>
        <Text color="gray"> · CLI v0.1.0</Text>
      </Box>

      {/* Tabs */}
      <Box marginBottom={1}>
        {TABS.map(t => (
          <Box key={t.id} marginRight={2}>
            <Text color={tab === t.id ? "cyan" : "gray"} bold={tab === t.id}>
              [{t.key.toUpperCase()}] {t.label}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Content */}
      <Box flexDirection="column" minHeight={20}>
        {tab === "tasks" && <TasksList />}
        {tab === "recipes" && <RecipesList />}
        {tab === "inbox" && <InboxList />}
        {tab === "chat" && <Chat onActiveChange={setChatActive} />}
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          [T] tasks · [R] recipes · [I] inbox · [C] chat · [Q] quit
        </Text>
      </Box>
    </Box>
  )
}
