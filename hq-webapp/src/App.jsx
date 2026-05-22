import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'

// Auth
import LoginPage from './pages/auth/LoginPage'

// Super Admin pages
import SuperDashboard     from './pages/super-admin/SuperDashboard'
import ClinicsPage        from './pages/super-admin/ClinicsPage'
import UsersPage          from './pages/super-admin/UsersPage'
import SystemReportsPage  from './pages/super-admin/SystemReportsPage'
import QueueOversightPage from './pages/super-admin/QueueOversightPage'
import SystemConfigPage   from './pages/super-admin/SystemConfigPage'

// Facility Admin pages
import FacilityDashboard  from './pages/facility-admin/FacilityDashboard'
import QueuePage          from './pages/facility-admin/QueuePage'
import AppointmentsPage   from './pages/facility-admin/AppointmentsPage'
import FacilityReportsPage from './pages/facility-admin/FacilityReportsPage'
import StaffPage          from './pages/facility-admin/StaffPage'
import ServicesPage       from './pages/facility-admin/ServicesPage'
import SchedulePage       from './pages/facility-admin/SchedulePage'

// Shared pages (available to both roles)
import PatientsPage       from './pages/shared/PatientsPage'
import ChatbotAdminPage   from './pages/shared/ChatbotAdminPage'

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="spinner" />
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

function RequireAnyAdmin({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="spinner" />
  if (!user) return <Navigate to="/login" replace />
  if (!['super_admin', 'facility_admin'].includes(user.role)) return <Navigate to="/login" replace />
  return children
}

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="spinner" />
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'super_admin')    return <Navigate to="/super/dashboard" replace />
  if (user.role === 'facility_admin') return <Navigate to="/facility/dashboard" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />

      {/* Super Admin */}
      <Route path="/super" element={<RequireAuth role="super_admin"><AppLayout role="super_admin" /></RequireAuth>}>
        <Route path="dashboard"  element={<SuperDashboard />} />
        <Route path="clinics"    element={<ClinicsPage />} />
        <Route path="users"      element={<UsersPage />} />
        <Route path="patients"   element={<PatientsPage />} />
        <Route path="queue"      element={<QueueOversightPage />} />
        <Route path="reports"    element={<SystemReportsPage />} />
        <Route path="chatbot"    element={<ChatbotAdminPage />} />
        <Route path="config"     element={<SystemConfigPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Facility Admin */}
      <Route path="/facility" element={<RequireAuth role="facility_admin"><AppLayout role="facility_admin" /></RequireAuth>}>
        <Route path="dashboard"    element={<FacilityDashboard />} />
        <Route path="queue"        element={<QueuePage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="schedule"     element={<SchedulePage />} />
        <Route path="staff"        element={<StaffPage />} />
        <Route path="patients"     element={<PatientsPage />} />
        <Route path="services"     element={<ServicesPage />} />
        <Route path="reports"      element={<FacilityReportsPage />} />
        <Route path="chatbot"      element={<ChatbotAdminPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
