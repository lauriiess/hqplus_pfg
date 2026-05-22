import { useEffect, useState, useCallback } from 'react'
import { staffApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const POSITIONS = ['Receptionist', 'Nurse', 'Doctor', 'Specialist', 'Medical Assistant', 'Other']

export default function StaffPage() {
  const { user } = useAuth()
  const [staff,    setStaff]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState({})
  const [saving,   setSaving]   = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    staffApi.list({ clinicId: user?.clinicId })
      .then((r) => setStaff(r.data))
      .catch(() => toast.error('Failed to load staff'))
      .finally(() => setLoading(false))
  }, [user?.clinicId])

  useEffect(() => { load() }, [load])

  const openEdit   = (s) => { setSelected(s); setForm({ position: s.position, specialization: s.specialization || '', licenseNumber: s.licenseNumber || '', phone: s.phone || '', schedule: s.schedule || [], isActive: s.isActive }); setModal('edit') }
  const openDeact  = (s) => { setSelected(s); setModal('deactivate') }
  const openSched  = (s) => { setSelected(s); setForm({ schedule: s.schedule || [] }); setModal('schedule') }
  const closeModal = () => { setModal(null); setSelected(null) }

  const handleSave = async () => {
    setSaving(true)
    try {
      await staffApi.update(selected._id, form)
      toast.success('Staff updated.')
      closeModal(); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleDeactivate = async () => {
    setSaving(true)
    try {
      await staffApi.deactivate(selected._id)
      toast.success('Staff deactivated.')
      closeModal(); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const toggleDay = (day) => {
    const sched = form.schedule || []
    const exists = sched.find((s) => s.day === day)
    if (exists) {
      setForm((f) => ({ ...f, schedule: sched.filter((s) => s.day !== day) }))
    } else {
      setForm((f) => ({ ...f, schedule: [...sched, { day, startTime: '08:00', endTime: '17:00', isAvailable: true }] }))
    }
  }

  const updateSlot = (day, field, val) => {
    setForm((f) => ({ ...f, schedule: f.schedule.map((s) => s.day === day ? { ...s, [field]: val } : s) }))
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Staff Management</div>
          <div className="page-subtitle">Manage clinic staff profiles, roles, and schedules</div>
        </div>
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="table-wrap card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr><th>Name</th><th>Position</th><th>Specialization</th><th>Phone</th><th>Schedule</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {staff.length === 0
                ? <tr><td colSpan={7}><div className="empty-state">No staff found. Add staff through User Management.</div></td></tr>
                : staff.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary-lt)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                          {s.fullName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.fullName}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-primary">{s.position}</span></td>
                    <td style={{ fontSize: 13 }}>{s.specialization || '—'}</td>
                    <td style={{ fontSize: 13 }}>{s.phone || '—'}</td>
                    <td style={{ fontSize: 12 }}>{s.schedule?.length > 0 ? s.schedule.map((d) => d.day.slice(0, 3)).join(', ') : 'Not set'}</td>
                    <td><span className={`badge ${s.isActive ? 'badge-success' : 'badge-muted'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Edit</button>
                        <button className="btn btn-outline btn-sm" onClick={() => openSched(s)}>Schedule</button>
                        {s.isActive && <button className="btn btn-sm" style={{ background: 'var(--warning-lt)', color: 'var(--warning)' }} onClick={() => openDeact(s)}>Deactivate</button>}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={modal === 'edit'} onClose={closeModal} title={`Edit — ${selected?.fullName}`}
        footer={<><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Position</label>
            <select className="input" value={form.position || ''} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}>
              {POSITIONS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="input" value={form.phone || ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Specialization</label>
            <input className="input" value={form.specialization || ''} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))} placeholder="e.g. Pediatrics" />
          </div>
          <div className="form-group">
            <label className="form-label">License Number</label>
            <input className="input" value={form.licenseNumber || ''} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal open={modal === 'schedule'} onClose={closeModal} title={`Schedule — ${selected?.fullName}`} width={540}
        footer={<><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Schedule'}</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DAYS.map((day) => {
            const slot = (form.schedule || []).find((s) => s.day === day)
            return (
              <div key={day} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: slot ? 600 : 400 }}>
                  <input type="checkbox" checked={!!slot} onChange={() => toggleDay(day)} />
                  {day}
                </label>
                {slot ? (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>Start</label>
                      <input className="input" type="time" value={slot.startTime} onChange={(e) => updateSlot(day, 'startTime', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>End</label>
                      <input className="input" type="time" value={slot.endTime} onChange={(e) => updateSlot(day, 'endTime', e.target.value)} />
                    </div>
                  </>
                ) : (
                  <span style={{ color: 'var(--muted)', fontSize: 13, gridColumn: '2 / -1' }}>Not working</span>
                )}
              </div>
            )
          })}
        </div>
      </Modal>

      {/* Deactivate Confirm */}
      <Modal open={modal === 'deactivate'} onClose={closeModal} title="Deactivate Staff"
        footer={<><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-warning" onClick={handleDeactivate} disabled={saving}>{saving ? '...' : 'Yes, Deactivate'}</button></>}>
        <p style={{ fontSize: 14 }}>Deactivate <strong>{selected?.fullName}</strong>? They will lose system access.</p>
      </Modal>
    </div>
  )
}
