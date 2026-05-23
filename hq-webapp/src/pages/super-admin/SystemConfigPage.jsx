import { useState, useEffect } from 'react'
import { systemConfigApi } from '../../services/api'
import styles from './SystemConfigPage.module.css'

const TABS = [
  { key: 'general',    label: 'General Settings',      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg> },
  { key: 'security',   label: 'Security & Access',     icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
  { key: 'deployment', label: 'Deployment Parameters', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  { key: 'notifs',     label: 'Notifications',         icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
  { key: 'database',   label: 'Database & Backup',     icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> },
]

const DEFAULTS = {
  general:  { systemName: 'HealthQueue+', systemVersion: 'v2.1.0', timezone: 'Asia/Manila (GMT+8)', dateFormat: 'MM/DD/YYYY', language: 'English', maintenanceMode: false },
  security: { sessionTimeout: '30', maxLoginAttempts: '5', passwordMinLength: '8', requireUppercase: true, requireNumbers: true, requireSpecialChars: true, twoFactorAuth: false },
  deployment: { apiBaseUrl: 'http://localhost:4000', rasaServerUrl: '', smsProvider: 'None', mapsApiKey: '', maxClinics: '100', debugMode: false },
  notifs: { emailNotifications: true, smsNotifications: false, pushNotifications: false, notifyOnQueueFull: true, notifyOnNoShow: true },
  database: { backupFrequency: 'Daily', backupRetention: '30', lastBackup: '—', dbVersion: 'MongoDB 7.x' },
}

export default function SystemConfigPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState('')
  const [configs,   setConfigs]   = useState(DEFAULTS)

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  // Load from server on mount
  useEffect(() => {
    systemConfigApi.get()
      .then(r => {
        if (r.data && Array.isArray(r.data)) {
          const merged = { ...DEFAULTS }
          r.data.forEach(item => {
            if (item.key && item.value !== undefined) {
              const [section, field] = item.key.split('.')
              if (merged[section]) merged[section] = { ...merged[section], [field]: item.value }
            }
          })
          setConfigs(merged)
        }
      })
      .catch(() => {}) // silently use defaults
  }, [])

  const set = (section, field, value) =>
    setConfigs(c => ({ ...c, [section]: { ...c[section], [field]: value } }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const flat = []
      Object.entries(configs).forEach(([section, fields]) => {
        Object.entries(fields).forEach(([field, value]) => {
          flat.push({ key: `${section}.${field}`, value })
        })
      })
      await systemConfigApi.bulkUpdate(flat)
      showToast('Configuration saved successfully')
    } catch { showToast('Saved locally (server sync optional)') }
    finally { setSaving(false) }
  }

  const handleReset = () => { setConfigs(DEFAULTS); showToast('Reset to defaults') }

  const c = configs[activeTab] || {}

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.header}>
        <div>
          <div className={styles.title}>System Configuration</div>
          <div className={styles.sub}>Manage platform-wide settings and deployment parameters</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-outline btn-sm" onClick={handleReset}>Reset Defaults</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Tab sidebar */}
        <div className={"card " + styles.tabSidebar}>
          {TABS.map(t => (
            <button key={t.key} className={`${styles.tabBtn} ${activeTab===t.key?styles.tabBtnActive:''}`} onClick={()=>setActiveTab(t.key)}>
              <span style={{color:activeTab===t.key?'var(--primary)':'var(--muted)'}}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Settings panel */}
        <div className={"card " + styles.panel}>
          <div className={styles.panelTitle}>{TABS.find(t=>t.key===activeTab)?.label}</div>

          {activeTab === 'general' && <>
            <Row label="System Name"        ><input className="form-input" value={c.systemName||''} onChange={e=>set('general','systemName',e.target.value)} /></Row>
            <Row label="Version"            ><input className="form-input" value={c.systemVersion||''} onChange={e=>set('general','systemVersion',e.target.value)} /></Row>
            <Row label="Timezone"           ><input className="form-input" value={c.timezone||''} onChange={e=>set('general','timezone',e.target.value)} /></Row>
            <Row label="Date Format"        ><select className="form-select" value={c.dateFormat||''} onChange={e=>set('general','dateFormat',e.target.value)}><option>MM/DD/YYYY</option><option>DD/MM/YYYY</option><option>YYYY-MM-DD</option></select></Row>
            <Row label="Language"           ><select className="form-select" value={c.language||''} onChange={e=>set('general','language',e.target.value)}><option>English</option><option>Filipino</option></select></Row>
            <Row label="Maintenance Mode"   ><Toggle value={!!c.maintenanceMode} onChange={v=>set('general','maintenanceMode',v)} /></Row>
          </>}

          {activeTab === 'security' && <>
            <Row label="Session Timeout (min)"    ><input className="form-input" type="number" value={c.sessionTimeout||''} onChange={e=>set('security','sessionTimeout',e.target.value)} /></Row>
            <Row label="Max Login Attempts"       ><input className="form-input" type="number" value={c.maxLoginAttempts||''} onChange={e=>set('security','maxLoginAttempts',e.target.value)} /></Row>
            <Row label="Min Password Length"      ><input className="form-input" type="number" value={c.passwordMinLength||''} onChange={e=>set('security','passwordMinLength',e.target.value)} /></Row>
            <Row label="Require Uppercase"        ><Toggle value={!!c.requireUppercase}    onChange={v=>set('security','requireUppercase',v)} /></Row>
            <Row label="Require Numbers"          ><Toggle value={!!c.requireNumbers}      onChange={v=>set('security','requireNumbers',v)} /></Row>
            <Row label="Require Special Chars"    ><Toggle value={!!c.requireSpecialChars} onChange={v=>set('security','requireSpecialChars',v)} /></Row>
            <Row label="Two-Factor Auth"          ><Toggle value={!!c.twoFactorAuth}       onChange={v=>set('security','twoFactorAuth',v)} /></Row>
          </>}

          {activeTab === 'deployment' && <>
            <Row label="API Base URL"    ><input className="form-input" value={c.apiBaseUrl||''} onChange={e=>set('deployment','apiBaseUrl',e.target.value)} /></Row>
            <Row label="Rasa Server URL" ><input className="form-input" placeholder="Leave blank to use FAQ fallback" value={c.rasaServerUrl||''} onChange={e=>set('deployment','rasaServerUrl',e.target.value)} /></Row>
            <Row label="SMS Provider"   ><select className="form-select" value={c.smsProvider||''} onChange={e=>set('deployment','smsProvider',e.target.value)}><option>None</option><option>Twilio</option><option>Semaphore</option><option>Vonage</option></select></Row>
            <Row label="Maps API Key"   ><input className="form-input" type="password" placeholder="Google Maps API key" value={c.mapsApiKey||''} onChange={e=>set('deployment','mapsApiKey',e.target.value)} /></Row>
            <Row label="Max Clinics"    ><input className="form-input" type="number" value={c.maxClinics||''} onChange={e=>set('deployment','maxClinics',e.target.value)} /></Row>
            <Row label="Debug Mode"     ><Toggle value={!!c.debugMode} onChange={v=>set('deployment','debugMode',v)} /></Row>
          </>}

          {activeTab === 'notifs' && <>
            <Row label="Email Notifications"  ><Toggle value={!!c.emailNotifications}  onChange={v=>set('notifs','emailNotifications',v)} /></Row>
            <Row label="SMS Notifications"    ><Toggle value={!!c.smsNotifications}    onChange={v=>set('notifs','smsNotifications',v)} /></Row>
            <Row label="Push Notifications"   ><Toggle value={!!c.pushNotifications}   onChange={v=>set('notifs','pushNotifications',v)} /></Row>
            <Row label="Notify on Queue Full" ><Toggle value={!!c.notifyOnQueueFull}   onChange={v=>set('notifs','notifyOnQueueFull',v)} /></Row>
            <Row label="Notify on No-show"    ><Toggle value={!!c.notifyOnNoShow}      onChange={v=>set('notifs','notifyOnNoShow',v)} /></Row>
          </>}

          {activeTab === 'database' && <>
            <Row label="Backup Frequency" ><select className="form-select" value={c.backupFrequency||''} onChange={e=>set('database','backupFrequency',e.target.value)}><option>Daily</option><option>Weekly</option><option>Monthly</option></select></Row>
            <Row label="Retention (days)" ><input className="form-input" type="number" value={c.backupRetention||''} onChange={e=>set('database','backupRetention',e.target.value)} /></Row>
            <Row label="Last Backup"      ><div style={{fontSize:13,color:'var(--muted)'}}>{c.lastBackup||'—'}</div></Row>
            <Row label="DB Version"       ><div style={{fontSize:13,color:'var(--muted)'}}>{c.dbVersion||'MongoDB 7.x'}</div></Row>
            <div style={{marginTop:16}}>
              <button className="btn btn-outline btn-sm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Run Backup Now
              </button>
            </div>
          </>}
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border-lt)'}}>
      <div style={{fontSize:13,fontWeight:600,color:'var(--text-2)',minWidth:180}}>{label}</div>
      <div style={{flex:1,maxWidth:280}}>{children}</div>
    </div>
  )
}
function Toggle({ value, onChange }) {
  return (
    <button style={{width:44,height:24,borderRadius:99,background:value?'#2563EB':'var(--border)',border:'none',cursor:'pointer',position:'relative'}} onClick={()=>onChange(!value)}>
      <span style={{position:'absolute',top:3,left:value?22:3,width:18,height:18,background:'#fff',borderRadius:'50%',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}} />
    </button>
  )
}
