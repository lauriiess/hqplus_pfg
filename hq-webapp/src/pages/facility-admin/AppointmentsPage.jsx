import { useState, useEffect } from 'react'
import { queueApi, appointmentsApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './facility-admin.module.css'

const STATUS_COLOR = { waiting:'badge-warn', serving:'badge-blue', completed:'badge-green', skipped:'badge-gray', no_show:'badge-red' }

export default function AppointmentsPage() {
  const { user } = useAuth()
  const [queue,    setQueue]    = useState([])
  const [metrics,  setMetrics]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('queue')  // 'queue' | 'appointments'
  const [appts,    setAppts]    = useState([])
  const [search,   setSearch]   = useState('')
  const [toast,    setToast]    = useState('')

  const clinicId = user?.clinicId
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const loadQueue = () => {
    if (!clinicId) return
    Promise.all([
      queueApi.list({ clinicId }),
      queueApi.metrics(clinicId),
    ]).then(([qr, mr]) => {
      setQueue(qr.data || [])
      setMetrics(mr.data || null)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  const loadAppts = () => {
    if (!clinicId) return
    appointmentsApi.today(clinicId)
      .then(r => setAppts(r.data || []))
      .catch(() => setAppts([]))
  }

  useEffect(() => { loadQueue(); loadAppts() }, [clinicId])

  const handleCall     = (id) => queueApi.call(id).then(loadQueue).catch(() => showToast('Failed to call'))
  const handleComplete = (id) => queueApi.complete(id).then(loadQueue).catch(() => showToast('Failed to complete'))
  const handleSkip     = (id) => queueApi.skip(id).then(loadQueue).catch(() => showToast('Failed to skip'))
  const handleNoShow   = (id) => queueApi.noShow(id).then(loadQueue).catch(() => showToast('Failed to mark no-show'))

  const handleApptStatus = (id, status) => {
    appointmentsApi.updateStatus(id, status)
      .then(() => { loadAppts(); showToast('Status updated') })
      .catch(() => showToast('Failed to update status'))
  }

  const filteredQueue = queue.filter(q =>
    !search || q.patientName?.toLowerCase().includes(search.toLowerCase()) ||
    q.queueNumber?.toLowerCase().includes(search.toLowerCase())
  )

  const serving   = queue.filter(q => q.status === 'serving').length
  const waiting   = queue.filter(q => q.status === 'waiting').length
  const completed = queue.filter(q => q.status === 'completed').length

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={"card " + styles.statCard}>
          <div className={styles.statLabel}>Now Serving</div>
          <div className={styles.statValue} style={{color:'#2563EB'}}>{serving}</div>
        </div>
        <div className={"card " + styles.statCard}>
          <div className={styles.statLabel}>Waiting</div>
          <div className={styles.statValue} style={{color:'#D97706'}}>{waiting}</div>
        </div>
        <div className={"card " + styles.statCard}>
          <div className={styles.statLabel}>Completed Today</div>
          <div className={styles.statValue} style={{color:'#16A34A'}}>{completed}</div>
        </div>
        <div className={"card " + styles.statCard}>
          <div className={styles.statLabel}>Avg Wait</div>
          <div className={styles.statValue} style={{color:'#7C3AED'}}>{metrics?.avgWaitMinutes ?? '—'}m</div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab==='queue'?styles.tabActive:''}`} onClick={()=>setTab('queue')}>Live Queue</button>
        <button className={`${styles.tab} ${tab==='appointments'?styles.tabActive:''}`} onClick={()=>setTab('appointments')}>Today's Appointments</button>
        <div style={{flex:1}} />
        <div className="search-bar" style={{maxWidth:260}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search patient or queue #..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => { loadQueue(); loadAppts() }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      {/* Queue table */}
      {tab === 'queue' && (
        <div className="card">
          {loading ? <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>Loading queue…</div> : (
          <div className="table-wrap" style={{border:'none',borderRadius:0}}>
            <table>
              <thead>
                <tr><th>#</th><th>Patient</th><th>Service</th><th>Type</th><th>Joined</th><th>Est. Wait</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filteredQueue.length === 0 ? (
                  <tr><td colSpan="8" style={{textAlign:'center',color:'var(--muted)',padding:32}}>No queue entries today</td></tr>
                ) : filteredQueue.map(q => (
                  <tr key={q._id}>
                    <td style={{fontWeight:700,color:'var(--primary)'}}>{q.queueNumber}</td>
                    <td>
                      <div style={{fontWeight:600,fontSize:13}}>{q.patientName}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{q.patientPhone}</div>
                    </td>
                    <td style={{fontSize:13}}>{q.serviceName}</td>
                    <td><span className={'badge badge-gray'}>{q.queueType}</span></td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{new Date(q.joinedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
                    <td style={{fontSize:13}}>{q.estimatedWaitMinutes ?? '—'}m</td>
                    <td><span className={'badge ' + (STATUS_COLOR[q.status]||'badge-gray')}>{q.status}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        {q.status==='waiting'   && <button className="btn btn-primary btn-sm" onClick={()=>handleCall(q._id)}>Call</button>}
                        {q.status==='serving'   && <button className="btn btn-sm" style={{background:'#16A34A',color:'#fff'}} onClick={()=>handleComplete(q._id)}>Done</button>}
                        {q.status==='waiting'   && <button className="btn btn-outline btn-sm" onClick={()=>handleSkip(q._id)}>Skip</button>}
                        {['waiting','serving'].includes(q.status) && <button className="btn btn-outline btn-sm" style={{color:'var(--error)'}} onClick={()=>handleNoShow(q._id)}>No-show</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Appointments table */}
      {tab === 'appointments' && (
        <div className="card">
          <div className="table-wrap" style={{border:'none',borderRadius:0}}>
            <table>
              <thead>
                <tr><th>Patient</th><th>Service</th><th>Time Slot</th><th>Type</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {appts.length === 0 ? (
                  <tr><td colSpan="6" style={{textAlign:'center',color:'var(--muted)',padding:32}}>No appointments today</td></tr>
                ) : appts.map(a => (
                  <tr key={a._id}>
                    <td>
                      <div style={{fontWeight:600,fontSize:13}}>{a.patientName}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{a.patientPhone}</div>
                    </td>
                    <td style={{fontSize:13}}>{a.serviceName}</td>
                    <td style={{fontSize:13}}>{a.timeSlot}</td>
                    <td><span className="badge badge-gray">{a.patientType||'regular'}</span></td>
                    <td><span className={'badge ' + (STATUS_COLOR[a.status]||'badge-gray')}>{a.status}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        {a.status==='pending'   && <button className="btn btn-primary btn-sm" onClick={()=>handleApptStatus(a._id,'confirmed')}>Confirm</button>}
                        {a.status==='confirmed' && <button className="btn btn-sm" style={{background:'#16A34A',color:'#fff'}} onClick={()=>handleApptStatus(a._id,'arrived')}>Arrived</button>}
                        {['pending','confirmed'].includes(a.status) && <button className="btn btn-outline btn-sm" style={{color:'var(--error)'}} onClick={()=>handleApptStatus(a._id,'cancelled')}>Cancel</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
