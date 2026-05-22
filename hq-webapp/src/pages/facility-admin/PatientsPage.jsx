import { useState, useEffect } from 'react'
import api from '../../services/api'
import styles from './PatientsPage.module.css'

const typeBadge = (t) => {
  const map = {
    'Regular':        'badge-blue',
    'Senior Citizen': 'badge-orange',
    'PWD':            'badge-purple',
    'Pregnant':       'badge-teal',
    'Priority':       'badge-red',
  }
  return <span className={`badge ${map[t] || 'badge-gray'}`}>{t}</span>
}

export default function PatientsPage() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const PER_PAGE = 10

  useEffect(() => {
    api.get('/api/patients')
      .then(r => { setPatients(r.data || []); setTotal(r.data?.length || 0) })
      .catch(() => setPatients([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = patients.filter(p =>
    !search ||
    p.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search) ||
    p.patientId?.toLowerCase().includes(search.toLowerCase())
  )
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const pageCount  = Math.max(1, Math.ceil(filtered.length / PER_PAGE))

  return (
    <div className={styles.page}>
      <div className="card">
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Patient Records</div>
            <div className={styles.sub}>Manage patient information and medical records</div>
          </div>
          <div className={styles.actions}>
            <button className="btn btn-primary btn-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add New Patient
            </button>
          </div>
        </div>

        {/* Search + filter */}
        <div className={styles.toolbar}>
          <div className="search-bar" style={{ flex: 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              placeholder="Search by name, ID, or phone number..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select className="dropdown-select">
            <option>All Departments</option>
            <option>General Consultation</option>
            <option>Pediatrics</option>
            <option>Wound Care</option>
          </select>
          <button className="btn btn-outline btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
        </div>

        {/* Table */}
        <div className="table-wrap" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border)' }}>
          <table>
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Age / Gender</th>
                <th>Contact</th>
                <th>Department</th>
                <th>Last Visit</th>
                <th>Total Visits</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>Loading patients…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No patients found.</td></tr>
              ) : paginated.map((p, i) => (
                <tr key={p._id}>
                  <td>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      P-{String((page - 1) * PER_PAGE + i + 1).padStart(4, '0')}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.fullName}</td>
                  <td style={{ color: 'var(--muted)' }}>
                    {p.age ? `${p.age}y` : '—'} / <span style={{ color: p.gender === 'male' ? 'var(--primary)' : '#DB2777', fontWeight: 600 }}>{p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : '—'}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>{p.phone || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.email || ''}</div>
                  </td>
                  <td>{typeBadge(p.patientType || 'Regular')}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-CA') : '—'}
                  </td>
                  <td style={{ fontWeight: 700, textAlign: 'center' }}>{p.visitCount ?? 0}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-icon btn-outline" title="View">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button className="btn btn-icon btn-outline" title="Edit">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn btn-icon btn-outline" title="More">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <div>Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} patients</div>
          <div className="page-btns">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => i + 1).map(n => (
              <button key={n} className={`page-btn ${n === page ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button className="page-btn" disabled={page === pageCount} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
