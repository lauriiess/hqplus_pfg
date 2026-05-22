import { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { dashboardApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/ui/StatCard'
import toast from 'react-hot-toast'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const IcoWaiting  = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const IcoDone     = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
const IcoNoShow   = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
const IcoTimer    = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const IcoUsers    = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>

export default function FacilityReportsPage() {
  const { user } = useAuth()
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.facility(user?.clinicId)
      .then((res) => setStats(res.data))
      .catch(() => toast.error('Failed to load report data'))
      .finally(() => setLoading(false))
  }, [user?.clinicId])

  if (loading) return <div className="spinner" />

  const peakHours = stats?.peakHours || []
  const peakData = {
    labels: peakHours.map((h) => `${h._id}:00`),
    datasets: [{
      label: 'Patients',
      data: peakHours.map((h) => h.count),
      backgroundColor: 'rgba(38,166,154,.75)',
      borderRadius: 6,
    }],
  }
  const peakOpts = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } },
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Clinic Reports</div>
          <div className="page-subtitle">Today's performance metrics for your facility</div>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Waiting"         value={stats?.queue?.waiting          ?? 0}    icon={IcoWaiting} color="warning" />
        <StatCard label="Served Today"    value={stats?.queue?.done             ?? 0}    icon={IcoDone}    color="success" />
        <StatCard label="No Shows"        value={stats?.queue?.noShow           ?? 0}    icon={IcoNoShow}  color="error" />
        <StatCard label="Avg Wait"        value={`${stats?.metrics?.avgWait    ?? 0}m`} icon={IcoTimer}   color="primary" />
        <StatCard label="Avg Turnaround"  value={`${stats?.metrics?.avgTurnaround ?? 0}m`} icon={IcoTimer} color="purple" />
        <StatCard label="Total Patients"  value={stats?.queue?.total            ?? 0}    icon={IcoUsers}   color="muted" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Peak Hours Today</div>
          <div className="text-muted" style={{ marginBottom: 20 }}>Patient volume per hour</div>
          {peakHours.length === 0
            ? <div className="empty-state"><p>No queue data yet for today.</p></div>
            : <Bar data={peakData} options={peakOpts} height={140} />
          }
        </div>

        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Today's Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['Waiting',              stats?.queue?.waiting           ?? 0, 'var(--warning)'],
              ['Now Serving',          stats?.queue?.serving           ?? 0, 'var(--primary)'],
              ['Served',               stats?.queue?.done              ?? 0, 'var(--success)'],
              ['No Shows',             stats?.queue?.noShow            ?? 0, 'var(--error)'],
              ['Pending Appointments', stats?.appointments?.pending    ?? 0, 'var(--warning)'],
              ['Confirmed Appointments', stats?.appointments?.confirmed ?? 0, 'var(--success)'],
              ['Avg Wait (min)',        stats?.metrics?.avgWait         ?? 0, 'var(--primary)'],
              ['Avg Turnaround (min)',  stats?.metrics?.avgTurnaround   ?? 0, 'var(--purple)'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13 }}>{label}</span>
                <span style={{ fontWeight: 800, fontSize: 16, color }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
