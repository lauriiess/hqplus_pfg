import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './AppLayout.module.css'

const SUPER_NAV = [
  { to: '/super/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/super/clinics',   icon: '🏥', label: 'Clinics' },
  { to: '/super/users',     icon: '👥', label: 'Users' },
  { to: '/super/reports',   icon: '📊', label: 'Reports' },
]

const FACILITY_NAV = [
  { to: '/facility/dashboard',    icon: '🏠', label: 'Dashboard' },
  { to: '/facility/queue',        icon: '🎫', label: 'Queue' },
  { to: '/facility/appointments', icon: '📅', label: 'Appointments' },
  { to: '/facility/reports',      icon: '📊', label: 'Reports' },
]

export default function AppLayout({ role }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const nav = role === 'super_admin' ? SUPER_NAV : FACILITY_NAV

  const handleLogout = () => { logout(); navigate('/login'); }

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🏥</span>
          <div>
            <div className={styles.logoName}>HealthQueue+</div>
            <div className={styles.logoRole}>{role === 'super_admin' ? 'Super Admin' : 'Facility Admin'}</div>
          </div>
        </div>

        <nav className={styles.nav}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.fullName?.[0] ?? 'A'}</div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{user?.fullName}</div>
              <div className={styles.userRole}>{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
          <button className={`${styles.logoutBtn}`} onClick={handleLogout} title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
