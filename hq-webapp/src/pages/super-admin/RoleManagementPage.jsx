import { useState } from 'react'
import styles from './RoleManagementPage.module.css'

const PERM_OPTIONS = [
  'full-access','queue-management','patient-view','patient-checkin',
  'reports-view','reports-export','analytics','staff-view','staff-manage',
  'queue-view','settings-view','settings-manage',
]

const SYSTEM_ROLES = [
  { _id:'1', name:'Facility Admin',  type:'system', users:24,  desc:'Full administrative access to facility operations',        perms:['full-access'] },
  { _id:'2', name:'Queue Manager',   type:'system', users:42,  desc:'Manage patient queues and flow',                           perms:['queue-management','patient-view','reports-view'] },
  { _id:'3', name:'Receptionist',    type:'system', users:156, desc:'Patient check-in and basic queue operations',              perms:['patient-checkin','queue-view'] },
  { _id:'4', name:'Data Analyst',    type:'system', users:18,  desc:'View and analyze reports and metrics',                     perms:['reports-view','reports-export','analytics'] },
]

const PERM_BADGE = {
  'full-access':'badge-blue','queue-management':'badge-teal','patient-view':'badge-green',
  'patient-checkin':'badge-green','reports-view':'badge-purple','reports-export':'badge-purple',
  'analytics':'badge-orange','staff-view':'badge-gray','staff-manage':'badge-gray',
  'queue-view':'badge-teal','settings-view':'badge-gray','settings-manage':'badge-gray',
}

