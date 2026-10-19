import { useState } from 'react'
import { parseFile } from '../services/importExcel'
import { upsertAudits } from '../services/auditsApi'

export default function UploadCard({ onImported }) {
  const [busy, setBusy]       = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setBusy(true)
    setMessage('')
    setIsError(false)

    try {
      const rows = await parseFile(file)
      if (rows.length === 0) throw new Error('Aucune ligne valide détectée.')

      const count = await upsertAudits(rows)
      setMessage(`${count} audit(s) importé(s) avec succès.`)
      onImported?.()
    } catch (err) {
      setIsError(true)
      setMessage(`Erreur : ${err.message}`)
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  return (
    <div className="card">
      <h2 className="card-title">Importer un fichier Excel</h2>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFile}
        disabled={busy}
      />
      {busy && <p className="muted">Import en cours…</p>}
      {message && (
        <p className={isError ? 'message-error' : 'message-success'}>{message}</p>
      )}
    </div>
  )
}
