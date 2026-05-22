import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './AppLayout.module.css'

const Ico = {
  dashboard:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  clinics:      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  users:        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  patients:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  staff:        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/></svg>,
  queue:        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  appointments: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  schedule:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  services:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  reports:      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  chatbot:      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  config:       <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  logout:       <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  logo:         <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
}

const SUPER_NAV = [
  { label: 'Dashboard',      to: '/super/dashboard', icon: Ico.dashboard },
  { label: 'Clinics',        to: '/super/clinics',   icon: Ico.clinics },
  { label: 'Users',          to: '/super/users',     icon: Ico.users },
  { label: 'Patients',       to: '/super/patients',  icon: Ico.patients },
  { label: 'Queue Oversight',to: '/super/queue',     icon: Ico.queue },
  { label: 'Reports',        to: '/super/reports',   icon: Ico.reports },
  { label: 'Chatbot Admin',  to: '/super/chatbot',   icon: Ico.chatbot },
  { label: 'System Config',  to: '/super/config',    icon: Ico.config },
]

const FACILITY_NAV = [
  { label: 'Dashboard',      to: '/facility/dashboard',    icon: Ico.dashboard },
  { label: 'Queue',          to: '/facility/queue',        icon: Ico.queue },
  { label: 'Appointments',   to: '/facility/appointments', icon: Ico.appointments },
  { label: 'Schedule',       to: '/facility/schedule',     icon: Ico.schedule },
  { label: 'Staff',          to: '/facility/staff',        icon: Ico.staff },
  { label: 'Patients',       to: '/facility/patients',     icon: Ico.patients },
  { label: 'Services',       to: '/facility/services',     icon: Ico.services },
  { label: 'Reports',        to: '/facility/reports',      icon: Ico.reports },
  { label: 'Chatbot Admin',  to: '/facility/chatbot',      icon: Ico.chatbot },
]

export default function AppLayout({ role }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const nav = role === 'super_admin' ? SUPER_NAV : FACILITY_NAV

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>{Ico.logo}</span>
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
            <div className={styles.avatar}>{user?.fullName?.[0]?.toUpperCase() ?? 'A'}</div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{user?.fullName}</div>
              <div className={styles.userRole}>{user?.role?.replace(/_/g, ' ')}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
            {Ico.logout}
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
