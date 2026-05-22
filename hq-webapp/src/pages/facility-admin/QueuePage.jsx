import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './QueuePage.module.css'

const STATUSES = ['All Status', 'waiting', 'serving', 'done', 'no_show']

const statusBadge = (s) => {
  const map = {
    waiting:   ['badge badge-orange', 'Waiting'],
    serving:   ['badge badge-blue',   'In Consultation'],
    done:      ['badge badge-green',  'Completed'],
    no_show:   ['badge badge-red',    'No Show'],
    skipped:   ['badge badge-gray',   'Skipped'],
    cancelled: ['badge badge-gray',   'Cancelled'],
  }
  const [cls, label] = map[s] || ['badge badge-gray', s]
  return <span className={cls}>{label}</span>
}

const priorityBadge = (t) => {
  if (t === 'Senior Citizen' || t === 'PWD' || t === 'Pregnant' || t === 'Priority')
    return <span className="badge badge-red">Urgent</span>
  return <span className="badge badge-gray">Normal</span>
}

export default function QueuePage() {
  const { user } = useAuth()
  const [entries, setEntries]   = useState([])
  const [metrics, setMetrics]   = useState({})
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('All Status')
  const [search, setSearch]     = useState('')

  const clinicId = user?.clinicId

  const load = useCallback(async () => {
    if (!clinicId) return
    try {
      const [qRes, mRes] = await Promise.all([
        api.get(`/api/queues?clinicId=${clinicId}`),
        api.get(`/api/queues/metrics?clinicId=${clinicId}`),
      ])
      setEntries(qRes.data || [])
      setMetrics(mRes.data || {})
    } catch { /* keep existing */ }
    finally { setLoading(false) }
  }, [clinicId])

  useEffect(() => { load() }, [load])

  const action = async (id, endpoint) => {
    try {
      await api.put(`/api/queues/${id}/${endpoint}`)
      load()
    } catch (e) {
      alert(e.response?.data?.message || 'Action failed.')
    }
  }

  const filtered = entries.filter(e => {
    const matchStatus = filter === 'All Status' || e.status === filter
    const matchSearch = !search ||
      e.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      e.queueNumber?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className={styles.page}>
      {/* ── Metric cards ── */}
      <div className={styles.metricsRow}>
        <MetricCard label="Total in Queue" value={metrics.waiting ?? 0} icon="users" />
        <MetricCard label="Avg Wait Time"  value={`${metrics.avgWaitMinutes ?? 0} min`} icon="clock" color="orange" />
        <MetricCard label="Served Today"   value={metrics.done ?? 0} icon="trend" color="green" />
      </div>

      {/* ── Queue table ── */}
      <div className="card">
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>Current Queue Status</div>
          <div className={styles.tableActions}>
            {/* Filters */}
            <select
              className="dropdown-select"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <button className="btn btn-outline btn-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
            <button className="btn btn-primary btn-sm" onClick={load}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Refresh
            </button>
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className="search-bar" style={{ flex: 1, maxWidth: 360 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              placeholder="Search patient name or queue number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            className={`btn btn-sm ${filter === 'waiting' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(f => f === 'waiting' ? 'All Status' : 'waiting')}
          >
            Urgent Only
          </button>
        </div>

        <div className="table-wrap" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border)' }}>
          <table>
            <thead>
              <tr>
                <th>Queue #</th>
                <th>Patient Name</th>
                <th>Department</th>
                <th>Doctor / Staff</th>
                <th>Check-in</th>
                <th>Wait Time</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>Loading queue…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No queue entries found.</td></tr>
              ) : filtered.map(e => (
                <tr key={e._id}>
                  <td><span style={{ fontWeight: 700, color: 'var(--primary)' }}>{e.queueNumber}</span></td>
                  <td style={{ fontWeight: 600 }}>{e.patientName}</td>
                  <td><span style={{ color: 'var(--primary)' }}>{e.serviceName}</span></td>
                  <td><span style={{ color: 'var(--muted)' }}>—</span></td>
                  <td style={{ color: 'var(--muted)' }}>
                    {e.joinedAt ? new Date(e.joinedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {e.estimatedWaitMinutes != null ? `${e.estimatedWaitMinutes} min` : e.actualWaitMinutes != null ? `${e.actualWaitMinutes} min` : '—'}
                  </td>
                  <td>{priorityBadge(e.patientType)}</td>
                  <td>{statusBadge(e.status)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      {e.status === 'waiting' && (
                        <button className="btn btn-primary btn-sm" onClick={() => action(e._id, 'call')}>Call</button>
                      )}
                      {e.status === 'serving' && (
                        <button className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff' }} onClick={() => action(e._id, 'complete')}>Done</button>
                      )}
                      {e.status === 'waiting' && (
                        <button className="btn btn-outline btn-sm" onClick={() => action(e._id, 'skip')}>Skip</button>
                      )}
                    </div>
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

function MetricCard({ label, value, icon, color = 'blue' }) {
  const icons = {
    users: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    clock: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    trend: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  }
  const colorMap = { blue: 'stat-icon-blue', orange: 'stat-icon-orange', green: 'stat-icon-green' }
  return (
    <div className="stat-card">
      <div className="stat-card-info">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
      </div>
      <div className={`stat-card-icon ${colorMap[color]}`}>{icons[icon]}</div>
    </div>
  )
}
