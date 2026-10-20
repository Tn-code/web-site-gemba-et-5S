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
import PlanAction5S from './pages/PlanAction5S'

import ImportGemba from './pages/ImportGemba'
import GembaDashboard from './pages/GembaDashboard'
import GembaPlanifieRealise from './pages/GembaPlanifieRealise'
import GembaAnalyse from './pages/GembaAnalyse'
import RapportGemba from './pages/RapportGemba'
import PlanActionGemba from './pages/PlanActionGemba'

import { parseFile } from './services/importExcel'
import { fetchAudits, upsertAudits } from './services/auditsApi'

export default function App() {
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [currentView, setCurrentView] = useState('import')
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAudits()
        setAudits(data)
        if (data.length === 0) setCurrentView('import')
      } catch (err) {
        setMessage({ type: 'error', text: err.message })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const parsed = await parseFile(file)
      setAudits(parsed)
      setPreviewMode(true)
      setMessage({ type: 'success', text: `${parsed.length} audits prêts à être enregistrés.` })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  async function handleSave() {
    setBusy(true)
    try {
      const count = await upsertAudits(audits)
      setMessage({ type: 'success', text: `${count} audits enregistrés !` })
      setPreviewMode(false)
      const data = await fetchAudits()
      setAudits(data)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div style={{ padding: 20, marginLeft: 260 }}>Chargement…</div>

  return (
    <div className="app-layout">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      
      <main className="main-content">
        {message.text && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
            {message.text}
          </div>
        )}

        {/* GEMBA */}
        {currentView === 'import_gemba' && <ImportGemba />}
        {currentView === 'planifie_gemba' && <GembaPlanifieRealise />}
        {['uap_gemba', 'lignes_gemba', 'top3_gemba', 'piliers_gemba'].includes(currentView) && <GembaDashboard view={currentView} />}
        {currentView === 'analyse_gemba' && <GembaAnalyse />}
        {currentView === 'plan_action_gemba' && <PlanActionGemba />}
        {currentView === 'rapport_gemba' && <RapportGemba />}

        {/* 5S */}
        {currentView === 'plan_action_5s' && <PlanAction5S />}
        {currentView === 'rapport' && !previewMode && <RapportPdf audits={audits} />}
        {currentView === 'analyse' && !previewMode && <AnalysePriorites audits={audits} />}
        {currentView === 'piliers' && !previewMode && <ResultatsPiliers audits={audits} />}
        {currentView === 'top3' && !previewMode && <Top3Lignes audits={audits} />}
        {currentView === 'tendance' && !previewMode && <TendanceLigne audits={audits} />}
        {currentView === 'lignes' && !previewMode && <ResultatsLigne audits={audits} />}
        {currentView === 'planifie' && !previewMode && <PlanifieRealise audits={audits} />}
        {currentView === 'uap' && !previewMode && <AnalysesUap audits={audits} />}
        {currentView === 'actions' && !previewMode && <PlanAction audits={audits} />}

        {/* IMPORT 5S */}
        {currentView === 'import' && (
          <div className="card">
            {!previewMode ? (
              <div className="upload-zone">
                <div style={{ fontSize: '3rem' }}>📁</div>
                <h2>Importer votre fichier 5S</h2>
                <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                  {busy ? 'Lecture...' : 'Choisir un fichier Excel'}
                  <input type="file" accept=".xlsx, .xls" onChange={handleFile} style={{ display: 'none' }} />
                </label>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Aperçu des données ({audits.length} lignes)</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-secondary" onClick={() => setPreviewMode(false)}>Annuler</button>
                  <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
