import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const IcoLogo = (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
)

const IcoEye     = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IcoEyeOff  = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>

const FEATURES = [
  ['Clinic Management',    'Create and manage private clinic profiles with services'],
  ['Queue Control',        'Real-time queue monitoring and management'],
  ['Appointments',         'Full appointment scheduling and status tracking'],
  ['Reports & Analytics',  'Weekly trends, peak hours, and service breakdowns'],
]

export default function LoginPage() {
  const { login, user, loading } = useAuth()
  const navigate = useNavigate()
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    if (!loading && user) {
      navigate(user.role === 'super_admin' ? '/super/dashboard' : '/facility/dashboard', { replace: true })
    }
  }, [user, loading, navigate])

  if (loading) return <div className="spinner" />

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    setSubmitting(true)
    setError('')
    try {
      const u = await login(email.trim(), password)
      toast.success(`Welcome back, ${u.fullName.split(' ')[0]}!`)
      navigate(u.role === 'super_admin' ? '/super/dashboard' : '/facility/dashboard', { replace: true })
    } catch (err) {
      setError(err?.message || 'Login failed. Please check your credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left panel */}
      <div style={{ flex: '0 0 45%', background: 'linear-gradient(135deg, #1565C0, #0D47A1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, color: '#fff' }}>
        <div style={{ color: '#fff', marginBottom: 20, opacity: .9 }}>{IcoLogo}</div>
        <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 6 }}>HealthQueue+</h1>
        <p style={{ fontSize: 16, opacity: .7, marginBottom: 48 }}>Admin Management Portal</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, width: '100%', maxWidth: 320 }}>
          {FEATURES.map(([title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,.6)', marginTop: 6, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
                <div style={{ fontSize: 12, opacity: .6, marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, background: 'var(--bg)' }}>
        <div className="card" style={{ width: '100%', maxWidth: 400, padding: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Sign In</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 28 }}>Access the HealthQueue+ admin portal.</p>

          {error && (
            <div style={{ background: 'var(--error-lt)', border: '1px solid rgba(198,40,40,.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: 'var(--error)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="input"
                type="email"
                placeholder="admin@healthqueue.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: 44 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {showPw ? IcoEyeOff : IcoEye}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={submitting}
              style={{ marginTop: 8, padding: '12px', fontSize: 15 }}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ marginTop: 24, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            For staff queue management, use the Tablet App.
          </p>
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#F8FAFC', borderRadius: 8, fontSize: 12, color: 'var(--muted)' }}>
            <strong>Demo credentials:</strong><br />
            Super Admin: <code>superadmin@healthqueue.ph</code> / <code>Admin@123</code><br />
            Facility Admin: <code>admin.delacruz@healthqueue.ph</code> / <code>Admin@123</code>
          </div>
        </div>
      </div>
    </div>
  )
}
