import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { 
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid, LabelList,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  LineChart, Line
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

  // 1. Regroupement par Audit
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

  // 2. Calcul des moyennes globales
  const uapStats = useMemo(() => {
    const stats = {
      'UAP 1': { sum: 0, count: 0 },
      'UAP 2': { sum: 0, count: 0 },
      'LOGISTIQUE': { sum: 0, count: 0 },
      'USINE': { sum: 0, count: 0 }
    }

    auditsGrouped.forEach(audit => {
      if (!audit.uap) return
      const uapName = audit.uap.toUpperCase()
      if (stats[uapName]) {
        stats[uapName].sum += audit.score
        stats[uapName].count++
      }
      stats['USINE'].sum += audit.score
      stats['USINE'].count++
    })

    const format = (name) => {
      const s = stats[name]
      return s.count > 0 ? Math.round(s.sum / s.count) : 0
    }

    return [
      { uap: 'UAP 1', score: format('UAP 1') },
      { uap: 'UAP 2', score: format('UAP 2') },
      { uap: 'Logistique', score: format('LOGISTIQUE') },
      { uap: 'Usine (Global)', score: format('USINE') }
    ]
  }, [auditsGrouped])

  // 3. Calcul des données par mois pour chaque UAP
  const trendData = useMemo(() => {
    const monthsMap = {}

    auditsGrouped.forEach(audit => {
      const monthKey = audit.date.slice(0, 7) // YYYY-MM
      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = {
          month: monthKey,
          label: new Date(monthKey + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
          uap1: { sum: 0, count: 0 },
          uap2: { sum: 0, count: 0 },
          logistique: { sum: 0, count: 0 },
          usine: { sum: 0, count: 0 }
        }
      }

      const uapName = audit.uap ? audit.uap.toUpperCase() : ''
      const m = monthsMap[monthKey]
      
      if (uapName === 'UAP 1') { m.uap1.sum += audit.score; m.uap1.count++ }
      else if (uapName === 'UAP 2') { m.uap2.sum += audit.score; m.uap2.count++ }
      else if (uapName === 'LOGISTIQUE') { m.logistique.sum += audit.score; m.logistique.count++ }

      m.usine.sum += audit.score
      m.usine.count++
    })

    return Object.values(monthsMap)
      .map(m => ({
        label: m.label,
        uap1: m.uap1.count > 0 ? Math.round(m.uap1.sum / m.uap1.count) : null,
        uap2: m.uap2.count > 0 ? Math.round(m.uap2.sum / m.uap2.count) : null,
        logistique: m.logistique.count > 0 ? Math.round(m.logistique.sum / m.logistique.count) : null,
        usine: m.usine.count > 0 ? Math.round(m.usine.sum / m.usine.count) : null
      }))
      .sort((a, b) => new Date(`01 ${a.label}`) - new Date(`01 ${b.label}`))
  }, [auditsGrouped])

  // ... autres stats
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

  // Composant pour dessiner les étiquettes sur la courbe
  const CustomLabel = (props) => {
    const { x, y, value } = props
    if (value === null || value === undefined) return null
    return (
      <text x={x} y={y - 12} fill="#f8fafc" fontSize={11} fontWeight="bold" textAnchor="middle">
        {value}%
      </text>
    )
  }

  if (loading) return <p className="muted" style={{ padding: '2rem' }}>Chargement…</p>

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>
          {view === 'uap_gemba' && 'Moyennes par UAP'}
          {view === 'lignes_gemba' && 'Résultats par Ligne'}
          {view === 'top3_gemba' && 'Top & Bottom 3'}
          {view === 'piliers_gemba' && 'Résultats par M (Radar)'}
        </h1>
      </div>

      {/* ================= VUE UAP (4 CARTES + 4 COURBES SÉPARÉES) ================= */}
      {view === 'uap_gemba' && (
        <div>
          {/* 1. Les 4 cartes de moyenne */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {uapStats.map((stat) => (
              <div key={stat.uap} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', borderTop: `4px solid ${getScoreColor(stat.score)}` }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{stat.uap}</h3>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: getScoreColor(stat.score) }}>{stat.score}%</div>
              </div>
            ))}
          </div>

          {/* 2. Les 4 courbes séparées */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            
            {/* Courbe UAP 1 */}
            <div className="card">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#3b82f6' }}>Tendance UAP 1</h3>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} />
                    <Line type="monotone" dataKey="uap1" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, fill: '#3b82f6', stroke: '#1e293b', strokeWidth: 2 }} connectNulls>
                      <LabelList content={<CustomLabel />} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Courbe UAP 2 */}
            <div className="card">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#f97316' }}>Tendance UAP 2</h3>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} />
                    <Line type="monotone" dataKey="uap2" stroke="#f97316" strokeWidth={3} dot={{ r: 5, fill: '#f97316', stroke: '#1e293b', strokeWidth: 2 }} connectNulls>
                      <LabelList content={<CustomLabel />} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Courbe Logistique */}
            <div className="card">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#10b981' }}>Tendance Logistique</h3>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} />
                    <Line type="monotone" dataKey="logistique" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981', stroke: '#1e293b', strokeWidth: 2 }} connectNulls>
                      <LabelList content={<CustomLabel />} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Courbe Usine Globale */}
            <div className="card">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#8b5cf6' }}>Tendance Usine (Globale)</h3>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} />
                    <Line type="monotone" dataKey="usine" stroke="#8b5cf6" strokeWidth={4} dot={{ r: 6, fill: '#8b5cf6', stroke: '#1e293b', strokeWidth: 2 }} connectNulls>
                      <LabelList content={<CustomLabel />} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ... autres vues inchangées ... */}
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
