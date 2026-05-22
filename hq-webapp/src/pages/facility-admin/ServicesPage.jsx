import { useEffect, useState, useCallback } from 'react'
import { servicesApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'

const EMPTY_FORM = { name: '', description: '', durationMinutes: 30, isAvailable: true }

export default function ServicesPage() {
  const { user } = useAuth()
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    servicesApi.list(user?.clinicId)
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load services'))
      .finally(() => setLoading(false))
  }, [user?.clinicId])

  useEffect(() => { load() }, [load])

  const openAdd    = () => { setForm(EMPTY_FORM); setModal('add') }
  const openEdit   = (s) => { setSelected(s); setForm({ name: s.name, description: s.description, durationMinutes: s.durationMinutes, isAvailable: s.isAvailable }); setModal('edit') }
  const openDelete = (s) => { setSelected(s); setModal('delete') }
  const closeModal = () => { setModal(null); setSelected(null) }

  const handleAdd = async () => {
    if (!form.name) { toast.error('Service name is required.'); return }
    setSaving(true)
    try {
      await servicesApi.add({ ...form, clinicId: user?.clinicId })
      toast.success('Service added.')
      closeModal(); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleEdit = async () => {
    if (!form.name) { toast.error('Service name is required.'); return }
    setSaving(true)
    try {
      await servicesApi.update(user?.clinicId, selected._id, form)
      toast.success('Service updated.')
      closeModal(); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await servicesApi.delete(user?.clinicId, selected._id)
      toast.success('Service removed.')
      closeModal(); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const FormFields = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="form-group">
        <label className="form-label">Service Name *</label>
        <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. General Consultation" />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
      </div>
      <div className="form-group">
        <label className="form-label">Duration (minutes)</label>
        <input className="input" type="number" min={5} value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: +e.target.value }))} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
        <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))} />
        Service is currently available
      </label>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Services</div>
          <div className="page-subtitle">
            {data?.clinicName ? `Managing services for ${data.clinicName}` : 'Manage clinic services and durations'}
          </div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Service</button>
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="table-wrap card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr><th>Service Name</th><th>Description</th><th>Duration</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {!data?.services?.length
                ? <tr><td colSpan={5}><div className="empty-state">No services yet. Add your first service.</div></td></tr>
                : data.services.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{s.description || '—'}</td>
                    <td style={{ fontSize: 13 }}>{s.durationMinutes} min</td>
                    <td><span className={`badge ${s.isAvailable ? 'badge-success' : 'badge-muted'}`}>{s.isAvailable ? 'Available' : 'Unavailable'}</span></td>
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
      )}

      <Modal open={modal === 'add'} onClose={closeModal} title="Add Service"
        footer={<><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Adding...' : 'Add Service'}</button></>}>
        <FormFields />
      </Modal>

      <Modal open={modal === 'edit'} onClose={closeModal} title={`Edit — ${selected?.name}`}
        footer={<><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></>}>
        <FormFields />
      </Modal>

      <Modal open={modal === 'delete'} onClose={closeModal} title="Remove Service"
        footer={<><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-error" onClick={handleDelete} disabled={saving}>{saving ? '...' : 'Yes, Remove'}</button></>}>
        <p style={{ fontSize: 14 }}>Remove <strong>{selected?.name}</strong>? This cannot be undone.</p>
      </Modal>
    </div>
  )
}
