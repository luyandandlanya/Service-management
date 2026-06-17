import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function SitesPage() {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ name: '', address: '', client_name: '' })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data, error } = await supabase.from('sites').select('*').order('name')
    if (error) setError(error.message)
    else setSites(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startEdit(site) {
    setEditId(site.id)
    setForm({ name: site.name, address: site.address || '', client_name: site.client_name || '' })
  }

  function cancelEdit() {
    setEditId(null)
    setForm({ name: '', address: '', client_name: '' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    if (editId) {
      const { error } = await supabase.from('sites').update(form).eq('id', editId)
      if (error) setError(error.message)
      else { cancelEdit(); load() }
    } else {
      const { error } = await supabase.from('sites').insert(form)
      if (error) setError(error.message)
      else { setForm({ name: '', address: '', client_name: '' }); load() }
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Sites</h1>
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-slate-700 mb-3">{editId ? 'Edit Site' : 'Add Site'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Client Name</label>
              <input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50">
              {saving ? 'Saving…' : editId ? 'Update' : 'Add Site'}
            </button>
            {editId && <button type="button" onClick={cancelEdit}
              className="px-4 py-2 rounded text-sm border border-slate-300 hover:bg-slate-50">Cancel</button>}
          </div>
        </form>
      </div>

      {loading ? <p className="text-slate-500">Loading…</p> : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Client</th>
                <th className="text-left px-4 py-2">Address</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sites.map(s => (
                <tr key={s.id}>
                  <td className="px-4 py-2 font-medium text-slate-800">
                    <Link to={`/sites/${s.id}`} className="hover:underline text-slate-800">{s.name}</Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{s.client_name || '—'}</td>
                  <td className="px-4 py-2 text-slate-600">{s.address || '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => startEdit(s)}
                      className="text-slate-500 hover:text-slate-800 text-xs underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sites.length === 0 && <p className="p-4 text-slate-500 text-sm">No sites yet.</p>}
        </div>
      )}
    </div>
  )
}
