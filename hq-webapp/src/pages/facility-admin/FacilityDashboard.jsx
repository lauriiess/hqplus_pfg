import { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { dashboardApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/ui/StatCard'
import toast from 'react-hot-toast'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function FacilityDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    dashboardApi.facility(user?.clinicId)
      .then((res) => setStats(res.data))
      .catch(() => toast.error('Failed to load dashboard stats'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [user?.clinicId])

  if (loading) return <div className="spinner" />

  const peakHours = stats?.peakHours || []
  const peakData = {
    labels: peakHours.map((h) => `${h._id}:00`),
    datasets: [{
      label: 'Patients',
      data: peakHours.map((h) => h.count),
      backgroundColor: 'rgba(26,107,196,.7)',
      borderRadius: 4,
    }],
  }
  const peakOpts = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } } }

  const recentQueue = stats?.recentQueue || []
  const statusColors = { waiting: 'badge-warning', serving: 'badge-primary', done: 'badge-success', no_show: 'badge-error', cancelled: 'badge-muted' }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Facility Dashboard</div>
          <div className="page-subtitle">Today's overview for your clinic</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load}>⟳ Refresh</button>
      </div>

      {/* Queue stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Waiting"       value={stats?.queue?.waiting  ?? 0} icon="⏳" color="warning" sub="in queue now" />
        <StatCard label="Now Serving"   value={stats?.queue?.serving  ?? 0} icon="🩺" color="primary" />
        <StatCard label="Served Today"  value={stats?.queue?.done     ?? 0} icon="✅" color="success" />
        <StatCard label="No Shows"      value={stats?.queue?.noShow   ?? 0} icon="❌" color="error" />
        <StatCard label="Avg Wait Time" value={`${stats?.metrics?.avgWait ?? 0}m`} icon="⏱️" color="purple" />
        <StatCard label="Avg Turnaround" value={`${stats?.metrics?.avgTurnaround ?? 0}m`} icon="🔄" color="muted" />
      </div>

      {/* Appointment stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <StatCard label="Pending Appointments"   value={stats?.appointments?.pending   ?? 0} icon="📋" color="warning" />
        <StatCard label="Confirmed Appointments" value={stats?.appointments?.confirmed ?? 0} icon="📅" color="success" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
        {/* Peak hours chart */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Peak Hours Today</div>
          <div className="text-muted" style={{ marginBottom: 20 }}>Patients per hour</div>
          {peakHours.length === 0
            ? <div className="empty-state"><p>No queue data yet for today.</p></div>
            : <Bar data={peakData} options={peakOpts} height={120} />
          }
        </div>

        {/* Recent queue */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px 0', fontWeight: 700, fontSize: 16 }}>Recent Queue</div>
          <div style={{ overflowY: 'auto', maxHeight: 300 }}>
            {recentQueue.length === 0
              ? <div className="empty-state" style={{ padding: 24 }}>No entries yet.</div>
              : recentQueue.map((e) => (
                <div key={e._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-lt)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                    {e.queueNumber}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.patientName}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.serviceName}</div>
                  </div>
                  <span className={`badge ${statusColors[e.status] || 'badge-muted'}`}>{e.status}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
