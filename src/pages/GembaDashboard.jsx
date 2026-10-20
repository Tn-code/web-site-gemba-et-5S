import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { 
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid, LabelList,
  RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts'

const getScoreColor = (score) => score >= 87 ? '#10b981' : score >= 85 ? '#f59e0b' : '#ef4444'

export default function GembaDashboard({ view }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('gemba_audits').select('*').order('date', { ascending: true }).then(({ data, error }) => {
      if (!error) setData(data || [])
      setLoading(false)
    })
  }, [])

  // Regroupement par Audit (pour les scores par ligne/UAP)
  const auditsGrouped = useMemo(() => {
    const groups = {}
    data.forEach(row => {
      const auditKey = `${row.date}|${row.ligne}`
      if (!groups[auditKey]) {
        groups[auditKey] = { 
          date: row.date, ligne: row.ligne, uap: row.uap, 
          ok: 0, nok: 0, total_questions: 0, seenQuestions: new Set() 
        }
      }
      const qText = String(row.question).trim().toLowerCase()
      if (groups[auditKey].seenQuestions.has(qText)) return
      groups[auditKey].seenQuestions.add(qText)
      
      const rep = String(row.reponse).toUpperCase()
      if (rep === 'OK') groups[auditKey].ok++
      if (rep === 'NOK') groups[auditKey].nok++
      if (rep !== 'N/A') groups[auditKey].total_questions++
    })
    return Object.values(groups).map(a => ({
      ...a,
      score: a.total_questions > 0 ? Math.round((a.ok / a.total_questions) * 100) : 0
    }))
  }, [data])

  // Stats UAP
  const uapStats = useMemo(() => {
    const groups = {}
    auditsGrouped.forEach(a => {
      if (!a.uap) return
      if (!groups[a.uap]) groups[a.uap] = { sum: 0, count: 0 }
      groups[a.uap].sum += a.score
      groups[a.uap].count++
    })
    return Object.entries(groups).map(([uap, s]) => ({ uap, score: Math.round(s.sum / s.count) })).sort((a, b) => b.score - a.score)
  }, [auditsGrouped])

  // Stats Ligne
  const lineStats = useMemo(() => {
    const groups = {}
    auditsGrouped.forEach(a => {
      if (!a.ligne) return
      if (!groups[a.ligne]) groups[a.ligne] = { sum: 0, count: 0 }
      groups[a.ligne].sum += a.score
      groups[a.ligne].count++
    })
    return Object.entries(groups).map(([ligne, s]) => ({ ligne, score: Math.round(s.sum / s.count) })).sort((a, b) => b.score - a.score)
  }, [auditsGrouped])

  // Stats 5M
  const mStats = useMemo(() => {
    const groups = {}
    data.forEach(row => {
      if (!row.point_m) return
      const rep = String(row.reponse).toUpperCase()
      if (rep === 'N/A') return 
      if (!groups[row.point_m]) groups[row.point_m] = { ok: 0, total: 0 }
      groups[row.point_m].total++
      if (rep === 'OK') groups[row.point_m].ok++
    })
    return Object.entries(groups).map(([subject, s]) => ({ subject, score: Math.round((s.ok / s.total) * 100) })).sort((a, b) => b.score - a.score)
  }, [data])

  if (loading) return <p className="muted" style={{ padding: '2rem' }}>Chargement…</p>

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>
          {view === 'uap_gemba' && 'Analyses par UAP'}
          {view === 'lignes_gemba' && 'Résultats par Ligne'}
          {view === 'top3_gemba' && 'Top & Bottom 3'}
          {view === 'piliers_gemba' && 'Résultats par M (Radar)'}
        </h1>
      </div>

      {view === 'uap_gemba' && (
        <div className="card">
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={uapStats} margin={{ top: 30, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="uap" tick={{ fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} formatter={(v) => [`${v}%`, 'Score']} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={80}>
                  {uapStats.map((entry, index) => <Cell key={index} fill={getScoreColor(entry.score)} />)}
                  <LabelList dataKey="score" position="top" fill="#f8fafc" formatter={(v) => `${v}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {view === 'lignes_gemba' && (
        <div className="card">
          <div style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lineStats} margin={{ top: 30, right: 30, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="ligne" tick={{ fill: '#94a3b8' }} angle={-45} textAnchor="end" />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} formatter={(v) => [`${v}%`, 'Score']} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {lineStats.map((entry, index) => <Cell key={index} fill={getScoreColor(entry.score)} />)}
                  <LabelList dataKey="score" position="top" fill="#f8fafc" formatter={(v) => `${v}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {view === 'top3_gemba' && (
        <div className="grid-2">
          <div className="card" style={{ borderTop: '4px solid var(--success)' }}>
            <h3 className="card-title" style={{ color: 'var(--success)' }}>🏆 Top 3 Lignes Gemba</h3>
            <ul className="top-list">
              {lineStats.slice(0, 3).map((item, i) => (
                <li key={item.ligne} style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>#{i+1}</strong> {item.ligne}</span>
                  <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{item.score}%</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card" style={{ borderTop: '4px solid var(--danger)' }}>
            <h3 className="card-title" style={{ color: 'var(--danger)' }}>⚠️ Bottom 3 Lignes Gemba</h3>
            <ul className="top-list">
              {[...lineStats].reverse().slice(0, 3).map((item, i) => (
                <li key={item.ligne} style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>#{i+1}</strong> {item.ligne}</span>
                  <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{item.score}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {view === 'piliers_gemba' && (
        <div className="card">
          <div style={{ height: 450 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={mStats}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#f8fafc', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} formatter={(v) => [`${v}%`, 'Score']} />
                <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
