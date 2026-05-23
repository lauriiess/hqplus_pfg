import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './StaffPage.module.css'

const ROLES       = ['doctor','nurse','midwife','med_tech','pharmacist','admin']
const ROLE_LABELS = { doctor:'Doctor', nurse:'Nurse', midwife:'Midwife', med_tech:'Med Tech', pharmacist:'Pharmacist', admin:'Admin Staff' }
const ROLE_BADGE  = { doctor:'badge-blue', nurse:'badge-green', midwife:'badge-teal', med_tech:'badge-purple', pharmacist:'badge-orange', admin:'badge-gray' }
const GENDERS     = ['Male','Female','Other','Prefer not to say']

const EMPTY_FORM = {
  fullName: '', email: '', phone: '', gender: 'Male',
  role: 'doctor', specialization: '', licenseNumber: '', status: 'active',
}

export default function StaffPage() {
  const { user }  = useAuth()
  const [staff,      setStaff]    = useState([])
  const [loading,    setLoading]  = useState(true)
  const [search,     setSearch]   = useState('')
  const [roleFilter, setRole]     = useState('All')
  const [modal,      setModal]    = useState(null)  // null | 'add' | 'edit' | 'view'
  const [selected,   setSelected] = useState(null)
  const [form,       setForm]     = useState(EMPTY_FORM)
  const [saving,     setSaving]   = useState(false)
  const [toast,      setToast]    = useState('')

  const clinicId  = user?.clinicId
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const load = () => {
    if (!clinicId) {
      setLoading(false)
      return
    }
    setLoading(true)
    api.get('/api/staff', { params: { clinicId } })
      .then(r => setStaff(r.data || []))
      .catch(() => setStaff([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [clinicId])

  const openAdd  = () => { setSelected(null); setForm(EMPTY_FORM); setModal('add') }
  const openEdit = (s) => {
    setSelected(s)
    setForm({
      fullName:      s.fullName || '',
      email:         s.email || '',
      phone:         s.phone || '',
      gender:        s.gender || 'Male',
      role:          s.role || 'doctor',
      specialization: s.specialization || '',
      licenseNumber: s.licenseNumber || '',
      status:        s.isActive ? 'active' : 'inactive',
    })
    setModal('edit')
  }
  const openView = (s) => { setSelected(s); setModal('view') }
  const close    = () => { setModal(null); setSelected(null) }

  const save = async () => {
    if (!clinicId) {
      showToast('Your account is not linked to a clinic. Please contact System Administrator.')
      return
    }
    if (!form.fullName.trim() || !form.email.trim()) {
      showToast('Name and email are required'); return
    }
    setSaving(true)
    try {
      const payload = {
        fullName:      form.fullName.trim(),
        email:         form.email.trim(),
        phone:         form.phone.trim(),
        gender:        form.gender,
        role:          form.role,
        specialization: form.specialization.trim(),
        licenseNumber: form.licenseNumber.trim(),
        isActive:      form.status === 'active',
        clinicId,
      }
      if (modal === 'edit') {
        await api.put(`/api/staff/${selected._id}`, payload)
        showToast('Staff member updated')
      } else {
        await api.post('/api/staff', payload)
        showToast('Staff member added — default password: Staff@123')
      }
      close(); load()
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Deactivate this staff member?')) return
    await api.delete(`/api/staff/${id}`).catch(() => {})
    showToast('Staff member deactivated'); load()
  }

  const exportCSV = () => {
    const rows = [['Name','Gender','Role','Specialization','Phone','Email','License #','Status']]
    filtered.forEach(s => rows.push([
      s.fullName, s.gender || '—', ROLE_LABELS[s.role] || s.role,
      s.specialization || '', s.phone || '', s.email || '',
      s.licenseNumber || '', s.isActive ? 'Active' : 'Inactive',
    ]))
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a    = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `staff_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    showToast('Exported to CSV')
  }

  const filtered = staff.filter(s => {
    const matchRole   = roleFilter === 'All' || s.role === roleFilter
    const q           = search.toLowerCase()
    const matchSearch = !q || s.fullName?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    return matchRole && matchSearch
  })

  const F = (field, label, type = 'text', opts = null) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {opts
        ? <select className="form-select" value={form[field] ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}>
            {opts.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
          </select>
        : <input className="form-input" type={type} value={form[field] ?? ''}
            onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
      }
    </div>
  )

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}
      {!clinicId && (
        <div style={{padding:'12px 16px',background:'#FEF3C7',border:'1px solid #F59E0B',borderRadius:8,marginBottom:12,fontSize:13,color:'#92400E'}}>
          <strong>No clinic assigned.</strong> Your facility admin account is not linked to a clinic. Run the seed script or ask a System Administrator to assign your account to a clinic.
        </div>
      )}

      <div className="card">
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Staff Management</div>
            <div className={styles.sub}>{staff.length} staff members in this facility</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-outline btn-sm" onClick={exportCSV}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Staff
            </button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className="search-bar" style={{ flex:1, maxWidth:300 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="dropdown-select" value={roleFilter} onChange={e => setRole(e.target.value)}>
            <option value="All">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <button className="btn btn-outline btn-sm" onClick={load}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>

        <div className="table-wrap" style={{ borderRadius:0, border:'none', borderTop:'1px solid var(--border)' }}>
          <table>
            <thead>
              <tr><th>Name</th><th>Gender</th><th>Role</th><th>Specialization</th><th>Contact</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={7} style={{ textAlign:'center', padding:32, color:'var(--muted)' }}>Loading staff…</td></tr>
                : filtered.length === 0
                ? <tr><td colSpan={7} style={{ textAlign:'center', padding:32, color:'var(--muted)' }}>No staff found</td></tr>
                : filtered.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ fontWeight:600, fontSize:13 }}>{s.fullName}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{s.email}</div>
                    </td>
                    <td style={{ fontSize:13 }}>{s.gender || '—'}</td>
                    <td><span className={`badge ${ROLE_BADGE[s.role] || 'badge-gray'}`}>{ROLE_LABELS[s.role] || s.role}</span></td>
                    <td style={{ fontSize:13 }}>{s.specialization || '—'}</td>
                    <td style={{ fontSize:13 }}>{s.phone || '—'}</td>
                    <td><span className={`badge ${s.isActive ? 'badge-green' : 'badge-gray'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn btn-icon btn-outline" title="View" onClick={() => openView(s)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button className="btn btn-icon btn-outline" title="Edit" onClick={() => openEdit(s)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn btn-icon" style={{ background:'var(--error-lt)', color:'var(--error)' }} title="Deactivate" onClick={() => remove(s._id)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW MODAL */}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth:440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Staff Profile</div>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              {[
                ['Full Name',      selected.fullName],
                ['Gender',         selected.gender || '—'],
                ['Role',           ROLE_LABELS[selected.role] || selected.role],
                ['Specialization', selected.specialization || '—'],
                ['Phone',          selected.phone || '—'],
                ['Email',          selected.email || '—'],
                ['License #',      selected.licenseNumber || '—'],
                ['Status',         selected.isActive ? 'Active' : 'Inactive'],
              ].map(([l, v]) => (
                <div key={l} style={{ display:'flex', padding:'8px 0', borderBottom:'1px solid var(--border-lt)', gap:12 }}>
                  <span style={{ minWidth:130, fontSize:12, color:'var(--muted)', fontWeight:500 }}>{l}</span>
                  <span style={{ fontSize:13 }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Close</button>
              <button className="btn btn-primary" onClick={() => openEdit(selected)}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'edit' ? 'Edit Staff Member' : 'Add New Staff'}</div>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                {F('fullName',       'Full Name *')}
                {F('email',         'Email Address *', 'email')}
                {F('phone',         'Phone Number', 'tel')}
                {F('gender',        'Gender', 'text', GENDERS.map(g => ({ value:g, label:g })))}
                {F('role',          'Role', 'text', ROLES.map(r => ({ value:r, label:ROLE_LABELS[r] })))}
                {F('specialization','Specialization')}
                {F('licenseNumber', 'License Number')}
                {F('status',        'Status', 'text', [
                  { value:'active',   label:'Active' },
                  { value:'inactive', label:'Inactive' },
                ])}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : modal === 'edit' ? 'Save Changes' : 'Add Staff'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
