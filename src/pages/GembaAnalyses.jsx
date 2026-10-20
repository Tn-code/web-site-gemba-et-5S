import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { formatMonthLabel } from '../utils/dateHelpers'
import { 
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid, LabelList, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts'

const OBJECTIF_SEMAINE = 5

const getScoreColor = (score) => {
  if (score >= 87) return '#10b981'
  if (score >= 85) return '#f59e0b'
  return '#ef4444'
}

// 🔴 NOUVELLE FONCTION ULTRA-ROBUSTE POUR EXTRAIRE LA SEMAINE
// Elle fonctionne même si le format de date est mal interprété par JavaScript
function getRobustWeekInfo(dateString) {
  if (!dateString) return null;
  
  // On sépare la date (ex: "2026-08-31")
  const parts = dateString.split('-');
  if (parts.length !== 3) return null;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-11
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  // On crée une date locale à 12h pour éviter les problèmes de fuseau horaire
  const d = new Date(year, month, day, 12, 0, 0);
  
  // Calcul de la semaine ISO standard
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3); 
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
  
  // On formate pour l'affichage
  const key = `${year}-S${String(weekNum).padStart(2, '0')}`;
  const label = `S${String(weekNum).padStart(2, '0')} (${year})`;
  
  return { year, week: weekNum, key, label };
}

