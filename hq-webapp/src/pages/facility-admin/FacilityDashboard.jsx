import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { dashboardApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './facility-admin.module.css'

<<<<<<< HEAD
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
=======
const STATUS_DOT = { waiting:'#D97706', serving:'#2563EB', done:'#16A34A', completed:'#16A34A', no_show:'#DC2626', cancelled:'#6B7280' }

export default function FacilityDashboard() {
  const { user }  = useAuth()
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    dashboardApi.facility(user?.clinicId)
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [user?.clinicId])

  useEffect(() => { load() }, [load])

  const s = stats || {}
>>>>>>> 7bba9d2b6d8807db259737758ea06940d1b7a494

  // All chart data from real API — empty arrays if not yet loaded
  const queueByService = (s.queueByService || []).map(x => ({ name: x._id || x.name, count: x.count }))
  const weeklyTrend    = (s.weeklyTrend    || []).map(w => ({ day: w.day, count: w.count }))
  const recentActivity = s.recentActivity  || []

  return (
    <div className={styles.page}>
      {/* Stat cards */}
      <div className={styles.statsGrid}>
<<<<<<< HEAD
        <StatCard label="Today's Patients" value={loading ? '…' : (stats?.todayPatients ?? 0)} sub="Checked in today" color="blue" />
        <StatCard label="Active Queue" value={loading ? '…' : (stats?.activeQueue ?? 0)} sub="Currently waiting" color="green" />
        <StatCard label="Avg. Wait Time" value={loading ? '…' : `${stats?.avgWaitTime ?? 0}m`} sub="Platform average" color="orange" />
        <StatCard label="Completed Today" value={loading ? '…' : (stats?.completedToday ?? 0)} sub="Served successfully" color="purple" />
=======
        <StatCard label="Today's Patients"  value={loading ? '…' : (s.todayPatients ?? 0)} sub="Checked in today"    color="blue"   />
        <StatCard label="Active Queue"       value={loading ? '…' : (s.activeQueue   ?? 0)} sub="Currently waiting"  color="green"  />
        <StatCard label="Avg. Wait Time"     value={loading ? '…' : `${s.avgWaitTime ?? 0}m`} sub="Today's average"  color="orange" />
        <StatCard label="Completed Today"    value={loading ? '…' : (s.completedToday ?? 0)} sub="Served successfully" color="purple" />
>>>>>>> 7bba9d2b6d8807db259737758ea06940d1b7a494
      </div>

      {/* Charts */}
      <div className={styles.chartsRow}>
        <div className={`card ${styles.chartCard}`}>
          <div className={styles.chartTitle}>Queue by Service</div>
<<<<<<< HEAD
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
=======
          {queueByService.length === 0
            ? <EmptyChart msg={loading ? 'Loading…' : 'No queue data today'} />
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={queueByService} margin={{ top:8, right:8, left:-18, bottom:40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize:10 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize:11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }} />
                  <Bar dataKey="count" name="Queue Count" fill="#2563EB" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
          }
>>>>>>> 7bba9d2b6d8807db259737758ea06940d1b7a494
        </div>
        <div className={`card ${styles.chartCard}`}>
          <div className={styles.chartTitle}>Weekly Patient Volume</div>
<<<<<<< HEAD
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
=======
          {weeklyTrend.length === 0
            ? <EmptyChart msg={loading ? 'Loading…' : 'No weekly data yet'} />
            : <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weeklyTrend} margin={{ top:8, right:8, left:-18, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize:11 }} />
                  <YAxis tick={{ fontSize:11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }} />
                  <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2.5} dot={{ r:4 }} />
                </LineChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Activity + Refresh */}
      <div className={styles.activityCard}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <span style={{ fontWeight:700, color:'var(--text)', fontSize:14 }}>Recent Activity</span>
          <button className="btn btn-outline" style={{ fontSize:12, padding:'4px 10px' }} onClick={load}>
            Refresh
          </button>
>>>>>>> 7bba9d2b6d8807db259737758ea06940d1b7a494
        </div>
        {recentActivity.length === 0
          ? <div style={{ textAlign:'center', color:'var(--muted)', fontSize:13, padding:'20px 0' }}>
              {loading ? 'Loading activity…' : 'No activity recorded today.'}
            </div>
          : <div className={styles.activityList}>
              {recentActivity.map((a, i) => (
                <div key={i} className={styles.activityRow}>
                  <div className={styles.activityDot}
                    style={{ background: STATUS_DOT[a.status] || '#6B7280' }} />
                  <div className={styles.activityInfo}>
                    <div className={styles.activityName}>{a.patientName || a.name}</div>
                    <div className={styles.activityAction}>
                      {a.action || `${a.status ? a.status.charAt(0).toUpperCase() + a.status.slice(1) : ''} — ${a.serviceName || ''}`}
                    </div>
                  </div>
                  <div className={styles.activityTime}>{a.time}</div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }) {
  const colors = { blue:'#2563EB', green:'#16A34A', orange:'#D97706', purple:'#7C3AED' }
  const bgs    = { blue:'#EFF6FF', green:'#F0FDF4', orange:'#FFFBEB', purple:'#F5F3FF' }
  return (
    <div className={`card ${styles.statCard}`}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={{ color: colors[color] || 'var(--text)' }}>{value}</div>
      <div className={styles.statSub}>{sub}</div>
    </div>
  )
<<<<<<< HEAD
}
=======
}

function EmptyChart({ msg }) {
  return <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)', fontSize:13 }}>{msg}</div>
}
>>>>>>> 7bba9d2b6d8807db259737758ea06940d1b7a494
