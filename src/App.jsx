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

import ImportGemba from './pages/ImportGemba'
import GembaAudits from './pages/GembaAudits'
import GembaDashboard from './pages/GembaDashboard'
import GembaPlanifieRealise from './pages/GembaPlanifieRealise'

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

  // ... (les fonctions d'import 5S restent inchangées) ...

  if (loading) return <div className="container muted" style={{ marginLeft: 260 }}>Chargement…</div>

  return (
    <div className="app-layout">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      
      <main className="main-content">
        {message.text && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
            {message.text}
          </div>
        )}

        {/* SECTION GEMBA */}
        {currentView === 'import_gemba' && <ImportGemba />}
        {currentView === 'audits_gemba' && <GembaAudits />}
        {currentView === 'planifie_gemba' && <GembaPlanifieRealise />}
        
        {['uap_gemba', 'lignes_gemba', 'top3_gemba', 'piliers_gemba'].includes(currentView) && (
          <GembaDashboard view={currentView} />
        )}

        {/* SECTION 5S (Le reste reste inchangé) */}
        {currentView === 'rapport' && !previewMode && <RapportPdf audits={audits} />}
        {currentView === 'analyse' && !previewMode && <AnalysePriorites audits={audits} />}
        {currentView === 'piliers' && !previewMode && <ResultatsPiliers audits={audits} />}
        {currentView === 'top3' && !previewMode && <Top3Lignes audits={audits} />}
        {currentView === 'tendance' && !previewMode && <TendanceLigne audits={audits} />}
        {currentView === 'lignes' && !previewMode && <ResultatsLigne audits={audits} />}
        {currentView === 'planifie' && !previewMode && <PlanifieRealise audits={audits} />}
        {currentView === 'uap' && !previewMode && <AnalysesUap audits={audits} />}
        {currentView === 'actions' && !previewMode && <PlanAction audits={audits} />}

        {/* IMPORT 5S (Ton code actuel) */}
        {/* ... */}
      </main>
    </div>
  )
}