export default function GembaAnalyses({ view }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [monthFilter, setMonthFilter] = useState('')

  useEffect(() => {
    supabase.from('gemba_audits').select('*').order('date', { ascending: true }).then(({ data, error }) => {
      if (!error) setData(data || [])
      setLoading(false)
    })
  }, [])

  // On utilise une fonction simple pour extraire le mois (YYYY-MM)
  const getMonthKey = (dateStr) => dateStr ? dateStr.slice(0, 7) : null
  const months = useMemo(() => [...new Set(data.map(d => getMonthKey(d.date)).filter(Boolean))].sort().reverse(), [data])

  const filtered = useMemo(() => data.filter(d => !monthFilter || getMonthKey(d.date) === monthFilter), [data, monthFilter])

  // --- 1. REGROUPEMENT PAR AUDIT ---
  const auditsGrouped = useMemo(() => {
    const groups = {}
    
    filtered.forEach(row => {
      const auditKey = `${row.date}|${row.ligne}`
      if (!groups[auditKey]) {
        groups[auditKey] = { 
          date: row.date, 
          ligne: row.ligne, 
          uap: row.uap, 
          ok: 0, 
          nok: 0, 
          total_questions: 0
        }
      }
      
      const rep = String(row.reponse).toUpperCase()
      if (rep === 'OK') groups[auditKey].ok++
      if (rep === 'NOK') groups[auditKey].nok++
      if (rep !== 'N/A') groups[auditKey].total_questions++
    })

    return Object.values(groups).map(audit => {
      const score = audit.total_questions > 0 
        ? Math.round((audit.ok / audit.total_questions) * 100) 
        : 0
      return { ...audit, score }
    }).sort((a, b) => b.date.localeCompare(a.date))
  }, [filtered])

  // --- 2. CALCULS PLANIFIÉ VS RÉALISÉ ---
  const weeklyData = useMemo(() => {
    const weeksMap = {}
    
    auditsGrouped.forEach(audit => {
      const wInfo = getRobustWeekInfo(audit.date)
      if (!wInfo) return
      
      if (!weeksMap[wInfo.key]) {
        weeksMap[wInfo.key] = { 
          key: wInfo.key,
          label: wInfo.label,
          year: wInfo.year,
          week: wInfo.week,
          count: 0 
        }
      }
      weeksMap[wInfo.key].count++
    })

    // Tri chronologique strict
    return Object.values(weeksMap)
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return a.week - b.week
      })
      .map(w => ({
        label: w.label,
        'Objectif': OBJECTIF_SEMAINE,
        'Réalisé': w.count,
        totalRealises: w.count
      }))
  }, [auditsGrouped])

  const totalRealise = auditsGrouped.length
  const totalPlanifie = weeklyData.length * OBJECTIF_SEMAINE

  // --- 3. STATS ---
  const uapStats = useMemo(() => {
    const groups = {}
    auditsGrouped.forEach(audit => {
      if (!audit.uap) return
      if (!groups[audit.uap]) groups[audit.uap] = { sum: 0, count: 0 }
      groups[audit.uap].sum += audit.score
      groups[audit.uap].count++
    })
    return Object.entries(groups).map(([uap, s]) => ({ uap, score: Math.round(s.sum / s.count) })).sort((a, b) => b.score - a.score)
  }, [auditsGrouped])

  const lineStats = useMemo(() => {
    const groups = {}
    auditsGrouped.forEach(audit => {
      if (!audit.ligne) return
      if (!groups[audit.ligne]) groups[audit.ligne] = { sum: 0, count: 0 }
      groups[audit.ligne].sum += audit.score
      groups[audit.ligne].count++
    })
    return Object.entries(groups).map(([ligne, s]) => ({ ligne, score: Math.round(s.sum / s.count) })).sort((a, b) => b.score - a.score)
  }, [auditsGrouped])

  const mStats = useMemo(() => {
    const groups = {}
    filtered.forEach(row => {
      if (!row.point_m) return
      const rep = String(row.reponse).toUpperCase()
      if (rep === 'N/A') return 

      if (!groups[row.point_m]) groups[row.point_m] = { ok: 0, total: 0 }
      groups[row.point_m].total++
      if (rep === 'OK') groups[row.point_m].ok++
    })
    return Object.entries(groups)
      .map(([point_m, s]) => ({ subject: point_m, score: Math.round((s.ok / s.total) * 100) }))
      .sort((a, b) => b.score - a.score)
  }, [filtered])

  if (loading) return <p className="muted" style={{ padding: '2rem' }}>Chargement des données Gemba…</p>

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Analyses Gemba (5M)</h1>
        <select className="filter-control" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
          <option value="">Tous les mois</option>
          {months.map(m => <option key={m} value={m}>{formatMonthLabel(m)}</option>)}
        </select>
      </div>

      {/* ================= VUE PLANIFIÉ VS RÉALISÉ ================= */}
      {view === 'planifie_gemba' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Objectif Total</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#3b82f6' }}>{totalPlanifie}</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Audits Réalisés</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f97316' }}>{totalRealise}</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Taux de réalisation</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: totalRealise >= totalPlanifie ? 'var(--success)' : 'var(--danger)' }}>
                {totalPlanifie > 0 ? Math.round((totalRealise / totalPlanifie) * 100) : 0} %
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '2rem' }}>Suivi Hebdomadaire Gemba (Objectif : {OBJECTIF_SEMAINE} audits / semaine)</h2>
            {weeklyData.length === 0 ? (
              <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>Aucune donnée.</div>
            ) : (
              <div style={{ height: 450 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 30, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} 
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    
                    <Bar dataKey="Objectif" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50}>
                      <LabelList dataKey="Objectif" position="top" fill="#3b82f6" fontSize={12} fontWeight="bold" />
                    </Bar>
                    
                    <Bar dataKey="Réalisé" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={50}>
                      <LabelList dataKey="Réalisé" position="top" fill="#f97316" fontSize={12} fontWeight="bold" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ... le reste des vues (UAP, Lignes, Top3, Piliers) ... */}
      {view === 'uap_gemba' && (
        <div className="card">
          <h2 className="card-title">Moyenne par UAP (Gemba)</h2>
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
          <h2 className="card-title">Résultats par Ligne (Gemba)</h2>
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
          <h2 className="card-title">Radar des 5M (Main d'œuvre, Matière, Méthode, Machine, Milieu)</h2>
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

      {view === 'analyse_gemba' && (
        <div className="card">
          <h2 className="card-title">Analyse des points NOK (Gemba)</h2>
          <p className="muted">Lignes nécessitant une action prioritaire :</p>
          <ul className="top-list">
            {[...lineStats].reverse().slice(0, 5).map(item => (
              <li key={item.ligne} style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                <strong>{item.ligne}</strong> — Score : <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{item.score}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view === 'rapport_gemba' && (
        <div className="card">
          <h2 className="card-title">Rapport d'Audit Gemba</h2>
          <p className="muted">Fonctionnalité en cours de développement.</p>
        </div>
      )}
    </div>
  )
}
