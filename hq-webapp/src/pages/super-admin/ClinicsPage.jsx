import { useEffect, useState } from 'react'
import { clinicsApi } from '../../services/api'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'

const EMPTY_CLINIC = {
  name: '', address: '', city: '', province: '', contactNumber: '', email: '',
  operatingHours: '8:00 AM - 5:00 PM', acceptsWalkIn: true, acceptsAppointment: true,
  maxQueueCapacity: 50, status: 'active',
  services: [{ name: 'General Consultation', description: '', durationMinutes: 30, isAvailable: true }],
}

export default function ClinicsPage() {
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'create' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY_CLINIC)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    clinicsApi.list().then((res) => setClinics(res.data)).catch(() => toast.error('Failed to load clinics')).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = clinics.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => { setForm(EMPTY_CLINIC); setModal('create') }
  const openEdit   = (c) => { setSelected(c); setForm({ ...c, services: c.services || [] }); setModal('edit') }
  const openDelete = (c) => { setSelected(c); setModal('delete') }
  const closeModal = () => { setModal(null); setSelected(null) }

  const handleSave = async () => {
    if (!form.name || !form.address || !form.city) { toast.error('Name, address, and city are required.'); return }
    setSaving(true)
    try {
      if (modal === 'create') {
        await clinicsApi.create(form)
        toast.success('Clinic created!')
      } else {
        await clinicsApi.update(selected._id, form)
        toast.success('Clinic updated!')
      }
      closeModal(); load()
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Save failed.')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await clinicsApi.delete(selected._id)
      toast.success('Clinic deleted.')
      closeModal(); load()
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Delete failed.')
    } finally { setSaving(false) }
  }

  const addService = () => setForm((f) => ({ ...f, services: [...f.services, { name: '', description: '', durationMinutes: 30, isAvailable: true }] }))
  const removeService = (i) => setForm((f) => ({ ...f, services: f.services.filter((_, idx) => idx !== i) }))
  const updateService = (i, field, val) => setForm((f) => ({ ...f, services: f.services.map((s, idx) => idx === i ? { ...s, [field]: val } : s) }))

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Clinics</div>
          <div className="page-subtitle">Manage all registered private clinics</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Clinic</button>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: '12px 16px' }}>
        <input className="input" placeholder="🔍  Search clinics by name or city…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="table-wrap card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Clinic Name</th>
                <th>Location</th>
                <th>Contact</th>
                <th>Hours</th>
                <th>Services</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="empty-state">No clinics found.</td></tr>
              ) : filtered.map((c) => (
                <tr key={c._id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.acceptsWalkIn ? '🚶 Walk-in' : ''} {c.acceptsAppointment ? '📅 Appointment' : ''}</div>
                  </td>
                  <td>{c.city}{c.province ? `, ${c.province}` : ''}</td>
                  <td style={{ fontSize: 13 }}>{c.contactNumber || '—'}<br/><span style={{ color: 'var(--muted)', fontSize: 12 }}>{c.email}</span></td>
                  <td style={{ fontSize: 13 }}>{c.operatingHours}</td>
                  <td style={{ fontSize: 13 }}>{c.services?.length ?? 0} service{c.services?.length !== 1 ? 's' : ''}</td>
                  <td>
                    <span className={`badge ${c.status === 'active' ? 'badge-success' : c.status === 'maintenance' ? 'badge-warning' : 'badge-muted'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>
                      <button className="btn btn-sm" style={{ background: 'var(--error-lt)', color: 'var(--error)' }} onClick={() => openDelete(c)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'create' ? 'Add New Clinic' : `Edit — ${selected?.name}`}
        width={620}
        footer={<>
          <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Clinic'}</button>
        </>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[['name','Clinic Name *','text'],['address','Address *','text'],['city','City *','text'],['province','Province','text'],['contactNumber','Contact Number','tel'],['email','Email','email'],['operatingHours','Operating Hours','text'],['maxQueueCapacity','Max Queue Capacity','number']].map(([field, label, type]) => (
            <div className="form-group" key={field} style={field === 'address' ? { gridColumn: '1 / -1' } : {}}>
              <label className="form-label">{label}</label>
              <input className="input" type={type} value={form[field] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [field]: type === 'number' ? +e.target.value : e.target.value }))} />
            </div>
          ))}
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.acceptsWalkIn} onChange={(e) => setForm((f) => ({ ...f, acceptsWalkIn: e.target.checked }))} /> Walk-in
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.acceptsAppointment} onChange={(e) => setForm((f) => ({ ...f, acceptsAppointment: e.target.checked }))} /> Appointments
            </label>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Services</div>
            <button className="btn btn-outline btn-sm" onClick={addService}>+ Add Service</button>
          </div>
          {form.services.map((s, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input className="input" placeholder="Service name" value={s.name} onChange={(e) => updateService(i, 'name', e.target.value)} />
              <input className="input" type="number" placeholder="min" value={s.durationMinutes} onChange={(e) => updateService(i, 'durationMinutes', +e.target.value)} />
              <input className="input" placeholder="Description" value={s.description} onChange={(e) => updateService(i, 'description', e.target.value)} />
              <button className="btn btn-sm" style={{ background: 'var(--error-lt)', color: 'var(--error)' }} onClick={() => removeService(i)}>✕</button>
            </div>
          ))}
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={modal === 'delete'} onClose={closeModal} title="Delete Clinic"
        footer={<>
          <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
          <button className="btn btn-error" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting…' : 'Yes, Delete'}</button>
        </>}
      >
        <p style={{ fontSize: 14 }}>Are you sure you want to delete <strong>{selected?.name}</strong>? This cannot be undone.</p>
      </Modal>
    </div>
  )
}
