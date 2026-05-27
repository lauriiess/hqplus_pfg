import { useEffect, useState } from 'react'
import api from '../../services/api'
import styles from './super-admin.module.css'

const CLINICS_DEMO = [
  { _id: '1', name: 'Makati City Health Center',  activeQueue: 34, avgWait: 18, status: 'normal' },
  { _id: '2', name: 'Cebu City Health Office',    activeQueue: 51, avgWait: 26, status: 'warning' },
  { _id: '3', name: 'Davao RHU Main',             activeQueue: 22, avgWait: 14, status: 'normal' },
  { _id: '4', name: 'Quezon City Health Center',  activeQueue: 68, avgWait: 35, status: 'critical' },
  { _id: '5', name: 'Pasig General Hospital',     activeQueue: 29, avgWait: 20, status: 'normal' },
  { _id: '6', name: 'Manila Health Center',       activeQueue: 45, avgWait: 28, status: 'warning' },
]

const statusBadge = (s) => {
  const map = { normal: 'badge-green', warning: 'badge-warn', critical: 'badge-red' }
  return <span className={'badge ' + (map[s] || 'badge-gray')}>{s}</span>
}

export default function QueueOversightPage() {
  const [clinics, setClinics]   = useState(CLINICS_DEMO)
  const [loading, setLoading]   = useState(false)
  const [toast,   setToast]     = useState('')
  const [search,  setSearch]    = useState('')
  const [filter,  setFilter]    = useState('All')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const refresh = () => {
    setLoading(true)
    api.get('/api/clinics')
      .then(r => { if (r.data?.length) setClinics(r.data); showToast('Queue data refreshed') })
      .catch(() => showToast('Using demo data'))
      .finally(() => setLoading(false))
  }

  const totalActive  = clinics.reduce((s, c) => s + (c.activeQueue || 0), 0)
  const avgWait      = Math.round(clinics.reduce((s, c) => s + (c.avgWait || 0), 0) / clinics.length)
  const critical     = clinics.filter(c => c.status === 'critical').length
  const warnings     = clinics.filter(c => c.status === 'warning').length

  const filtered = clinics.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || c.status === filter.toLowerCase()
    return matchSearch && matchFilter
  })

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && (
        <div className={styles.toast}>{toast}</div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Queue Oversight</div>
          <div className={styles.sub}>Real-time queue monitoring across all facilities</div>
        </div>
        <button className={"btn btn-primary btn-sm"} onClick={refresh} disabled={loading}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={"card " + styles.statCard}>
          <div className={styles.statLabel}>Total Active Queues</div>
          <div className={styles.statValue} style={{ color: "var(--primary)" }}>{totalActive}</div>
          <div className={styles.statSub}>Across all facilities</div>
        </div>
        <div className={"card " + styles.statCard}>
          <div className={styles.statLabel}>Avg. Wait Time</div>
          <div className={styles.statValue} style={{ color: "var(--success)" }}>{avgWait} min</div>
          <div className={styles.statSub}>Platform average</div>
        </div>
        <div className={"card " + styles.statCard}>
          <div className={styles.statLabel}>Critical Alerts</div>
          <div className={styles.statValue} style={{ color: "var(--error)" }}>{critical}</div>
          <div className={styles.statSub}>Needs attention</div>
        </div>
        <div className={"card " + styles.statCard}>
          <div className={styles.statLabel}>Warnings</div>
          <div className={styles.statValue} style={{ color: "var(--warning)" }}>{warnings}</div>
          <div className={styles.statSub}>High queue load</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search clinic..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="dropdown-select" value={filter} onChange={e => setFilter(e.target.value)}>
          {['All', 'Normal', 'Warning', 'Critical'].map(f => <option key={f}>{f}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Health Center</th>
                <th>Active Queue</th>
                <th>Avg Wait</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c._id}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--border-lt)', borderRadius: 99, maxWidth: 80 }}>
                        <div style={{ height: 6, borderRadius: 99, width: Math.min(100, (c.activeQueue / 80) * 100) + '%', background: c.status === 'critical' ? 'var(--error)' : c.status === 'warning' ? 'var(--warning)' : 'var(--success)' }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{c.activeQueue}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{c.avgWait} min</td>
                  <td>{statusBadge(c.status)}</td>
                  <td>
                    <button className="btn btn-outline btn-sm">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
