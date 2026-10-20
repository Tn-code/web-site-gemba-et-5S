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

  const handlePhotoUpload = (index, e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        setQuestionPhotos(prev => ({
          ...prev,
          [index]: [...(prev[index] || []), event.target.result]
        }))
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removePhoto = (index, photoIndex) => {
    setQuestionPhotos(prev => {
      const copy = { ...prev }
      copy[index] = copy[index].filter((_, i) => i !== photoIndex)
      if (copy[index].length === 0) delete copy[index]
      return copy
    })
  }

  const generatePDF = () => {
    if (!selectedAudit) return

    const doc = new jsPDF()
    
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

    const globalOk = selectedAudit.rows.filter(r => r.reponse === 'OK').length
    const globalTotal = selectedAudit.rows.filter(r => r.reponse === 'OK' || r.reponse === 'NOK').length
    const globalScore = globalTotal > 0 ? Math.round((globalOk / globalTotal) * 100) : 0

    const imgLogo = new Image()
    imgLogo.src = '/logo.png'
    try { doc.addImage(imgLogo, 'PNG', 14, 10, 20, 20) } catch (e) {}

    doc.setFontSize(22)
    doc.setTextColor(15, 23, 42)
    doc.text("Rapport d'Audit Gemba", 40, 20)
    doc.setFontSize(11)
    doc.setTextColor(100, 116, 139)
    doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')}`, 40, 28)

    autoTable(doc, {
      startY: 40,
      head: [['Informations sur l\'audit', 'Détails']],
      body: [
        ['Date de l\'audit', new Date(selectedAudit.date).toLocaleDateString('fr-FR')],
        ['Ligne / Zone auditée', selectedAudit.ligne || '—'],
        ['UAP', selectedAudit.uap || '—'],
        ['Score Global', `${globalScore} %`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Pilier M (Axe)', 'OK', 'NOK', 'Score']],
      body: mStats,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
    })

    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text("Détail de l'audit", 14, doc.lastAutoTable.finalY + 12)

    const tableData = selectedAudit.rows.map((r, i) => {
      const photosCount = questionPhotos[i]?.length || 0
      return [
        r.point_m,
        r.question,
        r.reponse,
        r.action !== '-' ? r.action : '',
        r.pilote !== '-' ? r.pilote : '',
        photosCount > 0 ? `${photosCount} photo(s)` : '—'
      ]
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16,
      head: [['Point M', 'Question', 'Statut', 'Action', 'Pilote', 'Photos']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 55 },
        2: { cellWidth: 15, fontStyle: 'bold', halign: 'center' },
        3: { cellWidth: 45 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20, halign: 'center' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 2) {
          if (data.cell.raw === 'OK') data.cell.styles.textColor = [16, 185, 129]
          if (data.cell.raw === 'NOK') data.cell.styles.textColor = [239, 68, 68]
        }
      }
    })

    // --- AJOUT DES PAGES PHOTOS ---
    const photosToRender = []
    Object.entries(questionPhotos).forEach(([index, photos]) => {
      const row = selectedAudit.rows[parseInt(index)]
      photos.forEach(base64 => photosToRender.push({ question: row ? row.question : `Question ${index}`, base64 }))
    })

    if (photosToRender.length > 0) {
      doc.addPage()
      doc.setFontSize(18)
      doc.setTextColor(15, 23, 42)
      doc.text("Photos de l'audit", 14, 20)

      let yPos = 30
      
      photosToRender.forEach((item, i) => {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(10)
        doc.setTextColor(100, 116, 139)
        // Coupe le texte si trop long
        const shortQ = item.question.length > 80 ? item.question.substring(0, 80) + '...' : item.question
        doc.text(`Problème : ${shortQ}`, 14, yPos)
        
        const imgWidth = 80
        const imgHeight = 60
        doc.addImage(item.base64, 'JPEG', 14, yPos + 5, imgWidth, imgHeight)
        
        yPos += 75
      })
    }

    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(9)
      doc.setTextColor(150)
      doc.text(`WKW Tunisie - Page ${i} / ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' })
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
                  <th style={{ width: '250px' }}>Photos</th>
                </tr>
              </thead>
              <tbody>
                {selectedAudit.rows.map((r, i) => {
                  const isNok = String(r.reponse).toUpperCase() === 'NOK'
                  const photos = questionPhotos[i] || []
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                              {photos.map((photo, pIdx) => (
                                <div key={pIdx} style={{ position: 'relative' }}>
                                  <img src={photo} alt={`Preuve ${pIdx + 1}`} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                                  <button onClick={() => removePhoto(i, pIdx)} style={{ position: 'absolute', top: -5, right: -5, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                </div>
                              ))}
                            </div>
                            <label className="btn btn-secondary" style={{ cursor: 'pointer', padding: '0.2rem 0.5rem', fontSize: '0.75rem', alignSelf: 'flex-start' }}>
                              📷 Ajouter des photos
                              <input type="file" accept="image/*" multiple onChange={(e) => handlePhotoUpload(i, e)} style={{ display: 'none' }} />
                            </label>
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
