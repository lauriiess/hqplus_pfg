import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login, user, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Redirect if already logged in — inside useEffect to avoid render-time navigation
  useEffect(() => {
    if (!loading && user) {
      navigate(user.role === 'super_admin' ? '/super/dashboard' : '/facility/dashboard', { replace: true })
    }
  }, [user, loading, navigate])

  // While auth is being restored from localStorage, show nothing
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
      // err is always an Error object now (AuthContext wraps it)
      setError(err?.message || 'Login failed. Please check your credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left panel — branding */}
      <div style={{ flex: '0 0 45%', background: 'linear-gradient(135deg, #1565C0, #0D47A1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, color: '#fff' }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🏥</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>HealthQueue+</h1>
        <p style={{ fontSize: 18, opacity: .75, marginBottom: 48 }}>Admin Management Portal</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: 320 }}>
          {[
            ['🏥', 'Clinic Management',   'Create and manage private clinic profiles with services'],
            ['🎫', 'Queue Control',        'Real-time queue monitoring and management'],
            ['📅', 'Appointments',         'Full appointment scheduling and status tracking'],
            ['📊', 'Reports & Analytics',  'Weekly trends, peak hours, and service breakdowns'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
                <div style={{ fontSize: 12, opacity: .65, marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, background: 'var(--bg)' }}>
        <div className="card" style={{ width: '100%', maxWidth: 400, padding: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Sign In</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 28 }}>Access the HealthQueue+ admin portal.</p>

          {error && (
            <div style={{ background: 'var(--error-lt)', border: '1px solid rgba(198,40,40,.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: 'var(--error)', fontSize: 13 }}>
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
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 16, cursor: 'pointer' }}
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={submitting}
              style={{ marginTop: 8, padding: '12px', fontSize: 15 }}
            >
              {submitting ? 'Signing in…' : 'Sign In'}
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
