import { useState, useEffect } from 'react'
import { queueApi, appointmentsApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './facility-admin.module.css'

const STATUS_COLOR = { 
  waiting: 'badge-warn', 
  serving: 'badge-blue', 
  completed: 'badge-green', 
  skipped: 'badge-gray', 
  no_show: 'badge-red', 
  pending: 'badge-warn', 
  confirmed: 'badge-blue', 
  arrived: 'badge-green', 
  cancelled: 'badge-red' 
}

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

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Now Serving</div>
          <div className={styles.statValue} style={{color:'var(--primary)'}}>{serving}</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Waiting</div>
          <div className={styles.statValue} style={{color:'#D97706'}}>{waiting}</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Completed Today</div>
          <div className={styles.statValue} style={{color:'#16A34A'}}>{completed}</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Avg Wait</div>
          <div className={styles.statValue} style={{color:'#7C3AED'}}>{metrics?.avgWaitMinutes ?? '—'}m</div>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className={styles.controlsRow}>
        <div className={styles.segmentedTabs}>
          <button className={`${styles.segTab} ${tab==='queue'?styles.segTabActive:''}`} onClick={()=>setTab('queue')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Live Queue
          </button>
          <button className={`${styles.segTab} ${tab==='appointments'?styles.segTabActive:''}`} onClick={()=>setTab('appointments')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Today's Appointments
          </button>
        </div>
        
        <div className={styles.toolbarRight}>
          <div className="search-bar" style={{width: 240}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search patient..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <button className="btn btn-outline" onClick={() => { loadQueue(); loadAppts() }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="card" style={{padding: 24}}>
        
        {/* --- LIVE QUEUE TAB --- */}
        {tab === 'queue' && (
          loading ? <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>Loading queue…</div> :
          <div className={styles.apptList}>
            {filteredQueue.length === 0 ? (
              <div style={{textAlign:'center',color:'var(--muted)',padding:40, background: '#f8fafc', borderRadius: 8}}>No queue entries today</div>
            ) : filteredQueue.map(q => (
              <div key={q._id} className={styles.apptCard}>
                <div className={styles.queueNumber}>{q.queueNumber}</div>
                <div className={styles.apptInfo}>
                  <div className={styles.apptName}>{q.patientName}</div>
                  <div className={styles.apptService}>{q.serviceName} • {q.patientPhone}</div>
                </div>
                
                <div className={styles.apptMetaGrid}>
                  <div className={styles.metaBlock}>
                    <span className={styles.metaLabel}>Joined</span>
                    <span className={styles.metaVal}>{new Date(q.joinedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                  <div className={styles.metaBlock}>
                    <span className={styles.metaLabel}>Wait</span>
                    <span className={styles.metaVal}>{q.estimatedWaitMinutes ?? '—'}m</span>
                  </div>
                  <div className={styles.metaBlock}>
                    <span className={`badge ${STATUS_COLOR[q.status]||'badge-gray'}`}>{q.status}</span>
                  </div>
                </div>

                <div className={styles.apptActions}>
                  {q.status==='waiting'   && <button className="btn btn-primary btn-sm" onClick={()=>handleCall(q._id)}>Call</button>}
                  {q.status==='serving'   && <button className="btn btn-sm" style={{background:'#16A34A',color:'#fff'}} onClick={()=>handleComplete(q._id)}>Done</button>}
                  {q.status==='waiting'   && <button className="btn btn-outline btn-sm" onClick={()=>handleSkip(q._id)}>Skip</button>}
                  {['waiting','serving'].includes(q.status) && <button className="btn btn-outline btn-sm" style={{color:'var(--error)'}} onClick={()=>handleNoShow(q._id)}>No-show</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- APPOINTMENTS TAB --- */}
        {tab === 'appointments' && (
          <div className={styles.apptList}>
            {appts.length === 0 ? (
              <div style={{textAlign:'center',color:'var(--muted)',padding:40, background: '#f8fafc', borderRadius: 8}}>No appointments today</div>
            ) : appts.map(a => (
              <div key={a._id} className={styles.apptCard}>
                <div className={styles.apptTime}>{a.timeSlot}</div>
                <div className={styles.apptInfo}>
                  <div className={styles.apptName}>{a.patientName}</div>
                  <div className={styles.apptService}>{a.serviceName} • {a.patientPhone}</div>
                </div>

                <div className={styles.apptMetaGrid}>
                   <div className={styles.metaBlock}>
                    <span className="badge badge-gray">{a.patientType||'regular'}</span>
                  </div>
                  <div className={styles.metaBlock}>
                    <span className={`badge ${STATUS_COLOR[a.status]||'badge-gray'}`}>{a.status}</span>
                  </div>
                </div>

                <div className={styles.apptActions}>
                  {a.status==='pending'   && <button className="btn btn-primary btn-sm" onClick={()=>handleApptStatus(a._id,'confirmed')}>Confirm</button>}
                  {a.status==='confirmed' && <button className="btn btn-sm" style={{background:'#16A34A',color:'#fff'}} onClick={()=>handleApptStatus(a._id,'arrived')}>Arrived</button>}
                  {['pending','confirmed'].includes(a.status) && <button className="btn btn-outline btn-sm" style={{color:'var(--error)'}} onClick={()=>handleApptStatus(a._id,'cancelled')}>Cancel</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}