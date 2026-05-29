import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { dashboardApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './facility-admin.module.css'

const PIE_COLORS = ['#2563EB','#16A34A','#D97706','#7C3AED','#DB2777','#0D9488','#EA580C','#9333EA']

const INSIGHT_STYLE = {
  warning: { bg:'#FEF9C3', border:'#FDE047', icon:'⚠️', label:'Warning' },
  success: { bg:'#DCFCE7', border:'#86EFAC', icon:'✅', label:'Good'    },
  info:    { bg:'#DBEAFE', border:'#93C5FD', icon:'💡', label:'Insight' },
}

export default function FacilityReportsPage() {
  const { user }  = useAuth()
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const load = () => {
    if (!user?.clinicId) { setLoading(false); return }
    setLoading(true)
    setError('')
    dashboardApi.facility(user.clinicId)
      .then(r => setStats(r.data))
      .catch(() => setError('Failed to load analytics. Make sure the server is running.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [user?.clinicId])

  if (loading) return <div style={{ padding:60, textAlign:'center', color:'var(--muted)' }}>Loading analytics…</div>
  if (error)   return (
    <div style={{ padding:40, textAlign:'center' }}>
      <div style={{ color:'var(--error)', marginBottom:12 }}>{error}</div>
      <button className="btn btn-primary" onClick={load}>Retry</button>
    </div>
  )

  const s = stats || {}

  // ── Data mapping ──────────────────────────────────────────────
  const weeklyTrend = (s.weeklyTrend || []).map(w => ({ date: w.day, patients: w.count }))
  const hourlyData  = s.hourlyData  || []

  // Service distribution — real data from queue or clinic services
  const distData = (s.serviceDist || []).map((svc, i) => ({
    name:  svc.name,
    value: svc.count,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  const insights        = s.insights       || []
  const completionRate  = s.completionRate  ?? 0
  const todayPatients   = s.todayPatients   ?? 0
  const avgWait         = s.avgWaitTime     ?? 0
  const activeQueue     = s.activeQueue     ?? 0
  const completedToday  = s.completedToday  ?? 0

  const hasQueueData = distData.some(d => d.value > 0)

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Analytics & Reports</div>
          <div className={styles.sub}>{s.clinicName || 'Facility'} · Today's overview</div>
        </div>
        <button className="btn btn-outline" onClick={load}>Refresh</button>
      </div>

      {/* Summary stats */}
      <div className={styles.statsGrid}>
        <StatCard label="Patients Today"   value={todayPatients}         color="#2563EB" bg="#EFF6FF" />
        <StatCard label="Active Queue"     value={activeQueue}           color="#D97706" bg="#FFF7ED" />
        <StatCard label="Avg. Wait Time"   value={`${avgWait} min`}     color="#7C3AED" bg="#F5F3FF" />
        <StatCard label="Completed Today"  value={completedToday}        color="#16A34A" bg="#ECFDF5" />
      </div>

      {/* Charts row 1 — Volume + Hourly */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:12 }}>Daily Patient Volume (Last 7 Days)</div>
          {weeklyTrend.length === 0 || weeklyTrend.every(d => d.patients === 0)
            ? <EmptyChart label="No queue data this week" />
            : <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weeklyTrend} margin={{ top:8, right:8, left:-24, bottom:4 }}>
                  <defs>
                    <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize:11 }} />
                  <YAxis tick={{ fontSize:11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }} />
                  <Area type="monotone" dataKey="patients" stroke="#2563EB" strokeWidth={2.5}
                    fill="url(#vol)" name="Patients" />
                </AreaChart>
              </ResponsiveContainer>
          }
        </div>

        <div className="card" style={{ padding:20 }}>
          <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:12 }}>Hourly Queue Volume (Today)</div>
          {hourlyData.length === 0
            ? <EmptyChart label="No queue entries recorded today yet" />
            : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyData} margin={{ top:8, right:8, left:-24, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize:10 }} />
                  <YAxis tick={{ fontSize:11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }} />
                  <Bar dataKey="count" fill="#7C3AED" radius={[4,4,0,0]} name="Patients" />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Charts row 2 — Service Dist + AI Recommendations */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Service Distribution */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:4 }}>Service Distribution</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:14 }}>
            {hasQueueData ? "Based on today's queue entries" : "Based on clinic's available services"}
          </div>

          {distData.length === 0
            ? <EmptyChart label="No services configured for this clinic" />
            : <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={distData} cx="50%" cy="50%"
                      innerRadius={40} outerRadius={68}
                      paddingAngle={distData.length > 1 ? 3 : 0}
                      dataKey="value"
                    >
                      {distData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius:8, fontSize:12 }}
                      formatter={(val, name) => [hasQueueData ? `${val} patient(s)` : 'Available', name]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7 }}>
                  {distData.map(d => {
                    const total = distData.reduce((s, x) => s + x.value, 0)
                    const pct   = total > 0 ? Math.round((d.value / total) * 100) : Math.round(100 / distData.length)
                    return (
                      <div key={d.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ width:9, height:9, borderRadius:'50%', background:d.color, flexShrink:0, display:'inline-block' }} />
                        <span style={{ flex:1, fontSize:12, color:'var(--text-2)' }}>{d.name}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>
                          {hasQueueData ? `${d.value}` : `${pct}%`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
          }
        </div>

        {/* AI Recommendations */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:4 }}>AI Recommendations</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:14 }}>
            Generated from today's real-time clinic data
          </div>

          {insights.length === 0
            ? <EmptyChart label="No insights available yet" />
            : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {insights.map((ins, i) => {
                  const style = INSIGHT_STYLE[ins.type] || INSIGHT_STYLE.info
                  return (
                    <div key={i} style={{
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                      borderRadius: 10,
                      padding: '10px 14px',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                        <span style={{ fontSize:13 }}>{style.icon}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{ins.title}</span>
                      </div>
                      <div style={{ fontSize:12, color:'#475569', lineHeight:1.5 }}>{ins.desc}</div>
                    </div>
                  )
                })}
              </div>
          }
        </div>
      </div>

      {/* Completion rate bar */}
      {todayPatients > 0 && (
        <div className="card" style={{ padding:20, marginTop:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Today's Completion Rate</span>
            <span style={{ fontSize:13, fontWeight:800, color: completionRate >= 85 ? '#16A34A' : '#D97706' }}>
              {completionRate}%
            </span>
          </div>
          <div style={{ height:10, background:'#E2E8F0', borderRadius:99, overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:99,
              width:`${Math.min(completionRate,100)}%`,
              background: completionRate >= 85 ? '#16A34A' : completionRate >= 60 ? '#D97706' : '#EF4444',
              transition:'width 0.6s ease',
            }} />
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>
            {completedToday} of {todayPatients} patients completed · Target: 85%
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color, bg }) {
  return (
    <div className="card" style={{ padding:16 }}>
      <div style={{ width:32, height:32, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        </svg>
      </div>
      <div style={{ fontSize:26, fontWeight:800, color:'var(--text)' }}>{value}</div>
      <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{label}</div>
    </div>
  )
}

function EmptyChart({ label }) {
  return (
    <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center',
      color:'var(--muted)', fontSize:13, fontStyle:'italic', textAlign:'center', padding:'0 20px' }}>
      {label}
    </div>
  )
}
