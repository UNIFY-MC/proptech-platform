import { supabase } from '../lib/supabase.js'
import { useNotificationsStore } from '../store'

export function useApprovalActions() {
  const addToast = useNotificationsStore(s => s.addToast)

  async function approveItem(itemId) {
    const { error } = await supabase
      .schema('system')
      .from('approvals_queue')
      .update({ status: 'approved', decision_at: new Date().toISOString() })
      .eq('id', itemId)
    if (error) addToast({ type: 'error', message: 'Erro ao aprovar: ' + error.message })
    else addToast({ type: 'success', message: 'Aprovado.' })
  }

  async function rejectItem(itemId) {
    const { error } = await supabase
      .schema('system')
      .from('approvals_queue')
      .update({ status: 'dismissed', decision_at: new Date().toISOString() })
      .eq('id', itemId)
    if (error) addToast({ type: 'error', message: 'Erro ao rejeitar: ' + error.message })
    else addToast({ type: 'success', message: 'Rejeitado.' })
  }

  async function editAndApprove(itemId, newDraft) {
    const { error } = await supabase
      .schema('system')
      .from('approvals_queue')
      .update({
        edited_message: newDraft,
        status: 'edited_approved',
        decision_at: new Date().toISOString(),
      })
      .eq('id', itemId)
    if (error) addToast({ type: 'error', message: 'Erro ao guardar: ' + error.message })
    else addToast({ type: 'success', message: 'Editado e aprovado.' })
  }

  return { approveItem, rejectItem, editAndApprove }
}
