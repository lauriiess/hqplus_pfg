import { useState, useEffect } from 'react'
import api, { clinicsApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './facility-admin.module.css'

export default function ServicesPage() {
  const { user }  = useAuth()
  const [clinic,   setClinic]  = useState(null)
  const [loading,  setLoading] = useState(true)
  const [toast,    setToast]   = useState('')
  const [editing,  setEditing] = useState(false)
  const [form,     setForm]    = useState({})

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    const id = user?.clinicId
    if (!id) { setLoading(false); return }
    clinicsApi.get(id)
      .then(r => { setClinic(r.data); setForm(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.clinicId])

  const handleSave = async () => {
    try {
      const r = await clinicsApi.update(clinic._id, form)
      setClinic(r.data)
      setEditing(false)
      showToast('Clinic info updated successfully')
    } catch { showToast('Failed to update clinic info') }
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>Loading clinic info…</div>
  if (!clinic) return <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>No clinic assigned to your account.</div>

  const services = clinic.services || []

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.title}>{clinic.name}</div>
          <div className={styles.sub}>{clinic.facilityType || 'Health Center'} • {clinic.city}, {clinic.province}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {editing
            ? <>
                <button className="btn btn-outline btn-sm" onClick={()=>setEditing(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleSave}>Save Changes</button>
              </>
            : <button className="btn btn-outline btn-sm" onClick={()=>setEditing(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit Info
              </button>
          }
        </div>
      </div>

      <div className={styles.grid}>
        {/* Left — facility info */}
        <div className={styles.leftCol}>
          <div className={"card " + styles.section}>
            <div className={styles.sectionTitle}>Facility Information</div>
            <div className={styles.fields}>
              <InfoRow label="Address"          value={clinic.address} editing={editing} field="address" form={form} setForm={setForm} />
              <InfoRow label="Contact Number"   value={clinic.contactNumber} editing={editing} field="contactNumber" form={form} setForm={setForm} />
              <InfoRow label="Email"            value={clinic.email} editing={editing} field="email" form={form} setForm={setForm} />
              <InfoRow label="Operating Hours"  value={clinic.operatingHours} editing={editing} field="operatingHours" form={form} setForm={setForm} />
              <InfoRow label="Max Queue Cap."   value={clinic.maxQueueCapacity} editing={editing} field="maxQueueCapacity" form={form} setForm={setForm} />
            </div>
          </div>

          <div className={"card " + styles.section}>
            <div className={styles.sectionTitle}>Queue Settings</div>
            <div className={styles.toggleRow}>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>Accepts Walk-in</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>Allow patients to join without appointment</div>
              </div>
              <Toggle
                value={editing ? form.acceptsWalkIn : clinic.acceptsWalkIn}
                onChange={v => setForm(f => ({...f, acceptsWalkIn: v}))}
                disabled={!editing}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>Accepts Appointments</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>Allow patients to book appointment slots</div>
              </div>
              <Toggle
                value={editing ? form.acceptsAppointment : clinic.acceptsAppointment}
                onChange={v => setForm(f => ({...f, acceptsAppointment: v}))}
                disabled={!editing}
              />
            </div>
          </div>
        </div>

        {/* Right — services */}
        <div className={styles.rightCol}>
          <div className={"card " + styles.section}>
            <div className={styles.sectionTitle}>Services Offered</div>
            {services.length === 0
              ? <div style={{color:'var(--muted)',fontSize:13,padding:'16px 0'}}>No services listed yet.</div>
              : <div className={styles.servicesList}>
                  {services.map((s, i) => (
                    <div key={i} className={styles.serviceItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      <span>{s.name || s}</span>
                      <span className="badge badge-green" style={{marginLeft:'auto'}}>Active</span>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, editing, field, form, setForm }) {
  return (
    <div className={styles.infoRow}>
      <div className={styles.infoLabel}>{label}</div>
      {editing
        ? <input className="form-input" value={form[field] ?? ''} onChange={e => setForm(f => ({...f, [field]: e.target.value}))} />
        : <div className={styles.infoValue}>{value ?? '—'}</div>
      }
    </div>
  )
}

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      style={{ width:44, height:24, borderRadius:99, background:value?'#2563EB':'var(--border)', border:'none', cursor:disabled?'default':'pointer', position:'relative', flexShrink:0, transition:'background .2s' }}
      onClick={() => !disabled && onChange(!value)}
    >
      <span style={{ position:'absolute', top:3, left:value?22:3, width:18, height:18, background:'#fff', borderRadius:'50%', transition:'left .2s', display:'block', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }} />
    </button>
  )
}
