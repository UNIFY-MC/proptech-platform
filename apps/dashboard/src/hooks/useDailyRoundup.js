// useDailyRoundup — hook dedicado para o Daily Roundup card
//
// Regras:
//   1. Mostra apenas se hora local >= 08:00
//   2. Mostra apenas roundup de hoje (isToday)
//   3. Não mostra se dismissed para hoje (localStorage cc:dismissed-roundups)
//   4. Expõe dismissRoundup + markAllRead + isLoading
//
// Formato localStorage cc:dismissed-roundups: array de IDs de roundups dismissed
// (compatível com implementação anterior em InboxUnified)

import { useMemo, useState } from 'react'

const HOUR_CUTOFF = 8  // 08:00 hora local

function isToday(iso) {
  const d = new Date(iso)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

function isAfterCutoff() {
  return new Date().getHours() >= HOUR_CUTOFF
}

export function useDailyRoundup(inboxItems) {
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('cc:dismissed-roundups') || '[]')) } catch { return new Set() }
  })

  const roundup = useMemo(() => {
    if (!isAfterCutoff()) return null   // antes das 08h — não mostrar
    return inboxItems
      .filter(i =>
        i.item_type === 'daily_roundup' &&
        isToday(i.created_at) &&
        !dismissedIds.has(i.id)
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ?? null
  }, [inboxItems, dismissedIds])

  function dismissRoundup(id) {
    setDismissedIds(prev => {
      const next = new Set([...prev, id])
      localStorage.setItem('cc:dismissed-roundups', JSON.stringify([...next]))
      return next
    })
  }

  // Marca todos os action items do roundup como "feitos" via localStorage
  function markAllActions(itemId, count) {
    for (let i = 0; i < count; i++) {
      try { localStorage.setItem(`roundup-check:${itemId}:${i}`, '1') } catch {}
    }
    // Dismiss depois de marcar todos
    dismissRoundup(itemId)
  }

  // Todos os roundups (para histórico)
  const allRoundups = useMemo(() =>
    inboxItems
      .filter(i => i.item_type === 'daily_roundup')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [inboxItems]
  )

  return { roundup, dismissRoundup, markAllActions, allRoundups, dismissedIds }
}
