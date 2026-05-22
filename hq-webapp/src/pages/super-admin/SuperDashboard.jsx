import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts'
import api from '../../services/api'
import styles from './SuperDashboard.module.css'

const COLORS = ['#2563EB','#16A34A','#D97706','#7C3AED','#0D9488']

const REGION_DATA = [
  { name: 'NCR',      clinics: 28 },
  { name: 'Region III', clinics: 14 },
  { name: 'Region IV', clinics: 19 },
  { name: 'Region V',  clinics: 11 },
  { name: 'Region VII',clinics: 9  },
]

const WEEKLY = [
  { day: 'Mon', patients: 1820 },
  { day: 'Tue', patients: 2100 },
  { day: 'Wed', patients: 1950 },
  { day: 'Thu', patients: 2380 },
  { day: 'Fri', patients: 2550 },
  { day: 'Sat', patients: 1400 },
  { day: 'Sun', patients: 980  },
]

const DIST = [
  { name: 'General',    value: 38 },
  { name: 'Pediatrics', value: 22 },
  { name: 'OB/GYN',    value: 18 },
  { name: 'Others',     value: 22 },
]

const RECENT = [
  { clinic: 'Quezon City HC',  event: 'New facility admin registered', time: '5 min ago' },
  { clinic: 'Makati Medical',  event: 'Service list updated',          time: '18 min ago' },
  { clinic: 'Pasig Gen Hosp',  event: 'Chatbot FAQ updated',           time: '32 min ago' },
  { clinic: 'Manila HC',       event: 'Staff member added',            time: '1 hr ago' },
  { clinic: 'Caloocan HC',     event: 'New clinic onboarded',          time: '2 hr ago' },
]

export default function SuperDashboard() {
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    api.get('/api/dashboard/super').then(r => setMetrics(r.data)).catch(() => {})
  }, [])

  const m = metrics || {}

  return (
    <div className={styles.page}>
      {/* Stats */}
      <div className={styles.statsGrid}>
        <StatCard label="Total Clinics"      value={m.totalClinics   ?? 81}  sub="Platform-wide" icon="clinic"   cls="stat-icon-blue" />
        <StatCard label="Total Patients"     value={m.totalPatients  ?? '12,480'} sub="All registered" icon="patients" cls="stat-icon-green" />
        <StatCard label="Active Queues"      value={m.activeQueues   ?? 247}  sub="Right now"    icon="queue"    cls="stat-icon-orange" />
        <StatCard label="System Uptime"      value="99.8%"                   sub="Last 30 days" icon="up"       cls="stat-icon-purple" />
      </div>

      {/* Charts row 1 */}
      <div className={styles.row}>
        <div className={`card ${styles.chartCard}`}>
          <div className={styles.chartTitle}>Clinics by Region</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={REGION_DATA} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize: 11 }}/>
              <YAxis tick={{ fontSize: 11 }}/>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }}/>
              <Bar dataKey="clinics" fill="#2563EB" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={`card ${styles.donutCard}`}>
          <div className={styles.chartTitle}>Service Distribution</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={DIST} cx="50%" cy="50%" innerRadius={50} outerRadius={76} paddingAngle={3} dataKey="value">
                {DIST.map((_,i) => <Cell key={i} fill={COLORS[i]}/>)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }}/>
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.legend}>
            {DIST.map((d,i) => (
              <div key={i} className={styles.legendRow}>
                <span className={styles.legendDot} style={{ background: COLORS[i] }}/>
                <span className={styles.legendLabel}>{d.name}</span>
                <span className={styles.legendVal}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className={styles.row}>
        <div className={`card ${styles.chartCard}`}>
          <div className={styles.chartTitle}>Platform-wide Patient Volume (This Week)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={WEEKLY} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="day" tick={{ fontSize: 11 }}/>
              <YAxis tick={{ fontSize: 11 }}/>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }}/>
              <Line type="monotone" dataKey="patients" stroke="#2563EB" strokeWidth={2.5}
                dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={`card ${styles.actCard}`}>
          <div className={styles.chartTitle}>Recent Activity</div>
          {RECENT.map((a, i) => (
            <div key={i} className={styles.actItem}>
              <div className={styles.actAvatar}>{a.clinic[0]}</div>
              <div className={styles.actInfo}>
                <div className={styles.actClinic}>{a.clinic}</div>
                <div className={styles.actEvent}>{a.event}</div>
              </div>
              <div className={styles.actTime}>{a.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, icon, cls }) {
  const icons = {
    clinic:   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    patients: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    queue:    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
    up:       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  }
  return (
    <div className="stat-card">
      <div className="stat-card-info">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-sub">{sub}</div>
      </div>
      <div className={`stat-card-icon ${cls}`}>{icons[icon]}</div>
    </div>
  )
}
