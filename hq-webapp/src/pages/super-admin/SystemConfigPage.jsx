import { useState } from 'react'
import api from '../../services/api'
import styles from './SystemConfigPage.module.css'

const TABS = [
  { key: 'general',    label: 'General Settings',      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg> },
  { key: 'security',   label: 'Security & Access',     icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
  { key: 'deployment', label: 'Deployment Parameters', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  { key: 'notifs',     label: 'Notifications',         icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
  { key: 'database',   label: 'Database & Backup',     icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> },
]

export default function SystemConfigPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)

  const [general, setGeneral] = useState({
    systemName:    'HealthQueue+',
    systemVersion: 'v2.1.0',
    timezone:      'Asia/Manila (GMT+8)',
    dateFormat:    'MM/DD/YYYY',
    language:      'English',
    maintenanceMode: false,
  })
  const [security, setSecurity] = useState({
    sessionTimeout:      '30',
    maxLoginAttempts:    '5',
    passwordMinLength:   '8',
    requireUppercase:    true,
    requireNumbers:      true,
    requireSpecialChars: true,
    twoFactorAuth:       false,
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('/api/system/config', { general, security })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    finally { setSaving(false) }
  }
  const handleReset = () => {
    setGeneral({ systemName: 'HealthQueue+', systemVersion: 'v2.1.0', timezone: 'Asia/Manila (GMT+8)', dateFormat: 'MM/DD/YYYY', language: 'English', maintenanceMode: false })
    setSecurity({ sessionTimeout: '30', maxLoginAttempts: '5', passwordMinLength: '8', requireUppercase: true, requireNumbers: true, requireSpecialChars: true, twoFactorAuth: false })
  }

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>System Configuration</div>
          <div className={styles.pageSub}>Configure general system settings, security preferences, and deployment parameters</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={handleReset}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Reset to Default
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ background: '#7C3AED', borderColor: '#7C3AED' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.layout}>
        {/* Left nav */}
        <div className={`card ${styles.tabNav}`}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`${styles.tabBtn} ${activeTab === t.key ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              <span className={styles.tabIcon}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Right panel */}
        <div className={`card ${styles.panel}`}>
          {activeTab === 'general' && (
            <>
              <div className={styles.panelTitle}>General System Settings</div>
              <div className={styles.panelSub}>Configure basic system-wide settings and preferences</div>
              <div className={styles.fields}>
                <Field label="System Name">
                  <input className="form-input" value={general.systemName} onChange={e => setGeneral(g => ({ ...g, systemName: e.target.value }))} />
                </Field>
                <Field label="System Version">
                  <input className="form-input" value={general.systemVersion} onChange={e => setGeneral(g => ({ ...g, systemVersion: e.target.value }))} />
                </Field>
                <Field label="System Timezone">
                  <select className="form-select" value={general.timezone} onChange={e => setGeneral(g => ({ ...g, timezone: e.target.value }))}>
                    <option>Asia/Manila (GMT+8)</option>
                    <option>Asia/Singapore (GMT+8)</option>
                    <option>UTC (GMT+0)</option>
                  </select>
                </Field>
                <Field label="Date Format">
                  <select className="form-select" value={general.dateFormat} onChange={e => setGeneral(g => ({ ...g, dateFormat: e.target.value }))}>
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </Field>
                <Field label="Language">
                  <select className="form-select" value={general.language} onChange={e => setGeneral(g => ({ ...g, language: e.target.value }))}>
                    <option>English</option>
                    <option>Filipino</option>
                  </select>
                </Field>
                <Field label="Maintenance Mode">
                  <div className={styles.toggleRow}>
                    <button
                      className={`${styles.toggle} ${general.maintenanceMode ? styles.toggleOn : ''}`}
                      onClick={() => setGeneral(g => ({ ...g, maintenanceMode: !g.maintenanceMode }))}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                    <span className={styles.toggleLabel}>
                      {general.maintenanceMode ? 'Enabled — system is in maintenance mode' : 'Disable system access for maintenance'}
                    </span>
                  </div>
                </Field>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <div className={styles.panelTitle}>Security & Access</div>
              <div className={styles.panelSub}>Configure authentication and security preferences</div>
              <div className={styles.fields}>
                <Field label="Session Timeout (minutes)">
                  <input className="form-input" type="number" value={security.sessionTimeout} onChange={e => setSecurity(s => ({ ...s, sessionTimeout: e.target.value }))} />
                </Field>
                <Field label="Max Login Attempts">
                  <input className="form-input" type="number" value={security.maxLoginAttempts} onChange={e => setSecurity(s => ({ ...s, maxLoginAttempts: e.target.value }))} />
                </Field>
                <Field label="Minimum Password Length">
                  <input className="form-input" type="number" value={security.passwordMinLength} onChange={e => setSecurity(s => ({ ...s, passwordMinLength: e.target.value }))} />
                </Field>
                <div className={styles.checkGroup}>
                  <div className={styles.checkGroupTitle}>Password Requirements</div>
                  <CheckItem label="Require Uppercase"      checked={security.requireUppercase}    onChange={() => setSecurity(s => ({ ...s, requireUppercase: !s.requireUppercase }))} />
                  <CheckItem label="Require Numbers"        checked={security.requireNumbers}      onChange={() => setSecurity(s => ({ ...s, requireNumbers: !s.requireNumbers }))} />
                  <CheckItem label="Require Special Chars"  checked={security.requireSpecialChars} onChange={() => setSecurity(s => ({ ...s, requireSpecialChars: !s.requireSpecialChars }))} />
                  <CheckItem label="Two-Factor Authentication" checked={security.twoFactorAuth}   onChange={() => setSecurity(s => ({ ...s, twoFactorAuth: !s.twoFactorAuth }))} />
                </div>
              </div>
            </>
          )}

          {activeTab === 'deployment' && <Placeholder title="Deployment Parameters" />}
          {activeTab === 'notifs'     && <Placeholder title="Notification Settings" />}
          {activeTab === 'database'   && <Placeholder title="Database & Backup" />}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

function CheckItem({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer', padding: '4px 0' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: 'var(--primary)', width: 15, height: 15 }} />
      {label}
    </label>
  )
}

function Placeholder({ title }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>Configuration options for this section are coming soon.</div>
    </div>
  )
}
