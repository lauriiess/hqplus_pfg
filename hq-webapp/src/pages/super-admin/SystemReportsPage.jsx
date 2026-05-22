import { useEffect, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { dashboardApi } from '../../services/api'
import StatCard from '../../components/ui/StatCard'
import toast from 'react-hot-toast'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function SystemReportsPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.superAdmin()
      .then((res) => setStats(res.data))
      .catch(() => toast.error('Failed to load report data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="spinner" />

  const trend = stats?.weeklyTrend || []
  const barData = {
    labels: trend.map((d) => new Date(d.date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Total Queue Entries',
      data: trend.map((d) => d.count),
      backgroundColor: 'rgba(26,107,196,.75)',
      borderRadius: 6,
    }],
  }
  const barOpts = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } } }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">System Reports</div>
          <div className="page-subtitle">Platform-wide analytics and trends</div>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Total Clinics"  value={stats?.totalClinics   ?? 0} icon="🏥" color="primary" />
        <StatCard label="Total Patients" value={stats?.totalPatients  ?? 0} icon="🧑‍⚕️" color="success" />
        <StatCard label="Today's Queue"  value={stats?.todayQueue     ?? 0} icon="🎫" color="warning" />
        <StatCard label="Today's Appts"  value={stats?.todayAppointments ?? 0} icon="📅" color="purple" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>7-Day Queue Volume</div>
          <div className="text-muted" style={{ marginBottom: 20 }}>Total queue entries per day across all clinics</div>
          <Bar data={barData} options={barOpts} height={120} />
        </div>

        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['🏥', 'Total Clinics',   stats?.totalClinics ?? 0],
              ['✅', 'Active Clinics',  stats?.activeClinics ?? 0],
              ['👥', 'Total Users',     stats?.totalUsers ?? 0],
              ['🧑‍⚕️', 'Total Patients', stats?.totalPatients ?? 0],
              ['🎫', "Today's Queue",   stats?.todayQueue ?? 0],
              ['📅', "Today's Appts",   stats?.todayAppointments ?? 0],
            ].map(([icon, label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13 }}>{icon} {label}</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--primary)' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Weekly Queue Trend</div>
        <div className="text-muted" style={{ marginBottom: 20 }}>Rolling 7-day average patient volume</div>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, color: 'var(--muted)', background: '#F8FAFC', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Date</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 12, color: 'var(--muted)', background: '#F8FAFC', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Queue Entries</th>
            </tr>
          </thead>
          <tbody>
            {trend.map((d) => (
              <tr key={d.date} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontSize: 14 }}>{new Date(d.date).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
