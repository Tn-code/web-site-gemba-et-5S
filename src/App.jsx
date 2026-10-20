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
import GembaAudits from './pages/GembaAudits' // Nouvelle page
import GembaAnalyses from './pages/GembaAnalyses'
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

  // Le reste des fonctions d'import 5S...
  async function handleFile(e) { /* ... */ }
  async function handleSave() { /* ... */ }
  function handleCancel() { /* ... */ }

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
        {currentView === 'audits_gemba' && <GembaAudits />} {/* Lien ajouté ici */}
        {currentView.endsWith('_gemba') && currentView !== 'import_gemba' && currentView !== 'audits_gemba' && (
          <GembaAnalyses view={currentView} />
        )}

        {/* SECTION 5S (inchangé) */}
        {/* ... */}
      </main>
    </div>
  )
}
