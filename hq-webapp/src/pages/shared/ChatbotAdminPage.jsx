import { useState, useEffect } from 'react'
import api from '../../services/api'
import styles from './ChatbotAdminPage.module.css'

const TABS = ['Responses', 'Settings', 'Analytics']

const CATEGORY_COLORS = {
  'Queue': 'badge-blue',
  'Appointments': 'badge-green',
  'General Info': 'badge-teal',
  'Account': 'badge-purple',
  'Clinic': 'badge-orange',
}

export default function ChatbotAdminPage() {
  const [tab, setTab]       = useState('Responses')
  const [faqs, setFaqs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm] = useState({ question: '', answer: '', category: 'General Info', isActive: true })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const r = await api.get('/api/chatbot/admin/faqs')
      setFaqs(r.data || [])
    } catch { setFaqs([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ question: '', answer: '', category: 'General Info', isActive: true })
    setShowModal(true)
  }
  const openEdit = (faq) => {
    setEditing(faq)
    setForm({ question: faq.question, answer: faq.answer, category: faq.category, isActive: faq.isActive })
    setShowModal(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/api/chatbot/admin/faqs/${editing._id}`, form)
      } else {
        await api.post('/api/chatbot/admin/faqs', form)
      }
      setShowModal(false)
      load()
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to save.')
    } finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Delete this response?')) return
    try {
      await api.delete(`/api/chatbot/admin/faqs/${id}`)
      load()
    } catch { alert('Failed to delete.') }
  }

  const toggle = async (faq) => {
    try {
      await api.put(`/api/chatbot/admin/faqs/${faq._id}`, { ...faq, isActive: !faq.isActive })
      load()
    } catch { alert('Failed to update.') }
  }

  const filtered = faqs.filter(f =>
    !search ||
    f.question?.toLowerCase().includes(search.toLowerCase()) ||
    f.answer?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={`card ${styles.pageHeader}`}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div>
            <div className={styles.headerTitle}>Chatbot Administration</div>
            <div className={styles.headerSub}>Manage automated responses and chatbot settings</div>
          </div>
        </div>
        <div className={styles.statusBadge}>
          <span className={styles.statusDot} />
          Active
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Responses' && (
        <div className={styles.responsesPane}>
          <div className={styles.toolbar}>
            <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="Search responses..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Response
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-title">No responses found</div>
              <div className="empty-desc">Add your first chatbot response above.</div>
            </div>
          ) : filtered.map(faq => (
            <div key={faq._id} className={`card ${styles.faqCard}`}>
              <div className={styles.faqHeader}>
                <div className={styles.faqMeta}>
                  <span className={styles.faqTitle}>{faq.question}</span>
                  <span className={`badge ${CATEGORY_COLORS[faq.category] || 'badge-gray'}`}>{faq.category}</span>
                  <span className={`badge ${faq.isActive ? 'badge-green' : 'badge-gray'}`}>
                    {faq.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>
              <div className={styles.faqKeywords}>
                Keywords: {faq.keywords?.join(', ') || '—'}
              </div>
              <div className={styles.faqAnswer}>{faq.answer}</div>
              {faq.usageCount != null && (
                <div className={styles.faqUsage}>Used {faq.usageCount} times</div>
              )}
              <div className={styles.faqActions}>
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(faq)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => toggle(faq)}>
                  {faq.isActive ? (
                    <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> Disable</>
                  ) : (
                    <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Enable</>
                  )}
                </button>
                <button className="btn btn-sm" style={{ background: 'var(--error-lt)', color: 'var(--error)' }} onClick={() => remove(faq._id)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Settings' && (
        <div className="card card-p">
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Chatbot settings panel — configure Rasa integration and fallback behavior.</div>
        </div>
      )}

      {tab === 'Analytics' && (
        <div className="card card-p">
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Chatbot analytics — response usage metrics and conversation stats.</div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Response' : 'Add New Response'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Question / Intent</label>
                <input className="form-input" value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="e.g. How do I join a queue?" />
              </div>
              <div className="form-group">
                <label className="form-label">Answer</label>
                <textarea className="form-textarea" rows={4} value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="Type the chatbot's response…" />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {['Queue', 'Appointments', 'General Info', 'Account', 'Clinic'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <label className={styles.checkRow}>
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                <span>Active (visible to patients)</span>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Response'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
