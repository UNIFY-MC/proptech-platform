import React, { useEffect, useState } from "react"
import { Box, Text } from "ink"
import Spinner from "ink-spinner"
import { fetchInbox } from "../lib/api.js"

export default function InboxList() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInbox(20).then(d => { setItems(d); setLoading(false) })
  }, [])

  if (loading) return <Text color="cyan"><Spinner /> A carregar inbox…</Text>
  if (items.length === 0) return <Text color="gray">Inbox limpa. 🎉</Text>

  return (
    <Box flexDirection="column">
      <Text color="gray" dimColor>{items.length} items activos</Text>
      <Box marginTop={1} flexDirection="column">
        {items.map(i => (
          <Box key={i.id}>
            <Text color="magenta">{(i.kind || "").padEnd(10)}</Text>
            <Text> {(i.title || "").slice(0, 60)}</Text>
            {i.vertical && <Text color="gray" dimColor> · {i.vertical}</Text>}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
