import { useEffect, useState, useCallback } from 'react'
import { appointmentsApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  pending:   'badge-warning',
  confirmed: 'badge-primary',
  completed: 'badge-success',
  cancelled: 'badge-error',
  no_show:   'badge-muted',
}

const STATUSES = ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'no_show']

export default function AppointmentsPage() {
  const { user } = useAuth()
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    appointmentsApi.today(user?.clinicId)
      .then((res) => setAppts(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Failed to load appointments'))
      .finally(() => setLoading(false))
  }, [user?.clinicId])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id, status) => {
    try {
      await appointmentsApi.updateStatus(id, status)
      toast.success(`Status updated to ${status}.`)
      load()
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Update failed.')
    }
  }

  const filtered = appts.filter((a) => {
    const matchStatus = filter === 'all' || a.status === filter
    const matchSearch = !search || a.patientName?.toLowerCase().includes(search.toLowerCase()) || a.serviceName?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—'
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Appointments</div>
          <div className="page-subtitle">Today's scheduled appointments</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>⟳ Refresh</button>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: '12px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" style={{ flex: '1 1 200px' }} placeholder="🔍  Search patient or service…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(s)}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
              <span style={{ marginLeft: 4, fontSize: 11, opacity: .8 }}>
                ({s === 'all' ? appts.length : appts.filter((a) => a.status === s).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="table-wrap card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Time</th><th>Patient</th><th>Service</th><th>Reason</th><th>Type</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state">No appointments found.</div></td></tr>
              ) : filtered.map((a) => (
                <tr key={a._id}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>{a.timeSlot}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(a.appointmentDate)}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.patientName || (a.patient?.fullName) || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.patient?.phone || a.patientPhone || ''}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{a.serviceName}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 160 }}>{a.reason || '—'}</td>
                  <td>
                    <span className={`badge ${a.patientType === 'Regular' ? 'badge-muted' : 'badge-warning'}`}>{a.patientType || 'Regular'}</span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_COLORS[a.status] || 'badge-muted'}`}>{a.status}</span>
                  </td>
                  <td>
                    {(a.status === 'pending' || a.status === 'confirmed') && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {a.status === 'pending' && <button className="btn btn-sm btn-primary" onClick={() => updateStatus(a._id, 'confirmed')}>Confirm</button>}
                        <button className="btn btn-sm btn-success" onClick={() => updateStatus(a._id, 'completed')}>Done</button>
                        <button className="btn btn-sm" style={{ background: 'var(--warning-lt)', color: 'var(--warning)' }} onClick={() => updateStatus(a._id, 'no_show')}>No Show</button>
                        <button className="btn btn-sm" style={{ background: 'var(--error-lt)', color: 'var(--error)' }} onClick={() => updateStatus(a._id, 'cancelled')}>Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
