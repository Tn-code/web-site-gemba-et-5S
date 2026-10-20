import { useState, useEffect, useMemo } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../supabaseClient'

export default function RapportGemba() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAuditId, setSelectedAuditId] = useState('')
  const [questionPhotos, setQuestionPhotos] = useState({})

  useEffect(() => {
    supabase.from('gemba_audits').select('*').order('date', { ascending: false }).then(({ data, error }) => {
      if (!error) setData(data || [])
      setLoading(false)
    })
  }, [])

  // Regroupement des audits
  const auditsGrouped = useMemo(() => {
    const groups = {}
    data.forEach(row => {
      const key = `${row.date}|${row.ligne}`
      if (!groups[key]) {
        groups[key] = { id: key, date: row.date, ligne: row.ligne, uap: row.uap, rows: [], seenQuestions: new Set() }
      }
      const qText = String(row.question).trim().toLowerCase()
      if (groups[key].seenQuestions.has(qText)) return
      groups[key].seenQuestions.add(qText)
      groups[key].rows.push(row)
    })
    return Object.values(groups)
  }, [data])

  const selectedAudit = auditsGrouped.find(a => a.id === selectedAuditId)

  // Gestion de l'ajout de photos
  const handlePhotoUpload = (index, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setQuestionPhotos(prev => ({ ...prev, [index]: event.target.result }))
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removePhoto = (index) => {
    setQuestionPhotos(prev => {
      const copy = { ...prev }
      delete copy[index]
      return copy
    })
  }

  const generatePDF = () => {
    if (!selectedAudit) return

    const doc = new jsPDF()
    
    // --- CALCUL DES SCORES PAR PILIER (M) ---
    const mScores = {}
    selectedAudit.rows.forEach(r => {
      const m = r.point_m
      if (!mScores[m]) mScores[m] = { ok: 0, nok: 0 }
      if (r.reponse === 'OK') mScores[m].ok++
      if (r.reponse === 'NOK') mScores[m].nok++
    })

    const mStats = Object.entries(mScores).map(([m, s]) => {
      const total = s.ok + s.nok
      const score = total > 0 ? Math.round((s.ok / total) * 100) : 0
      return [m, `${s.ok} OK`, `${s.nok} NOK`, `${score} %`]
    })

    // Score Global de l'audit
    const globalOk = selectedAudit.rows.filter(r => r.reponse === 'OK').length
    const globalTotal = selectedAudit.rows.filter(r => r.reponse === 'OK' || r.reponse === 'NOK').length
    const globalScore = globalTotal > 0 ? Math.round((globalOk / globalTotal) * 100) : 0

    // En-tête
    const imgLogo = new Image()
    imgLogo.src = '/logo.png'
    try { doc.addImage(imgLogo, 'PNG', 14, 10, 20, 20) } catch (e) {}

    doc.setFontSize(22)
    doc.setTextColor(15, 23, 42)
    doc.text("Rapport d'Audit Gemba", 40, 20)

    doc.setFontSize(11)
    doc.setTextColor(100, 116, 139)
    doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')}`, 40, 28)

    // Infos générales
    autoTable(doc, {
      startY: 40,
      head: [['Informations sur l\'audit', 'Détails']],
      body: [
        ['Date de l\'audit', new Date(selectedAudit.date).toLocaleDateString('fr-FR')],
        ['Ligne / Zone auditée', selectedAudit.ligne || '—'],
        ['UAP', selectedAudit.uap || '—'],
        ['Score Global de l\'audit', `${globalScore} % (${globalOk} OK / ${globalTotal} évalués)`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
    })

    // Analyse par pilier (M)
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Pilier M (Axe)', 'Points OK', 'Points NOK', 'Score de l\'axe']],
      body: mStats,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
    })

    // Détail des questions
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text("Détail de l'audit", 14, doc.lastAutoTable.finalY + 12)

    const tableData = selectedAudit.rows.map((r, i) => {
      const hasPhoto = questionPhotos[i] ? true : false
      return [
        r.point_m,
        r.question,
        r.reponse,
        r.action !== '-' ? r.action : '',
        r.pilote !== '-' ? r.pilote : '',
        hasPhoto ? ' ' : '—'
      ]
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16,
      head: [['Point M', 'Question', 'Statut', 'Action Corrective', 'Pilote', 'Photo']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 55 },
        2: { cellWidth: 15, fontStyle: 'bold', halign: 'center' },
        3: { cellWidth: 45 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25, halign: 'center' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 2) {
          if (data.cell.raw === 'OK') data.cell.styles.textColor = [16, 185, 129]
          if (data.cell.raw === 'NOK') data.cell.styles.textColor = [239, 68, 68]
        }
      },
      didDrawCell: function (data) {
        if (data.section === 'body' && data.column.index === 5) {
          const rowIndex = data.row.index
          if (questionPhotos[rowIndex]) {
            const imgWidth = data.cell.width - 4
            const imgHeight = data.cell.height - 4
            doc.addImage(questionPhotos[rowIndex], 'JPEG', data.cell.x + 2, data.cell.y + 2, imgWidth, imgHeight)
          }
        }
      }
    })

    // Pied de page
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(9)
      doc.setTextColor(150)
      doc.text(`WKW Tunisie - Rapport confidentiel - Page ${i} / ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' })
    }

    doc.save(`Gemba_${selectedAudit.ligne}_${selectedAudit.date}.pdf`)
    setQuestionPhotos({})
  }

  if (loading) return <p className="muted" style={{ padding: '2rem' }}>Chargement…</p>

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Rapport d'Audit Gemba</h1>
      </div>

      <div className="card">
        <h2 className="card-title">1. Sélectionner un audit</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '300px' }}>
            <select className="filter-control" value={selectedAuditId} onChange={e => { setSelectedAuditId(e.target.value); setQuestionPhotos({}); }}>
              <option value="">-- Choisir un audit --</option>
              {auditsGrouped.map(a => (
                <option key={a.id} value={a.id}>
                  {new Date(a.date).toLocaleDateString('fr-FR')} — {a.ligne} ({a.uap})
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={generatePDF} disabled={!selectedAudit} style={{ height: '42px' }}>
            📥 Télécharger le PDF
          </button>
        </div>
      </div>

      {selectedAudit && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>2. Ajouter des photos (Optionnel)</h2>
          </div>
          
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Point M</th>
                  <th>Question</th>
                  <th>Statut</th>
                  <th>Action / Commentaire</th>
                  <th>Photo</th>
                </tr>
              </thead>
              <tbody>
                {selectedAudit.rows.map((r, i) => {
                  const isNok = String(r.reponse).toUpperCase() === 'NOK'
                  return (
                    <tr key={i} style={{ background: isNok ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                      <td style={{ color: 'var(--text-muted)' }}>{r.point_m}</td>
                      <td style={{ whiteSpace: 'normal', maxWidth: '300px' }}>{r.question}</td>
                      <td>
                        <span className={`badge ${r.reponse === 'OK' ? 'ok' : r.reponse === 'NOK' ? 'bad' : ''}`}>
                          {r.reponse}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'normal', maxWidth: '250px', color: 'var(--warning)' }}>{r.action}</td>
                      <td>
                        {isNok && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {questionPhotos[i] ? (
                              <div style={{ position: 'relative' }}>
                                <img src={questionPhotos[i]} alt="Preuve" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                                <button onClick={() => removePhoto(i)} style={{ position: 'absolute', top: -5, right: -5, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                              </div>
                            ) : (
                              <label className="btn btn-secondary" style={{ cursor: 'pointer', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                                📷 Ajouter
                                <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(i, e)} style={{ display: 'none' }} />
                              </label>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
