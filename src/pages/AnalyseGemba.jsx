import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function AnalyseGemba() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterUAP, setFilterUAP] = useState('')

  useEffect(() => {
    supabase.from('gemba_audits').select('*').order('date', { ascending: false }).then(({ data, error }) => {
      if (!error) setData(data || [])
      setLoading(false)
    })
  }, [])

  const uaps = useMemo(() => [...new Set(data.map(d => d.uap).filter(Boolean))].sort(), [data])

  const filtered = useMemo(() => data.filter(d => !filterUAP || d.uap === filterUAP), [data, filterUAP])

  // Calcul des moyennes par ligne
  const lineStats = useMemo(() => {
    const groups = {}
    filtered.forEach(row => {
      if (!row.ligne) return
      if (!groups[row.ligne]) groups[row.ligne] = { sum: 0, count: 0 }
      groups[row.ligne].sum += Number(row.score)
      groups[row.ligne].count++
    })
    return Object.entries(groups)
      .map(([ligne, s]) => ({ ligne, score: Math.round(s.sum / s.count) }))
      .sort((a, b) => b.score - a.score)
  }, [filtered])

  const top3 = lineStats.slice(0, 3)
  const bottom3 = [...lineStats].reverse().slice(0, 3)

  if (loading) return <p className="muted">Chargement…</p>

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Analyses Gemba (5M)</h1>
      </div>

      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '200px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filtrer par UAP</label>
          <select className="filter-control" value={filterUAP} onChange={e => setFilterUAP(e.target.value)}>
            <option value="">Tous les UAP</option>
            {uaps.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={() => setFilterUAP('')}>Réinitialiser</button>
      </div>

      <div className="grid-2">
        <div className="card" style={{ borderTop: '4px solid var(--success)' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--success)' }}>🏆 Top 3 Lignes Gemba</h3>
          <ul className="top-list">
            {top3.map((item, i) => (
              <li key={item.ligne} style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold' }}>#{i + 1} {item.ligne}</span>
                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{item.score}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card" style={{ borderTop: '4px solid var(--danger)' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--danger)' }}>⚠️ Bottom 3 Lignes Gemba</h3>
          <ul className="top-list">
            {bottom3.map((item, i) => (
              <li key={item.ligne} style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold' }}>#{i + 1} {item.ligne}</span>
                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{item.score}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
