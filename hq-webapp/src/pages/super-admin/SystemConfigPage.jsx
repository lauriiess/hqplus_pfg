import { useEffect, useState } from 'react'
import { systemConfigApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function SystemConfigPage() {
  const [configs,  setConfigs]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [edits,    setEdits]    = useState({})
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    systemConfigApi.get()
      .then((r) => { setConfigs(r.data); const init = {}; r.data.forEach((c) => { init[c.key] = c.value }); setEdits(init) })
      .catch(() => toast.error('Failed to load config'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = Object.entries(edits).map(([key, value]) => ({ key, value }))
      const r = await systemConfigApi.bulkUpdate(payload)
      setConfigs(r.data)
      toast.success('Configuration saved.')
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const groups = [...new Set(configs.map((c) => c.group))]

  const renderInput = (config) => {
    const val = edits[config.key]
    if (typeof val === 'boolean') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={val} onChange={(e) => setEdits((prev) => ({ ...prev, [config.key]: e.target.checked }))} />
          <span style={{ fontSize: 13 }}>{val ? 'Enabled' : 'Disabled'}</span>
        </label>
      )
    }
    if (typeof val === 'number') {
      return <input className="input" type="number" value={val} style={{ maxWidth: 160 }} onChange={(e) => setEdits((prev) => ({ ...prev, [config.key]: +e.target.value }))} />
    }
    return <input className="input" type="text" value={val ?? ''} onChange={(e) => setEdits((prev) => ({ ...prev, [config.key]: e.target.value }))} />
  }

  if (loading) return <div className="spinner" />

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">System Configuration</div>
          <div className="page-subtitle">Manage platform-wide settings and deployment options</div>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save All Changes'}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {groups.map((group) => (
          <div key={group} className="card">
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{group} Settings</div>
            <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {configs.filter((c) => c.group === group).map((config) => (
                <div key={config.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{config.label || config.key}</div>
                    {config.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{config.description}</div>}
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>{config.key}</div>
                  </div>
                  <div>{renderInput(config)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: 160 }}>
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  )
}
