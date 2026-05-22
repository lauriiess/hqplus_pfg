import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './StaffPage.module.css'

const ROLE_LABELS = {
  doctor: 'Doctor', nurse: 'Nurse', midwife: 'Midwife',
  med_tech: 'Med Tech', pharmacist: 'Pharmacist', admin: 'Admin Staff',
}

const roleBadge = (r) => {
  const map = {
    doctor:      'badge-blue',
    nurse:       'badge-green',
    midwife:     'badge-teal',
    med_tech:    'badge-purple',
    pharmacist:  'badge-orange',
    admin:       'badge-gray',
  }
  return <span className={`badge ${map[r] || 'badge-gray'}`}>{ROLE_LABELS[r] || r}</span>
}

const statusBadge = (s) => s === 'active'
  ? <span className="badge badge-green">Active</span>
  : <span className="badge badge-gray">Inactive</span>

export default function StaffPage() {
  const { user } = useAuth()
  const [staff, setStaff]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [roleFilter, setRole] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', role: 'doctor', specialization: '', status: 'active' })
  const [saving, setSaving] = useState(false)

  const clinicId = user?.clinicId

  const load = () => {
    if (!clinicId) { setLoading(false); return }
    api.get(`/api/staff?clinicId=${clinicId}`)
      .then(r => setStaff(r.data || []))
      .catch(() => setStaff([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [clinicId])

  const openAdd = () => {
    setEditing(null)
    setForm({ fullName: '', email: '', phone: '', role: 'doctor', specialization: '', status: 'active' })
    setShowModal(true)
  }
  const openEdit = (s) => {
    setEditing(s)
    setForm({ fullName: s.fullName, email: s.email, phone: s.phone, role: s.role, specialization: s.specialization, status: s.status })
    setShowModal(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (editing) await api.put(`/api/staff/${editing._id}`, form)
      else         await api.post('/api/staff', { ...form, clinicId })
      setShowModal(false)
      load()
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to save.')
    } finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Remove this staff member?')) return
    await api.delete(`/api/staff/${id}`).catch(() => {})
    load()
  }

  const filtered = staff.filter(s => {
    const matchRole   = roleFilter === 'All' || s.role === roleFilter
    const matchSearch = !search || s.fullName?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  const roles = ['All', ...Object.keys(ROLE_LABELS)]

  return (
    <div className={styles.page}>
      <div className="card">
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Staff Management</div>
            <div className={styles.sub}>Manage facility staff and their assignments</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Staff
          </button>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className="search-bar" style={{ flex: 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search staff by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="dropdown-select" value={roleFilter} onChange={e => setRole(e.target.value)}>
            {roles.map(r => <option key={r} value={r}>{r === 'All' ? 'All Roles' : ROLE_LABELS[r]}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="table-wrap" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border)' }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Specialization</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No staff found.</td></tr>
              ) : filtered.map(s => (
                <tr key={s._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, background: 'var(--primary-lt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: 13 }}>
                        {s.fullName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.fullName}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{roleBadge(s.role)}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{s.specialization || '—'}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{s.phone || '—'}</td>
                  <td>{statusBadge(s.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-icon btn-outline" onClick={() => openEdit(s)} title="Edit">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn btn-icon" style={{ background: 'var(--error-lt)', color: 'var(--error)' }} onClick={() => remove(s._id)} title="Remove">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Count */}
        <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
          Showing {filtered.length} of {staff.length} staff members
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Staff Member' : 'Add New Staff'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Dr. Maria Santos" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Specialization</label>
                <input className="form-input" value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder="e.g. General Medicine, Pediatrics" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Staff'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
