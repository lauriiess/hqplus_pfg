import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { dashboardApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './facility-admin.module.css'

export default function FacilityDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.clinicId) {
      setLoading(false)
      return
    }

    dashboardApi.facility(user.clinicId)
      .then(r => {
        // DEBUG: Check your browser console to see exactly what the server sends
        console.log("DEBUG - API Response:", r.data) 
        setStats(r.data)
      })
      .catch(err => {
        console.error("DEBUG - API Fetch Failed:", err)
        setStats(null)
      })
      .finally(() => setLoading(false))
  }, [user?.clinicId])

  // Data processing: use empty array if stats are null
  const queueByService = stats?.queueByService?.map(s => ({ 
    name: s.name || s._id || 'Unknown', 
    count: s.count || 0 
  })) || [];

  const weeklyTrend = stats?.weeklyTrend?.map(w => ({ 
    day: w.day, 
    count: w.count || 0 
  })) || [];

  const recentActivity = stats?.recentActivity || [];

  return (
    <div className={styles.page}>
      {/* Stat cards */}
      <div className={styles.statsGrid}>
        <StatCard label="Today's Patients" value={loading ? '…' : (stats?.todayPatients ?? 0)} sub="Checked in today" color="blue" />
        <StatCard label="Active Queue" value={loading ? '…' : (stats?.activeQueue ?? 0)} sub="Currently waiting" color="green" />
        <StatCard label="Avg. Wait Time" value={loading ? '…' : `${stats?.avgWaitTime ?? 0}m`} sub="Platform average" color="orange" />
        <StatCard label="Completed Today" value={loading ? '…' : (stats?.completedToday ?? 0)} sub="Served successfully" color="purple" />
      </div>

      {/* Charts */}
      <div className={styles.chartsRow}>
        <div className={"card " + styles.chartCard}>
          <div className={styles.chartTitle}>Queue by Service</div>
          {queueByService.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={queueByService} margin={{ top: 8, right: 8, left: -18, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#2563EB" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>No data available</div>}
        </div>

        <div className={"card " + styles.chartCard}>
          <div className={styles.chartTitle}>Weekly Patient Volume</div>
          {weeklyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyTrend} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div style={{height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>No data available</div>}
        </div>
      </div>

      {/* Recent activity */}
      <div className={"card " + styles.activityCard}>
        <div className={styles.chartTitle}>Recent Activity</div>
        <div className={styles.activityList}>
          {recentActivity.length > 0 ? recentActivity.map((a, i) => (
            <div key={i} className={styles.activityRow}>
              <div className={styles.activityDot} />
              <div className={styles.activityInfo}>
                <div className={styles.activityName}>{a.patientName}</div>
                <div className={styles.activityAction}>{a.action}</div>
              </div>
              <div className={styles.activityTime}>{a.time}</div>
            </div>
          )) : <div style={{padding: 20, textAlign: 'center', color: 'var(--muted)'}}>No recent activity</div>}
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