// useRecordCount — contagem de records por tipo para badges na sidebar CRM
// recordType: 'pessoa' | 'empresa' | 'imovel' | 'condominio' | 'oportunidade'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const TABLE_MAP = {
  pessoa:       { schema: 'core',   table: 'pessoas' },
  empresa:      { schema: 'core',   table: 'organizations' },
  imovel:       { schema: 'core',   table: 'imoveis' },
  condominio:   { schema: 'core',   table: 'condominios' },
  oportunidade: { schema: 'core',   table: 'crm_oportunidades' },
}

export function useRecordCount(recordType) {
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !TABLE_MAP[recordType]) {
      setLoading(false)
      return
    }

    const { schema, table } = TABLE_MAP[recordType]

    async function fetchCount() {
      const { count: n, error } = await supabase
        .schema(schema)
        .from(table)
        .select('*', { count: 'exact', head: true })
      if (!error) setCount(n ?? 0)
      setLoading(false)
    }

    fetchCount()
  }, [recordType])

  return { count, loading }
}
