// Queue Oversight — matches prototype with bottleneck detection + department cards
import { useState } from 'react'
import styles from './AppointmentsPage.module.css'

const DEPTS = [
  {
    name: 'General Consultation', doctors: 3, status: 'NORMAL',
    queued: 18, serving: 3, completed: 42, avgWait: 22,
  },
  {
    name: 'Pre-natal Care', doctors: 2, status: 'NORMAL',
    queued: 12, serving: 2, completed: 28, avgWait: 15,
  },
  {
    name: 'Child Immunization', doctors: 2, status: 'WARNING',
    queued: 25, serving: 2, completed: 35, avgWait: 38,
  },
  {
    name: 'Family Planning', doctors: 1, status: 'NORMAL',
    queued: 8, serving: 1, completed: 19, avgWait: 12,
  },
  {
    name: 'TB-DOTS Program', doctors: 1, status: 'NORMAL',
    queued: 6, serving: 1, completed: 24, avgWait: 10,
  },
  {
    name: 'Dental Services', doctors: 1, status: 'WARNING',
    queued: 14, serving: 1, completed: 11, avgWait: 28,
  },
]

const BOTTLENECKS = [
  { dept: 'Child Immunization', reason: 'High queue length (25 patients)', suggestion: 'Consider opening additional immunization station' },
  { dept: 'Dental Services',    reason: 'Above average wait time (28 minutes)',  suggestion: 'Check if dentist needs assistance' },
]

const ACTIVITY = [
  { id: 'P-2024-156', action: 'Checked in',          service: 'General Consultation', time: '14:48', type: 'check' },
  { id: 'P-2024-155', action: 'Consultation started', service: 'Pre-natal Care',      time: '14:43', type: 'consult' },
  { id: 'P-2024-154', action: 'Completed',            service: 'Child Immunization',  time: '14:40', type: 'done' },
  { id: 'P-2024-153', action: 'Checked in',           service: 'Family Planning',     time: '14:38', type: 'check' },
  { id: 'P-2024-152', action: 'Consultation started', service: 'General Consultation', priority: 'Senior Citizen', time: '14:35', type: 'consult' },
  { id: 'P-2024-151', action: 'Completed',            service: 'TB-DOTS Program',     time: '14:32', type: 'done' },
  { id: 'P-2024-150', action: 'Checked in',           service: 'Dental Services',     priority: 'PWD', time: '14:30', type: 'check' },
]

export default function AppointmentsPage() {
  const [view, setView]     = useState('real-time')
  const [service, setService] = useState('All Services')

  const actDotColor = (t) => ({
    check: 'var(--primary)', consult: 'var(--warning)', done: 'var(--success)'
  }[t] || 'var(--muted)')

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Real-Time Queue Oversight</div>
          <div className={styles.sub}>Monitor queue flow and detect bottlenecks across all services</div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${view === 'real-time' ? styles.viewActive : ''}`} onClick={() => setView('real-time')}>Real-time View</button>
            <button className={`${styles.viewBtn} ${view === 'summary' ? styles.viewActive : ''}`} onClick={() => setView('summary')}>Summary View</button>
          </div>
          <button className="btn btn-primary btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Filter + live badge */}
      <div className={styles.filterRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--muted)' }}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Filter by Service:</span>
          <select className="dropdown-select" value={service} onChange={e => setService(e.target.value)}>
            {['All Services', ...DEPTS.map(d => d.name)].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className={styles.liveBadge}>
          <span className={styles.liveDot} />
          Live Updates · Last updated: Just now
        </div>
      </div>

      {/* ── Bottleneck alerts ── */}
      {BOTTLENECKS.length > 0 && (
        <div className={`card ${styles.bottleneckCard}`}>
          <div className={styles.bottleneckHeader}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--warning)' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>Bottlenecks Detected</span>
          </div>
          {BOTTLENECKS.map((b, i) => (
            <div key={i} className={styles.bottleneckItem}>
              <div className={styles.bottleneckLeft}>
                <div className={styles.bottleneckDept}>{b.dept}</div>
                <div className={styles.bottleneckReason}>{b.reason}</div>
                <div className={styles.bottleneckSug}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {b.suggestion}
                </div>
              </div>
              <button className="btn btn-outline btn-sm">Take Action</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Main 2-col ── */}
      <div className={styles.mainGrid}>
        {/* Dept cards */}
        <div className={styles.deptList}>
          {DEPTS.filter(d => service === 'All Services' || d.name === service).map(d => (
            <div key={d.name} className={`card ${styles.deptCard}`}>
              <div className={styles.deptHeader}>
                <div>
                  <div className={styles.deptName}>{d.name}</div>
                  <div className={styles.deptDoctors}>{d.doctors} doctor(s) assigned</div>
                </div>
                <span className={`badge ${d.status === 'WARNING' ? 'badge-warn' : 'badge-green'}`}>{d.status}</span>
              </div>
              <div className={styles.deptStats}>
                <DeptStat label="Queued"    value={d.queued}    color="orange" icon="queue" />
                <DeptStat label="Serving"   value={d.serving}   color="blue"   icon="serve" />
                <DeptStat label="Completed" value={d.completed} color="green"  icon="done" />
                <DeptStat label="Avg Wait"  value={`${d.avgWait} min`} color="purple" icon="clock" />
              </div>
            </div>
          ))}
        </div>

        {/* Activity feed */}
        <div className={`card ${styles.activityCard}`}>
          <div className={styles.actTitle}>Recent Activity</div>
          {ACTIVITY.map((a, i) => (
            <div key={i} className={styles.actItem}>
              <div className={styles.actIconWrap}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={actDotColor(a.type)} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className={styles.actInfo}>
                <div className={styles.actId}>{a.id}</div>
                <div className={styles.actAction}>{a.action}</div>
                <div className={styles.actService}>{a.service}
                  {a.priority && <span className="badge badge-orange" style={{ marginLeft: 6, fontSize: 10 }}>{a.priority}</span>}
                </div>
              </div>
              <div className={styles.actTime}>{a.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DeptStat({ label, value, color, icon }) {
  const colorMap = { orange: 'var(--orange)', blue: 'var(--primary)', green: 'var(--success)', purple: 'var(--purple)' }
  const bgMap    = { orange: 'var(--orange-lt)', blue: 'var(--primary-lt)', green: 'var(--success-lt)', purple: 'var(--purple-lt)' }
  return (
    <div className={styles.deptStat} style={{ background: bgMap[color] }}>
      <div className={styles.deptStatLabel} style={{ color: colorMap[color] }}>{label}</div>
      <div className={styles.deptStatValue} style={{ color: colorMap[color] }}>{value}</div>
    </div>
  )
}
