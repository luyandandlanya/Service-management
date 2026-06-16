import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function AssetsPage() {
  const { id: contractId } = useParams()
  const { user } = useAuth()
  const [assets, setAssets] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ asset_id: '', quantity: '', condition: 'good', moved_on: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    const [{ data: a }, { data: l }] = await Promise.all([
      supabase.from('assets').select('*').order('name'),
      supabase.from('asset_locations').select('*, assets(name, category)')
        .eq('contract_id', contractId)
        .order('moved_on', { ascending: false }),
    ])
    setAssets(a || [])
    setLocations(l || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [contractId])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('asset_locations').insert({
      ...form,
      quantity: parseInt(form.quantity),
      contract_id: contractId,
      created_by: user.id,
    })
    if (error) setError(error.message)
    else { setForm({ asset_id: '', quantity: '', condition: 'good', moved_on: '' }); load() }
    setSaving(false)
  }

  const conditionColors = { good: 'bg-green-100 text-green-700', worn: 'bg-amber-100 text-amber-700', damaged: 'bg-red-100 text-red-700' }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/contracts/${contractId}`} className="text-slate-500 hover:text-slate-700 text-sm">← Contract</Link>
        <h1 className="text-xl font-bold text-slate-800">Asset Register</h1>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-slate-700 mb-3">Move / Add Asset</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Asset *</label>
            <select required value={form.asset_id} onChange={e => setForm({ ...form, asset_id: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
              <option value="">Select…</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.category})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Quantity *</label>
            <input type="number" min="1" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Condition</label>
            <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
              <option value="good">Good</option>
              <option value="worn">Worn</option>
              <option value="damaged">Damaged</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date moved *</label>
            <input type="date" required value={form.moved_on} onChange={e => setForm({ ...form, moved_on: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={saving}
              className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Record location'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Asset Location History</h2>
        </div>
        {loading ? <p className="p-4 text-slate-500">Loading…</p> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Asset</th>
                <th className="text-left px-4 py-2">Category</th>
                <th className="text-right px-4 py-2">Qty</th>
                <th className="text-left px-4 py-2">Condition</th>
                <th className="text-left px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {locations.map(l => (
                <tr key={l.id}>
                  <td className="px-4 py-2 text-slate-800">{l.assets?.name}</td>
                  <td className="px-4 py-2 text-slate-600">{l.assets?.category}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{l.quantity}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${conditionColors[l.condition]}`}>{l.condition}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{l.moved_on}</td>
                </tr>
              ))}
              {locations.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-3 text-slate-500">No asset records.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
