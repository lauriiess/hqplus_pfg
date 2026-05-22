import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './LoginPage.module.css'

const EyeIcon = ({ open }) => open
  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>

export default function LoginPage() {
  const [tab, setTab]       = useState('facility') // 'facility' | 'super'
  const [email, setEmail]   = useState('')
  const [password, setPass] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { login }    = useAuth()
  const navigate     = useNavigate()

  const DEMO = {
    facility: { email: 'admin.delacruz@healthqueue.ph', password: 'Admin@123', role: 'facility_admin', redirect: '/facility/dashboard' },
    super:    { email: 'superadmin@healthqueue.ph',     password: 'Admin@123', role: 'super_admin',    redirect: '/super/dashboard' },
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(email, password)
      if (result.success) {
        const role = result.user?.role
        if (role === 'super_admin')    navigate('/super/dashboard')
        else if (role === 'facility_admin') navigate('/facility/dashboard')
        else setError('Access denied. This portal is for admins only.')
      } else {
        setError(result.message || 'Invalid email or password.')
      }
    } catch {
      setError('Connection error. Please check the server.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    const d = DEMO[tab]
    setEmail(d.email)
    setPass(d.password)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoWrap}>
          <div className={styles.logoIcon}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <h1 className={styles.appName}>HealthQueue+</h1>
        </div>

        {/* Role tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'facility' ? styles.tabActive : ''}`}
            onClick={() => { setTab('facility'); setError('') }}
            type="button"
          >
            Facility Admin
          </button>
          <button
            className={`${styles.tab} ${tab === 'super' ? styles.tabActive : ''}`}
            onClick={() => { setTab('super'); setError('') }}
            type="button"
          >
            Super Admin
          </button>
        </div>

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.error}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <div className={styles.inputWrap}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.inputIcon}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input
                type="email"
                className={styles.input}
                placeholder="admin@healthqueue.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrap}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.inputIcon}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input
                type={showPw ? 'text' : 'password'}
                className={styles.input}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPass(e.target.value)}
                required
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(p => !p)}>
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>

          <div className={styles.row}>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <span>Remember me</span>
            </label>
            <button type="button" className={styles.forgot}>Forgot password?</button>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          {/* Demo access box */}
          <div className={styles.demoBox} onClick={fillDemo}>
            <div className={styles.demoTitle}>Demo Access:</div>
            <div className={styles.demoDesc}>
              Click here to auto-fill {tab === 'facility' ? 'Facility Admin' : 'Super Admin'} credentials, then click Sign In.
            </div>
          </div>
        </form>
      </div>

      <div className={styles.footer}>© 2026 HealthQueue+. All rights reserved.</div>
    </div>
  )
}
