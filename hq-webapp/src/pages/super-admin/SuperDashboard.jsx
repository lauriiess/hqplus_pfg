import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { dashboardApi } from '../../services/api'
import StatCard from '../../components/ui/StatCard'
import toast from 'react-hot-toast'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function SuperDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.superAdmin()
      .then((res) => setStats(res.data))
      .catch(() => toast.error('Failed to load dashboard stats'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="spinner" />

  const trend = stats?.weeklyTrend || []
  const chartData = {
    labels: trend.map((d) => new Date(d.date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Queue Entries',
      data: trend.map((d) => d.count),
      fill: true,
      borderColor: '#1A6BC4',
      backgroundColor: 'rgba(26,107,196,.1)',
      tension: 0.4,
      pointBackgroundColor: '#1A6BC4',
      pointRadius: 4,
    }],
  }
  const chartOpts = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { mode: 'index' } },
    scales: { y: { beginAtZero: true, grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } },
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">System Dashboard</div>
          <div className="page-subtitle">Platform-wide overview — all clinics</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => window.location.reload()}>⟳ Refresh</button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Total Clinics"     value={stats?.totalClinics   ?? 0} icon="🏥" color="primary" sub={`${stats?.activeClinics ?? 0} active`} />
        <StatCard label="Registered Users"  value={stats?.totalUsers     ?? 0} icon="👥" color="purple" />
        <StatCard label="Total Patients"    value={stats?.totalPatients  ?? 0} icon="🧑‍⚕️" color="success" />
        <StatCard label="Today's Queue"     value={stats?.todayQueue     ?? 0} icon="🎫" color="warning" />
        <StatCard label="Today's Appts"     value={stats?.todayAppointments ?? 0} icon="📅" color="primary" />
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Queue Activity — Last 7 Days</div>
            <div className="text-muted">Daily queue entries across all clinics</div>
          </div>
        </div>
        <Line data={chartData} options={chartOpts} height={80} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href="/super/clinics" className="btn btn-outline w-full" style={{ justifyContent: 'flex-start' }}>🏥 Manage Clinics</a>
            <a href="/super/users"   className="btn btn-outline w-full" style={{ justifyContent: 'flex-start' }}>👥 Manage Users</a>
            <a href="/super/reports" className="btn btn-outline w-full" style={{ justifyContent: 'flex-start' }}>📊 View Reports</a>
          </div>
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>System Health</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['Active Clinics',   stats?.activeClinics ?? 0,  stats?.totalClinics ?? 1,  '#2E7D32'],
              ['Active Users',     stats?.totalUsers    ?? 0,  (stats?.totalUsers ?? 0) + 5, '#1A6BC4'],
            ].map(([label, val, total, color]) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{label}</span><span style={{ fontWeight: 700 }}>{val} / {total}</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: '#F1F5F9' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: color, width: `${total ? Math.round(val / total * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
