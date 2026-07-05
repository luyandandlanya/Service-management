import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function computeNextAlertDate(expiryDate, alertLeadDays) {
  if (!expiryDate) return null
  const d = new Date(expiryDate)
  d.setDate(d.getDate() - parseInt(alertLeadDays || 30))
  return d.toISOString().slice(0, 10)
}

function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

function urgencyClass(expiryDate) {
  const days = daysUntil(expiryDate)
  if (days < 0)  return 'border-l-4 border-red-500 bg-red-50'
  if (days < 30) return 'border-l-4 border-red-400 bg-red-50'
  if (days < 60) return 'border-l-4 border-amber-400 bg-amber-50'
  return 'border-l-4 border-green-400 bg-green-50'
}

function daysLabel(expiryDate) {
  const days = daysUntil(expiryDate)
  if (days < 0)  return `Expired ${Math.abs(days)}d ago`
  if (days === 0) return 'Expires today'
  return `${days}d left`
}

const TYPE_COLORS = {
  tender:        'bg-purple-100 text-purple-700',
  certification: 'bg-blue-100 text-blue-700',
  document:      'bg-slate-100 text-slate-700',
}

const STATUS_COLORS = {
  expired: 'bg-red-100 text-red-700',
  renewed: 'bg-green-100 text-green-700',
  snoozed: 'bg-amber-100 text-amber-700',
}

const EMPTY_FORM = {
  type: 'certification', name: '', institution: '', notes: '',
  effective_date: '', expiry_date: '', alert_lead_days: 30,
}

export default function TrackerPage() {
  const [items, setItems]         = useState([])
  const [archived, setArchived]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('active')   // 'active' | 'archive'
  const [typeFilter, setTypeFilter] = useState('all')
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)

  async function load() {
    setLoading(true)
    const [{ data: active }, { data: archive }] = await Promise.all([
      supabase.from('tracked_items').select('*').in('status', ['active', 'snoozed']).order('expiry_date'),
      supabase.from('tracked_items').select('*').in('status', ['expired', 'renewed']).order('expiry_date', { ascending: false }),
    ])
    setItems(active || [])
    setArchived(archive || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const next_alert_date = computeNextAlertDate(form.expiry_date, form.alert_lead_days)
    const { error } = await supabase.from('tracked_items').insert({
      ...form,
      alert_lead_days: parseInt(form.alert_lead_days),
      next_alert_date,
      status: 'active',
    })
    if (error) { setError(error.message) }
    else { setForm(EMPTY_FORM); setShowForm(false); load() }
    setSaving(false)
  }

  const visibleActive = typeFilter === 'all'
    ? items
    : items.filter(i => i.type === typeFilter)

  const visibleArchive = typeFilter === 'all'
    ? archived
    : archived.filter(i => i.type === typeFilter)

  // Summary counts for active items
  const expiredNow  = items.filter(i => daysUntil(i.expiry_date) < 0).length
  const urgent      = items.filter(i => { const d = daysUntil(i.expiry_date); return d >= 0 && d < 30 }).length
  const warning     = items.filter(i => { const d = daysUntil(i.expiry_date); return d >= 30 && d < 60 }).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Document Tracker</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700"
        >
          {showForm ? 'Cancel' : '+ Add item'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      {/* Summary tiles */}
      {(expiredNow > 0 || urgent > 0 || warning > 0) && (
        <div className="grid grid-cols-3 gap-3">
          {expiredNow > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{expiredNow}</p>
              <p className="text-xs text-red-600 mt-0.5">Expired</p>
            </div>
          )}
          {urgent > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{urgent}</p>
              <p className="text-xs text-red-500 mt-0.5">Under 30 days</p>
            </div>
          )}
          {warning > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{warning}</p>
              <p className="text-xs text-amber-600 mt-0.5">Under 60 days</p>
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-slate-700 mb-3">New Tracked Item</h2>
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
                  placeholder="e.g. COIDA, BEE Certificate"
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Institution</label>
                <input value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })}
                  placeholder="e.g. SARS, DoL"
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
                {form.expiry_date && (
                  <p className="text-xs text-slate-400 mt-1">
                    Alert on: {computeNextAlertDate(form.expiry_date, form.alert_lead_days)}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save item'}
            </button>
          </form>
        </div>
      )}

      {/* Tabs + filter */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex rounded-lg overflow-hidden border border-slate-200 text-sm">
          <button
            onClick={() => setTab('active')}
            className={`px-4 py-1.5 ${tab === 'active' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Active ({items.length})
          </button>
          <button
            onClick={() => setTab('archive')}
            className={`px-4 py-1.5 ${tab === 'archive' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Archive ({archived.length})
          </button>
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-slate-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="all">All types</option>
          <option value="tender">Tender</option>
          <option value="certification">Certification</option>
          <option value="document">Document</option>
        </select>
      </div>

      {/* List */}
      {loading ? <p className="text-slate-500">Loading…</p> : (
        <div className="space-y-2">
          {tab === 'active' && (
            <>
              {visibleActive.map(item => (
                <Link key={item.id} to={`/tracker/${item.id}`}
                  className={`block bg-white rounded-lg shadow px-4 py-3 hover:shadow-md transition ${urgencyClass(item.expiry_date)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[item.type]}`}>{item.type}</span>
                        <span className="font-medium text-slate-800">{item.name}</span>
                        {item.institution && <span className="text-sm text-slate-500">· {item.institution}</span>}
                        {item.status === 'snoozed' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">snoozed</span>}
                      </div>
                      <div className="flex gap-4 mt-1">
                        <p className="text-xs text-slate-500">Expires: {item.expiry_date}</p>
                        {item.next_alert_date && (
                          <p className="text-xs text-slate-400">Alert: {item.next_alert_date}</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${daysUntil(item.expiry_date) < 30 ? 'text-red-600' : daysUntil(item.expiry_date) < 60 ? 'text-amber-600' : 'text-slate-700'}`}>
                      {daysLabel(item.expiry_date)}
                    </span>
                  </div>
                </Link>
              ))}
              {visibleActive.length === 0 && (
                <p className="text-slate-500">No active tracked items{typeFilter !== 'all' ? ` of type "${typeFilter}"` : ''}.</p>
              )}
            </>
          )}

          {tab === 'archive' && (
            <>
              {visibleArchive.map(item => (
                <Link key={item.id} to={`/tracker/${item.id}`}
                  className="block bg-white rounded-lg shadow px-4 py-3 hover:shadow-md transition border-l-4 border-slate-300">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[item.type]}`}>{item.type}</span>
                        <span className="font-medium text-slate-600">{item.name}</span>
                        {item.institution && <span className="text-sm text-slate-400">· {item.institution}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status]}`}>{item.status}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Expired: {item.expiry_date}</p>
                    </div>
                  </div>
                </Link>
              ))}
              {visibleArchive.length === 0 && (
                <p className="text-slate-500">No archived items{typeFilter !== 'all' ? ` of type "${typeFilter}"` : ''}.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
