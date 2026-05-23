import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './QueuePage.module.css'

const STATUS_BADGE = { waiting:'badge-warn', serving:'badge-blue', completed:'badge-green', skipped:'badge-gray', no_show:'badge-red' }

export default function QueuePage() {
  const { user }   = useAuth()
  const [queue,    setQueue]   = useState([])
  const [metrics,  setMetrics] = useState(null)
  const [loading,  setLoading] = useState(true)
  const [search,   setSearch]  = useState('')
  const [statusFilter, setStatus] = useState('All')
  const [view,     setView]    = useState('list')   // 'list' | 'summary'
  const [walkinModal, setWalkin] = useState(false)
  const [walkinForm, setWalkinForm] = useState({ patientName:'', phone:'', serviceName:'', patientType:'Regular' })
  const [saving,   setSaving]  = useState(false)
  const [toast,    setToast]   = useState('')

  const clinicId  = user?.clinicId
  const showToast = (m) => { setToast(m); setTimeout(()=>setToast(''), 3000) }

  const load = useCallback(() => {
    if (!clinicId) { setLoading(false); return }
    setLoading(true)
    Promise.all([
      api.get('/api/queues', { params: { clinicId } }),
      api.get('/api/queues/metrics', { params: { clinicId } }).catch(()=>({ data:null })),
    ]).then(([qr, mr]) => {
      setQueue(qr.data || [])
      setMetrics(mr.data)
    }).catch(()=>{})
    .finally(()=>setLoading(false))
  }, [clinicId])

  useEffect(load, [load])

  const act = (fn) => fn().then(load).catch(()=>showToast('Action failed'))

  const exportCSV = () => {
    const rows = [['Queue #','Patient','Service','Type','Joined','Status','Wait (min)']]
    filtered.forEach(q => rows.push([
      q.queueNumber, q.patientName, q.serviceName, q.queueType,
      new Date(q.joinedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),
      q.status, q.estimatedWaitMinutes||0
    ]))
    const csv  = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv'})
    const a    = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`queue_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    showToast('Queue exported to CSV')
  }

  const addWalkin = async () => {
    if (!walkinForm.patientName || !walkinForm.serviceName) { showToast('Name and service are required'); return }
    setSaving(true)
    try {
      await api.post('/api/queues/add-walkin', { ...walkinForm, clinicId })
      showToast('Walk-in patient added to queue')
      setWalkin(false)
      setWalkinForm({ patientName:'', phone:'', serviceName:'', patientType:'Regular' })
      load()
    } catch (e) { showToast(e?.response?.data?.message || 'Failed to add walk-in') }
    finally { setSaving(false) }
  }

  const filtered = queue.filter(q => {
    const matchStatus = statusFilter==='All' || q.status===statusFilter
    const matchSearch = !search || q.patientName?.toLowerCase().includes(search.toLowerCase()) || q.queueNumber?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  // Summary view — group by service
  const byService = filtered.reduce((acc, q) => {
    const k = q.serviceName||'Other'
    if (!acc[k]) acc[k] = { name:k, waiting:0, serving:0, completed:0, total:0 }
    acc[k][q.status] = (acc[k][q.status]||0) + 1
    acc[k].total++
    return acc
  }, {})

  const waiting   = queue.filter(q=>q.status==='waiting').length
  const serving   = queue.filter(q=>q.status==='serving').length
  const completed = queue.filter(q=>q.status==='completed').length

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Stat cards */}
      <div className={styles.statsRow}>
        <div className={"card "+styles.statCard}><div className={styles.statLabel}>Waiting</div><div className={styles.statValue} style={{color:'#D97706'}}>{waiting}</div></div>
        <div className={"card "+styles.statCard}><div className={styles.statLabel}>Now Serving</div><div className={styles.statValue} style={{color:'#2563EB'}}>{serving}</div></div>
        <div className={"card "+styles.statCard}><div className={styles.statLabel}>Completed</div><div className={styles.statValue} style={{color:'#16A34A'}}>{completed}</div></div>
        <div className={"card "+styles.statCard}><div className={styles.statLabel}>Avg Wait</div><div className={styles.statValue} style={{color:'#7C3AED'}}>{metrics?.avgWaitMinutes??'—'}m</div></div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className="search-bar" style={{flex:1,maxWidth:280}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search patient or queue #..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="dropdown-select" value={statusFilter} onChange={e=>setStatus(e.target.value)}>
          {['All','waiting','serving','completed','skipped','no_show'].map(s=><option key={s} value={s}>{s==='All'?'All Status':s}</option>)}
        </select>

        {/* View toggle */}
        <div className={styles.viewToggle}>
          <button className={`${styles.viewBtn} ${view==='list'?styles.viewBtnActive:''}`} onClick={()=>setView('list')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            List
          </button>
          <button className={`${styles.viewBtn} ${view==='summary'?styles.viewBtnActive:''}`} onClick={()=>setView('summary')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Summary
          </button>
        </div>

        <button className="btn btn-outline btn-sm" onClick={exportCSV}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
        <button className="btn btn-outline btn-sm" onClick={load}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
        <button className="btn btn-primary btn-sm" onClick={()=>setWalkin(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Walk-in
        </button>
      </div>

      {/* LIST VIEW */}
      {view==='list' && (
        <div className="card">
          {loading ? <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>Loading queue…</div>
          : <div className="table-wrap" style={{border:'none',borderRadius:0}}>
              <table>
                <thead><tr><th>#</th><th>Patient</th><th>Service</th><th>Type</th><th>Joined</th><th>Wait</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length===0
                    ? <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'var(--muted)'}}>No queue entries</td></tr>
                    : filtered.map(q=>(
                      <tr key={q._id}>
                        <td style={{fontWeight:700,color:'var(--primary)'}}>{q.queueNumber}</td>
                        <td><div style={{fontWeight:600,fontSize:13}}>{q.patientName}</div><div style={{fontSize:11,color:'var(--muted)'}}>{q.patientPhone}</div></td>
                        <td style={{fontSize:13}}>{q.serviceName}</td>
                        <td><span className="badge badge-gray">{q.queueType||'walk-in'}</span></td>
                        <td style={{fontSize:12,color:'var(--muted)'}}>{new Date(q.joinedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
                        <td style={{fontSize:13}}>{q.estimatedWaitMinutes??'—'}m</td>
                        <td><span className={`badge ${STATUS_BADGE[q.status]||'badge-gray'}`}>{q.status}</span></td>
                        <td>
                          <div style={{display:'flex',gap:4}}>
                            {q.status==='waiting'  && <button className="btn btn-primary btn-sm" onClick={()=>act(()=>api.put(`/api/queues/${q._id}/call`))}>Call</button>}
                            {q.status==='serving'  && <button className="btn btn-sm" style={{background:'#16A34A',color:'#fff'}} onClick={()=>act(()=>api.put(`/api/queues/${q._id}/complete`))}>Done</button>}
                            {q.status==='waiting'  && <button className="btn btn-outline btn-sm" onClick={()=>act(()=>api.put(`/api/queues/${q._id}/skip`))}>Skip</button>}
                            {['waiting','serving'].includes(q.status) && <button className="btn btn-outline btn-sm" style={{color:'var(--error)'}} onClick={()=>act(()=>api.put(`/api/queues/${q._id}/no-show`))}>No-show</button>}
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      )}

      {/* SUMMARY VIEW */}
      {view==='summary' && (
        <div className={styles.summaryGrid}>
          {Object.values(byService).length===0
            ? <div className="card" style={{padding:32,textAlign:'center',color:'var(--muted)',gridColumn:'1/-1'}}>No queue data today</div>
            : Object.values(byService).map(svc=>(
              <div key={svc.name} className={"card "+styles.summaryCard}>
                <div className={styles.summaryName}>{svc.name}</div>
                <div className={styles.summaryStats}>
                  <div className={styles.summaryStat}><span style={{color:'#D97706',fontWeight:800,fontSize:22}}>{svc.waiting||0}</span><span style={{fontSize:11,color:'var(--muted)'}}>Waiting</span></div>
                  <div className={styles.summaryStat}><span style={{color:'#2563EB',fontWeight:800,fontSize:22}}>{svc.serving||0}</span><span style={{fontSize:11,color:'var(--muted)'}}>Serving</span></div>
                  <div className={styles.summaryStat}><span style={{color:'#16A34A',fontWeight:800,fontSize:22}}>{svc.completed||0}</span><span style={{fontSize:11,color:'var(--muted)'}}>Done</span></div>
                </div>
                <div className={styles.summaryTotal}>Total: {svc.total}</div>
              </div>
            ))
          }
        </div>
      )}

      {/* WALK-IN MODAL */}
      {walkinModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setWalkin(false)}>
          <div className="modal" style={{maxWidth:420}}>
            <div className="modal-header"><div className="modal-title">Add Walk-in Patient</div><button className="modal-close" onClick={()=>setWalkin(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Patient Name *</label><input className="form-input" value={walkinForm.patientName} onChange={e=>setWalkinForm(f=>({...f,patientName:e.target.value}))} placeholder="Full name" /></div>
              <div className="form-group"><label className="form-label">Phone Number</label><input className="form-input" value={walkinForm.phone} onChange={e=>setWalkinForm(f=>({...f,phone:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Service *</label><input className="form-input" value={walkinForm.serviceName} onChange={e=>setWalkinForm(f=>({...f,serviceName:e.target.value}))} placeholder="e.g. General Consultation" /></div>
              <div className="form-group"><label className="form-label">Patient Type</label>
                <select className="form-select" value={walkinForm.patientType} onChange={e=>setWalkinForm(f=>({...f,patientType:e.target.value}))}>
                  {['Regular','Senior Citizen','PWD','Pregnant','Priority'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setWalkin(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addWalkin} disabled={saving}>{saving?'Adding…':'Add to Queue'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
