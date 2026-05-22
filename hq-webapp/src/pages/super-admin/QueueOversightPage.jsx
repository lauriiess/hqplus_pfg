import { useEffect, useState } from 'react'
import { queueApi, clinicsApi } from '../../services/api'
import toast from 'react-hot-toast'

const IcoRefresh = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>

const STATUS_COLORS = { waiting: 'badge-warning', serving: 'badge-primary', done: 'badge-success', no_show: 'badge-error', skipped: 'badge-muted' }

export default function QueueOversightPage() {
  const [clinics,       setClinics]       = useState([])
  const [entries,       setEntries]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [clinicFilter,  setClinicFilter]  = useState('all')
  const [statusFilter,  setStatusFilter]  = useState('all')

  const load = () => {
    setLoading(true)
    Promise.all([clinicsApi.list(), queueApi.list({})])
      .then(([cr, qr]) => { setClinics(cr.data); setEntries(Array.isArray(qr.data) ? qr.data : []) })
      .catch(() => toast.error('Failed to load queue data'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  const filtered = entries.filter((e) => {
    const matchClinic = clinicFilter === 'all' || e.clinic?._id === clinicFilter || e.clinic === clinicFilter
    const matchStatus = statusFilter === 'all' || e.status === statusFilter
    return matchClinic && matchStatus
  })

  const countByStatus = (status) => entries.filter((e) => e.status === status).length
  const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Queue Oversight</div>
          <div className="page-subtitle">Real-time queue activity across all clinics</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load} style={{ gap: 6 }}>{IcoRefresh} Refresh</button>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          ['Total', entries.length, 'var(--primary)'],
          ['Waiting', countByStatus('waiting'), 'var(--warning)'],
          ['Serving', countByStatus('serving'), 'var(--primary)'],
          ['Done', countByStatus('done'), 'var(--success)'],
          ['No Show', countByStatus('no_show'), 'var(--error)'],
        ].map(([label, count, color]) => (
          <div key={label} className="card" style={{ padding: '12px 20px', display: 'flex', gap: 10, alignItems: 'center', minWidth: 120 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{count}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <select className="input" style={{ width: 220 }} value={clinicFilter} onChange={(e) => setClinicFilter(e.target.value)}>
          <option value="all">All Clinics</option>
          {clinics.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select className="input" style={{ width: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {['all', 'waiting', 'serving', 'done', 'no_show', 'skipped'].map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace('_', ' ')}</option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 'auto' }}>{filtered.length} entries</span>
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="table-wrap card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr><th>Queue #</th><th>Patient</th><th>Service</th><th>Clinic</th><th>Type</th><th>Joined</th><th>Status</th><th>Wait</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={8}><div className="empty-state">No queue entries found.</div></td></tr>
                : filtered.map((e) => {
                  const clinic = clinics.find((c) => c._id === (e.clinic?._id || e.clinic))
                  return (
                    <tr key={e._id}>
                      <td><span style={{ fontWeight: 800, fontSize: 15, color: 'var(--primary)' }}>#{e.queueNumber}</span></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{e.patientName}</div>
                        {e.patientType && e.patientType !== 'Regular' && <span className="badge badge-warning" style={{ fontSize: 9 }}>{e.patientType}</span>}
                      </td>
                      <td style={{ fontSize: 13 }}>{e.serviceName}</td>
                      <td style={{ fontSize: 13 }}>{clinic?.name || '—'}</td>
                      <td><span className="badge badge-muted">{e.queueType?.replace('_', ' ')}</span></td>
                      <td style={{ fontSize: 12 }}>{fmtTime(e.joinedAt)}</td>
                      <td><span className={`badge ${STATUS_COLORS[e.status] || 'badge-muted'}`}>{e.status}</span></td>
                      <td style={{ fontSize: 13 }}>{e.actualWaitMinutes != null ? `${e.actualWaitMinutes}m` : e.estimatedWaitMinutes != null ? `~${e.estimatedWaitMinutes}m` : '—'}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
