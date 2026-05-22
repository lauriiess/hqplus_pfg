// Prescriptive Analytics & Recommendations — matches prototype
import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'
import styles from './FacilityReportsPage.module.css'

const VOLUME_DATA = [
  { date: 'Jan 26', patients: 185 },
  { date: 'Jan 27', patients: 202 },
  { date: 'Jan 28', patients: 178 },
  { date: 'Jan 29', patients: 231 },
  { date: 'Jan 30', patients: 248 },
  { date: 'Jan 31', patients: 215 },
  { date: 'Feb 1',  patients: 226 },
]

const WAIT_DATA = [
  { dept: 'General',    wait: 18 },
  { dept: 'Pediatrics', wait: 22 },
  { dept: 'Cardiology', wait: 15 },
  { dept: 'Orthopedics',wait: 26 },
  { dept: 'Dermatology',wait: 20 },
]

const HOURLY_DATA = [
  { hour: '8 AM', count: 22 },
  { hour: '9 AM', count: 48 },
  { hour: '10 AM', count: 61 },
  { hour: '11 AM', count: 54 },
  { hour: '12 PM', count: 38 },
  { hour: '1 PM', count: 42 },
  { hour: '2 PM', count: 51 },
  { hour: '3 PM', count: 45 },
  { hour: '4 PM', count: 30 },
  { hour: '5 PM', count: 15 },
]

const DIST_DATA = [
  { name: 'General 35%',    value: 35, color: '#2563EB' },
  { name: 'Pediatrics 22%', value: 22, color: '#16A34A' },
  { name: 'Cardiology 18%', value: 18, color: '#D97706' },
  { name: 'Orthopedics 15%',value: 15, color: '#7C3AED' },
  { name: 'Dermatology 10%',value: 10, color: '#DB2777' },
]

const INSIGHTS = [
  { type: 'warning', title: 'Peak Hour Bottleneck', desc: 'Queue volume spikes at 10 AM — consider adding a morning triage staff to reduce average wait time by ~8 minutes.' },
  { type: 'success', title: 'Completion Rate Excellent', desc: '92.3% completion rate this week. Your team is performing above the regional benchmark of 85%.' },
  { type: 'info', title: 'Orthopedics Wait Time High', desc: 'Average wait of 26 min detected. Review slot allocation or add a second consultation room on peak days.' },
  { type: 'warning', title: 'Senior Citizen Queue Rising', desc: 'PWD/Senior priority queue increased 15% — consider a dedicated lane on Tuesdays and Thursdays.' },
]

const RANGES = ['Last 7 Days', 'Last 30 Days', 'Last 3 Months', 'Last Year']

export default function FacilityReportsPage() {
  const [range, setRange] = useState('Last 7 Days')

  return (
    <div className={styles.page}>
      {/* ── Controls ── */}
      <div className={styles.controls}>
        <div className={styles.dateRange}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Date Range:</span>
          <select
            className="dropdown-select"
            value={range}
            onChange={e => setRange(e.target.value)}
          >
            {RANGES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <button className="btn btn-outline btn-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export Report
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className={styles.statsGrid}>
        <AnalyticCard label="Avg. Daily Patients" value="218"  sub="+8.2%" subColor="green" icon="patients" />
        <AnalyticCard label="Avg. Wait Time"       value="20 min" sub="-12%"  subColor="green" icon="clock" />
        <AnalyticCard label="Completion Rate"      value="92.3%" sub="+2.1%"  subColor="green" icon="trend" />
        <AnalyticCard label="Peak Hour"            value="10 AM"  sub="55 patients avg" icon="bar" />
      </div>

      {/* ── Charts row 1 ── */}
      <div className={styles.row2}>
        <div className={`card ${styles.chartCard}`}>
          <div className={styles.chartTitle}>Patient Volume Trend</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={VOLUME_DATA} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="date" tick={{ fontSize: 11 }}/>
              <YAxis tick={{ fontSize: 11 }}/>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }}/>
              <Area type="monotone" dataKey="patients" stroke="#7C3AED" strokeWidth={2.5} fill="url(#volGrad)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={`card ${styles.pieCard}`}>
          <div className={styles.chartTitle}>Department Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={DIST_DATA}
                cx="50%" cy="50%"
                innerRadius={52} outerRadius={78}
                paddingAngle={3}
                dataKey="value"
                label={({ name }) => name}
                labelLine={false}
              >
                {DIST_DATA.map((d, i) => <Cell key={i} fill={d.color}/>)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Charts row 2 ── */}
      <div className={styles.row2}>
        <div className={`card ${styles.chartCard}`}>
          <div className={styles.chartTitle}>Average Wait Times by Department</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={WAIT_DATA} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="dept" tick={{ fontSize: 11 }}/>
              <YAxis tick={{ fontSize: 11 }} unit=" min"/>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }}/>
              <Bar dataKey="wait" fill="#2563EB" radius={[4, 4, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`card ${styles.chartCard}`}>
          <div className={styles.chartTitle}>Patient Traffic by Hour</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={HOURLY_DATA} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="hour" tick={{ fontSize: 10 }}/>
              <YAxis tick={{ fontSize: 11 }}/>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }}/>
              <Line
                type="monotone" dataKey="count"
                stroke="#0D9488" strokeWidth={2.5}
                dot={{ r: 4, fill: '#0D9488', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Key Insights ── */}
      <div className={`card ${styles.insightsCard}`}>
        <div className={styles.chartTitle}>Key Insights</div>
        <div className={styles.insightsList}>
          {INSIGHTS.map((ins, i) => (
            <div key={i} className={`${styles.insight} ${styles['insight_' + ins.type]}`}>
              <div className={styles.insightIcon}>
                {ins.type === 'warning' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                {ins.type === 'success' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
                {ins.type === 'info'    && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
              </div>
              <div>
                <div className={styles.insightTitle}>{ins.title}</div>
                <div className={styles.insightDesc}>{ins.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AnalyticCard({ label, value, sub, subColor, icon }) {
  const icons = {
    patients: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    clock:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    trend:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    bar:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  }
  return (
    <div className={`card ${styles.analyticCard}`}>
      <div className={styles.analyticIcon}>{icons[icon]}</div>
      <div className={styles.analyticSub} style={{ color: subColor === 'green' ? 'var(--success)' : 'var(--muted)' }}>
        {subColor === 'green' ? '▲ ' : ''}{sub}
      </div>
      <div className={styles.analyticValue}>{value}</div>
      <div className={styles.analyticLabel}>{label}</div>
    </div>
  )
}
