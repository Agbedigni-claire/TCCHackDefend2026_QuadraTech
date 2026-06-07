import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import api from '../api/client'

const STATUT_COLORS = {
  libre:          '#2563eb',
  en_transaction: '#60a5fa',
  litige:         '#1d4ed8',
}

const NIVEAU_COLORS = {
  faible:   '#93c5fd',
  moyen:    '#3b82f6',
  critique: '#1e40af',
}

function StatCard({ label, value, color, sub }) {
  return (
    <div className={`stat-card${color ? ` stat-card-${color}` : ''}`}>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/stats/')
      .then(({ data }) => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><p className="text-muted">Chargement…</p></div>
  if (!stats)  return (
    <div className="page">
      <p className="text-muted">Impossible de charger les statistiques.</p>
    </div>
  )

  const barData = [
    { name: 'Libre',           value: stats.terrains_par_statut.libre,          fill: STATUT_COLORS.libre },
    { name: 'En transaction',  value: stats.terrains_par_statut.en_transaction,  fill: STATUT_COLORS.en_transaction },
    { name: 'En litige',       value: stats.terrains_par_statut.litige,          fill: STATUT_COLORS.litige },
  ]

  const pieData = (stats.alertes_par_niveau ?? []).map(a => ({
    name:  a.niveau.charAt(0).toUpperCase() + a.niveau.slice(1),
    value: a.count,
    fill:  NIVEAU_COLORS[a.niveau] ?? '#94a3b8',
  }))

  return (
    <div className="page">
      <div className="page-header">
        <h2>Tableau de bord</h2>
      </div>

      <div className="dashboard-stats-grid">
        <StatCard label="Terrains enregistrés"  value={stats.terrains_total} />
        <StatCard label="Terrains libres"        value={stats.terrains_par_statut.libre}          color="blue" />
        <StatCard label="En transaction"         value={stats.terrains_par_statut.en_transaction}  color="blue" />
        <StatCard label="En litige"              value={stats.terrains_par_statut.litige}          color="blue" />
        <StatCard label="Transactions totales"   value={stats.transactions_total} />
        <StatCard label="Litiges ouverts"        value={stats.litiges_ouverts} />
        <StatCard
          label="Alertes IA actives"
          value={stats.alertes_actives}
          color={stats.alertes_critiques > 0 ? 'red' : undefined}
          sub={stats.alertes_critiques > 0 ? `${stats.alertes_critiques} critiques` : undefined}
        />
      </div>

      <div className="dashboard-charts-grid">
        <div className="card dashboard-chart-card">
          <h3 className="chart-title">Terrains par statut</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {pieData.length > 0 ? (
          <div className="card dashboard-chart-card">
            <h3 className="chart-title">Alertes IA par niveau</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={78}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="card dashboard-chart-card dashboard-no-alerts">
            <h3 className="chart-title">Alertes IA par niveau</h3>
            <p className="text-muted">Aucune alerte IA enregistrée.</p>
          </div>
        )}
      </div>
    </div>
  )
}
