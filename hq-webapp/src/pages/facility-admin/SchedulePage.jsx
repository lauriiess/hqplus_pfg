import { useEffect, useState, useCallback } from 'react'
import { timeSlotsApi, servicesApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const EMPTY_SLOT = { dayOfWeek: 1, startTime: '09:00', endTime: '09:30', maxPatients: 2, serviceId: '', serviceName: '' }

export default function SchedulePage() {
  const { user } = useAuth()
  const [slots,    setSlots]    = useState([])
  const [services, setServices] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [dayFilter, setDayFilter] = useState(0) // 0 = All
  const [modal,    setModal]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [form,     setForm]     = useState(EMPTY_SLOT)
  const [saving,   setSaving]   = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      timeSlotsApi.list({ clinicId: user?.clinicId }),
      servicesApi.list(user?.clinicId),
    ])
      .then(([sr, svr]) => { setSlots(Array.isArray(sr.data) ? sr.data : []); setServices(svr.data?.services || []) })
      .catch(() => toast.error('Failed to load schedule'))
      .finally(() => setLoading(false))
  }, [user?.clinicId])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm({ ...EMPTY_SLOT, serviceId: services[0]?._id || '', serviceName: services[0]?.name || '' }); setModal('create') }
  const openEdit   = (s) => { setSelected(s); setForm({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, maxPatients: s.maxPatients, serviceId: s.serviceId, serviceName: s.serviceName }); setModal('edit') }
  const openDelete = (s) => { setSelected(s); setModal('delete') }
  const closeModal = () => { setModal(null); setSelected(null) }

  const handleSave = async () => {
    if (!form.startTime || !form.endTime) { toast.error('Start and end time are required.'); return }
    setSaving(true)
    try {
      const payload = { ...form, clinicId: user?.clinicId }
      if (modal === 'create') { await timeSlotsApi.create(payload); toast.success('Time slot added.') }
      else { await timeSlotsApi.update(selected._id, payload); toast.success('Time slot updated.') }
      closeModal(); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await timeSlotsApi.delete(selected._id)
      toast.success('Time slot removed.')
      closeModal(); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const onServiceChange = (serviceId) => {
    const svc = services.find((s) => s._id === serviceId)
    setForm((f) => ({ ...f, serviceId, serviceName: svc?.name || '' }))
  }

  const filtered = dayFilter === 0 ? slots : slots.filter((s) => s.dayOfWeek === dayFilter)
  const byDay = DAYS.reduce((acc, day, i) => { acc[i + 1] = filtered.filter((s) => s.dayOfWeek === i + 1); return acc }, {})

  const FormFields = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div className="form-group">
        <label className="form-label">Day of Week</label>
        <select className="input" value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: +e.target.value }))}>
          {DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Service</label>
        <select className="input" value={form.serviceId} onChange={(e) => onServiceChange(e.target.value)}>
          <option value="">— Select service —</option>
          {services.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Start Time</label>
        <input className="input" type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
      </div>
      <div className="form-group">
        <label className="form-label">End Time</label>
        <input className="input" type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Max Patients per Slot</label>
        <input className="input" type="number" min={1} value={form.maxPatients} onChange={(e) => setForm((f) => ({ ...f, maxPatients: +e.target.value }))} />
      </div>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Appointment Schedule</div>
          <div className="page-subtitle">Manage time slots, booking rules, and availability</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Time Slot</button>
      </div>

      {/* Day filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
        {[['All', 0], ...DAYS.map((d, i) => [d.slice(0, 3), i + 1])].map(([label, val]) => (
          <button key={val} className={`btn btn-sm ${dayFilter === val ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDayFilter(val)}>
            {label}
            {val !== 0 && <span style={{ marginLeft: 4, opacity: .7 }}>({slots.filter((s) => s.dayOfWeek === val).length})</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="spinner" /> : (
        dayFilter === 0
          ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {DAYS.map((day, i) => {
                const daySlots = byDay[i + 1] || []
                return (
                  <div key={day} className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14, background: 'var(--primary-lt)', color: 'var(--primary)', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{day}</span>
                      <span style={{ fontWeight: 400, fontSize: 12 }}>{daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      {daySlots.length === 0
                        ? <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>No slots</div>
                        : daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((s) => (
                          <div key={s._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label || `${s.startTime} – ${s.endTime}`}</div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.serviceName} · max {s.maxPatients}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={() => openEdit(s)}>Edit</button>
                              <button className="btn btn-sm" style={{ background: 'var(--error-lt)', color: 'var(--error)', padding: '4px 8px' }} onClick={() => openDelete(s)}>Remove</button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="table-wrap card" style={{ padding: 0 }}>
              <table>
                <thead><tr><th>Day</th><th>Time</th><th>Service</th><th>Max Patients</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan={5}><div className="empty-state">No slots for this day.</div></td></tr>
                    : filtered.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((s) => (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 600 }}>{DAYS[s.dayOfWeek - 1]}</td>
                        <td style={{ fontSize: 13 }}>{s.startTime} – {s.endTime}</td>
                        <td style={{ fontSize: 13 }}>{s.serviceName}</td>
                        <td style={{ fontSize: 13 }}>{s.maxPatients}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Edit</button>
                            <button className="btn btn-sm" style={{ background: 'var(--error-lt)', color: 'var(--error)' }} onClick={() => openDelete(s)}>Remove</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )
      )}

      <Modal open={modal === 'create'} onClose={closeModal} title="Add Time Slot"
        footer={<><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Adding...' : 'Add Slot'}</button></>}>
        <FormFields />
      </Modal>

      <Modal open={modal === 'edit'} onClose={closeModal} title="Edit Time Slot"
        footer={<><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></>}>
        <FormFields />
      </Modal>

      <Modal open={modal === 'delete'} onClose={closeModal} title="Remove Time Slot"
        footer={<><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-error" onClick={handleDelete} disabled={saving}>{saving ? '...' : 'Yes, Remove'}</button></>}>
        <p style={{ fontSize: 14 }}>Remove the <strong>{selected?.startTime} – {selected?.endTime}</strong> slot on <strong>{DAYS[(selected?.dayOfWeek || 1) - 1]}</strong>?</p>
      </Modal>
    </div>
  )
}
