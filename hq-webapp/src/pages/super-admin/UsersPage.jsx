import { useState, useEffect } from 'react'
import api from '../../services/api'
import styles from './super-admin.module.css'

const ROLE_LABELS = {
  super_admin:    'System Administrator',
  facility_admin: 'Facility Admin',
  staff:          'Staff',
  patient:        'Patient',
}
const ROLE_BADGE = {
  super_admin:    'badge-purple',
  facility_admin: 'badge-blue',
  staff:          'badge-teal',
  patient:        'badge-green',
}
const CREATE_ROLES = ['facility_admin', 'staff', 'super_admin']
const PERMISSIONS = {
  'Patient Management':  ['Patient Check-in', 'View Patient Records', 'Edit Patient Records'],
  'Queue Management':    ['View Queue', 'Manage Queue'],
  'Staff Management':    ['View Staff', 'Manage Staff'],
  'Analytics':           ['View Reports', 'Export Reports'],
  'System Settings':     ['View Settings', 'Manage Settings'],
}
const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', phone: '',
  role: 'facility_admin', clinicId: '', permissions: [],
}

export default function UsersPage() {
  const [tab,      setTab]     = useState('list')   // 'list' | 'create'
  const [users,    setUsers]   = useState([])
  const [clinics,  setClinics] = useState([])
  const [loading,  setLoading] = useState(true)
  const [search,   setSearch]  = useState('')
  const [roleFilter, setRoleF] = useState('all')

  // create form
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState('')
  const [error,   setError]   = useState('')

  // assign clinic modal
  const [assignModal, setAssignModal] = useState(null)   // user object | null
  const [assignClinic, setAssignClinic] = useState('')
  const [assigning,    setAssigning]   = useState(false)

  // deactivate confirm
  const [deactivateTarget, setDeactivateTarget] = useState(null)

  const loadUsers = () => {
    setLoading(true)
    api.get('/api/users').then(r => setUsers(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }
  const loadClinics = () => {
    api.get('/api/clinics').then(r => setClinics(r.data || [])).catch(() => {})
  }

  useEffect(() => { loadUsers(); loadClinics() }, [])

  // ── Create user ──────────────────────────────────────────────────────────────
  const togglePerm = (perm) => setForm(f => ({
    ...f, permissions: f.permissions.includes(perm)
      ? f.permissions.filter(p => p !== perm)
      : [...f.permissions, perm],
  }))

  const handleCreate = async () => {
    if (!form.firstName || !form.email || !form.role) {
      setError('First name, email, and role are required.'); return
    }
    if (form.role === 'facility_admin' && !form.clinicId) {
      setError('Facility Admin must be assigned to a clinic.'); return
    }
    setSaving(true); setError(''); setSuccess('')
    try {
      await api.post('/api/users/create', {
        fullName:    `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
        email:       form.email.trim(),
        phone:       form.phone.trim(),
        role:        form.role,
        clinicId:    form.clinicId || null,
        permissions: form.permissions,
        password:    'HealthQueue@2025',
      })
      setSuccess(`User created! Default password: HealthQueue@2025`)
      setForm(EMPTY_FORM)
      loadUsers()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create user.')
    } finally { setSaving(false) }
  }

  // ── Assign clinic ────────────────────────────────────────────────────────────
  const openAssign = (u) => { setAssignModal(u); setAssignClinic(u.clinicId?._id || u.clinicId || '') }

  const handleAssign = async () => {
    if (!assignModal) return
    setAssigning(true)
    try {
      await api.put(`/api/users/${assignModal._id}`, { clinicId: assignClinic || null })
      setAssignModal(null)
      loadUsers()
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to assign clinic.')
    } finally { setAssigning(false) }
  }

  // ── Deactivate ───────────────────────────────────────────────────────────────
  const handleDeactivate = async (u) => {
    try {
      await api.delete(`/api/users/${u._id}`)
      setDeactivateTarget(null)
      loadUsers()
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to deactivate user.')
    }
  }

  // ── Reactivate ───────────────────────────────────────────────────────────────
  const handleReactivate = async (u) => {
    try {
      await api.put(`/api/users/${u._id}`, { isActive: true })
      loadUsers()
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to reactivate user.')
    }
  }

  const clinicName = (u) => {
    if (!u.clinicId) return '—'
    const c = clinics.find(cl => cl._id === (u.clinicId?._id || u.clinicId))
    return c ? c.name.replace('Hi-Precision Diagnostics - ', '') : '—'
  }

  const filtered = users.filter(u => {
    const matchRole   = roleFilter === 'all' || u.role === roleFilter
    const q           = search.toLowerCase()
    const matchSearch = !q || u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    return matchRole && matchSearch
  })

  const facilityAdmins = users.filter(u => u.role === 'facility_admin')
  const unassigned     = facilityAdmins.filter(u => !u.clinicId)

  return (
    <div className={styles.page}>

      {/* Tabs */}
      <div className={styles.pageTabs}>
        <button className={`${styles.pageTab} ${tab==='list'?styles.pageTabActive:''}`} onClick={() => setTab('list')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          User Management
        </button>
        <button className={`${styles.pageTab} ${tab==='create'?styles.pageTabActive:''}`} onClick={() => setTab('create')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          Create New User
        </button>
      </div>

      {/* ── LIST TAB ── */}
      {tab === 'list' && (
        <>
          {/* Unassigned warning */}
          {unassigned.length > 0 && (
            <div style={{padding:'10px 14px',background:'#FEF3C7',border:'1px solid #F59E0B',borderRadius:8,marginBottom:12,fontSize:13,color:'#92400E',display:'flex',alignItems:'center',gap:8}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span><strong>{unassigned.length} Facility Admin{unassigned.length>1?'s':''}</strong> without a clinic assignment. Use the <strong>Assign Clinic</strong> button below.</span>
            </div>
          )}

          <div className="card">
            {/* Toolbar */}
            <div className={styles.toolbar}>
              <div className="search-bar" style={{flex:1,maxWidth:300}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="dropdown-select" value={roleFilter} onChange={e => setRoleF(e.target.value)}>
                <option value="all">All Roles</option>
                <option value="super_admin">System Administrator</option>
                <option value="facility_admin">Facility Admin</option>
                <option value="staff">Staff</option>
                <option value="patient">Patient</option>
              </select>
              <button className="btn btn-outline btn-sm" onClick={loadUsers}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                Refresh
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setTab('create')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add User
              </button>
            </div>

            {/* Stats row */}
            <div style={{display:'flex',gap:12,padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
              {[
                ['Total Users',    users.length,                                        'var(--text)'],
                ['Sys Admin',      users.filter(u=>u.role==='super_admin').length,      '#7C3AED'],
                ['Facility Admin', users.filter(u=>u.role==='facility_admin').length,   '#2563EB'],
                ['Staff',          users.filter(u=>u.role==='staff').length,            '#0D9488'],
                ['Active',         users.filter(u=>u.isActive).length,                 '#16A34A'],
                ['Inactive',       users.filter(u=>!u.isActive).length,                '#6B7280'],
              ].map(([label, val, color]) => (
                <div key={label} style={{flex:1,textAlign:'center',padding:'8px 4px',background:'var(--bg)',borderRadius:8}}>
                  <div style={{fontSize:20,fontWeight:700,color}}>{val}</div>
                  <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{label}</div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="table-wrap" style={{border:'none',borderRadius:0}}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Assigned Clinic</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'var(--muted)'}}>Loading users…</td></tr>
                    : filtered.length === 0
                    ? <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'var(--muted)'}}>No users found</td></tr>
                    : filtered.map(u => (
                      <tr key={u._id} style={{opacity: u.isActive ? 1 : 0.55}}>
                        <td>
                          <div style={{fontWeight:600,fontSize:13}}>{u.fullName}</div>
                          <div style={{fontSize:11,color:'var(--muted)'}}>{u.email}</div>
                        </td>
                        <td>
                          <span className={`badge ${ROLE_BADGE[u.role]||'badge-gray'}`}>
                            {ROLE_LABELS[u.role]||u.role}
                          </span>
                        </td>
                        <td style={{fontSize:13}}>
                          {u.role === 'facility_admin' ? (
                            <span style={{
                              color: u.clinicId ? 'var(--text)' : '#D97706',
                              fontWeight: u.clinicId ? 400 : 600,
                            }}>
                              {clinicName(u) === '—' ? '⚠ Not assigned' : clinicName(u)}
                            </span>
                          ) : clinicName(u)}
                        </td>
                        <td>
                          <span className={`badge ${u.isActive ? 'badge-green' : 'badge-gray'}`}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{fontSize:12,color:'var(--muted)'}}>
                          {new Date(u.createdAt).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}
                        </td>
                        <td>
                          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                            {/* Assign Clinic — only for facility_admin */}
                            {u.role === 'facility_admin' && (
                              <button className="btn btn-primary btn-sm" onClick={() => openAssign(u)}
                                title="Assign or change clinic">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                Assign Clinic
                              </button>
                            )}
                            {/* Deactivate / Reactivate */}
                            {u.isActive ? (
                              <button className="btn btn-sm" style={{background:'var(--error-lt)',color:'var(--error)',border:'none'}}
                                onClick={() => setDeactivateTarget(u)}>
                                Deactivate
                              </button>
                            ) : (
                              <button className="btn btn-outline btn-sm" onClick={() => handleReactivate(u)}>
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── CREATE TAB ── */}
      {tab === 'create' && (
        <>
          <div className={`card ${styles.banner}`}>
            <div className={styles.bannerIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>
            <div>
              <div className={styles.bannerTitle}>Create New User</div>
              <div className={styles.bannerSub}>Add a new user to the HealthQueue+ system. Default password: <strong>HealthQueue@2025</strong></div>
            </div>
          </div>

          {success && <div className="alert alert-success">{success}</div>}
          {error   && <div className="alert alert-error">{error}</div>}

          <div className={`card ${styles.section}`}>
            <div className={styles.sectionTitle}>Personal Information</div>
            <div className={styles.formGrid2}>
              <div className="form-group">
                <label className="form-label">First Name <span className={styles.req}>*</span></label>
                <input className="form-input" placeholder="First name" value={form.firstName} onChange={e => setForm(f=>({...f,firstName:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" placeholder="Last name" value={form.lastName} onChange={e => setForm(f=>({...f,lastName:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address <span className={styles.req}>*</span></label>
                <input className="form-input" type="email" placeholder="user@example.com" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" placeholder="+63 9XX XXX XXXX" value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} />
              </div>
            </div>
          </div>

          <div className={`card ${styles.section}`}>
            <div className={styles.sectionTitle}>Account Information</div>
            <div className={styles.formGrid2}>
              <div className="form-group">
                <label className="form-label">Role <span className={styles.req}>*</span></label>
                <select className="form-select" value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value,clinicId:''}))}>
                  {CREATE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]||r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Assign Clinic
                  {form.role === 'facility_admin' && <span className={styles.req}> *</span>}
                </label>
                <select className="form-select" value={form.clinicId} onChange={e => setForm(f=>({...f,clinicId:e.target.value}))}>
                  <option value="">
                    {form.role === 'facility_admin' ? '— Select clinic (required) —' : '— None —'}
                  </option>
                  {clinics.map(cl => <option key={cl._id} value={cl._id}>{cl.name.replace('Hi-Precision Diagnostics - ','')}</option>)}
                </select>
                {form.role === 'facility_admin' && !form.clinicId && (
                  <div style={{fontSize:11,color:'#D97706',marginTop:4}}>Facility Admin must be assigned to a clinic.</div>
                )}
              </div>
            </div>
          </div>

          <div className={`card ${styles.section}`}>
            <div className={styles.sectionTitle}>Permissions</div>
            {Object.entries(PERMISSIONS).map(([group, perms]) => (
              <div key={group} className={styles.permGroup}>
                <div className={styles.permGroupTitle}>{group}</div>
                <div className={styles.permGrid}>
                  {perms.map(p => (
                    <label key={p} className={styles.permItem}>
                      <input type="checkbox" checked={form.permissions.includes(p)} onChange={() => togglePerm(p)} className={styles.permCheck} />
                      <span className={styles.permLabel}>{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            <button className="btn btn-outline" onClick={() => { setForm(EMPTY_FORM); setError(''); setSuccess('') }}>Clear</button>
            <button className="btn btn-outline" onClick={() => setTab('list')}>Back to List</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </>
      )}

      {/* ── ASSIGN CLINIC MODAL ── */}
      {assignModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setAssignModal(null)}>
          <div className="modal" style={{maxWidth:440}}>
            <div className="modal-header">
              <div className="modal-title">Assign Clinic</div>
              <button className="modal-close" onClick={() => setAssignModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{fontSize:13,marginBottom:16,color:'var(--muted)'}}>
                Assigning clinic for <strong style={{color:'var(--text)'}}>{assignModal.fullName}</strong> ({assignModal.email})
              </p>
              <div className="form-group">
                <label className="form-label">Select Clinic</label>
                <select className="form-select" value={assignClinic} onChange={e => setAssignClinic(e.target.value)}>
                  <option value="">— Remove clinic assignment —</option>
                  {clinics.map(cl => (
                    <option key={cl._id} value={cl._id}>
                      {cl.name.replace('Hi-Precision Diagnostics - ','')}
                      {cl.status === 'open' ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {assignClinic && (
                <div style={{marginTop:8,padding:'8px 12px',background:'#F0FDF4',borderRadius:6,fontSize:12,color:'#166534'}}>
                  This user will be able to manage staff, queues, and appointments for the selected clinic.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssign} disabled={assigning}>
                {assigning ? 'Saving…' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DEACTIVATE CONFIRM MODAL ── */}
      {deactivateTarget && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setDeactivateTarget(null)}>
          <div className="modal" style={{maxWidth:400}}>
            <div className="modal-header">
              <div className="modal-title">Deactivate User</div>
              <button className="modal-close" onClick={() => setDeactivateTarget(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{fontSize:13,color:'var(--muted)'}}>
                Are you sure you want to deactivate <strong style={{color:'var(--text)'}}>{deactivateTarget.fullName}</strong>?
                They will no longer be able to log in.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeactivateTarget(null)}>Cancel</button>
              <button className="btn btn-sm" style={{background:'var(--error)',color:'#fff',border:'none',padding:'8px 16px',borderRadius:6,cursor:'pointer'}}
                onClick={() => handleDeactivate(deactivateTarget)}>
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
