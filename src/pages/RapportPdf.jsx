import { useState, useMemo } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Configuration des 5 piliers
const PILLARS_CONFIG = [
  { name: '1. Seiri (Trier)', range: [0, 3] },
  { name: '2. Seiton (Ranger)', range: [4, 8] },
  { name: '3. Seiso (Nettoyer)', range: [9, 14] },
  { name: '4. Seiketsu (Standardiser)', range: [15, 21] },
  { name: '5. Shitsuke (Respecter)', range: [22, 25] }
]

export default function RapportPdf({ audits }) {
  const [selectedAuditId, setSelectedAuditId] = useState('')

  const sortedAudits = useMemo(() => {
    return [...audits].sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [audits])

  const selectedAudit = useMemo(() => {
    return sortedAudits.find(a => `${a.date}|${a.zone}|${a.auditor}` === selectedAuditId)
  }, [sortedAudits, selectedAuditId])

  const generatePDF = () => {
    if (!selectedAudit) return

    const doc = new jsPDF()
    const pct = selectedAudit.total_points && selectedAudit.max_points 
      ? ((selectedAudit.total_points / selectedAudit.max_points) * 100).toFixed(1) 
      : '0.0'

    // --- CALCUL DES SCORES PAR PILIER POUR CET AUDIT ---
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

    // --- EN-TÊTE AVEC LOGO ---
    // Le logo est chargé depuis le dossier public/
    const img = new Image()
    img.src = '/logo.png'
    
    // On ajoute le logo (s'il charge correctement)
    try {
      doc.addImage(img, 'PNG', 14, 10, 20, 20)
    } catch (e) {
      console.warn("Logo non trouvé, vérifiez public/logo.png");
    }

    doc.setFontSize(22)
    doc.setTextColor(15, 23, 42) // Bleu foncé
    doc.text("Rapport d'Audit 5S", 40, 20) // Décalé pour laisser la place au logo

    doc.setFontSize(11)
    doc.setTextColor(100, 116, 139) // Gris
    doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')}`, 40, 28)

    // --- INFOS GÉNÉRALES ---
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
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      styles: { fontSize: 11, cellPadding: 4 },
    })

    // --- ANALYSE PAR AXE (NOUVEAU) ---
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Pilier 5S (Axe)', 'Points OK', 'Points NOK', 'Score de l\'axe']],
      body: pillarStats,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 11, cellPadding: 4 },
    })

    // --- DÉTAIL DES QUESTIONS ---
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text("Détail de l'audit (26 questions)", 14, doc.lastAutoTable.finalY + 15)

    const tableData = (selectedAudit.checkpoints || []).map((cp, index) => [
      index + 1,
      cp.q,
      cp.s || '—',
      cp.a || '—'
    ])

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['N°', 'Question 5S', 'Statut', 'Action / Commentaire']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 75 },
        2: { cellWidth: 20, fontStyle: 'bold', halign: 'center' },
        3: { cellWidth: 'auto' },
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 2) {
          if (data.cell.raw === 'OK') data.cell.styles.textColor = [16, 185, 129] // Vert
          if (data.cell.raw === 'NOK') data.cell.styles.textColor = [239, 68, 68] // Rouge
        }
      }
    })

    // --- PIED DE PAGE ---
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(9)
      doc.setTextColor(150)
      doc.text(
        `WKW Tunisie - Rapport confidentiel - Page ${i} / ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      )
    }

    // Téléchargement
    doc.save(`Audit_5S_${selectedAudit.zone}_${selectedAudit.date}.pdf`)
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Rapport d'Audit PDF</h1>
      </div>

      <div className="card">
        <h2 className="card-title">Sélectionner un audit à exporter</h2>
        <p className="muted" style={{ marginBottom: '1.5rem' }}>
          Choisissez un audit dans la liste ci-dessous pour générer un rapport PDF professionnel incluant le logo de l'entreprise et l'analyse par pilier 5S.
        </p>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '300px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Choisir l'audit</label>
            <select 
              className="filter-control" 
              value={selectedAuditId} 
              onChange={e => setSelectedAuditId(e.target.value)}
            >
              <option value="">-- Sélectionner un audit --</option>
              {sortedAudits.map(a => (
                <option key={`${a.date}|${a.zone}|${a.auditor}`} value={`${a.date}|${a.zone}|${a.auditor}`}>
                  {new Date(a.date).toLocaleDateString('fr-FR')} — {a.zone} (Auditeur: {a.auditor})
                </option>
              ))}
            </select>
          </div>

          <button 
            className="btn btn-primary" 
            onClick={generatePDF} 
            disabled={!selectedAudit}
            style={{ height: '42px', padding: '0 2rem' }}
          >
            📥 Télécharger le PDF
          </button>
        </div>
      </div>

      {/* APERÇU DU RAPPORT SÉLECTIONNÉ */}
      {selectedAudit && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h2 className="card-title">Aperçu des informations</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 8 }}>
              <div className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Ligne / Zone</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedAudit.zone}</div>
            </div>
            <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 8 }}>
              <div className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Auditeur</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedAudit.auditor}</div>
            </div>
            <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 8 }}>
              <div className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Score Global</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                {((selectedAudit.total_points / selectedAudit.max_points) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="table-wrapper" style={{ maxHeight: '400px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Statut</th>
                  <th>Action / Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {(selectedAudit.checkpoints || []).map((cp, i) => (
                  <tr key={i}>
                    <td style={{ maxWidth: '400px', whiteSpace: 'normal' }}>{cp.q}</td>
                    <td>
                      <span className={`badge ${cp.s === 'OK' ? 'ok' : cp.s === 'NOK' ? 'bad' : ''}`}>
                        {cp.s || 'N/A'}
                      </span>
                    </td>
                    <td style={{ maxWidth: '300px', whiteSpace: 'normal', color: 'var(--text-muted)' }}>
                      {cp.a || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
