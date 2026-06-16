import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function TrackerPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    type: 'certification', name: '', institution: '', notes: '',
    effective_date: '', expiry_date: '', alert_lead_days: 30,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    const { data, error } = await supabase
      .from('tracked_items')
      .select('*')
      .in('status', ['active', 'snoozed'])
      .order('expiry_date')
    if (error) setError(error.message)
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('tracked_items').insert({
      ...form,
      alert_lead_days: parseInt(form.alert_lead_days),
    })
    if (error) setError(error.message)
    else {
      setForm({ type: 'certification', name: '', institution: '', notes: '', effective_date: '', expiry_date: '', alert_lead_days: 30 })
      load()
    }
    setSaving(false)
  }

  function urgencyClass(expiryDate) {
    const days = Math.ceil((new Date(expiryDate) - new Date()) / 86400000)
    if (days < 30) return 'border-l-4 border-red-400 bg-red-50'
    if (days < 60) return 'border-l-4 border-amber-400 bg-amber-50'
    return 'border-l-4 border-green-400 bg-green-50'
  }

  function daysLabel(expiryDate) {
    const days = Math.ceil((new Date(expiryDate) - new Date()) / 86400000)
    if (days < 0) return `Expired ${Math.abs(days)}d ago`
    return `${days}d left`
  }

  const typeColors = {
    tender: 'bg-purple-100 text-purple-700',
    certification: 'bg-blue-100 text-blue-700',
    document: 'bg-slate-100 text-slate-700',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Tracker</h1>
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-slate-700 mb-3">Add Tracked Item</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                <option value="tender">Tender</option>
                <option value="certification">Certification</option>
                <option value="document">Document</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Institution</label>
              <input value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Effective date</label>
              <input type="date" value={form.effective_date} onChange={e => setForm({ ...form, effective_date: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Expiry date *</label>
              <input type="date" required value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Alert lead days</label>
              <input type="number" min="1" value={form.alert_lead_days} onChange={e => setForm({ ...form, alert_lead_days: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Add item'}
          </button>
        </form>
      </div>

      {loading ? <p className="text-slate-500">Loading…</p> : (
        <div className="space-y-2">
          {items.map(item => (
            <Link key={item.id} to={`/tracker/${item.id}`}
              className={`block bg-white rounded-lg shadow px-4 py-3 hover:shadow-md transition ${urgencyClass(item.expiry_date)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[item.type]}`}>{item.type}</span>
                    <span className="font-medium text-slate-800">{item.name}</span>
                    {item.institution && <span className="text-sm text-slate-500">· {item.institution}</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Expires: {item.expiry_date}</p>
                </div>
                <span className="text-sm font-semibold text-slate-700 shrink-0">{daysLabel(item.expiry_date)}</span>
              </div>
            </Link>
          ))}
          {items.length === 0 && <p className="text-slate-500">No tracked items.</p>}
        </div>
      )}
    </div>
  )
}
