import { useState, useMemo } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const PILLARS_CONFIG = [
  { name: '1. Seiri (Trier)', range: [0, 3] },
  { name: '2. Seiton (Ranger)', range: [4, 8] },
  { name: '3. Seiso (Nettoyer)', range: [9, 14] },
  { name: '4. Seiketsu (Standardiser)', range: [15, 21] },
  { name: '5. Shitsuke (Respecter)', range: [22, 25] }
]

export default function RapportPdf({ audits }) {
  const [selectedAuditId, setSelectedAuditId] = useState('')
  // On stocke maintenant un tableau de photos par index : { 2: ["base64_1", "base64_2"], ... }
  const [questionPhotos, setQuestionPhotos] = useState({})

  const sortedAudits = useMemo(() => {
    return [...audits].sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [audits])

  const selectedAudit = useMemo(() => {
    return sortedAudits.find(a => `${a.date}|${a.zone}|${a.auditor}` === selectedAuditId)
  }, [sortedAudits, selectedAuditId])

  // Ajouter une ou plusieurs photos
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

    const imgLogo = new Image()
    imgLogo.src = '/logo.png'
    try { doc.addImage(imgLogo, 'PNG', 14, 10, 20, 20) } catch (e) {}

    doc.setFontSize(22)
    doc.setTextColor(15, 23, 42)
    doc.text("Rapport d'Audit 5S", 40, 20)
    doc.setFontSize(11)
    doc.setTextColor(100, 116, 139)
    doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')}`, 40, 28)

    autoTable(doc, {
      startY: 40,
      head: [['Informations sur l\'audit', 'Détails']],
      body: [
        ['Date de l\'audit', new Date(selectedAudit.date).toLocaleDateString('fr-FR')],
        ['Ligne / Zone auditée', selectedAudit.zone || '—'],
        ['Auditeur', selectedAudit.auditor || '—'],
        ['Pilote de la zone', selectedAudit.pilot || '—'],
        ['Score Global', `${selectedAudit.score_pct} %`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Pilier 5S (Axe)', 'OK', 'NOK', 'Score']],
      body: pillarStats,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
    })

    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text("Détail de l'audit (26 questions)", 14, doc.lastAutoTable.finalY + 12)

    const tableData = (selectedAudit.checkpoints || []).map((cp, index) => {
      const photosCount = questionPhotos[index]?.length || 0
      return [
        index + 1,
        cp.q,
        cp.s || '—',
        cp.a || '—',
        photosCount > 0 ? `${photosCount} photo(s)` : '—'
      ]
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16,
      head: [['N°', 'Question 5S', 'Statut', 'Action / Commentaire', 'Photos']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 60 },
        2: { cellWidth: 15, fontStyle: 'bold', halign: 'center' },
        3: { cellWidth: 60 },
        4: { cellWidth: 25, halign: 'center' },
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
      photos.forEach(base64 => photosToRender.push({ questionNum: parseInt(index) + 1, base64 }))
    })

    if (photosToRender.length > 0) {
      doc.addPage()
      doc.setFontSize(18)
      doc.setTextColor(15, 23, 42)
      doc.text("Photos de l'audit", 14, 20)

      let yPos = 30
      const pageWidth = doc.internal.pageSize.width - 28
      
      photosToRender.forEach((item, i) => {
        if (yPos > 250) { // Nouvelle page si on arrive en bas
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(10)
        doc.setTextColor(100, 116, 139)
        doc.text(`Question N°${item.questionNum}`, 14, yPos)
        
        // Taille d'image max 60mm de haut pour en mettre plusieurs
        const imgWidth = 80
        const imgHeight = 60
        doc.addImage(item.base64, 'JPEG', 14, yPos + 5, imgWidth, imgHeight)
        
        yPos += 75 // On décale vers le bas pour la photo suivante
      })
    }

    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(9)
      doc.setTextColor(150)
      doc.text(`WKW Tunisie - Page ${i} / ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' })
    }

    doc.save(`Audit_5S_${selectedAudit.zone}_${selectedAudit.date}.pdf`)
    setQuestionPhotos({})
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Rapport d'Audit 5S</h1>
      </div>

      <div className="card">
        <h2 className="card-title">1. Sélectionner un audit</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '300px' }}>
            <select className="filter-control" value={selectedAuditId} onChange={e => { setSelectedAuditId(e.target.value); setQuestionPhotos({}); }}>
              <option value="">-- Choisir un audit --</option>
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
            <span className="muted" style={{ fontSize: '0.875rem' }}>Ajoutez autant de photos que nécessaire</span>
          </div>
          
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Question 5S</th>
                  <th>Statut</th>
                  <th>Action / Commentaire</th>
                  <th style={{ width: '250px' }}>Photos</th>
                </tr>
              </thead>
              <tbody>
                {(selectedAudit.checkpoints || []).map((cp, i) => {
                  const isNok = cp.s === 'NOK'
                  const photos = questionPhotos[i] || []
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                              {photos.map((photo, pIdx) => (
                                <div key={pIdx} style={{ position: 'relative' }}>
                                  <img src={photo} alt={`Preuve ${pIdx + 1}`} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                                  <button 
                                    onClick={() => removePhoto(i, pIdx)}
                                    style={{ position: 'absolute', top: -5, right: -5, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    ✕
                                  </button>
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
