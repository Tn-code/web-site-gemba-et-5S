import { useState } from 'react'
import { deleteAllAudits } from '../services/auditsApi'

export default function Sidebar({ currentView, setCurrentView, onDataCleared, hasData }) {
  const [busy, setBusy] = useState(false)

  async function handleClear() {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer TOUTES les données de la base ?")) return
    setBusy(true)
    try {
      await deleteAllAudits()
      onDataCleared()
    } catch (err) {
      alert('Erreur lors de la suppression : ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span style={{ fontSize: '1.5rem' }}>🏭</span> Gemba 5S
      </div>
      
      <div className="sidebar-nav">
        <button className={`nav-item ${currentView === 'import' ? 'active' : ''}`} onClick={() => setCurrentView('import')}>
          📥 Importation & Données
        </button>
        <button className={`nav-item ${currentView === 'actions' ? 'active' : ''}`} onClick={() => setCurrentView('actions')}>
          🎯 Plan d'action
        </button>
        <button className={`nav-item ${currentView === 'planifie' ? 'active' : ''}`} onClick={() => setCurrentView('planifie')}>
          📊 Planifié vs Réalisé
        </button>
        <button className={`nav-item ${currentView === 'uap' ? 'active' : ''}`} onClick={() => setCurrentView('uap')}>
          📈 Analyses UAP
        </button>
        <button className={`nav-item ${currentView === 'lignes' ? 'active' : ''}`} onClick={() => setCurrentView('lignes')}>
          📍 Résultats par Ligne
        </button>
        <button className={`nav-item ${currentView === 'tendance' ? 'active' : ''}`} onClick={() => setCurrentView('tendance')}>
          📉 Tendance par Ligne
        </button>
        <button className={`nav-item ${currentView === 'top3' ? 'active' : ''}`} onClick={() => setCurrentView('top3')}>
          🏆 Top & Bottom 3 Lignes
        </button>
        <button className={`nav-item ${currentView === 'piliers' ? 'active' : ''}`} onClick={() => setCurrentView('piliers')}>
          🧭 Résultats par Axe (5S)
        </button>
        
        {/* NOUVEAU BOUTON */}
        <button className={`nav-item ${currentView === 'analyse' ? 'active' : ''}`} onClick={() => setCurrentView('analyse')}>
          🎯 Analyse & Priorités
        </button>
      </div>

      {hasData && (
        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleClear} disabled={busy}>
            {busy ? 'Suppression...' : 'Effacer les données'}
          </button>
        </div>
      )}
    </aside>
  )
}
