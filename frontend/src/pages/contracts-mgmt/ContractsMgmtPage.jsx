import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function ContractsMgmtPage() {
  const [contracts, setContracts] = useState([])
  const [sites, setSites] = useState([])
  const [supervisors, setSupervisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState(null) // null = new, obj = edit
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = {
    site_id: '',
    supervisor_id: '',
    name: '',
    working_days: 'mon-fri',
    pays_public_holidays: false,
    start_date: '',
    end_date: '',
    is_active: true,
  }
  const [form, setForm] = useState(emptyForm)

  async function load() {
    const [{ data: c }, { data: s }, { data: p }] = await Promise.all([
      supabase.from('contracts')
        .select('*, sites(name), profiles!contracts_supervisor_id_fkey(full_name)')
        .order('name'),
      supabase.from('sites').select('id, name').order('name'),
      supabase.from('profiles').select('id, full_name, role').eq('role', 'supervisor').order('full_name'),
    ])
    setContracts(c || [])
    setSites(s || [])
    setSupervisors(p || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startNew() {
    setEditTarget(null)
    setForm(emptyForm)
    setShowForm(true)
    setError(null)
  }

  function startEdit(c) {
    setEditTarget(c)
    setForm({
      site_id: c.site_id || '',
      supervisor_id: c.supervisor_id || '',
      name: c.name,
      working_days: c.working_days || 'mon-fri',
      pays_public_holidays: c.pays_public_holidays || false,
      start_date: c.start_date || '',
      end_date: c.end_date || '',
      is_active: c.is_active,
    })
    setShowForm(true)
    setError(null)
  }

  function cancel() {
    setShowForm(false)
    setEditTarget(null)
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      ...form,
      supervisor_id: form.supervisor_id || null,
      end_date: form.end_date || null,
    }
    let err
    if (editTarget) {
      ;({ error: err } = await supabase.from('contracts').update(payload).eq('id', editTarget.id))
    } else {
      ;({ error: err } = await supabase.from('contracts').insert(payload))
    }
    if (err) setError(err.message)
    else { cancel(); load() }
    setSaving(false)
  }

  async function toggleActive(c) {
    await supabase.from('contracts').update({ is_active: !c.is_active }).eq('id', c.id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Contracts</h1>
        {!showForm && (
          <button onClick={startNew}
            className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700">
            + New contract
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-slate-700 mb-4">{editTarget ? 'Edit Contract' : 'New Contract'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contract name *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Bara Grounds Maintenance"
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Site *</label>
                <select required value={form.site_id} onChange={e => setForm({ ...form, site_id: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                  <option value="">Select site…</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Supervisor</label>
                <select value={form.supervisor_id} onChange={e => setForm({ ...form, supervisor_id: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                  <option value="">Unassigned</option>
                  {supervisors.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
                {supervisors.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No supervisors yet — <Link to="/supervisors" className="underline">create supervisors first</Link></p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Working days *</label>
                <select value={form.working_days} onChange={e => setForm({ ...form, working_days: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                  <option value="mon-fri">Mon – Fri</option>
                  <option value="mon-sat">Mon – Sat</option>
                  <option value="mon-sun">Mon – Sun</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Start date</label>
                <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">End date</label>
                <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.pays_public_holidays}
                  onChange={e => setForm({ ...form, pays_public_holidays: e.target.checked })}
                  className="rounded" />
                Pays on public holidays
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded" />
                Active
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="bg-slate-800 text-white px-5 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50">
                {saving ? 'Saving…' : editTarget ? 'Update contract' : 'Create contract'}
              </button>
              <button type="button" onClick={cancel}
                className="px-4 py-2 rounded text-sm border border-slate-300 hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <p className="text-slate-500">Loading…</p> : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Contract</th>
                <th className="text-left px-4 py-2">Site</th>
                <th className="text-left px-4 py-2">Supervisor</th>
                <th className="text-left px-4 py-2">Days</th>
                <th className="text-left px-4 py-2">Start</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contracts.map(c => (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-medium text-slate-800">
                    <Link to={`/contracts/${c.id}`} className="hover:underline">{c.name}</Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{c.sites?.name || '—'}</td>
                  <td className="px-4 py-2 text-slate-600">{c.profiles?.full_name || <span className="text-amber-500 text-xs">Unassigned</span>}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{c.working_days}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{c.start_date || '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right flex gap-3 justify-end">
                    <button onClick={() => startEdit(c)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline">Edit</button>
                    <button onClick={() => toggleActive(c)}
                      className="text-xs text-slate-400 hover:text-slate-700 underline">
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {contracts.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-4 text-slate-500">No contracts yet. Create one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
