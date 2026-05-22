import { useState, useEffect } from 'react'
import api from '../../services/api'
import styles from './UsersPage.module.css'

const PERMISSIONS = {
  'Patient Management':  ['Patient Check-in', 'View Patient Records', 'Edit Patient Records'],
  'Queue Management':    ['View Queue', 'Manage Queue'],
  'Staff Management':    ['View Staff', 'Manage Staff'],
  'Analytics':           ['View Reports', 'Export Reports'],
  'System Settings':     ['View Settings', 'Manage Settings'],
}

const ROLES   = ['Select role', 'super_admin', 'facility_admin', 'doctor', 'nurse', 'receptionist', 'data_analyst']
const DEPTS   = ['Select department', 'General Consultation', 'Pre-natal Care', 'Child Immunization', 'Dental Services', 'TB-DOTS', 'Administration']

export default function UsersPage() {
  const [clinics, setClinics] = useState([])
  const [form, setForm]       = useState({
    firstName: '', lastName: '', email: '', phone: '',
    username: '', role: '', clinicId: '', department: '',
    permissions: [],
  })
  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    api.get('/api/clinics').then(r => setClinics(r.data || [])).catch(() => {})
  }, [])

  const togglePerm = (perm) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }))
  }

  const handleSubmit = async () => {
    if (!form.firstName || !form.email || !form.role || form.role === 'Select role') {
      setError('Please fill in all required fields.')
      return
    }
    setSaving(true); setError(''); setSuccess(false)
    try {
      await api.post('/api/users/create', {
        fullName: `${form.firstName} ${form.lastName}`,
        email:    form.email,
        phone:    form.phone,
        username: form.username,
        role:     form.role,
        clinicId: form.clinicId,
        department: form.department,
        permissions: form.permissions,
        password: 'HealthQueue@2025',
      })
      setSuccess(true)
      setForm({ firstName: '', lastName: '', email: '', phone: '', username: '', role: '', clinicId: '', department: '', permissions: [] })
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create user.')
    } finally { setSaving(false) }
  }

  return (
    <div className={styles.page}>
      {/* Header banner */}
      <div className={`card ${styles.banner}`}>
        <div className={styles.bannerIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
        </div>
        <div>
          <div className={styles.bannerTitle}>Create New User</div>
          <div className={styles.bannerSub}>Add a new user to the HealthQueue+ system</div>
        </div>
      </div>

      {success && <div className="alert alert-success">User created successfully! Default password is <strong>HealthQueue@2025</strong> — ask them to change it on first login.</div>}
      {error   && <div className="alert alert-error">{error}</div>}

      {/* Personal Information */}
      <div className={`card ${styles.section}`}>
        <div className={styles.sectionTitle}>Personal Information</div>
        <div className={styles.formGrid2}>
          <div className="form-group">
            <label className="form-label">First Name <span className={styles.req}>*</span></label>
            <input className="form-input" placeholder="Enter first name" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name <span className={styles.req}>*</span></label>
            <input className="form-input" placeholder="Enter last name" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address <span className={styles.req}>*</span></label>
            <input className="form-input" type="email" placeholder="user@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" placeholder="+1 234 567 8900" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className={`card ${styles.section}`}>
        <div className={styles.sectionTitle}>Account Information</div>
        <div className={styles.formGrid2}>
          <div className="form-group">
            <label className="form-label">Username <span className={styles.req}>*</span></label>
            <input className="form-input" placeholder="username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Role <span className={styles.req}>*</span></label>
            <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Facility <span className={styles.req}>*</span></label>
            <select className="form-select" value={form.clinicId} onChange={e => setForm(f => ({ ...f, clinicId: e.target.value }))}>
              <option value="">Select facility</option>
              {clinics.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-select" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
              {DEPTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className={`card ${styles.section}`}>
        <div className={styles.sectionTitle}>Permissions</div>
        {Object.entries(PERMISSIONS).map(([group, perms]) => (
          <div key={group} className={styles.permGroup}>
            <div className={styles.permGroupTitle}>{group}</div>
            <div className={styles.permGrid}>
              {perms.map(p => (
                <label key={p} className={styles.permItem}>
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(p)}
                    onChange={() => togglePerm(p)}
                    className={styles.permCheck}
                  />
                  <span className={styles.permLabel}>{p}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className={styles.actions}>
        <button className="btn btn-outline" onClick={() => setForm({ firstName: '', lastName: '', email: '', phone: '', username: '', role: '', clinicId: '', department: '', permissions: [] })}>
          Clear Form
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Creating…' : 'Create User'}
        </button>
      </div>
    </div>
  )
}
