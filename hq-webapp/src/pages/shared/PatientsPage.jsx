import { useEffect, useState } from 'react'
import { patientsApi } from '../../services/api'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'

const TYPES = ['all', 'Regular', 'Senior Citizen', 'PWD', 'Pregnant', 'Priority']

export default function PatientsPage() {
  const [patients, setPatients] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState({})
  const [saving,   setSaving]   = useState(false)

  const load = () => {
    setLoading(true)
    patientsApi.list()
      .then((r) => setPatients(r.data))
      .catch(() => toast.error('Failed to load patients'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = patients.filter((p) => {
    const matchType   = typeFilter === 'all' || p.patientType === typeFilter
    const matchSearch = !search || p.fullName?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search)
    return matchType && matchSearch
  })

  const openView   = (p) => { setSelected(p); setModal('view') }
  const openEdit   = (p) => { setSelected(p); setForm({ ...p }); setModal('edit') }
  const openDeact  = (p) => { setSelected(p); setModal('deactivate') }
  const closeModal = () => { setModal(null); setSelected(null) }

  const handleSave = async () => {
    setSaving(true)
    try {
      await patientsApi.update(selected._id, form)
      toast.success('Patient updated.')
      closeModal(); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleDeactivate = async () => {
    setSaving(true)
    try {
      await patientsApi.deactivate(selected._id)
      toast.success('Patient account deactivated.')
      closeModal(); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Patient Records</div>
          <div className="page-subtitle">View and manage registered patient profiles</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{patients.length} total patients</div>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: '12px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" style={{ flex: '1 1 200px' }} placeholder="Search by name, email, or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" style={{ width: 180 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          {TYPES.map((t) => <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>)}
        </select>
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="table-wrap card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr><th>Patient</th><th>Contact</th><th>Gender</th><th>Type</th><th>PhilHealth</th><th>Registered</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={8}><div className="empty-state">No patients found.</div></td></tr>
                : filtered.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--success-lt)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                          {p.fullName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.fullName}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{p.phone || '—'}</td>
                    <td style={{ fontSize: 13, textTransform: 'capitalize' }}>{p.gender || '—'}</td>
                    <td><span className={`badge ${p.patientType === 'Regular' ? 'badge-muted' : 'badge-warning'}`}>{p.patientType}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.philHealthNumber || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDate(p.user?.createdAt)}</td>
                    <td><span className={`badge ${p.user?.isActive !== false ? 'badge-success' : 'badge-muted'}`}>{p.user?.isActive !== false ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openView(p)}>View</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                        {p.user?.isActive !== false && <button className="btn btn-sm" style={{ background: 'var(--error-lt)', color: 'var(--error)' }} onClick={() => openDeact(p)}>Deactivate</button>}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Modal */}
      <Modal open={modal === 'view'} onClose={closeModal} title={selected?.fullName}
        footer={<><button className="btn btn-ghost" onClick={closeModal}>Close</button><button className="btn btn-outline" onClick={() => { closeModal(); setTimeout(() => openEdit(selected), 100) }}>Edit</button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
          {[
            ['Full Name',       selected?.fullName],
            ['Email',           selected?.email],
            ['Phone',           selected?.phone || '—'],
            ['Gender',          selected?.gender || '—'],
            ['Date of Birth',   fmtDate(selected?.dob)],
            ['Patient Type',    selected?.patientType],
            ['Address',         selected?.address || '—'],
            ['PhilHealth No.',  selected?.philHealthNumber || '—'],
            ['HMO Provider',    selected?.hmoProvider || '—'],
          ].map(([label, val]) => (
            <div key={label} style={{ gridColumn: label === 'Address' ? '1/-1' : 'auto' }}>
              <div style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>{label}</div>
              <div>{val}</div>
            </div>
          ))}
          {selected?.medicalNotes && (
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>Medical Notes</div>
              <div style={{ background: '#F8FAFC', padding: 10, borderRadius: 8, fontSize: 13 }}>{selected.medicalNotes}</div>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={modal === 'edit'} onClose={closeModal} title={`Edit — ${selected?.fullName}`} width={560}
        footer={<><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            ['fullName', 'Full Name', 'text'],
            ['email',    'Email',     'email'],
            ['phone',    'Phone',     'tel'],
            ['address',  'Address',   'text'],
            ['philHealthNumber', 'PhilHealth No.', 'text'],
            ['hmoProvider',     'HMO Provider',   'text'],
          ].map(([field, label, type]) => (
            <div className="form-group" key={field} style={field === 'address' ? { gridColumn: '1/-1' } : {}}>
              <label className="form-label">{label}</label>
              <input className="input" type={type} value={form[field] || ''} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} />
            </div>
          ))}
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select className="input" value={form.gender || ''} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Patient Type</label>
            <select className="input" value={form.patientType || 'Regular'} onChange={(e) => setForm((f) => ({ ...f, patientType: e.target.value }))}>
              {['Regular', 'Senior Citizen', 'PWD', 'Pregnant', 'Priority'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Medical Notes</label>
            <textarea className="input" rows={3} value={form.medicalNotes || ''} onChange={(e) => setForm((f) => ({ ...f, medicalNotes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <Modal open={modal === 'deactivate'} onClose={closeModal} title="Deactivate Patient"
        footer={<><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-error" onClick={handleDeactivate} disabled={saving}>{saving ? '...' : 'Yes, Deactivate'}</button></>}>
        <p style={{ fontSize: 14 }}>Deactivate <strong>{selected?.fullName}</strong>? They will lose app access but their records will be retained.</p>
      </Modal>
    </div>
  )
}
