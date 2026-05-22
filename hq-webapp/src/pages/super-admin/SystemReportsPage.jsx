import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import api from '../../services/api'
import styles from './SystemReportsPage.module.css'

const MONTHLY = [
  { month: 'Nov', patients: 3200, appointments: 810 },
  { month: 'Dec', patients: 3800, appointments: 920 },
  { month: 'Jan', patients: 4100, appointments: 980 },
  { month: 'Feb', patients: 3900, appointments: 870 },
  { month: 'Mar', patients: 4500, appointments: 1100 },
  { month: 'Apr', patients: 4800, appointments: 1240 },
]

const CLINIC_DATA = [
  { name: 'Makati HC',   patients: 1420 },
  { name: 'Cebu CHO',    patients: 1180 },
  { name: 'Davao RHU',   patients: 980  },
  { name: 'QC HC',       patients: 1650 },
  { name: 'Pasig Gen',   patients: 870  },
]

const STATUS_DIST = [
  { name: 'Completed', value: 68, color: '#16A34A' },
  { name: 'Pending',   value: 18, color: '#D97706' },
  { name: 'Cancelled', value: 9,  color: '#DC2626' },
  { name: 'No Show',   value: 5,  color: '#6B7280' },
]

export default function SystemReportsPage() {
  const [range, setRange] = useState('Last 30 Days')

  return (
    <div className={styles.page}>
      {/* Controls */}
      <div className={styles.controls}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--muted)" }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <select className="dropdown-select" value={range} onChange={e => setRange(e.target.value)}>
            {["Last 7 Days","Last 30 Days","Last 3 Months","Last Year"].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <button className="btn btn-outline btn-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
      </div>

      {/* Stat cards */}
      <div className={styles.statsRow}>
        <MiniStat label="Total Patient Visits"    value="24,180" sub="+12% vs last period" color="blue" />
        <MiniStat label="Total Appointments"      value="6,920"  sub="+8% vs last period"  color="green" />
        <MiniStat label="Avg Completion Rate"     value="91.4%"  sub="Platform-wide"        color="purple" />
        <MiniStat label="Active Clinics Reporting" value="81"    sub="All regions"           color="teal" />
      </div>

      {/* Charts row 1 */}
      <div className={styles.row2}>
        <div className={"card " + styles.chartCard}>
          <div className={styles.chartTitle}>Monthly Patient Volume vs Appointments</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MONTHLY} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="patients"     name="Patients"     fill="#2563EB" radius={[3,3,0,0]} />
              <Bar dataKey="appointments" name="Appointments" fill="#10B981" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={"card " + styles.pieCard}>
          <div className={styles.chartTitle}>Appointment Status</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={STATUS_DIST} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                {STATUS_DIST.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.pieLegend}>
            {STATUS_DIST.map(d => (
              <div key={d.name} className={styles.pieLegendRow}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: d.color, display: "inline-block", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: "var(--muted)" }}>{d.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className={"card " + styles.chartCard}>
        <div className={styles.chartTitle}>Top Clinics by Patient Volume</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={CLINIC_DATA} layout="vertical" margin={{ top: 8, right: 24, left: 60, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="patients" name="Patients" fill="#7C3AED" radius={[0,3,3,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function MiniStat({ label, value, sub, color }) {
  const bgMap = { blue: "#EFF6FF", green: "#ECFDF5", purple: "#F5F3FF", teal: "#F0FDFA" }
  const fgMap = { blue: "#2563EB", green: "#16A34A", purple: "#7C3AED", teal: "#0D9488" }
  return (
    <div className={"card " + styles.miniStat}>
      <div className={styles.miniDot} style={{ background: bgMap[color], color: fgMap[color] }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
      </div>
      <div className={styles.miniValue}>{value}</div>
      <div className={styles.miniLabel}>{label}</div>
      <div className={styles.miniSub} style={{ color: fgMap[color] }}>{sub}</div>
    </div>
  )
}
