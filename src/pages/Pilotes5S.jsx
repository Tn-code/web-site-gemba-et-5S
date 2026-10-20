import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { fetchActions } from '../services/actionsApi'

export default function Pilotes5S() {
  const [audits, setAudits] = useState([])
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('audits').select('*'),
      fetchActions()
    ]).then(([auditsRes, actionsRes]) => {
      if (!auditsRes.error) setAudits(auditsRes.data || [])
      setActions(actionsRes)
      setLoading(false)
    })
  }, [])

  // On regroupe les actions par pilote
  const piloteStats = useMemo(() => {
    const stats = {}

    // On parcourt les actions existantes
    actions.filter(a => a.type === '5S').forEach(action => {
      const pilote = action.pilote_email || 'Non assigné'
      
      if (!stats[pilote]) {
        stats[pilote] = { total: 0, realisees: 0, nonRealisees: 0 }
      }

      stats[pilote].total++
      if (action.progression === 100) {
        stats[pilote].realisees++
      } else {
        stats[pilote].nonRealisees++
      }
    })

    // Pour les NOK qui n'ont pas encore d'action, on les compte dans "Non assigné"
    let unassignedCount = 0
    audits.forEach(audit => {
      (audit.checkpoints || []).forEach(cp => {
        if (cp.s === 'NOK') {
          const hasAction = actions.find(a => a.type === '5S' && a.audit_date === audit.date && a.ligne === audit.zone && a.question === cp.q)
          if (!hasAction) unassignedCount++
        }
      })
    })

    if (unassignedCount > 0) {
      if (!stats['Non assigné']) stats['Non assigné'] = { total: 0, realisees: 0, nonRealisees: 0 }
      stats['Non assigné'].total += unassignedCount
      stats['Non assigné'].nonRealisees += unassignedCount
    }

    return Object.entries(stats).map(([email, data]) => ({
      email,
      ...data,
      taux: data.total > 0 ? Math.round((data.realisees / data.total) * 100) : 0
    })).sort((a, b) => b.total - a.total)
  }, [audits, actions])

  if (loading) return <p className="muted" style={{ padding: '2rem' }}>Chargement…</p>

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Suivi par Pilote (5S)</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {piloteStats.length === 0 ? (
          <p className="muted">Aucune action assignée pour le moment.</p>
        ) : piloteStats.map((p) => (
          <div key={p.email} className="card" style={{ borderTop: `4px solid ${p.taux === 100 ? 'var(--success)' : p.taux > 0 ? 'var(--warning)' : 'var(--danger)'}` }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>👤 {p.email}</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{p.total}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{p.realisees}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Réalisées</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>{p.nonRealisees}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>En cours</div>
              </div>
            </div>

            {/* Barre de progression globale */}
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-hover)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${p.taux}%`, height: '100%', background: p.taux === 100 ? 'var(--success)' : 'var(--warning)', borderRadius: '4px' }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>Avancement : {p.taux}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}
