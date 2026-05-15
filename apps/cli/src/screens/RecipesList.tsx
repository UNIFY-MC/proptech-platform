import React, { useEffect, useState } from "react"
import { Box, Text } from "ink"
import Spinner from "ink-spinner"
import { fetchRecipes } from "../lib/api.js"

export default function RecipesList() {
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecipes(40).then(r => { setRecipes(r); setLoading(false) })
  }, [])

  if (loading) return <Text color="cyan"><Spinner /> A carregar recipes…</Text>
  if (recipes.length === 0) return <Text color="gray">Sem recipes.</Text>

  return (
    <Box flexDirection="column">
      <Text color="gray" dimColor>{recipes.length} recipes activas</Text>
      <Box marginTop={1} flexDirection="column">
        {recipes.slice(0, 18).map(r => (
          <Box key={r.id}>
            <Text color="cyan">{(r.slug || "").padEnd(28)}</Text>
            <Text> {(r.name || "").slice(0, 50)}</Text>
            {r.run_count > 0 && <Text color="gray" dimColor> · {r.run_count} runs</Text>}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
