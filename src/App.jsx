import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import PlanAction from './components/PlanAction'
import AnalysesUap from './pages/AnalysesUap'
import PlanifieRealise from './pages/PlanifieRealise'
import ResultatsLigne from './pages/ResultatsLigne'
import TendanceLigne from './pages/TendanceLigne'
import Top3Lignes from './pages/Top3Lignes'
import ResultatsPiliers from './pages/ResultatsPiliers'
import AnalysePriorites from './pages/AnalysePriorites'
import RapportPdf from './pages/RapportPdf'
import { parseFile } from './services/importExcel'
import { fetchAudits, upsertAudits } from './services/auditsApi'

export default function App() {
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [currentView, setCurrentView] = useState('import')
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const data = await fetchAudits()
      setAudits(data)
      setPreviewMode(false)
      if (data.length === 0) setCurrentView('import')
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur de connexion : ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setMessage({ type: '', text: '' })
    
    try {
      const parsed = await parseFile(file)
      setAudits(parsed)
      setPreviewMode(true)
      setMessage({ type: 'success', text: `Fichier lu avec succès. ${parsed.length} audits prêts à être enregistrés.` })
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur de lecture : ' + err.message })
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  async function handleSave() {
    setBusy(true); setMessage({ type: '', text: '' })
    try {
      const count = await upsertAudits(audits)
      setMessage({ type: 'success', text: `${count} audits enregistrés avec succès !` })
      setPreviewMode(false)
      await loadData()
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur d\'enregistrement : ' + err.message })
    } finally {
      setBusy(false)
    }
  }

  function handleCancel() {
    setPreviewMode(false)
    setMessage({ type: '', text: '' })
    loadData()
  }

  if (loading) return <div className="container muted" style={{ marginLeft: 260 }}>Chargement…</div>

  return (
    <div className="app-layout">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        onDataCleared={() => { setAudits([]); setCurrentView('import'); setMessage({type:'', text:''}) }}
        hasData={audits.length > 0 && !previewMode}
      />
      
      <main className="main-content">
        
        {message.text && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
            {message.text}
          </div>
        )}

        {currentView === 'rapport' && !previewMode && <RapportPdf audits={audits} />}
        {currentView === 'analyse' && !previewMode && <AnalysePriorites audits={audits} />}
        {currentView === 'piliers' && !previewMode && <ResultatsPiliers audits={audits} />}
        {currentView === 'top3' && !previewMode && <Top3Lignes audits={audits} />}
        {currentView === 'tendance' && !previewMode && <TendanceLigne audits={audits} />}
        {currentView === 'lignes' && !previewMode && <ResultatsLigne audits={audits} />}
        {currentView === 'planifie' && !previewMode && <PlanifieRealise audits={audits} />}
        {currentView === 'uap' && !previewMode && <AnalysesUap audits={audits} />}
        {currentView === 'actions' && !previewMode && <PlanAction audits={audits} />}

        {currentView === 'import' && (
          <>
            {audits.length === 0 && !previewMode && (
              <div className="card">
                <div className="upload-zone">
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                  <h2 style={{ marginBottom: '1rem' }}>Importer votre fichier Excel</h2>
                  <p className="muted" style={{ marginBottom: '2rem' }}>Sélectionnez votre fichier (.xlsx) pour voir les résultats avant de les enregistrer.</p>
                  <label className="btn btn-primary" style={{ cursor: busy ? 'not-allowed' : 'pointer' }}>
                    {busy ? 'Lecture...' : 'Choisir un fichier Excel'}
                    <input type="file" accept=".xlsx, .xls" onChange={handleFile} disabled={busy} />
                  </label>
                </div>
              </div>
            )}

            {previewMode && (
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.5rem 0' }}>Aperçu des données</h2>
                  <p className="muted" style={{ margin: 0 }}>Vérifiez le tableau ci-dessous, puis cliquez sur Enregistrer.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-secondary" onClick={handleCancel} disabled={busy}>Annuler</button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={busy}>
                    {busy ? 'Enregistrement...' : 'Enregistrer dans la base'}
                  </button>
                </div>
              </div>
            )}

            {audits.length > 0 && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>{previewMode ? 'Données importées' : 'Base de données'} — {audits.length} audits</h3>
                  {!previewMode && (
                    <label className="btn btn-secondary" style={{ cursor: busy ? 'not-allowed' : 'pointer', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                      + Ajouter un fichier
                      <input type="file" accept=".xlsx, .xls" onChange={handleFile} disabled={busy} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Auditeur</th>
                        <th>Zone</th>
                        <th>Pilote</th>
                        <th>Total</th>
                        <th>Score</th>
                        <th>Actions (NOK)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audits.map((a, i) => {
                        const pct = a.total_points && a.max_points ? ((a.total_points / a.max_points) * 100).toFixed(1) : '0.0'
                        const scoreClass = pct >= 80 ? 'ok' : pct >= 60 ? 'warn' : 'bad'
                        const nokActions = (a.checkpoints || []).filter(c => c.a)
                        
                        return (
                          <tr key={i}>
                            <td>{a.date ? new Date(a.date).toLocaleDateString('fr-FR') : '—'}</td>
                            <td>{a.auditor || '—'}</td>
                            <td style={{ fontWeight: 600 }}>{a.zone || '—'}</td>
                            <td>{a.pilot || '—'}</td>
                            <td>{a.total_points} / {a.max_points}</td>
                            <td className={`score ${scoreClass}`}>{pct} %</td>
                            <td>
                              {nokActions.length > 0 ? (
                                <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.8rem', color: 'var(--warning)', whiteSpace: 'normal', minWidth: '300px' }}>
                                  {nokActions.map((act, idx) => (
                                    <li key={idx} style={{ marginBottom: '0.25rem' }}>{act.a}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="muted">Aucune</span>
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
          </>
        )}
      </main>
    </div>
  )
}