export default function RoleManagementPage() {
  const [customRoles, setCustom] = useState([
    { _id:'5', name:'OPD Supervisor', type:'custom', users:8, desc:'Custom role for OPD supervision', perms:['queue-management','staff-view','patient-view','settings-view'] },
  ])
  const [modal,    setModal]   = useState(null)   // null | 'create' | 'edit'
  const [editing,  setEditing] = useState(null)
  const [form,     setForm]    = useState({ name:'', desc:'', perms:[] })
  const [toast,    setToast]   = useState('')

  const showToast = (m) => { setToast(m); setTimeout(()=>setToast(''), 3000) }

  const allRoles   = [...SYSTEM_ROLES, ...customRoles]
  const totalUsers = allRoles.reduce((s,r)=>s+r.users,0)

  const openCreate = () => { setEditing(null); setForm({ name:'', desc:'', perms:[] }); setModal('create') }
  const openEdit   = (r) => {
    setEditing(r)
    setForm({ name:r.name, desc:r.desc, perms:[...r.perms] })
    setModal('edit')
  }
  const close = () => { setModal(null); setEditing(null) }

  const togglePerm = (p) => setForm(f=>({
    ...f, perms: f.perms.includes(p) ? f.perms.filter(x=>x!==p) : [...f.perms, p]
  }))

  const save = () => {
    if (!form.name.trim()) { showToast('Role name is required'); return }
    if (modal === 'edit' && editing?.type === 'system') {
      showToast('System roles cannot be modified'); return
    }
    if (modal === 'edit') {
      setCustom(rs => rs.map(r => r._id===editing._id ? {...r, ...form} : r))
      showToast('Role updated')
    } else {
      setCustom(rs => [...rs, { _id: String(Date.now()), type:'custom', users:0, ...form }])
      showToast('Role created successfully')
    }
    close()
  }

  const duplicate = (r) => {
    setCustom(rs => [...rs, { ...r, _id:String(Date.now()), name:`${r.name} (Copy)`, type:'custom', users:0 }])
    showToast(`"${r.name}" duplicated`)
  }

  const remove = (id) => {
    if (!confirm('Delete this custom role?')) return
    setCustom(rs => rs.filter(r=>r._id!==id))
    showToast('Role deleted')
  }

  const renderPerms = (perms) => {
    const max = 3
    const visible = perms.slice(0, max)
    const extra   = perms.length - max
    return (
      <div className={styles.perms}>
        {visible.map(p=>(
          <span key={p} className={`${styles.permTag} ${PERM_BADGE[p]||'badge-gray'}`}>{p}</span>
        ))}
        {extra > 0 && <span className={styles.permTag} style={{background:'#F1F5F9',color:'var(--muted)'}}>+{extra} more</span>}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Role Management</div>
          <div className={styles.sub}>Create and manage user roles and permissions</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          + Create Role
        </button>
      </div>

      {/* Stat cards */}
      <div className={styles.statsRow}>
        <StatCard label="Total Roles"   value={allRoles.length}      sub={`${SYSTEM_ROLES.length} system + ${customRoles.length} custom`} />
        <StatCard label="System Roles"  value={SYSTEM_ROLES.length}  sub="Default roles"      color="blue" />
        <StatCard label="Custom Roles"  value={customRoles.length}   sub="Created by admins"  color="green" />
        <StatCard label="Total Users"   value={totalUsers}           sub="Across all roles"   color="purple" />
      </div>

      {/* Role cards grid */}
      <div className={styles.rolesGrid}>
        {allRoles.map(role => (
          <div key={role._id} className={`card ${styles.roleCard}`}>
            {/* Card header */}
            <div className={styles.roleHeader}>
              <div className={styles.roleIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <div className={styles.roleName}>{role.name}</div>
                <span className={`badge ${role.type==='system'?'badge-gray':'badge-blue'}`} style={{fontSize:10}}>{role.type}</span>
              </div>
            </div>

            {/* Description */}
            <div className={styles.roleDesc}>{role.desc}</div>

            {/* Users */}
            <div className={styles.roleUsers}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              {role.users} users
            </div>

            {/* Permissions */}
            <div className={styles.permLabel}>Permissions:</div>
            {renderPerms(role.perms)}

            {/* Actions */}
            <div className={styles.roleActions}>
              <button className={styles.actBtn} onClick={()=>openEdit(role)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
              <button className={styles.actBtn} onClick={()=>duplicate(role)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Duplicate
              </button>
              {role.type === 'custom' && (
                <button className={`${styles.actBtn} ${styles.actDel}`} onClick={()=>remove(role._id)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CREATE / EDIT MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&close()}>
          <div className="modal" style={{maxWidth:520}}>
            <div className="modal-header">
              <div className="modal-title">{modal==='edit'?'Edit Role':'Create New Role'}</div>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              {modal==='edit' && editing?.type==='system' && (
                <div style={{padding:'10px 14px',background:'#FFF7ED',borderRadius:8,fontSize:12,color:'#92400E',marginBottom:12,borderLeft:'3px solid #D97706'}}>
                  System roles are read-only. Duplicate this role to create a custom variant.
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Role Name *</label>
                <input className="form-input" value={form.name}
                  onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                  placeholder="e.g. OPD Supervisor"
                  disabled={modal==='edit' && editing?.type==='system'} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" value={form.desc}
                  onChange={e=>setForm(f=>({...f,desc:e.target.value}))}
                  placeholder="Describe what this role can do"
                  disabled={modal==='edit' && editing?.type==='system'} />
              </div>
              <div className="form-group">
                <label className="form-label">Permissions</label>
                <div className={styles.permGrid}>
                  {PERM_OPTIONS.map(p=>(
                    <label key={p} className={`${styles.permCheck} ${form.perms.includes(p)?styles.permChecked:''}`}>
                      <input type="checkbox" checked={form.perms.includes(p)}
                        onChange={()=>!(modal==='edit'&&editing?.type==='system')&&togglePerm(p)}
                        style={{display:'none'}} />
                      <span className={styles.permCheckBox}>
                        {form.perms.includes(p) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </span>
                      {p}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancel</button>
              {!(modal==='edit' && editing?.type==='system') && (
                <button className="btn btn-primary" onClick={save}>
                  {modal==='edit' ? 'Save Changes' : 'Create Role'}
                </button>
              )}
              {modal==='edit' && editing?.type==='system' && (
                <button className="btn btn-primary" onClick={()=>{duplicate(editing);close()}}>
                  Duplicate & Customize
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color }) {
  const fg = {blue:'#2563EB',green:'#16A34A',purple:'#7C3AED'}
  return (
    <div className={`card ${styles.statCard}`}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={{color:color?fg[color]:'var(--text)'}}>{value}</div>
      {sub && <div className={styles.statSub} style={{color:color?fg[color]:'var(--muted)'}}>{sub}</div>}
    </div>
  )
}
