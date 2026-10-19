import { supabase } from '../supabaseClient'

/** Récupère tous les audits, triés par date croissante. */
export async function fetchAudits() {
  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .order('date', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * Upsert par lots de 50 pour rester sous la limite de payload Supabase.
 * @returns {Promise<number>} nombre de lignes traitées
 */
export async function upsertAudits(rows, chunkSize = 50) {
  let processed = 0
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const { error } = await supabase
      .from('audits')
      .upsert(chunk, { onConflict: 'date,zone,auditor' })
    if (error) throw error
    processed += chunk.length
  }
  return processed
}
