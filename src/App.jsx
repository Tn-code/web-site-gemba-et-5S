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
import Pilotes5S from './pages/Pilotes5S' // Nouveau

import ImportGemba from './pages/ImportGemba'
import GembaDashboard from './pages/GembaDashboard'
import GembaPlanifieRealise from './pages/GembaPlanifieRealise'
import GembaAnalyse from './pages/GembaAnalyse'
import RapportGemba from './pages/RapportGemba'
import PlanActionGemba from './pages/PlanActionGemba'
import PilotesGemba from './pages/PilotesGemba' // Nouveau

import Login from './pages/Login'
import { supabase } from './supabaseClient'
import { parseFile } from './services/importExcel'
import { fetchAudits, upsertAudits } from './services/auditsApi'

export default function App() {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState('user')
  const [loading, setLoading] = useState(true)
  const [audits, setAudits] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [currentView, setCurrentView] = useState('import')
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchUserRole(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchUserRole(session.user.id)
      else setRole('user')
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserRole(userId) {
    const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (!error && data) setRole(data.role)
    setLoading(false)
  }

  useEffect(() => {
    if (!session) return
    async function load() {
      try {
        const data = await fetchAudits()
        setAudits(data)
        if (data.length === 0) setCurrentView('import')
      } catch (err) {
        setMessage({ type: 'error', text: err.message })
      }
    }
    load()
  }, [session])

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

  if (loading) return <div style={{ padding: 20, textAlign: 'center', marginTop: '20vh' }}>Chargement…</div>
  if (!session) return <Login />

  return (
    <div className="app-layout">
      <div style={{ position: 'fixed', bottom: 15, left: 15, zIndex: 100 }}>
        <button className="btn btn-danger" onClick={() => supabase.auth.signOut()} style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
          Déconnexion
        </button>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          {session.user.email} <br/> ({role})
        </div>
      </div>

      <Sidebar currentView={currentView} setCurrentView={setCurrentView} role={role} />
      
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
        {currentView === 'pilotes_gemba' && <PilotesGemba />}
        {currentView === 'rapport_gemba' && <RapportGemba />}

        {/* 5S */}
        {currentView === 'plan_action_5s' && <PlanAction5S />}
        {currentView === 'pilotes_5s' && <Pilotes5S />}
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
