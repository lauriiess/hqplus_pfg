import { useEffect, useState } from 'react'
import { chatbotAdminApi } from '../../services/api'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'

const CATEGORIES = ['General', 'Queue', 'Appointments', 'Clinic', 'Account', 'Technical']
const EMPTY_FAQ = { question: '', answer: '', category: 'General', isActive: true }

export default function ChatbotAdminPage() {
  const [tab,      setTab]      = useState('faqs')
  const [faqs,     setFaqs]     = useState([])
  const [logs,     setLogs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState(EMPTY_FAQ)
  const [saving,   setSaving]   = useState(false)
  const [catFilter, setCatFilter] = useState('all')

  useEffect(() => {
    if (tab === 'faqs') {
      setLoading(true)
      chatbotAdminApi.getFAQs()
        .then((r) => setFaqs(r.data))
        .catch(() => toast.error('Failed to load FAQs'))
        .finally(() => setLoading(false))
    } else {
      setLoading(true)
      chatbotAdminApi.getLogs()
        .then((r) => setLogs(r.data))
        .catch(() => toast.error('Failed to load logs'))
        .finally(() => setLoading(false))
    }
  }, [tab])

  const openCreate = () => { setForm(EMPTY_FAQ); setModal('create') }
  const openEdit   = (f) => { setSelected(f); setForm({ question: f.question, answer: f.answer, category: f.category, isActive: f.isActive }); setModal('edit') }
  const openDelete = (f) => { setSelected(f); setModal('delete') }
  const closeModal = () => { setModal(null); setSelected(null) }

  const handleSave = async () => {
    if (!form.question || !form.answer) { toast.error('Question and answer are required.'); return }
    setSaving(true)
    try {
      if (modal === 'create') { await chatbotAdminApi.createFAQ(form); toast.success('FAQ created.') }
      else { await chatbotAdminApi.updateFAQ(selected._id, form); toast.success('FAQ updated.') }
      closeModal()
      chatbotAdminApi.getFAQs().then((r) => setFaqs(r.data))
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await chatbotAdminApi.deleteFAQ(selected._id)
      toast.success('FAQ deleted.')
      closeModal()
      setFaqs((prev) => prev.filter((f) => f._id !== selected._id))
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const filteredFaqs = catFilter === 'all' ? faqs : faqs.filter((f) => f.category === catFilter)
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Chatbot Administration</div>
          <div className="page-subtitle">Manage FAQs, service info, and inquiry logs</div>
        </div>
        {tab === 'faqs' && <button className="btn btn-primary" onClick={openCreate}>+ Add FAQ</button>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
        {[['faqs', 'FAQ Management'], ['logs', 'Inquiry Logs']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '10px 20px', fontWeight: 700, fontSize: 14, background: 'none', border: 'none', borderBottom: `2px solid ${tab === key ? 'var(--primary)' : 'transparent'}`, color: tab === key ? 'var(--primary)' : 'var(--muted)', marginBottom: -2, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'faqs' && (
        <>
          <div className="card" style={{ marginBottom: 16, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Filter:</span>
            {['all', ...CATEGORIES].map((cat) => (
              <button key={cat} className={`btn btn-sm ${catFilter === cat ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCatFilter(cat)}>
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>

          {loading ? <div className="spinner" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredFaqs.length === 0
                ? <div className="empty-state card">No FAQs found. Add your first FAQ.</div>
                : filteredFaqs.map((f) => (
                  <div key={f._id} className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span className="badge badge-primary" style={{ fontSize: 10 }}>{f.category}</span>
                          {!f.isActive && <span className="badge badge-muted" style={{ fontSize: 10 }}>Hidden</span>}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Q: {f.question}</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>A: {f.answer}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(f)}>Edit</button>
                        <button className="btn btn-sm" style={{ background: 'var(--error-lt)', color: 'var(--error)' }} onClick={() => openDelete(f)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {tab === 'logs' && (
        <>
          {loading ? <div className="spinner" /> : (
            <div className="table-wrap card" style={{ padding: 0 }}>
              <table>
                <thead>
                  <tr><th>Time</th><th>Patient</th><th>Message</th><th>Reply</th><th>Source</th></tr>
                </thead>
                <tbody>
                  {logs.length === 0
                    ? <tr><td colSpan={5}><div className="empty-state">No chat logs yet.</div></td></tr>
                    : logs.map((l) => (
                      <tr key={l._id}>
                        <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(l.createdAt)}</td>
                        <td style={{ fontSize: 13 }}>{l.patient?.fullName || l.senderId || 'Anonymous'}</td>
                        <td style={{ fontSize: 13, maxWidth: 200 }}>{l.message}</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 240 }}>{l.reply}</td>
                        <td><span className={`badge ${l.isFallback ? 'badge-muted' : 'badge-success'}`}>{l.isFallback ? 'Rule-based' : 'FAQ / Rasa'}</span></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modal === 'create' || modal === 'edit'} onClose={closeModal}
        title={modal === 'create' ? 'Add FAQ' : 'Edit FAQ'}
        footer={<><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Question *</label>
            <input className="input" value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} placeholder="e.g. How do I join a queue?" />
          </div>
          <div className="form-group">
            <label className="form-label">Answer *</label>
            <textarea className="input" rows={4} value={form.answer} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} placeholder="Provide a clear, helpful answer..." />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            Active (visible to chatbot)
          </label>
        </div>
      </Modal>

      <Modal open={modal === 'delete'} onClose={closeModal} title="Delete FAQ"
        footer={<><button className="btn btn-ghost" onClick={closeModal}>Cancel</button><button className="btn btn-error" onClick={handleDelete} disabled={saving}>{saving ? '...' : 'Yes, Delete'}</button></>}>
        <p style={{ fontSize: 14 }}>Delete this FAQ? The chatbot will no longer use it.</p>
      </Modal>
    </div>
  )
}
