import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { dashboardApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './FacilityDashboard.module.css'

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const SERVICE_COLORS = ['#2563EB','#16A34A','#D97706','#7C3AED','#0D9488']

export default function FacilityDashboard() {
  const { user } = useAuth()
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    dashboardApi.facility(user?.clinicId)
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [user?.clinicId])

  // Build chart data from API or fall back to demo shapes
  const queueByService = stats?.queueByService?.length
    ? stats.queueByService.map(s => ({ name: s._id || s.name, count: s.count }))
    : ['General Consultation','Pre-natal Care','Family Planning','Child Immunization','Wound Care']
        .map((name,i) => ({ name, count: [18,9,7,11,5][i] }))

  const weeklyTrend = stats?.weeklyTrend?.length
    ? stats.weeklyTrend.map(w => ({ day: w.day, count: w.count }))
    : DAY_LABELS.map((d,i) => ({ day: d, count: [185,210,195,250,260,160,125][i] }))

  const recentActivity = stats?.recentActivity?.length
    ? stats.recentActivity
    : [
        { name: 'Juan Dela Cruz',  action: 'Checked in — General Consultation', time: '2 min ago' },
        { name: 'Maria Santos',    action: 'Serving — Pre-natal Care',           time: '5 min ago' },
        { name: 'Pedro Reyes',     action: 'Completed — Child Immunization',     time: '8 min ago' },
      ]

  const s = stats || {}

  return (
    <div className={styles.page}>
      {/* Stat cards */}
      <div className={styles.statsGrid}>
        <StatCard label="Today's Patients"    value={loading ? '…' : (s.todayPatients ?? 0)}    sub="Checked in today"         color="blue" />
        <StatCard label="Active Queue"         value={loading ? '…' : (s.activeQueue    ?? 0)}    sub="Currently waiting"        color="green" />
        <StatCard label="Avg. Wait Time"       value={loading ? '…' : `${s.avgWaitTime  ?? 0}m`}  sub="Platform average"         color="orange" />
        <StatCard label="Completed Today"      value={loading ? '…' : (s.completedToday ?? 0)}    sub="Served successfully"      color="purple" />
      </div>

      {/* Charts */}
      <div className={styles.chartsRow}>
        <div className={"card " + styles.chartCard}>
          <div className={styles.chartTitle}>Queue by Service</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={queueByService} margin={{ top: 8, right: 8, left: -18, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" name="Queue Count" fill="#2563EB" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={"card " + styles.chartCard}>
          <div className={styles.chartTitle}>Weekly Patient Volume</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weeklyTrend} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4 }} name="Patients" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent activity */}
      <div className={"card " + styles.activityCard}>
        <div className={styles.chartTitle}>Recent Activity</div>
        <div className={styles.activityList}>
          {recentActivity.map((a, i) => (
            <div key={i} className={styles.activityRow}>
              <div className={styles.activityDot} />
              <div className={styles.activityInfo}>
                <div className={styles.activityName}>{a.patientName || a.name}</div>
                <div className={styles.activityAction}>{a.action || `Queue #${a.queueNumber} — ${a.serviceName}`}</div>
              </div>
              <div className={styles.activityTime}>{a.time || 'just now'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }) {
  const bg = { blue:'#EFF6FF', green:'#ECFDF5', orange:'#FFF7ED', purple:'#F5F3FF' }
  const fg = { blue:'#2563EB', green:'#16A34A', orange:'#D97706', purple:'#7C3AED' }
  return (
    <div className={"card " + styles.statCard}>
      <div style={{ width:36, height:36, borderRadius:8, background:bg[color], display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={fg[color]} strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
      </div>
      <div style={{ fontSize:28, fontWeight:800, color:'var(--text)', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginTop:4 }}>{label}</div>
      <div style={{ fontSize:11, color:'var(--muted-lt)', marginTop:2 }}>{sub}</div>
    </div>
  )
}
