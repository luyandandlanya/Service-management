import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function IssuesPage() {
  const { id: contractId } = useParams()
  const { user, profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('open')
  const [filterType, setFilterType] = useState('')
  const [form, setForm] = useState({ type: 'broken', subject: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    let q = supabase.from('issues').select('*').eq('contract_id', contractId).order('created_at', { ascending: false })
    if (filterStatus) q = q.eq('status', filterStatus)
    if (filterType) q = q.eq('type', filterType)
    const { data, error } = await q
    if (error) setError(error.message)
    setIssues(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [contractId, filterStatus, filterType])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('issues').insert({ ...form, contract_id: contractId, created_by: user.id })
    if (error) setError(error.message)
    else { setForm({ type: 'broken', subject: '', description: '' }); load() }
    setSaving(false)
  }

  async function resolve(id) {
    await supabase.from('issues').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  const typeColors = {
    broken: 'bg-red-100 text-red-700',
    low_stock: 'bg-amber-100 text-amber-700',
    service: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/contracts/${contractId}`} className="text-slate-500 hover:text-slate-700 text-sm">← Contract</Link>
        <h1 className="text-xl font-bold text-slate-800">Issues</h1>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-slate-700 mb-3">Report Issue</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                <option value="broken">Broken</option>
                <option value="low_stock">Low Stock</option>
                <option value="service">Service</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Subject *</label>
              <input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={saving}
            className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Report issue'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-2 items-center">
          <h2 className="font-semibold text-slate-700 flex-1">Issues</h2>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm">
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm">
            <option value="">All types</option>
            <option value="broken">Broken</option>
            <option value="low_stock">Low stock</option>
            <option value="service">Service</option>
          </select>
        </div>
        {loading ? <p className="p-4 text-slate-500">Loading…</p> : (
          <div className="divide-y divide-slate-100">
            {issues.map(i => (
              <div key={i.id} className="px-4 py-3 flex items-start gap-3">
                <span className={`mt-0.5 text-xs px-2 py-0.5 rounded-full shrink-0 ${typeColors[i.type]}`}>{i.type}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{i.subject}</p>
                  {i.description && <p className="text-xs text-slate-500 mt-0.5">{i.description}</p>}
                  <p className="text-xs text-slate-400 mt-1">{new Date(i.created_at).toLocaleDateString()}</p>
                </div>
                {i.status === 'open' && isOwner && (
                  <button onClick={() => resolve(i.id)}
                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 shrink-0">
                    Resolve
                  </button>
                )}
                {i.status === 'resolved' && (
                  <span className="text-xs text-slate-400 shrink-0">Resolved</span>
                )}
              </div>
            ))}
            {issues.length === 0 && <p className="p-4 text-sm text-slate-500">No issues found.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
