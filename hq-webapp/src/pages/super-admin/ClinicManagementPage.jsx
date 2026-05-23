import { useState, useEffect } from 'react'
import { clinicsApi } from '../../services/api'
import styles from './ClinicManagementPage.module.css'

const STATUS_BADGE = { active:'badge-green', inactive:'badge-gray', maintenance:'badge-warn' }
const EMPTY_FORM = {
  name:'', address:'', city:'', province:'', contactNumber:'', email:'',
  operatingHours:'8:00 AM - 5:00 PM', maxQueueCapacity:60,
  acceptsWalkIn:true, acceptsAppointment:true, status:'active',
  facilityType:'City Health Center', region:'NCR',
}

export default function ClinicManagementPage() {
  const [clinics,   setClinics]  = useState([])
  const [loading,   setLoading]  = useState(true)
  const [search,    setSearch]   = useState('')
  const [statusFilter, setStatus]= useState('all')
  const [modal,     setModal]    = useState(null)   // null | 'add' | 'edit' | 'view'
  const [selected,  setSelected] = useState(null)
  const [form,      setForm]     = useState(EMPTY_FORM)
  const [saving,    setSaving]   = useState(false)
  const [deleting,  setDeleting] = useState(null)
  const [toast,     setToast]    = useState('')

  const showToast = (m) => { setToast(m); setTimeout(()=>setToast(''), 3000) }

  const load = () => {
    setLoading(true)
    clinicsApi.list()
      .then(r => setClinics(r.data || []))
      .catch(() => showToast('Failed to load clinics'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd  = () => { setSelected(null); setForm(EMPTY_FORM); setModal('add') }
  const openEdit = (c) => { setSelected(c); setForm({...EMPTY_FORM,...c}); setModal('edit') }
  const openView = (c) => { setSelected(c); setModal('view') }
  const close    = () => { setModal(null); setSelected(null) }

  const save = async () => {
    if (!form.name || !form.city) { showToast('Clinic name and city are required'); return }
    setSaving(true)
    try {
      if (modal === 'edit') await clinicsApi.update(selected._id, form)
      else                  await clinicsApi.create(form)
      showToast(modal==='edit' ? 'Clinic updated successfully' : 'Clinic added to the system')
      close(); load()
    } catch (e) { showToast(e?.response?.data?.message || 'Failed to save clinic') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    try {
      await clinicsApi.delete(id)
      showToast('Clinic removed'); setDeleting(null); load()
    } catch (e) { showToast(e?.response?.data?.message || 'Failed to remove clinic') }
  }

  const filtered = clinics.filter(c => {
    const matchStatus = statusFilter==='all' || c.status===statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || c.name?.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const totalActive   = clinics.filter(c=>c.status==='active').length
  const totalInactive = clinics.filter(c=>c.status!=='active').length

  const F = (field, label, type='text', opts=null) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {opts
        ? <select className="form-select" value={form[field]??''} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}>
            {opts.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
          </select>
        : <input className="form-input" type={type} value={form[field]??''}
            onChange={e=>setForm(f=>({...f,[field]:type==='number'?Number(e.target.value):e.target.value}))} />
      }
    </div>
  )

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Clinic Management</div>
          <div className={styles.sub}>Add, edit, and manage all health facilities on the platform</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          + Add Clinic
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={"card "+styles.statCard}><div className={styles.statLabel}>Total Clinics</div><div className={styles.statValue}>{clinics.length}</div></div>
        <div className={"card "+styles.statCard}><div className={styles.statLabel}>Active</div><div className={styles.statValue} style={{color:'#16A34A'}}>{totalActive}</div></div>
        <div className={"card "+styles.statCard}><div className={styles.statLabel}>Inactive</div><div className={styles.statValue} style={{color:'#6B7280'}}>{totalInactive}</div><div style={{fontSize:11,color:'#6B7280',marginTop:2}}>Maintenance or offline</div></div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className="search-bar" style={{flex:1,maxWidth:320}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search clinic name or city..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="dropdown-select" value={statusFilter} onChange={e=>setStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <button className="btn btn-outline btn-sm" onClick={load}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      {/* Cards grid */}
      {loading
        ? <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>Loading clinics…</div>
        : filtered.length === 0
          ? <div className="card" style={{padding:40,textAlign:'center',color:'var(--muted)'}}>No clinics found. Click "+ Add Clinic" to register one.</div>
          : <div className={styles.clinicsGrid}>
              {filtered.map(c => (
                <div key={c._id} className={"card "+styles.clinicCard}>
                  <div className={styles.clinicHeader}>
                    <div className={styles.clinicIcon}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    </div>
                    <div style={{flex:1}}>
                      <div className={styles.clinicName}>{c.name}</div>
                      <div className={styles.clinicType}>{c.facilityType||'Health Center'}</div>
                    </div>
                    <span className={`badge ${STATUS_BADGE[c.status]||'badge-gray'}`}>{c.status||'active'}</span>
                  </div>

                  <div className={styles.clinicDetails}>
                    <div className={styles.detailRow}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {c.city}{c.province?', '+c.province:''}
                    </div>
                    {c.contactNumber && <div className={styles.detailRow}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      {c.contactNumber}
                    </div>}
                    <div className={styles.detailRow}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {c.operatingHours||'—'}
                    </div>
                    <div className={styles.detailRow}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                      Max {c.maxQueueCapacity||60} patients/day
                    </div>
                  </div>

                  <div className={styles.clinicTags}>
                    {c.acceptsWalkIn     && <span className="badge badge-teal" style={{fontSize:10}}>Walk-in</span>}
                    {c.acceptsAppointment && <span className="badge badge-blue" style={{fontSize:10}}>Appointments</span>}
                  </div>

                  <div className={styles.clinicActions}>
                    <button className={styles.cActBtn} onClick={()=>openView(c)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      View
                    </button>
                    <button className={styles.cActBtn} onClick={()=>openEdit(c)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </button>
                    <button className={`${styles.cActBtn} ${styles.cActDel}`} onClick={()=>setDeleting(c._id)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
      }

      {/* DELETE CONFIRM */}
      {deleting && (
        <div className="modal-overlay" onClick={()=>setDeleting(null)}>
          <div className="modal" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Delete Clinic</div></div>
            <div className="modal-body"><p style={{fontSize:14,color:'var(--text-2)'}}>Are you sure you want to remove this clinic from the system? This cannot be undone.</p></div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setDeleting(null)}>Cancel</button>
              <button className="btn btn-sm" style={{background:'var(--error)',color:'#fff'}} onClick={()=>remove(deleting)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {modal==='view' && selected && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">{selected.name}</div><button className="modal-close" onClick={close}>×</button></div>
            <div className="modal-body">
              {[['Facility Type',selected.facilityType||'—'],['Address',selected.address||'—'],['City',selected.city||'—'],['Province',selected.province||'—'],['Contact',selected.contactNumber||'—'],['Email',selected.email||'—'],['Operating Hours',selected.operatingHours||'—'],['Max Queue Capacity',selected.maxQueueCapacity||60],['Status',selected.status||'active'],['Walk-in',selected.acceptsWalkIn?'Yes':'No'],['Appointments',selected.acceptsAppointment?'Yes':'No']].map(([l,v])=>(
                <div key={l} style={{display:'flex',padding:'8px 0',borderBottom:'1px solid var(--border-lt)',gap:12}}>
                  <div style={{minWidth:150,fontSize:12,fontWeight:600,color:'var(--muted)'}}>{l}</div>
                  <div style={{fontSize:13}}>{String(v)}</div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Close</button>
              <button className="btn btn-primary" onClick={()=>{close();setTimeout(()=>openEdit(selected),50)}}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {(modal==='add'||modal==='edit') && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&close()}>
          <div className="modal" style={{maxWidth:580}}>
            <div className="modal-header">
              <div className="modal-title">{modal==='edit'?'Edit Clinic':'Add New Clinic'}</div>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
              <div style={{gridColumn:'1/-1'}}>{F('name','Clinic Name *')}</div>
              {F('facilityType','Facility Type','text',[
                'City Health Center','Rural Health Unit','Barangay Health Center',
                'District Hospital','General Hospital','Specialty Clinic'
              ])}
              {F('status','Status','text',[
                {value:'active',label:'Active'},
                {value:'inactive',label:'Inactive'},
                {value:'maintenance',label:'Maintenance'},
              ])}
              <div style={{gridColumn:'1/-1'}}>{F('address','Address')}</div>
              {F('city','City *')}
              {F('province','Province')}
              {F('region','Region')}
              {F('contactNumber','Contact Number')}
              {F('email','Email','email')}
              {F('operatingHours','Operating Hours')}
              {F('maxQueueCapacity','Max Queue Capacity','number')}
              <div className="form-group" style={{display:'flex',alignItems:'center',gap:10}}>
                <input type="checkbox" id="walkIn" checked={!!form.acceptsWalkIn}
                  onChange={e=>setForm(f=>({...f,acceptsWalkIn:e.target.checked}))} style={{width:16,height:16}} />
                <label htmlFor="walkIn" style={{fontSize:13,cursor:'pointer'}}>Accepts Walk-in Patients</label>
              </div>
              <div className="form-group" style={{display:'flex',alignItems:'center',gap:10}}>
                <input type="checkbox" id="appt" checked={!!form.acceptsAppointment}
                  onChange={e=>setForm(f=>({...f,acceptsAppointment:e.target.checked}))} style={{width:16,height:16}} />
                <label htmlFor="appt" style={{fontSize:13,cursor:'pointer'}}>Accepts Appointments</label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving?'Saving…':modal==='edit'?'Save Changes':'Add Clinic'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
