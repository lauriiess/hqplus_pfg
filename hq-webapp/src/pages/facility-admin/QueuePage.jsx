import { useState, useEffect, useCallback } from 'react'
import api, { clinicsApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './facility-admin.module.css'

const STATUS_BADGE = {
  waiting:'badge-warn', serving:'badge-blue',
  done:'badge-green', completed:'badge-green',
  skipped:'badge-gray', no_show:'badge-red', cancelled:'badge-red'
}
const PATIENT_TYPES = ['Regular','Senior Citizen','PWD','Pregnant','Priority']

export default function QueuePage() {
  const { user }   = useAuth()
  const [queue,    setQueue]      = useState([])
  const [metrics,  setMetrics]    = useState(null)
  const [services, setServices]   = useState([])   // clinic services for dropdown
  const [loading,  setLoading]    = useState(true)
  const [search,   setSearch]     = useState('')
  const [statusFilter, setStatus] = useState('All')
  const [walkinModal, setWalkin]  = useState(false)
  const [walkinForm, setWalkinForm] = useState({ patientName:'', phone:'', serviceName:'', patientType:'Regular' })
  const [saving,   setSaving]     = useState(false)
  const [toast,    setToast]      = useState('')

  const clinicId  = user?.clinicId
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(() => {
    if (!clinicId) { setLoading(false); return }
    setLoading(true)
    Promise.all([
      api.get('/api/queues', { params: { clinicId } }),
      api.get('/api/queues/metrics', { params: { clinicId } }).catch(() => ({ data: null })),
      clinicsApi.get(clinicId),
    ]).then(([qr, mr, cr]) => {
      setQueue(qr.data || [])
      setMetrics(mr.data)
      setServices((cr.data?.services || []).filter(s => s.isAvailable))
    }).catch(() => {})
    .finally(() => setLoading(false))
  }, [clinicId])

  useEffect(load, [load])

  const act = async (fn, label) => {
    try { await fn(); load() }
    catch { showToast(`Failed: ${label}`) }
  }

  const addWalkin = async () => {
    if (!walkinForm.patientName || !walkinForm.serviceName) {
      showToast('Name and service are required'); return
    }
    setSaving(true)
    try {
      await api.post('/api/queues/add-walkin', { ...walkinForm, clinicId })
      showToast('Walk-in patient added to queue')
      setWalkin(false)
      setWalkinForm({ patientName:'', phone:'', serviceName:'', patientType:'Regular' })
      load()
    } catch (e) { showToast(e?.response?.data?.message || 'Failed to add walk-in') }
    finally { setSaving(false) }
  }

  const exportCSV = () => {
    const rows = [['Queue #','Patient','Service','Type','Joined','Status']]
    filtered.forEach(q => rows.push([
      q.queueNumber, q.patientName, q.serviceName, q.queueType || 'Regular',
      q.joinedAt ? new Date(q.joinedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—',
      q.status,
    ]))
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const a    = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `queue_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    showToast('Queue exported')
  }

  const filtered = queue.filter(q => {
    const matchStatus = statusFilter === 'All' || q.status === statusFilter
    const matchSearch = !search ||
      q.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      q.queueNumber?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const waiting   = queue.filter(q => q.status === 'waiting').length
  const serving   = queue.filter(q => q.status === 'serving').length
  const completed = queue.filter(q => ['done','completed'].includes(q.status)).length

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Waiting</div>
          <div className={styles.statValue} style={{ color:'#D97706' }}>{loading ? '…' : waiting}</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Being Served</div>
          <div className={styles.statValue} style={{ color:'#2563EB' }}>{loading ? '…' : serving}</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Completed</div>
          <div className={styles.statValue} style={{ color:'#16A34A' }}>{loading ? '…' : completed}</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Avg Wait</div>
          <div className={styles.statValue}>{metrics?.avgWait ?? 0} min</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.header}>
        <div className={styles.toolbar}>
          <input className="form-input" style={{ width:220 }} placeholder="Search patient or queue #…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-select" style={{ width:140 }} value={statusFilter} onChange={e => setStatus(e.target.value)}>
            {['All','waiting','serving','done','skipped','no_show','cancelled'].map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>
            ))}
          </select>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline" onClick={exportCSV}>Export CSV</button>
          <button className="btn btn-outline" onClick={load}>Refresh</button>
          <button className="btn btn-primary" onClick={() => setWalkin(true)}>+ Add Walk-in</button>
        </div>
      </div>

      {/* Queue Table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading
          ? <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>Loading queue…</div>
          : filtered.length === 0
            ? <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>
                {queue.length === 0 ? 'No queue entries today.' : 'No results match your filter.'}
              </div>
            : <table className="table">
                <thead>
                  <tr>
                    <th>Queue #</th><th>Patient</th><th>Service</th>
                    <th>Type</th><th>Joined</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(q => (
                    <tr key={q._id}>
                      <td><strong>{q.queueNumber}</strong></td>
                      <td>
                        <div>{q.patientName || '—'}</div>
                        {q.patientPhone && <div style={{ fontSize:11, color:'var(--muted)' }}>{q.patientPhone}</div>}
                      </td>
                      <td>{q.serviceName || '—'}</td>
                      <td>
                        <span className={`badge ${q.queueType === 'Priority' ? 'badge-red' : 'badge-blue'}`}>
                          {q.queueType || 'Regular'}
                        </span>
                      </td>
                      <td style={{ fontSize:12 }}>
                        {q.joinedAt ? new Date(q.joinedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—'}
                      </td>
                      <td><span className={`badge ${STATUS_BADGE[q.status] || 'badge-gray'}`}>{q.status}</span></td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          {q.status === 'waiting' && (
                            <button className="btn btn-outline" style={{ fontSize:11, padding:'3px 8px' }}
                              onClick={() => act(() => api.put(`/api/queues/${q._id}/call`), 'call')}>Call</button>
                          )}
                          {q.status === 'serving' && (
                            <button className="btn btn-outline" style={{ fontSize:11, padding:'3px 8px', color:'var(--success)' }}
                              onClick={() => act(() => api.put(`/api/queues/${q._id}/complete`), 'complete')}>Done</button>
                          )}
                          {['waiting','serving'].includes(q.status) && (
                            <button className="btn btn-outline" style={{ fontSize:11, padding:'3px 8px', color:'var(--error)' }}
                              onClick={() => act(() => api.put(`/api/queues/${q._id}/cancel`), 'cancel')}>Cancel</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
        }
      </div>

      {/* Walk-in Modal */}
      {walkinModal && (
        <div className="modal-overlay" onClick={() => setWalkin(false)}>
          <div className="modal" style={{ maxWidth:420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Walk-in Patient</span>
              <button className="modal-close" onClick={() => setWalkin(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Patient Name <span style={{ color:'var(--error)' }}>*</span></label>
                <input className="form-input" value={walkinForm.patientName}
                  onChange={e => setWalkinForm(p => ({ ...p, patientName: e.target.value }))}
                  placeholder="Full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" value={walkinForm.phone}
                  onChange={e => setWalkinForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+63 9XX XXX XXXX" />
              </div>
              <div className="form-group">
                <label className="form-label">Service <span style={{ color:'var(--error)' }}>*</span></label>
                {services.length > 0
                  ? <select className="form-select" value={walkinForm.serviceName}
                      onChange={e => setWalkinForm(p => ({ ...p, serviceName: e.target.value }))}>
                      <option value="">Select service…</option>
                      {services.map(s => <option key={s._id || s.name} value={s.name}>{s.name} ({s.durationMinutes} min)</option>)}
                    </select>
                  : <input className="form-input" value={walkinForm.serviceName}
                      onChange={e => setWalkinForm(p => ({ ...p, serviceName: e.target.value }))}
                      placeholder="e.g. Laboratory" />
                }
              </div>
              <div className="form-group">
                <label className="form-label">Patient Type</label>
                <select className="form-select" value={walkinForm.patientType}
                  onChange={e => setWalkinForm(p => ({ ...p, patientType: e.target.value }))}>
                  {PATIENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setWalkin(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addWalkin} disabled={saving}>
                {saving ? 'Adding…' : 'Add to Queue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
