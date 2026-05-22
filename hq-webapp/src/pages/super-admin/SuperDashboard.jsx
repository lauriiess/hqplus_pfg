import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import api from '../../services/api'
import styles from './SuperDashboard.module.css'

const FACILITY_GROWTH = [
  { month: 'Nov', count: 18 }, { month: 'Dec', count: 18 },
  { month: 'Jan', count: 19 }, { month: 'Feb', count: 20 },
  { month: 'Mar', count: 22 }, { month: 'Apr', count: 24 },
]
const USER_GROWTH = [
  { month: 'Nov', count: 210 }, { month: 'Dec', count: 240 },
  { month: 'Jan', count: 255 }, { month: 'Feb', count: 268 },
  { month: 'Mar', count: 300 }, { month: 'Apr', count: 342 },
]
const RECENT_CENTERS = [
  { name: 'Makati City Health Center', location: 'Makati City, Metro Manila', added: '2025-06-15', users: 42, status: 'active' },
  { name: 'Cebu City Health Office',   location: 'Cebu City, Cebu',           added: '2025-04-10', users: 38, status: 'active' },
  { name: 'Davao RHU Main',            location: 'Davao City, Davao del Sur', added: '2025-04-18', users: 15, status: 'pending' },
]
const ALERTS = [
  { type: 'info',    msg: 'System maintenance scheduled for April 23, 2026', time: '2 hours ago' },
  { type: 'warning', msg: 'License renewal due for 3 health centers',         time: '5 hours ago' },
  { type: 'success', msg: 'New health center onboarded successfully',          time: '1 day ago' },
]

export default function SuperDashboard() {
  const [metrics, setMetrics] = useState({})

  useEffect(() => {
    api.get('/api/dashboard/super').then(r => setMetrics(r.data)).catch(() => {})
  }, [])

  return (
    <div className={styles.page}>
      {/* ── Stat cards ── */}
      <div className={styles.statsRow}>
        <StatCard label="Total Health Centers" value={metrics.totalClinics ?? 24}   sub="+2 this month"       icon="building" color="blue" />
        <StatCard label="Total Users"           value={metrics.totalUsers  ?? 342}   sub="+18 this week"       icon="users"    color="green" />
        <StatCard label="Active Roles"          value={metrics.activeRoles ?? 12}    sub="4 custom roles"      icon="shield"   color="purple" />
        <StatCard label="System Health"         value="99.8%"                        sub="All systems operational" icon="pulse" color="teal" />
      </div>

      {/* ── Charts ── */}
      <div className={styles.chartsRow}>
        <div className={`card ${styles.chartBox}`}>
          <div className={styles.chartTitle}>Facility Growth</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={FACILITY_GROWTH} margin={{ top: 8, right: 8, left: -24, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2.5}
                dot={{ r: 3, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={`card ${styles.chartBox}`}>
          <div className={styles.chartTitle}>User Growth</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={USER_GROWTH} margin={{ top: 8, right: 8, left: -24, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className={styles.bottomRow}>
        {/* Recent Health Centers */}
        <div className={`card ${styles.centersCard}`}>
          <div className={styles.centersHeader}>
            <div className={styles.chartTitle} style={{ marginBottom: 0 }}>Recent Health Centers</div>
            <button className={styles.viewAll}>View All</button>
          </div>
          {RECENT_CENTERS.map((c, i) => (
            <div key={i} className={styles.centerItem}>
              <div className={styles.centerIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div className={styles.centerInfo}>
                <div className={styles.centerName}>{c.name}</div>
                <div className={styles.centerLoc}>{c.location}</div>
                <div className={styles.centerDate}>Added {c.added}</div>
              </div>
              <div className={styles.centerRight}>
                <div className={styles.centerUsers}>{c.users} users</div>
                <span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-warn'}`}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* System Alerts */}
        <div className={`card ${styles.alertsCard}`}>
          <div className={styles.chartTitle}>System Alerts</div>
          {ALERTS.map((a, i) => (
            <div key={i} className={styles.alertItem}>
              <div className={styles.alertIconWrap} data-type={a.type}>
                {a.type === 'info'    && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                {a.type === 'warning' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                {a.type === 'success' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
              </div>
              <div>
                <div className={styles.alertMsg} data-type={a.type}>{a.msg}</div>
                <div className={styles.alertTime}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, icon, color }) {
  const colorMap = {
    blue:   { bg: '#EFF6FF', fg: '#2563EB', card: '#EFF6FF' },
    green:  { bg: '#ECFDF5', fg: '#10B981', card: '#ECFDF5' },
    purple: { bg: '#F5F3FF', fg: '#7C3AED', card: '#F5F3FF' },
    teal:   { bg: '#F0FDFA', fg: '#0D9488', card: '#F0FDFA' },
  }
  const c = colorMap[color]
  const icons = {
    building: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    users:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    shield:   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    pulse:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  }
  return (
    <div className={styles.statCard}>
      <div>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statSub}>{sub}</div>
      </div>
      <div className={styles.statIcon} style={{ background: c.bg, color: c.fg }}>
        {icons[icon]}
      </div>
    </div>
  )
}
