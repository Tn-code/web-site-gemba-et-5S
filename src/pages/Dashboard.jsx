import { useMemo, useState } from 'react'
import { useAudits } from '../hooks/useAudits'
import FilterBar from '../components/FilterBar'
import KpiGrid from '../components/KpiGrid'
import ChartCard from '../components/ChartCard'
import TrendChart from '../components/TrendChart'
import ZoneRankingChart from '../components/ZoneRankingChart'
import TopNokList from '../components/TopNokList'
import AuditTable from '../components/AuditTable'

export default function Dashboard({ refreshKey }) {
  const { audits, loading, error } = useAudits(refreshKey)

  const [filter, setFilter] = useState({ zone: '', from: '', to: '' })

  const zones = useMemo(
    () => [...new Set(audits.map(a => a.zone).filter(Boolean))].sort(),
    [audits]
  )

  const filtered = useMemo(() => audits.filter((a) => {
    if (filter.zone && a.zone !== filter.zone) return false
    if (filter.from && a.date < filter.from)  return false
    if (filter.to   && a.date > filter.to)    return false
    return true
  }), [audits, filter])

  const kpi = useMemo(() => computeKpi(filtered), [filtered])
  const trend       = useMemo(() => computeTrend(filtered), [filtered])
  const zoneRanking = useMemo(() => computeZoneRanking(filtered), [filtered])
  const topNok      = useMemo(() => computeTopNok(filtered), [filtered])

  if (loading) return <p className="container muted" style={{ padding: '2rem' }}>Chargement…</p>
  if (error)   return <p className="container message-error" style={{ padding: '2rem' }}>{error}</p>
  if (audits.length === 0) {
    return (
      <p className="container muted" style={{ padding: '2rem' }}>
        Aucune donnée. Importez le fichier Excel ci-dessus.
      </p>
    )
  }

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      <FilterBar
        zones={zones}
        value={filter}
        onChange={setFilter}
        onReset={() => setFilter({ zone: '', from: '', to: '' })}
      />

      <KpiGrid kpi={kpi} />

      <ChartCard title="Évolution du score (%)">
        <TrendChart data={trend} />
      </ChartCard>

      <div className="charts-grid">
        <ChartCard title="Classement des zones (score moyen)">
          <ZoneRankingChart data={zoneRanking} />
        </ChartCard>
        <ChartCard title="Top 10 points NOK">
          <TopNokList items={topNok} />
        </ChartCard>
      </div>

      <ChartCard title={`Audits (${filtered.length})`}>
        <AuditTable audits={filtered} />
      </ChartCard>
    </div>
  )
}

/* ── Helpers de calcul (pures, testables) ─────────────────────── */

function computeKpi(audits) {
  if (audits.length === 0) {
    return { avg: '0.0', count: 0, nok: 0, best: '-', worst: '-' }
  }
  const avg = audits.reduce((s, a) => s + Number(a.score_pct ?? 0), 0) / audits.length
  let nok = 0
  for (const a of audits) for (const c of a.checkpoints ?? []) if (c.s === 'NOK') nok++

  const byZone = new Map()
  for (const a of audits) {
    if (!a.zone) continue
    const e = byZone.get(a.zone) ?? { sum: 0, n: 0 }
    e.sum += Number(a.score_pct ?? 0); e.n++
    byZone.set(a.zone, e)
  }
  const ranked = [...byZone.entries()]
    .map(([z, v]) => [z, v.sum / v.n])
    .sort((a, b) => b[1] - a[1])

  return {
    avg: avg.toFixed(1),
    count: audits.length,
    nok,
    best:  ranked[0]?.[0] ?? '-',
    worst: ranked[ranked.length - 1]?.[0] ?? '-',
  }
}

function computeTrend(audits) {
  const byDate = new Map()
  for (const a of audits) {
    const e = byDate.get(a.date) ?? { sum: 0, n: 0 }
    e.sum += Number(a.score_pct ?? 0); e.n++
    byDate.set(a.date, e)
  }
  return [...byDate.entries()]
    .map(([date, v]) => ({ date, score: +(v.sum / v.n).toFixed(1) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function computeZoneRanking(audits) {
  const byZone = new Map()
  for (const a of audits) {
    if (!a.zone) continue
    const e = byZone.get(a.zone) ?? { sum: 0, n: 0 }
    e.sum += Number(a.score_pct ?? 0); e.n++
    byZone.set(a.zone, e)
  }
  return [...byZone.entries()]
    .map(([zone, v]) => ({ zone, score: +(v.sum / v.n).toFixed(1), count: v.n }))
    .sort((a, b) => b.score - a.score)
}

function computeTopNok(audits) {
  const byQ = new Map()
  for (const a of audits) for (const c of a.checkpoints ?? []) {
    if (c.s !== 'NOK') continue
    const e = byQ.get(c.q) ?? { q: c.q, count: 0 }
    e.count++
    byQ.set(c.q, e)
  }
  return [...byQ.values()].sort((a, b) => b.count - a.count).slice(0, 10)
}
