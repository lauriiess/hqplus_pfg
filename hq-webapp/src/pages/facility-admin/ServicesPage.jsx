// Health Center Management page — matches prototype design
import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './ServicesPage.module.css'

const FACILITY_DEMO = {
  name: 'Quezon City Health Center',
  facilityType: 'City Health Center',
  address: '123 Commonwealth Avenue, Quezon City, Metro Manila',
  barangay: 'Barangay Commonwealth',
  cityMunicipality: 'Quezon City',
  province: 'Metro Manila',
  region: 'National Capital Region (NCR)',
  contactNumber: '+63 2 8123 4567',
  email: 'qc.healthcenter@quezon.gov.ph',
  operatingHours: '7:00 AM – 5:00 PM',
  operatingDays: 'Monday – Saturday',
  yearEstablished: '1998',
  dohLicenseNumber: 'DOH-NCR-2024-001',
}

const STAFF_OVERVIEW = [
  { role: 'Doctors',     count: 4 },
  { role: 'Nurses',      count: 12 },
  { role: 'Midwives',    count: 6 },
  { role: 'Med Techs',   count: 3 },
  { role: 'Pharmacists', count: 2 },
  { role: 'Admin Staff', count: 8 },
]

const FACILITY_CAPACITY = [
  { label: 'Consultation Rooms', value: '6 rooms',   icon: 'room' },
  { label: 'Examination Beds',   value: '12 beds',   icon: 'bed' },
  { label: 'Waiting Area Capacity', value: '50 persons', icon: 'wait' },
  { label: 'Pharmacy',           value: '1 unit',    icon: 'pharm' },
]

const SERVICES = {
  'Primary Care': ['General Consultation', 'Pre-natal Care', 'Post-natal Care', 'Child Immunization'],
  'Specialized Services': ['Family Planning', 'TB-DOTS Program', 'Dental Services', 'Laboratory Services'],
  'Health Programs': ['Nutrition Program', 'Senior Citizen Care', 'Adolescent Health', 'Mental Health Counseling'],
}

const CapIcon = ({ type }) => {
  const icons = {
    room:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
    bed:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/></svg>,
    wait:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    pharm: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  }
  return icons[type] || null
}

export default function ServicesPage() {
  const { user } = useAuth()
  const [clinic, setClinic] = useState(null)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    if (user?.clinicId) {
      api.get(`/api/clinics/${user.clinicId}`)
        .then(r => setClinic(r.data))
        .catch(() => setClinic(null))
    }
  }, [user])

  const f = clinic || FACILITY_DEMO
  const totalStaff = STAFF_OVERVIEW.reduce((s, r) => s + r.count, 0)

  return (
    <div className={styles.page}>
      {/* ── Profile header ── */}
      <div className={`card ${styles.profileHeader}`}>
        <div>
          <div className={styles.profileTitle}>Health Center Profile</div>
          <div className={styles.profileSub}>Manage your health center information and service details</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowEdit(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit Profile
        </button>
      </div>

      {/* ── Main info + sidebar ── */}
      <div className={styles.mainGrid}>
        {/* Basic Info */}
        <div className={`card ${styles.infoCard}`}>
          <div className={styles.sectionTitle}>Basic Information</div>
          <div className={styles.infoGrid}>
            <InfoField label="Health Center Name"  value={f.name || f.facilityName} />
            <InfoField label="Facility Type"        value={f.facilityType} />
            <InfoField label="Complete Address"     value={f.address} full />
            <InfoField label="Barangay"             value={f.barangay} />
            <InfoField label="City/Municipality"    value={f.cityMunicipality} />
            <InfoField label="Province"             value={f.province} />
            <InfoField label="Region"               value={f.region} />
            <InfoField label="Contact Number"       value={f.contactNumber || f.phone} />
            <InfoField label="Email Address"        value={f.email} />
            <InfoField label="Operating Hours"      value={f.operatingHours} />
            <InfoField label="Operating Days"       value={f.operatingDays} />
            <InfoField label="Year Established"     value={f.yearEstablished} />
            <InfoField label="DOH License Number"   value={f.dohLicenseNumber} />
          </div>
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          {/* Staff Overview */}
          <div className={`card ${styles.sideCard}`}>
            <div className={styles.sectionTitle}>Staff Overview</div>
            <div className={styles.staffList}>
              {STAFF_OVERVIEW.map(r => (
                <div key={r.role} className={styles.staffRow}>
                  <span className={styles.staffRole}>{r.role}</span>
                  <span className={styles.staffCount}>{r.count}</span>
                </div>
              ))}
              <div className={`${styles.staffRow} ${styles.staffTotal}`}>
                <span>Total Staff</span>
                <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{totalStaff}</span>
              </div>
            </div>
          </div>

          {/* Facility Capacity */}
          <div className={`card ${styles.sideCard}`}>
            <div className={styles.sectionTitle}>Facility Capacity</div>
            <div className={styles.capList}>
              {FACILITY_CAPACITY.map(c => (
                <div key={c.label} className={styles.capItem}>
                  <div className={styles.capIcon}><CapIcon type={c.icon} /></div>
                  <div>
                    <div className={styles.capLabel}>{c.label}</div>
                    <div className={styles.capValue}>{c.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Services Offered ── */}
      <div className={`card ${styles.servicesCard}`}>
        <div className={styles.sectionTitle}>Services Offered</div>
        <div className={styles.servicesGrid}>
          {Object.entries(SERVICES).map(([group, items]) => (
            <div key={group}>
              <div className={styles.serviceGroup}>
                <span className={styles.groupDot} />
                {group}
              </div>
              <ul className={styles.serviceList}>
                {items.map(s => (
                  <li key={s}>
                    <span className={styles.serviceBullet} />
                    <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InfoField({ label, value, full }) {
  return (
    <div className={`${styles.infoField} ${full ? styles.infoFull : ''}`}>
      <div className={styles.infoLabel}>{label}</div>
      <div className={styles.infoValue}>{value || '—'}</div>
    </div>
  )
}
