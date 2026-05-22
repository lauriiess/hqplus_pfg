import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './AppLayout.module.css'

/* ── SVG Icons ── */
const Ico = {
  logo:         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  dashboard:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  clinic:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  users:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  patient:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  staff:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/></svg>,
  queue:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  oversight:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  analytics:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  appointments: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  schedule:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  services:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  reports:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  chatbot:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  config:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  logout:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  bell:         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  search:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
}

/* ── Nav configs ── */
const PAGE_TITLES = {
  '/super/dashboard':    { title: 'Dashboard & Statistics',   sub: 'System-wide overview' },
  '/super/clinics':      { title: 'Clinic Management',        sub: 'Manage all registered clinics' },
  '/super/users':        { title: 'User Management',          sub: 'Manage admin and staff accounts' },
  '/super/patients':     { title: 'Patient Records',          sub: 'All registered patients' },
  '/super/queue':        { title: 'Queue Oversight',          sub: 'Monitor queues across all clinics' },
  '/super/reports':      { title: 'System Reports',           sub: 'Platform-wide analytics' },
  '/super/chatbot':      { title: 'Chatbot Administration',   sub: 'Manage automated responses and FAQ' },
  '/super/config':       { title: 'System Configuration',     sub: 'Platform-wide settings' },
  '/facility/dashboard': { title: 'Dashboard & Statistics',   sub: '' },
  '/facility/queue':     { title: 'Queue & Waiting Metrics',  sub: '' },
  '/facility/appointments': { title: 'Appointments',          sub: '' },
  '/facility/schedule':  { title: 'Schedule Management',      sub: '' },
  '/facility/staff':     { title: 'Staff Management',         sub: '' },
  '/facility/patients':  { title: 'Patient Records Management', sub: '' },
  '/facility/services':  { title: 'Services',                 sub: '' },
  '/facility/reports':   { title: 'Reports & Analytics',      sub: '' },
  '/facility/chatbot':   { title: 'Chatbot Administration',   sub: 'Manage automated responses and settings' },
}

const SUPER_NAV = [
  { label: 'Dashboard & Statistics', to: '/super/dashboard', icon: Ico.dashboard },
  { label: 'Clinic Management',      to: '/super/clinics',   icon: Ico.clinic },
  { label: 'User Management',        to: '/super/users',     icon: Ico.users },
  { label: 'Patient Records',        to: '/super/patients',  icon: Ico.patient },
  { label: 'Queue Oversight',        to: '/super/queue',     icon: Ico.oversight },
  { label: 'Prescriptive Analytics', to: '/super/reports',   icon: Ico.analytics },
  { label: 'Chatbot Administration', to: '/super/chatbot',   icon: Ico.chatbot },
  { label: 'System Config',          to: '/super/config',    icon: Ico.config },
]

const FACILITY_NAV = [
  { label: 'Dashboard & Statistics', to: '/facility/dashboard',    icon: Ico.dashboard },
  { label: 'Health Center Management', to: '/facility/services',   icon: Ico.clinic },
  { label: 'Patient Records',        to: '/facility/patients',     icon: Ico.patient },
  { label: 'Staff Management',       to: '/facility/staff',        icon: Ico.staff },
  { label: 'Queue & Waiting Metrics',to: '/facility/queue',        icon: Ico.queue },
  { label: 'Queue Oversight',        to: '/facility/appointments', icon: Ico.oversight },
  { label: 'Prescriptive Analytics', to: '/facility/reports',      icon: Ico.analytics },
  { label: 'Chatbot Administration', to: '/facility/chatbot',      icon: Ico.chatbot },
]

export default function AppLayout({ role }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const nav = role === 'super_admin' ? SUPER_NAV : FACILITY_NAV
  const pageInfo = PAGE_TITLES[location.pathname] || { title: 'HealthQueue+', sub: '' }

  const clinicName = user?.clinicId?.name || 'HealthQueue+ Platform'
  const subtitle = pageInfo.sub || clinicName

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>{Ico.logo}</div>
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
              className={({ isActive }) => `${styles.navItem}${isActive ? ' ' + styles.active : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.fullName?.[0]?.toUpperCase() ?? 'A'}</div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{user?.fullName}</div>
              <div className={styles.userEmail}>{user?.email}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            {Ico.logout}
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className={styles.main}>
        {/* Top bar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <div className={styles.topbarTitle}>{pageInfo.title}</div>
            <div className={styles.topbarSub}>{subtitle}</div>
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.topSearch}>
              {Ico.search}
              <input placeholder="Search..." />
            </div>
            <button className={styles.bellBtn}>
              {Ico.bell}
              <span className={styles.bellDot} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
