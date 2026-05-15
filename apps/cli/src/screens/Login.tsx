import React, { useState } from "react"
import { Box, Text } from "ink"
import TextInput from "ink-text-input"
import { saveConfig, getConfigPath } from "../lib/config.js"

type Step = "url" | "anon_key" | "done"

export default function Login({ onDone }: { onDone?: () => void }) {
  const [step, setStep] = useState<Step>("url")
  const [url, setUrl] = useState("https://hkmvszkpxjbxmnixzqbl.supabase.co")
  const [anonKey, setAnonKey] = useState("")

  function handleSubmit() {
    if (step === "url") {
      if (!url.trim()) return
      setStep("anon_key")
    } else if (step === "anon_key") {
      if (!anonKey.trim()) return
      saveConfig({ supabase_url: url.trim(), anon_key: anonKey.trim() })
      setStep("done")
      setTimeout(() => onDone?.(), 1500)
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="magentaBright">Property007 CLI · Setup</Text>
      <Text color="gray" dimColor>Vai gravar em: {getConfigPath()}</Text>

      <Box marginTop={2} flexDirection="column">
        {step === "url" && (
          <>
            <Text>Supabase URL:</Text>
            <TextInput value={url} onChange={setUrl} onSubmit={handleSubmit} />
          </>
        )}
        {step === "anon_key" && (
          <>
            <Text color="green">✓ URL: {url}</Text>
            <Box marginTop={1}>
              <Text>Anon key (Supabase dashboard → Settings → API → anon public):</Text>
            </Box>
            <TextInput value={anonKey} onChange={setAnonKey} onSubmit={handleSubmit} mask="*" />
          </>
        )}
        {step === "done" && (
          <Text color="green">✓ Config gravada. A iniciar dashboard…</Text>
        )}
      </Box>
    </Box>
  )
}
