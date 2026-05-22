import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line
} from 'recharts'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './FacilityDashboard.module.css'

/* ── Stat card icons ── */
const Icons = {
  patients: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  queue:    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  wait:     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  done:     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
}

const DONUT_COLORS = ['#D97706', '#2563EB', '#16A34A']
const DAY_LABELS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SERVICE_COLORS = ['#2563EB', '#16A34A', '#D97706', '#7C3AED', '#0D9488']

const DEMO_QUEUE_BY_SERVICE = [
  { name: 'General Consultation', count: 18 },
  { name: 'Pre-natal Care',       count: 9 },
  { name: 'Family Planning',      count: 7 },
  { name: 'Child Immunization',   count: 11 },
  { name: 'Wound Care',           count: 5 },
]

const DEMO_WEEKLY = DAY_LABELS.map((d, i) => ({
  day: d,
  count: [185, 210, 195, 250, 260, 160, 125][i],
}))

const DEMO_RECENT = [
  { name: 'Juan Dela Cruz',   action: 'Checked in — General Consultation', time: '2 min ago', dot: 'orange' },
  { name: 'Maria Santos',     action: 'Consultation started — Pre-natal Care', time: '5 min ago', dot: 'blue' },
  { name: 'Pedro Reyes',      action: 'Completed — TB-DOTS Program', time: '8 min ago', dot: 'green' },
  { name: 'Ana Garcia',       action: 'Checked in — Family Planning', time: '12 min ago', dot: 'orange' },
  { name: 'Jose Cruz',        action: 'Consultation started — Child Immunization', time: '15 min ago', dot: 'blue' },
]

export default function FacilityDashboard() {
  const { user } = useAuth()
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const clinicId = user?.clinicId
    if (!clinicId) { setLoading(false); return }
    api.get(`/api/dashboard/facility?clinicId=${clinicId}`)
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [user])

  const q   = stats?.queue || {}
  const m   = stats?.metrics || {}
  const appts = stats?.appointments || {}

  const waiting  = q.waiting ?? 38
  const done     = q.done    ?? 209
  const inQueue  = (q.waiting ?? 38) + (q.serving ?? 12)
  const avgWait  = m.avgWait ?? 18
  const totalToday = (q.waiting ?? 38) + (q.serving ?? 12) + (q.done ?? 209)

  const donutData = [
    { name: 'Waiting',       value: q.waiting ?? 38 },
    { name: 'In Consultation', value: q.serving ?? 12 },
    { name: 'Completed',     value: q.done ?? 209 },
  ]

  return (
    <div className={styles.page}>
      {/* ── Stat cards ── */}
      <div className={styles.statsGrid}>
        <StatCard
          label="Total Patients Today"
          value={totalToday}
          sub="+12% from yesterday"
          icon={Icons.patients}
          iconClass="stat-icon-blue"
        />
        <StatCard
          label="In Queue"
          value={inQueue}
          sub="Across all departments"
          icon={Icons.queue}
          iconClass="stat-icon-orange"
        />
        <StatCard
          label="Avg. Wait Time"
          value={`${avgWait} min`}
          sub="-5 min from avg"
          icon={Icons.wait}
          iconClass="stat-icon-green"
        />
        <StatCard
          label="Consultations Done"
          value={done}
          sub={`${waiting} patients in queue`}
          icon={Icons.done}
          iconClass="stat-icon-purple"
        />
      </div>

      {/* ── Charts row 1 ── */}
      <div className={styles.chartsRow}>
        {/* Queue by service — bar chart */}
        <div className={`card ${styles.chartCard}`}>
          <div className={styles.chartTitle}>Queue Status by Department</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={DEMO_QUEUE_BY_SERVICE} margin={{ top: 8, right: 8, left: -18, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#16A34A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut — patient status */}
        <div className={`card ${styles.donutCard}`}>
          <div className={styles.chartTitle}>Patient Status</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {donutData.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.donutLegend}>
            {donutData.map((d, i) => (
              <div key={i} className={styles.legendRow}>
                <span className={styles.legendDot} style={{ background: DONUT_COLORS[i] }} />
                <span className={styles.legendLabel}>{d.name}</span>
                <span className={styles.legendVal}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Charts row 2 ── */}
      <div className={styles.chartsRow}>
        {/* Weekly line */}
        <div className={`card ${styles.chartCard}`}>
          <div className={styles.chartTitle}>Patient Traffic (This Week)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={DEMO_WEEKLY} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Line
                type="monotone" dataKey="count"
                stroke="#2563EB" strokeWidth={2.5}
                dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent activity */}
        <div className={`card ${styles.recentCard}`}>
          <div className={styles.chartTitle}>Recent Activity</div>
          <div className={styles.activityList}>
            {DEMO_RECENT.map((a, i) => (
              <div key={i} className={styles.activityItem}>
                <span
                  className={styles.activityDot}
                  style={{ background: a.dot === 'orange' ? '#D97706' : a.dot === 'blue' ? '#2563EB' : '#16A34A' }}
                />
                <div className={styles.activityInfo}>
                  <div className={styles.activityName}>{a.name}</div>
                  <div className={styles.activityAction}>{a.action}</div>
                  <div className={styles.activityTime}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, icon, iconClass }) {
  return (
    <div className="stat-card">
      <div className="stat-card-info">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
        {sub && <div className="stat-card-sub">{sub}</div>}
      </div>
      <div className={`stat-card-icon ${iconClass}`}>{icon}</div>
    </div>
  )
}
