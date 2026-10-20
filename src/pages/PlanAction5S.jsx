import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { fetchActions, upsertAction } from '../services/actionsApi'

export default function PlanAction5S() {
  const [audits, setAudits] = useState([])
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('audits').select('*').order('date', { ascending: false }),
      fetchActions()
    ]).then(([auditsRes, actionsRes]) => {
      if (!auditsRes.error) setAudits(auditsRes.data || [])
      setActions(actionsRes)
      setLoading(false)
    })
  }, [])

  const nokQuestions = useMemo(() => {
    const list = []
    audits.forEach(audit => {
      (audit.checkpoints || []).forEach(cp => {
        if (cp.s === 'NOK') {
          const existingAction = actions.find(a => a.type === '5S' && a.audit_date === audit.date && a.ligne === audit.zone && a.question === cp.q)
          list.push({
            type: '5S', audit_date: audit.date, ligne: audit.zone, point_m: '', question: cp.q,
            action_texte: existingAction?.action_texte || '', progression: existingAction?.progression || 0
          })
        }
      })
    })
    return list
  }, [audits, actions])

  // Calcul des KPI
  const totalActions = nokQuestions.length
  const actionsRealisees = nokQuestions.filter(a => a.progression === 100).length
  const actionsNonRealisees = totalActions - actionsRealisees
  const tauxRealisation = totalActions > 0 ? Math.round((actionsRealisees / totalActions) * 100) : 0

  const handleUpdate = async (item, newProgression, newTexte) => {
    const updated = { ...item, progression: newProgression, action_texte: newTexte }
    await upsertAction(updated)
    setActions(prev => {
      const idx = prev.findIndex(a => a.audit_date === updated.audit_date && a.ligne === updated.ligne && a.question === updated.question)
      if (idx >= 0) { const copy = [...prev]; copy[idx] = updated; return copy }
      return [...prev, updated]
    })
  }

  if (loading) return <p className="muted" style={{ padding: '2rem' }}>Chargement…</p>

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Plan d'Action 5S</h1>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total des actions</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{totalActions}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Actions réalisées</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--success)' }}>{actionsRealisees}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Non réalisées</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--danger)' }}>{actionsNonRealisees}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Taux d'avancement</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>{tauxRealisation} %</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Zone</th>
                <th>Problème (NOK)</th>
                <th>Action</th>
                <th style={{ width: '200px' }}>Progression</th>
              </tr>
            </thead>
            <tbody>
              {nokQuestions.map((item, i) => (
                <tr key={i}>
                  <td>{new Date(item.audit_date).toLocaleDateString('fr-FR')}</td>
                  <td style={{ fontWeight: 'bold' }}>{item.ligne}</td>
                  <td style={{ whiteSpace: 'normal', maxWidth: '300px' }}>{item.question}</td>
                  <td>
                    <input type="text" className="filter-control" style={{ width: '100%' }} defaultValue={item.action_texte} onBlur={(e) => handleUpdate(item, item.progression, e.target.value)} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="range" min="0" max="100" step="25" value={item.progression} onChange={(e) => handleUpdate(item, Number(e.target.value), item.action_texte)} style={{ flex: 1 }} />
                      <span style={{ width: '40px', textAlign: 'right', fontWeight: 'bold', color: item.progression === 100 ? 'var(--success)' : 'var(--text-main)' }}>{item.progression}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
