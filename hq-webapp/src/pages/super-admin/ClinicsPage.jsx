// Role Management Module — matches prototype
import { useState } from 'react'
import styles from './ClinicsPage.module.css'

const ROLES_SEED = [
  { _id: '1', name: 'Facility Admin',  type: 'system', users: 24,  desc: 'Full administrative access to facility operations',           perms: ['full-access'] },
  { _id: '2', name: 'Queue Manager',   type: 'system', users: 42,  desc: 'Manage patient queues and flow',                             perms: ['queue-management','patient-view','reports-view'] },
  { _id: '3', name: 'Receptionist',    type: 'system', users: 156, desc: 'Patient check-in and basic queue operations',                perms: ['patient-checkin','queue-view'] },
  { _id: '4', name: 'Data Analyst',    type: 'system', users: 18,  desc: 'View and analyze reports and metrics',                       perms: ['reports-view','reports-export','analytics'] },
  { _id: '5', name: 'OPD Supervisor',  type: 'custom', users: 8,   desc: 'Custom role for OPD supervision',                           perms: ['queue-management','staff-view','patient-view','+1 more'] },
]

const PERM_OPTIONS = [
  'full-access','queue-management','patient-view','patient-checkin',
  'reports-view','reports-export','analytics','staff-view','staff-manage',
  'queue-view','settings-view','settings-manage',
]

export default function ClinicsPage() {
  const [roles, setRoles]         = useState(ROLES_SEED)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState({ name: '', desc: '', type: 'custom', perms: [] })

  const totalRoles   = roles.length
  const systemRoles  = roles.filter(r => r.type === 'system').length
  const customRoles  = roles.filter(r => r.type === 'custom').length
  const totalUsers   = roles.reduce((s, r) => s + r.users, 0)

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', desc: '', type: 'custom', perms: [] })
    setShowModal(true)
  }
  const openEdit = (r) => {
    setEditing(r)
    setForm({ name: r.name, desc: r.desc, type: r.type, perms: r.perms.filter(p => !p.startsWith('+')) })
    setShowModal(true)
  }
  const save = () => {
    if (!form.name) return
    if (editing) {
      setRoles(rs => rs.map(r => r._id === editing._id ? { ...r, name: form.name, desc: form.desc, perms: form.perms } : r))
    } else {
      setRoles(rs => [...rs, { _id: String(Date.now()), name: form.name, desc: form.desc, type: 'custom', users: 0, perms: form.perms }])
    }
    setShowModal(false)
  }
  const duplicate = (r) => {
    setRoles(rs => [...rs, { ...r, _id: String(Date.now()), name: `${r.name} (Copy)`, type: 'custom', users: 0 }])
  }
  const remove = (id) => setRoles(rs => rs.filter(r => r._id !== id))

  const togglePerm = (p) => setForm(f => ({
    ...f, perms: f.perms.includes(p) ? f.perms.filter(x => x !== p) : [...f.perms, p]
  }))

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Role Management</div>
          <div className={styles.pageSub}>Create and manage user roles and permissions</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          + Create Role
        </button>
      </div>

      {/* Summary stats */}
      <div className={styles.summaryGrid}>
        <SummaryCard label="Total Roles"  value={totalRoles}  sub={`${systemRoles} system + ${customRoles} custom`} />
        <SummaryCard label="System Roles" value={systemRoles} sub="Default roles" />
        <SummaryCard label="Custom Roles" value={customRoles} sub="Created by admins" subColor="var(--primary)" />
        <SummaryCard label="Total Users"  value={totalUsers}  sub="Across all roles" />
      </div>

      {/* Role cards grid */}
      <div className={styles.rolesGrid}>
        {roles.map(r => (
          <div key={r._id} className={`card ${styles.roleCard}`}>
            <div className={styles.roleHeader}>
              <div className={styles.roleIconWrap}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <div className={styles.roleName}>{r.name}</div>
                <span className={`badge ${r.type === 'system' ? 'badge-blue' : 'badge-orange'}`} style={{ fontSize: 10 }}>{r.type}</span>
              </div>
            </div>
            <div className={styles.roleDesc}>{r.desc}</div>
            <div className={styles.roleUsers}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              {r.users} users
            </div>
            <div className={styles.rolePerms}>
              <div className={styles.permTitle}>Permissions:</div>
              <div className={styles.permTags}>
                {r.perms.map(p => (
                  <span key={p} className={styles.permTag}>{p}</span>
                ))}
              </div>
            </div>
            <div className={styles.roleActions}>
              <button className={`${styles.roleBtn}`} onClick={() => openEdit(r)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
              <button className={`${styles.roleBtn}`} onClick={() => duplicate(r)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Duplicate
              </button>
              {r.type === 'custom' && (
                <button className={`${styles.roleBtn} ${styles.roleBtnDanger}`} onClick={() => remove(r._id)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Role' : 'Create New Role'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Role Name</label>
                <input className="form-input" placeholder="e.g. OPD Supervisor" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" placeholder="Brief description of this role" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Permissions</label>
                <div className={styles.permCheckGrid}>
                  {PERM_OPTIONS.map(p => (
                    <label key={p} className={styles.permCheckItem}>
                      <input type="checkbox" checked={form.perms.includes(p)} onChange={() => togglePerm(p)} style={{ accentColor: 'var(--primary)' }} />
                      <span>{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editing ? 'Save Changes' : 'Create Role'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, sub, subColor }) {
  return (
    <div className={`card ${styles.summaryCard}`}>
      <div className={styles.summaryLabel}>{label}</div>
      <div className={styles.summaryValue}>{value}</div>
      <div className={styles.summarySub} style={subColor ? { color: subColor } : {}}>{sub}</div>
    </div>
  )
}
