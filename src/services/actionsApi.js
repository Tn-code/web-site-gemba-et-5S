import { supabase } from '../supabaseClient'

export async function fetchActions() {
  const { data, error } = await supabase.from('action_plans').select('*')
  if (error) return []
  return data || []
}

export async function upsertAction(action) {
  const { error } = await supabase.from('action_plans').upsert(action, { onConflict: 'type, audit_date, ligne, question' })
  if (error) console.error('Erreur action:', error)
}
