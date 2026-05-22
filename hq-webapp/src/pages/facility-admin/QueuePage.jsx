import { useEffect, useState, useCallback } from 'react'
import { queueApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'

const COLS = [
  { status: 'waiting', label: 'Waiting',     color: 'var(--warning)',  bg: 'var(--warning-lt)' },
  { status: 'serving', label: 'Now Serving', color: 'var(--primary)',  bg: 'var(--primary-lt)' },
  { status: 'done',    label: 'Completed',   color: 'var(--success)',  bg: 'var(--success-lt)' },
]

export default function QueuePage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [walkinModal, setWalkinModal] = useState(false)
  const [walkinForm, setWalkinForm] = useState({ patientName: '', patientPhone: '', serviceName: '', patientType: 'Regular', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    queueApi.list({ clinicId: user?.clinicId })
      .then((res) => setEntries(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Failed to load queue'))
      .finally(() => setLoading(false))
  }, [user?.clinicId])

  useEffect(() => { load() }, [load])

  // Auto refresh every 20s
  useEffect(() => {
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [load])

  const action = async (fn, label) => {
    try { await fn(); load(); toast.success(`${label} done.`) }
    catch (err) { toast.error(typeof err === 'string' ? err : `${label} failed.`) }
  }

  const handleAddWalkin = async () => {
    if (!walkinForm.patientName || !walkinForm.serviceName) { toast.error('Name and service are required.'); return }
    setSaving(true)
    try {
      const res = await queueApi.addWalkin({ ...walkinForm, clinicId: user?.clinicId })
      toast.success(`Added! Queue #${res.data?.queueNumber}`)
      setWalkinModal(false)
      setWalkinForm({ patientName: '', patientPhone: '', serviceName: '', patientType: 'Regular', notes: '' })
      load()
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to add walk-in.')
    } finally { setSaving(false) }
  }

  const byStatus = (status) => entries.filter((e) => e.status === status)
    .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt))

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Queue Management</div>
          <div className="page-subtitle">Today's walk-in queue — live view</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={load}>⟳ Refresh</button>
          <button className="btn btn-primary" onClick={() => setWalkinModal(true)}>+ Add Walk-in</button>
        </div>
      </div>

      {loading ? <div className="spinner" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, alignItems: 'start' }}>
          {COLS.map((col) => {
            const colEntries = byStatus(col.status)
            return (
              <div key={col.status}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderRadius: 10, background: col.bg, marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, color: col.color, fontSize: 14 }}>{col.label}</span>
                  <span style={{ fontWeight: 800, color: col.color, fontSize: 18 }}>{colEntries.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {colEntries.length === 0
                    ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>No patients</div>
                    : colEntries.map((e) => <QueueCard key={e._id} entry={e} col={col} onAction={action} />)
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Walk-in Modal */}
      <Modal open={walkinModal} onClose={() => setWalkinModal(false)} title="Add Walk-in Patient"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setWalkinModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddWalkin} disabled={saving}>{saving ? 'Adding…' : 'Add to Queue'}</button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Patient Name *</label>
            <input className="input" value={walkinForm.patientName} onChange={(e) => setWalkinForm((f) => ({ ...f, patientName: e.target.value }))} placeholder="Full name" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="input" type="tel" value={walkinForm.patientPhone} onChange={(e) => setWalkinForm((f) => ({ ...f, patientPhone: e.target.value }))} placeholder="+63 9XX XXX XXXX" />
          </div>
          <div className="form-group">
            <label className="form-label">Service *</label>
            <input className="input" value={walkinForm.serviceName} onChange={(e) => setWalkinForm((f) => ({ ...f, serviceName: e.target.value }))} placeholder="e.g. General Consultation" />
          </div>
          <div className="form-group">
            <label className="form-label">Patient Type</label>
            <select className="input" value={walkinForm.patientType} onChange={(e) => setWalkinForm((f) => ({ ...f, patientType: e.target.value }))}>
              {['Regular', 'Senior Citizen', 'PWD', 'Pregnant'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="input" rows={2} value={walkinForm.notes} onChange={(e) => setWalkinForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
          </div>
        </div>
      </Modal>
    </div>
  )
}

function QueueCard({ entry: e, col, onAction }) {
  const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 14, boxShadow: 'var(--shadow)', borderLeft: `4px solid ${col.color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ background: col.bg, color: col.color, fontWeight: 800, fontSize: 14, padding: '4px 10px', borderRadius: 6 }}>{e.queueNumber}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.patientName || '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.serviceName}</div>
        </div>
        {e.patientType && e.patientType !== 'Regular' && (
          <span className="badge badge-warning" style={{ fontSize: 9 }}>{e.patientType}</span>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
        Joined: {fmtTime(e.joinedAt)} {e.patientPhone ? `· ${e.patientPhone}` : ''}
      </div>
      {e.status === 'waiting' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onAction(() => queueApi.call(e._id), 'Call')}>📣 Call</button>
          <button className="btn btn-sm" style={{ flex: 1, background: 'var(--warning-lt)', color: 'var(--warning)' }} onClick={() => onAction(() => queueApi.skip(e._id), 'Skip')}>⏭ Skip</button>
        </div>
      )}
      {e.status === 'serving' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => onAction(() => queueApi.complete(e._id), 'Complete')}>✅ Done</button>
          <button className="btn btn-sm" style={{ flex: 1, background: 'var(--error-lt)', color: 'var(--error)' }} onClick={() => onAction(() => queueApi.noShow(e._id), 'No Show')}>❌ No Show</button>
        </div>
      )}
      {e.status === 'done' && (
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          {e.doneAt ? `Served at ${fmtTime(e.doneAt)}` : 'Completed'}
        </div>
      )}
    </div>
  )
}
