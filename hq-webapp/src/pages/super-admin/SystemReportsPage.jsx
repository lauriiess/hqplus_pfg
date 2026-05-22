import { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { dashboardApi } from '../../services/api'
import StatCard from '../../components/ui/StatCard'
import toast from 'react-hot-toast'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const IcoClinics  = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const IcoPatients = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IcoQueue    = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
const IcoCalendar = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>

export default function SystemReportsPage() {
  const [stats,   setStats]   = useState(null)
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
  const barOpts = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } },
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">System Reports</div>
          <div className="page-subtitle">Platform-wide analytics and trends</div>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Total Clinics"        value={stats?.totalClinics      ?? 0} icon={IcoClinics}  color="primary" />
        <StatCard label="Total Patients"       value={stats?.totalPatients     ?? 0} icon={IcoPatients} color="success" />
        <StatCard label="Today's Queue"        value={stats?.todayQueue        ?? 0} icon={IcoQueue}    color="warning" />
        <StatCard label="Today's Appointments" value={stats?.todayAppointments ?? 0} icon={IcoCalendar} color="purple" />
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
              ['Total Clinics',        stats?.totalClinics      ?? 0],
              ['Active Clinics',       stats?.activeClinics     ?? 0],
              ['Total Users',          stats?.totalUsers        ?? 0],
              ['Total Patients',       stats?.totalPatients     ?? 0],
              ["Today's Queue",        stats?.todayQueue        ?? 0],
              ["Today's Appointments", stats?.todayAppointments ?? 0],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13 }}>{label}</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--primary)' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Weekly Queue Breakdown</div>
        <div className="text-muted" style={{ marginBottom: 16 }}>Queue entries per day for the past 7 days</div>
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
                <td style={{ padding: '12px 16px', fontSize: 14 }}>
                  {new Date(d.date).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
