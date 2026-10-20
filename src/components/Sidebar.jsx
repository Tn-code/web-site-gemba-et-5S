import { useState } from 'react'

export default function Sidebar({ currentView, setCurrentView, role }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/logo.png" alt="WKW Logo" style={{ height: '32px', objectFit: 'contain', marginRight: '0.5rem' }} />
        <span>WKW Gemba</span>
      </div>
      
      <div className="sidebar-nav">
        
        <div className="sidebar-section">Mon Espace</div>
        <button className={`nav-item ${currentView === 'mes_actions' ? 'active' : ''}`} onClick={() => setCurrentView('mes_actions')}>
          📌 Mes Actions
        </button>

        {/* SECTION 5S */}
        <div className="sidebar-section" style={{ marginTop: '1rem' }}>5S</div>
        
        {role === 'admin' && (
          <>
            <button className={`nav-item ${currentView === 'import' ? 'active' : ''}`} onClick={() => setCurrentView('import')}>
              📥 Importation 5S
            </button>
            <button className={`nav-item ${currentView === 'plan_action_5s' ? 'active' : ''}`} onClick={() => setCurrentView('plan_action_5s')}>
              📋 Plan d'Action 5S
            </button>
            <button className={`nav-item ${currentView === 'pilotes_5s' ? 'active' : ''}`} onClick={() => setCurrentView('pilotes_5s')}>
              👤 Suivi par Pilote
            </button>
            <button className={`nav-item ${currentView === 'historique' ? 'active' : ''}`} onClick={() => setCurrentView('historique')}>
              📜 Historique des Actions
            </button>
          </>
        )}

        <button className={`nav-item ${currentView === 'planifie' ? 'active' : ''}`} onClick={() => setCurrentView('planifie')}>
          📊 Planifié vs Réalisé
        </button>
        <button className={`nav-item ${currentView === 'uap' ? 'active' : ''}`} onClick={() => setCurrentView('uap')}>
          📈 Analyses UAP
        </button>
        <button className={`nav-item ${currentView === 'lignes' ? 'active' : ''}`} onClick={() => setCurrentView('lignes')}>
          📍 Résultats par Ligne
        </button>
        <button className={`nav-item ${currentView === 'top3' ? 'active' : ''}`} onClick={() => setCurrentView('top3')}>
          🏆 Top & Bottom 3
        </button>
        <button className={`nav-item ${currentView === 'heatmap_5s' ? 'active' : ''}`} onClick={() => setCurrentView('heatmap_5s')}>
          🔥 Heatmap 5S
        </button>
        <button className={`nav-item ${currentView === 'piliers' ? 'active' : ''}`} onClick={() => setCurrentView('piliers')}>
          🧭 Résultats par Axe
        </button>
        <button className={`nav-item ${currentView === 'analyse' ? 'active' : ''}`} onClick={() => setCurrentView('analyse')}>
          🎯 Analyse & Priorités
        </button>
        <button className={`nav-item ${currentView === 'rapport' ? 'active' : ''}`} onClick={() => setCurrentView('rapport')}>
          📄 Rapport d'Audit
        </button>

        {/* SECTION GEMBA */}
        <div className="sidebar-section" style={{ marginTop: '1.5rem' }}>Gemba (5M)</div>
        
        {role === 'admin' && (
          <>
            <button className={`nav-item ${currentView === 'import_gemba' ? 'active' : ''}`} onClick={() => setCurrentView('import_gemba')}>
              🏭 Importation Gemba
            </button>
            <button className={`nav-item ${currentView === 'plan_action_gemba' ? 'active' : ''}`} onClick={() => setCurrentView('plan_action_gemba')}>
              📋 Plan d'Action Gemba
            </button>
            <button className={`nav-item ${currentView === 'pilotes_gemba' ? 'active' : ''}`} onClick={() => setCurrentView('pilotes_gemba')}>
              👤 Suivi par Pilote
            </button>
          </>
        )}

        <button className={`nav-item ${currentView === 'planifie_gemba' ? 'active' : ''}`} onClick={() => setCurrentView('planifie_gemba')}>
          📊 Planifié vs Réalisé
        </button>
        <button className={`nav-item ${currentView === 'uap_gemba' ? 'active' : ''}`} onClick={() => setCurrentView('uap_gemba')}>
          📈 Analyses UAP
        </button>
        <button className={`nav-item ${currentView === 'lignes_gemba' ? 'active' : ''}`} onClick={() => setCurrentView('lignes_gemba')}>
          📍 Résultats par Ligne
        </button>
        <button className={`nav-item ${currentView === 'top3_gemba' ? 'active' : ''}`} onClick={() => setCurrentView('top3_gemba')}>
          🏆 Top & Bottom 3
        </button>
        <button className={`nav-item ${currentView === 'heatmap_gemba' ? 'active' : ''}`} onClick={() => setCurrentView('heatmap_gemba')}>
          🔥 Heatmap Gemba
        </button>
        <button className={`nav-item ${currentView === 'piliers_gemba' ? 'active' : ''}`} onClick={() => setCurrentView('piliers_gemba')}>
          🧭 Résultats par M
        </button>
        <button className={`nav-item ${currentView === 'analyse_gemba' ? 'active' : ''}`} onClick={() => setCurrentView('analyse_gemba')}>
          🎯 Analyse & Priorités
        </button>
        <button className={`nav-item ${currentView === 'rapport_gemba' ? 'active' : ''}`} onClick={() => setCurrentView('rapport_gemba')}>
          📄 Rapport d'Audit Gemba
        </button>
      </div>
    </aside>
  )
}
