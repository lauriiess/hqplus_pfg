import { useEffect, useState } from 'react'
import { usersApi, clinicsApi } from '../../services/api'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'

const EMPTY_USER = { fullName: '', email: '', phone: '', password: '', role: 'staff', clinicId: '', isActive: true }

export default function UsersPage() {
  const [users,    setUsers]    = useState([])
  const [clinics,  setClinics]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [modal,    setModal]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [form,     setForm]     = useState(EMPTY_USER)
  const [saving,   setSaving]   = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([usersApi.list(), clinicsApi.list()])
      .then(([ur, cr]) => { setUsers(ur.data); setClinics(cr.data) })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = users.filter((u) => {
    const matchSearch = u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole   = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const openCreate = () => { setForm(EMPTY_USER); setModal('create') }
  const openEdit   = (u) => { setSelected(u); setForm({ ...u, password: '' }); setModal('edit') }
  const openDeact  = (u) => { setSelected(u); setModal('deactivate') }
  const closeModal = () => { setModal(null); setSelected(null) }

  const handleSave = async () => {
    if (!form.fullName || !form.email) { toast.error('Full name and email are required.'); return }
    if (modal === 'create' && !form.password) { toast.error('Password is required for new users.'); return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.clinicId) delete payload.clinicId
      if (!payload.password) delete payload.password
      if (modal === 'create') { await usersApi.create(payload); toast.success('User created.') }
      else { await usersApi.update(selected._id, payload); toast.success('User updated.') }
      closeModal(); load()
    } catch (err) {
      toast.error(err?.message || 'Save failed.')
    } finally { setSaving(false) }
  }

  const handleDeactivate = async () => {
    setSaving(true)
    try {
      await usersApi.deactivate(selected._id)
      toast.success('User deactivated.')
      closeModal(); load()
    } catch (err) {
      toast.error(err?.message || 'Failed to deactivate.')
    } finally { setSaving(false) }
  }

  const roleColors = { super_admin: 'badge-error', facility_admin: 'badge-purple', staff: 'badge-primary', patient: 'badge-success' }
  const roles = ['all', 'super_admin', 'facility_admin', 'staff', 'patient']

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Users</div>
          <div className="page-subtitle">Manage all system users and their roles</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add User</button>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <input className="input" style={{ flex: 1 }} placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" style={{ width: 180 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          {roles.map((r) => <option key={r} value={r}>{r === 'all' ? 'All Roles' : r.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="table-wrap card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Clinic</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="empty-state">No users found.</td></tr>
              ) : filtered.map((u) => {
                const clinic = clinics.find((c) => c._id === u.clinicId)
                return (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-lt)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {u.fullName?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.fullName}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{u.email}</td>
                    <td style={{ fontSize: 13 }}>{u.phone || '—'}</td>
                    <td><span className={`badge ${roleColors[u.role] || 'badge-muted'}`}>{u.role?.replace(/_/g, ' ')}</span></td>
                    <td style={{ fontSize: 13 }}>{clinic?.name || '—'}</td>
                    <td><span className={`badge ${u.isActive !== false ? 'badge-success' : 'badge-muted'}`}>{u.isActive !== false ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>Edit</button>
                        {u.isActive !== false && (
                          <button className="btn btn-sm" style={{ background: 'var(--warning-lt)', color: 'var(--warning)' }} onClick={() => openDeact(u)}>Deactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'create' ? 'Add New User' : `Edit — ${selected?.fullName}`}
        footer={<>
          <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save User'}</button>
        </>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="input" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="input" type="tel" value={form.phone || ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">{modal === 'create' ? 'Password *' : 'New Password (leave blank to keep)'}</label>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="super_admin">Super Admin</option>
              <option value="facility_admin">Facility Admin</option>
              <option value="staff">Staff</option>
              <option value="patient">Patient</option>
            </select>
          </div>
          {(form.role === 'facility_admin' || form.role === 'staff') && (
            <div className="form-group">
              <label className="form-label">Assigned Clinic</label>
              <select className="input" value={form.clinicId || ''} onChange={(e) => setForm((f) => ({ ...f, clinicId: e.target.value }))}>
                <option value="">— Select clinic —</option>
                {clinics.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </Modal>

      {/* Deactivate Confirm */}
      <Modal open={modal === 'deactivate'} onClose={closeModal} title="Deactivate User"
        footer={<>
          <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
          <button className="btn btn-warning" onClick={handleDeactivate} disabled={saving}>{saving ? 'Deactivating...' : 'Yes, Deactivate'}</button>
        </>}
      >
        <p style={{ fontSize: 14 }}>Deactivate <strong>{selected?.fullName}</strong>? They will lose access but their data will be retained.</p>
      </Modal>
    </div>
  )
}
