import { useState, useEffect } from 'react'
import { clinicsApi } from '../../services/api'
import styles from './super-admin.module.css'

const STATUS_BADGE = { open:'badge-green', closed:'badge-gray', maintenance:'badge-warn', active:'badge-green', inactive:'badge-gray' }
const EMPTY_FORM = {
  name:'', address:'', city:'', province:'', contactNumber:'', email:'',
  operatingHours:'8:00 AM - 5:00 PM', maxQueueCapacity:60,
  acceptsWalkIn:true, acceptsAppointment:true, status:'open',
  facilityType:'City Health Center', region:'NCR',
}

export default function ClinicManagementPage() {
  const [clinics,   setClinics]  = useState([])
  const [loading,   setLoading]  = useState(true)
  const [search,    setSearch]   = useState('')
  const [statusFilter, setStatus]= useState('all')
  const [modal,     setModal]    = useState(null)
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
    const matchStatus = statusFilter==='all' || c.status===statusFilter || (statusFilter==='open' && c.status==='active')
    const q = search.toLowerCase()
    const matchSearch = !q || c.name?.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const totalActive   = clinics.filter(c=>c.status==='open' || c.status==='active').length
  const totalInactive = clinics.filter(c=>c.status!=='open' && c.status!=='active').length

  const F = (field, label, type='text', opts=null) => (
    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
      <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>{label}</label>
      {opts
        ? <select className="form-select" style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', background: '#fff' }} value={form[field]??''} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}>
            {opts.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
          </select>
        : <input className="form-input" style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px' }} type={type} value={form[field]??''}
            onChange={e=>setForm(f=>({...f,[field]:type==='number'?Number(e.target.value):e.target.value}))} />
      }
    </div>
  )

  return (
    <div className={styles.page}>
      {toast && <div style={{position:'fixed', bottom:24, right:24, background:'#333', color:'#fff', padding:'12px 24px', borderRadius:8, zIndex:9999}}>{toast}</div>}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Clinic Management</div>
          <div className={styles.sub}>Add, edit, and manage all health facilities on the platform</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          + Add Clinic
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}><div className={styles.statLabel}>Total Clinics</div><div className={styles.statValue}>{clinics.length}</div></div>
        <div className={styles.statCard}><div className={styles.statLabel}>Active</div><div className={styles.statValue} style={{color:'#16A34A'}}>{totalActive}</div></div>
        <div className={styles.statCard}><div className={styles.statLabel}>Inactive</div><div className={styles.statValue} style={{color:'#6B7280'}}>{totalInactive}</div></div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div style={{ flex: 1, maxWidth: 320, position: 'relative' }}>
          <input 
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }} 
            placeholder="Search clinic name or city..." 
            value={search} 
            onChange={e=>setSearch(e.target.value)} 
          />
        </div>
        <select style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }} value={statusFilter} onChange={e=>setStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <button className="btn btn-outline" onClick={load}>Refresh</button>
      </div>

      {/* Grid */}
      {loading
        ? <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>Loading clinics…</div>
        : filtered.length === 0
          ? <div style={{padding:40,textAlign:'center',color:'var(--muted)', background:'#fff', borderRadius:12}}>No clinics found. Click "+ Add Clinic" to register one.</div>
          : <div className={styles.clinicGrid}>
              {filtered.map(c => (
                <div key={c._id} className={styles.clinicCard}>
                  
                  <div className={styles.clinicHead}>
                    <div style={{flex:1}}>
                      <div className={styles.clinicName}>{c.name}</div>
                      <span className={`badge ${STATUS_BADGE[c.status]||'badge-gray'}`} style={{marginTop: 6, display: 'inline-block'}}>{c.status||'active'}</span>
                    </div>
                  </div>

                  <div className={styles.clinicMeta}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {c.city}{c.province?', '+c.province:''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {c.operatingHours||'—'}
                    </div>
                  </div>

                  <div className={styles.clinicStats}>
                    <div className={styles.cStat}>
                      <div className={styles.cStatVal}>{c.maxQueueCapacity || 60}</div>
                      <div className={styles.cStatLbl}>Max Queue</div>
                    </div>
                    <div className={styles.cStat}>
                      <div className={styles.cStatVal}>{c.acceptsWalkIn ? 'Yes' : 'No'}</div>
                      <div className={styles.cStatLbl}>Walk-in</div>
                    </div>
                    <div className={styles.cStat}>
                      <div className={styles.cStatVal}>{c.acceptsAppointment ? 'Yes' : 'No'}</div>
                      <div className={styles.cStatLbl}>Appt</div>
                    </div>
                  </div>

                  <div className={styles.clinicActions}>
                    <button className={`${styles.actionBtn} ${styles.btnView}`} onClick={()=>openView(c)}>View</button>
                    <button className={`${styles.actionBtn} ${styles.btnEdit}`} onClick={()=>openEdit(c)}>Edit</button>
                    <button className={`${styles.actionBtn} ${styles.btnDelete}`} onClick={()=>setDeleting(c._id)}>Delete</button>
                  </div>

                </div>
              ))}
            </div>
      }

      {/* DELETE CONFIRM - Restored Global Classes */}
      {deleting && (
        <div className="modal-overlay" onClick={()=>setDeleting(null)}>
          <div className="modal" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Delete Clinic</div></div>
            <div className="modal-body" style={{display:'block', padding:'24px 32px'}}>
              <p style={{fontSize:14,color:'var(--text-2)', margin:0}}>Are you sure you want to remove this clinic? This cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setDeleting(null)}>Cancel</button>
              <button className="btn btn-sm" style={{background:'var(--error)',color:'#fff'}} onClick={()=>remove(deleting)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL - Restored Global Classes */}
      {modal==='view' && selected && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{selected.name}</div>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body" style={{display:'block'}}>
              {[['Facility Type',selected.facilityType||'—'],['Address',selected.address||'—'],['City',selected.city||'—'],['Province',selected.province||'—'],['Contact',selected.contactNumber||'—'],['Email',selected.email||'—'],['Operating Hours',selected.operatingHours||'—'],['Max Queue Capacity',selected.maxQueueCapacity||60],['Status',selected.status||'active'],['Walk-in',selected.acceptsWalkIn?'Yes':'No'],['Appointments',selected.acceptsAppointment?'Yes':'No']].map(([l,v])=> (
                <div key={l} style={{display:'flex',padding:'10px 0',borderBottom:'1px solid var(--border)',gap:12}}>
                  <div style={{minWidth:150,fontSize:13,fontWeight:600,color:'var(--muted)'}}>{l}</div>
                  <div style={{fontSize:13, color:'var(--text)'}}>{String(v)}</div>
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

      {/* ADD / EDIT MODAL - Restored Global Classes & New Toggles */}
      {(modal==='add'||modal==='edit') && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&close()}>
          <div className="modal" style={{maxWidth: 640}}>
            <div className="modal-header">
              <div className="modal-title">{modal==='edit'?'Edit Clinic':'Add New Clinic'}</div>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px', padding:'24px 32px'}}>
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
              
              {/* TOGGLE SWITCHES */}
              <div className={styles.toggleWrap}>
                <div className={styles.toggleLabel}>Accepts Walk-in Patients</div>
                <label className={styles.toggleSwitch}>
                  <input type="checkbox" checked={!!form.acceptsWalkIn} onChange={e=>setForm(f=>({...f,acceptsWalkIn:e.target.checked}))} />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>

              <div className={styles.toggleWrap}>
                <div className={styles.toggleLabel}>Accepts Appointments</div>
                <label className={styles.toggleSwitch}>
                  <input type="checkbox" checked={!!form.acceptsAppointment} onChange={e=>setForm(f=>({...f,acceptsAppointment:e.target.checked}))} />
                  <span className={styles.toggleSlider}></span>
                </label>
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