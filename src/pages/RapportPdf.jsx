import { useState, useMemo, useEffect } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const PILLARS_CONFIG = [
  { name: '1. Seiri (Trier)', range: [0, 3] },
  { name: '2. Seiton (Ranger)', range: [4, 8] },
  { name: '3. Seiso (Nettoyer)', range: [9, 14] },
  { name: '4. Seiketsu (Standardiser)', range: [15, 21] },
  { name: '5. Shitsuke (Respecter)', range: [22, 25] }
]

const STORAGE_KEY = 'gemba_5s_photos'

export default function RapportPdf({ audits }) {
  const [selectedAuditId, setSelectedAuditId] = useState('')
  
  const [questionPhotos, setQuestionPhotos] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch (e) { return {} }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(questionPhotos)) } catch (e) {}
  }, [questionPhotos])

  const sortedAudits = useMemo(() => [...audits].sort((a, b) => new Date(b.date) - new Date(a.date)), [audits])

  const selectedAudit = useMemo(() => sortedAudits.find(a => `${a.date}|${a.zone}|${a.auditor}` === selectedAuditId), [sortedAudits, selectedAuditId])

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

    const doc = new jsPDF('p', 'mm', 'a4')
    const pct = selectedAudit.total_points && selectedAudit.max_points 
      ? ((selectedAudit.total_points / selectedAudit.max_points) * 100).toFixed(1) 
      : '0.0'

    const pillarStats = PILLARS_CONFIG.map(pillar => {
      let ok = 0, nok = 0
      const cps = selectedAudit.checkpoints || []
      for (let i = pillar.range[0]; i <= pillar.range[1]; i++) {
        if (cps[i] && cps[i].s) {
          if (cps[i].s === 'OK') ok++
          if (cps[i].s === 'NOK') nok++
        }
      }
      const total = ok + nok
      const score = total > 0 ? Math.round((ok / total) * 100) : 0
      return [pillar.name, `${ok} OK`, `${nok} NOK`, `${score} %`]
    })

    // En-tête
    const imgLogo = new Image()
    imgLogo.src = '/logo.png'
    try { doc.addImage(imgLogo, 'PNG', 14, 10, 20, 20) } catch (e) {}

    doc.setFontSize(22)
    doc.setTextColor(15, 23, 42)
    doc.text("Rapport d'Audit 5S", 40, 20)
    doc.setFontSize(11)
    doc.setTextColor(100, 116, 139)
    doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')}`, 40, 28)

    // Infos générales
    autoTable(doc, {
      startY: 40,
      head: [['Informations sur l\'audit', 'Détails']],
      body: [
        ['Date de l\'audit', new Date(selectedAudit.date).toLocaleDateString('fr-FR')],
        ['Ligne / Zone auditée', selectedAudit.zone || '—'],
        ['Auditeur', selectedAudit.auditor || '—'],
        ['Pilote de la zone', selectedAudit.pilot || '—'],
        ['Score Global de l\'audit', `${pct} % (${selectedAudit.total_points} / ${selectedAudit.max_points})`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
    })

    // Analyse par Axe
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Pilier 5S (Axe)', 'OK', 'NOK', 'Score']],
      body: pillarStats,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
    })

    // Détail des questions
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text("Détail de l'audit (26 questions)", 14, doc.lastAutoTable.finalY + 12)

    const tableData = (selectedAudit.checkpoints || []).map((cp, index) => {
      // Si on a une photo, on met un espace, sinon un tiret
      const photoPlaceholder = questionPhotos[index] ? ' ' : '—'
      return [
        index + 1,
        cp.q,
        cp.s || '—',
        cp.a || '—',
        photoPlaceholder 
      ]
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16,
      head: [['N°', 'Question 5S', 'Statut', 'Action / Commentaire', 'Photo']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle', overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 60 }, // Réduit pour laisser de la place à la photo
        2: { cellWidth: 15, fontStyle: 'bold', halign: 'center' },
        3: { cellWidth: 60 },
        4: { cellWidth: 35, halign: 'center' }, // Colonne photo plus large
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 2) {
          if (data.cell.raw === 'OK') data.cell.styles.textColor = [16, 185, 129]
          if (data.cell.raw === 'NOK') data.cell.styles.textColor = [239, 68, 68]
        }
      },
      didDrawCell: function (data) {
        // Insertion de l'image si c'est la colonne 4 et qu'on a une photo
        if (data.section === 'body' && data.column.index === 4) {
          const rowIndex = data.row.index
          if (questionPhotos[rowIndex]) {
            const imgWidth = data.cell.width - 4
            const imgHeight = data.cell.height - 4
            // On ajuste la taille de l'image pour qu'elle rentre dans la cellule
            doc.addImage(questionPhotos[rowIndex], 'JPEG', data.cell.x + 2, data.cell.y + 2, imgWidth, imgHeight)
          }
        }
      }
    })

    // Pied de page
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`WKW Tunisie - Page ${i} / ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: 'center' })
    }

    doc.save(`Audit_5S_${selectedAudit.zone}_${selectedAudit.date}.pdf`)

    setQuestionPhotos({})
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Rapport d'Audit PDF</h1>
      </div>

      <div className="card">
        <h2 className="card-title">1. Sélectionner un audit</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '300px' }}>
            <select className="filter-control" value={selectedAuditId} onChange={e => setSelectedAuditId(e.target.value)}>
              <option value="">-- Choisir une ligne / audit --</option>
              {sortedAudits.map(a => (
                <option key={`${a.date}|${a.zone}|${a.auditor}`} value={`${a.date}|${a.zone}|${a.auditor}`}>
                  {new Date(a.date).toLocaleDateString('fr-FR')} — {a.zone} (Auditeur: {a.auditor})
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={generatePDF} disabled={!selectedAudit} style={{ height: '42px', padding: '0 2rem' }}>
            📥 Télécharger le PDF
          </button>
        </div>
      </div>

      {selectedAudit && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>2. Ajouter des photos aux problèmes (NOK)</h2>
            <span className="muted" style={{ fontSize: '0.875rem' }}>Ajoutez des photos pour illustrer les problèmes.</span>
          </div>
          
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Question 5S</th>
                  <th>Statut</th>
                  <th>Action / Commentaire</th>
                  <th>Photo</th>
                </tr>
              </thead>
              <tbody>
                {(selectedAudit.checkpoints || []).map((cp, i) => {
                  const isNok = cp.s === 'NOK'
                  return (
                    <tr key={i} style={{ background: isNok ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                      <td>{i + 1}</td>
                      <td style={{ maxWidth: '300px', whiteSpace: 'normal' }}>{cp.q}</td>
                      <td>
                        <span className={`badge ${cp.s === 'OK' ? 'ok' : cp.s === 'NOK' ? 'bad' : ''}`}>
                          {cp.s || 'N/A'}
                        </span>
                      </td>
                      <td style={{ maxWidth: '250px', whiteSpace: 'normal', color: 'var(--text-muted)' }}>
                        {cp.a || '—'}
                      </td>
                      <td>
                        {isNok && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {questionPhotos[i] ? (
                              <div style={{ position: 'relative' }}>
                                <img src={questionPhotos[i]} alt="Preuve NOK" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                                <button 
                                  onClick={() => removePhoto(i)}
                                  style={{ position: 'absolute', top: -5, right: -5, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  ✕
                                </button>
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
