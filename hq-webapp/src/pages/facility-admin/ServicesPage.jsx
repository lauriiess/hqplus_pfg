import { useState, useEffect } from 'react'
import { clinicsApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './facility-admin.module.css'

// UPDATED: Mapping to match the new Backend Schema (name, duration, enabled)
const EMPTY_SVC = { name:'', description:'', duration: 30, enabled: true }

export default function ServicesPage() {
  const { user } = useAuth()
  const [clinic, setClinic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY_SVC)
  const [saving, setSaving] = useState(false)
  const [editingInfo, setEditingInfo] = useState(false)
  const [infoForm, setInfoForm] = useState({})

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }
  const clinicId = user?.clinicId

  const load = () => {
    if (!clinicId) { setLoading(false); return }
    setLoading(true)
    clinicsApi.get(clinicId)
      .then(r => { setClinic(r.data); setInfoForm(r.data) })
      .catch(() => showToast('Failed to load clinic data'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [clinicId])

  const saveInfo = async () => {
    try {
      const r = await clinicsApi.update(clinic._id, infoForm)
      setClinic(r.data); setEditingInfo(false)
      showToast('Clinic info updated')
    } catch { showToast('Failed to update clinic info') }
  }

  const openAdd = () => { setSelected(null); setForm(EMPTY_SVC); setModal('add') }
  const openEdit = (svc, idx) => { setSelected({ svc, idx }); setForm({ ...EMPTY_SVC, ...svc }); setModal('edit') }
  const openView = (svc, idx) => { setSelected({ svc, idx }); setModal('view') }
  const close = () => { setModal(null); setSelected(null) }

  const saveService = async () => {
    if (!form.name.trim()) { showToast('Service name is required'); return }
    setSaving(true)
    try {
      const services = [...(clinic.services || [])]
      if (modal === 'edit' && selected !== null) {
        services[selected.idx] = { ...services[selected.idx], ...form }
      } else {
        services.push(form)
      }
      const r = await clinicsApi.update(clinic._id, { services })
      setClinic(r.data)
      showToast(modal === 'edit' ? 'Service updated' : 'Service added')
      close(); load()
    } catch { showToast('Failed to save service') }
    finally { setSaving(false) }
  }

  const deleteService = async (idx) => {
    if (!confirm('Remove this service?')) return
    const services = [...(clinic.services || [])]
    services.splice(idx, 1)
    try {
      const r = await clinicsApi.update(clinic._id, { services })
      setClinic(r.data)
      showToast('Service removed')
    } catch { showToast('Failed to remove service') }
  }

  const toggleAvailable = async (idx) => {
    const services = [...(clinic.services || [])]
    services[idx] = { ...services[idx], enabled: !services[idx].enabled }
    try {
      const r = await clinicsApi.update(clinic._id, { services })
      setClinic(r.data)
    } catch { showToast('Failed to update service') }
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>Loading clinic info…</div>
  if (!clinic) return <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>No clinic assigned.</div>

  const services = clinic.services || []

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.header}>
        <div className={styles.title}>{clinic.name}</div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Service</button>
      </div>

      <div className={styles.servicesGrid}>
        {services.map((svc, idx) => (
          <div key={idx} className={`card ${styles.serviceCard}`} style={{ opacity: svc.enabled ? 1 : 0.6 }}>
            <div className={styles.serviceName}>{svc.serviceName}</div>
            <span className={`badge ${svc.enabled ? 'badge-green' : 'badge-gray'}`}>
              {svc.enabled ? 'Available' : 'Unavailable'}
            </span>
            <div className={styles.serviceMeta}>⏱ {svc.duration || 30} min</div>
            <div className={styles.serviceActions}>
              <button className="btn btn-outline" onClick={() => openView(svc, idx)}>View</button>
              <button className="btn btn-outline" onClick={() => openEdit(svc, idx)}>Edit</button>
              <button className="btn btn-outline" onClick={() => toggleAvailable(idx)}>
                {svc.enabled ? 'Disable' : 'Enable'}
              </button>
              <button className="btn" style={{color:'var(--error)'}} onClick={() => deleteService(idx)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && modal !== 'view' && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth:440 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal === 'edit' ? 'Edit Service' : 'Add New Service'}</span>
              <button className="modal-close" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Service Name <span style={{color:'var(--error)'}}>*</span></label>
                <input className="form-input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. General Consultation" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (minutes)</label>
                <input className="form-input" type="number" min={5} value={form.durationMinutes}
                  onChange={e=>setForm(p=>({...p,durationMinutes:Number(e.target.value)}))} />
              </div>
              <div className="form-group" style={{ display:'flex', alignItems:'center', gap:10 }}>
                <input type="checkbox" checked={!!form.isAvailable}
                  onChange={e=>setForm(p=>({...p,isAvailable:e.target.checked}))} id="avail" />
                <label htmlFor="avail" style={{ cursor:'pointer', color:'var(--text-2)' }}>Currently available</label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={saveService} disabled={saving}>
                {saving ? 'Saving…' : modal === 'edit' ? 'Save Changes' : 'Add Service'}
              </button>
            </div>
          </div>
        </div>
      )}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth:380 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{selected.svc.serviceName}</span>
              <button className="modal-close" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              <p><strong>Description:</strong> {selected.svc.description || '—'}</p>
              <p><strong>Duration:</strong> {selected.svc.durationMinutes || 30} minutes</p>
              <p><strong>Status:</strong> {selected.svc.isAvailable ? 'Available' : 'Unavailable'}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Close</button>
              <button className="btn btn-primary" onClick={() => { close(); openEdit(selected.svc, selected.idx) }}>Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
