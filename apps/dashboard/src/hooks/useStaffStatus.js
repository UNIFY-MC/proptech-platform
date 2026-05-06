import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store'

export function useStaffStatus() {
  const { user } = useAuthStore()
  const [isStaff, setIsStaff] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase || !user) {
      setLoading(false)
      return
    }
    supabase
      .rpc('is_staff')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setIsStaff(!!data)
        setLoading(false)
      })
  }, [user])

  return { isStaff, loading, error }
}
