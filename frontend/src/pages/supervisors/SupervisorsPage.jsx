import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function SupervisorsPage() {
  const [supervisors, setSupervisors] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', contract_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', contract_id: '' })

  async function load() {
    const [{ data: sups }, { data: conts }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*, contracts!contracts_supervisor_id_fkey(id, name, sites(name))')
        .eq('role', 'supervisor')
        .order('full_name'),
      supabase
        .from('contracts')
        .select('id, name, sites(name), supervisor_id')
        .eq('is_active', true)
        .order('name'),
    ])
    setSupervisors(sups || [])
    setContracts(conts || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    // Call Edge Function — uses service role so owner session is not affected
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) { setError('Not authenticated.'); setSaving(false); return }

    const { data: fnData, error: fnErr } = await supabase.functions.invoke('create-supervisor', {
      body: {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone || null,
      },
    })

    if (fnErr || fnData?.error) {
      setError(fnErr?.message || fnData?.error)
      setSaving(false)
      return
    }

    // Assign to contract if selected
    if (form.contract_id && fnData?.id) {
      const { error: assignErr } = await supabase
        .from('contracts')
        .update({ supervisor_id: fnData.id })
        .eq('id', form.contract_id)
      if (assignErr) {
        setError(`Account created but contract assignment failed: ${assignErr.message}`)
        setSaving(false)
        return
      }
    }

    setSuccess(`Supervisor account created for ${form.full_name} (${form.email}). Share the password with them.`)
    setForm({ full_name: '', email: '', phone: '', password: '', contract_id: '' })
    load()
    setSaving(false)
  }

  async function saveEdit(id) {
    const { contract_id, ...profileFields } = editForm
    const { error } = await supabase.from('profiles').update(profileFields).eq('id', id)
    if (error) { setError(error.message); return }

    // Remove supervisor from any contract they're currently on, then assign the new one
    await supabase.from('contracts').update({ supervisor_id: null }).eq('supervisor_id', id)
    if (contract_id) {
      await supabase.from('contracts').update({ supervisor_id: id }).eq('id', contract_id)
    }
    setEditId(null)
    load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Supervisors</h1>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 p-3 rounded">{success}</p>}

      {/* Create supervisor */}
      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="font-semibold text-slate-700 mb-1">Create Supervisor Account</h2>
        <p className="text-xs text-slate-500 mb-4">
          This creates a login for the supervisor. Share the email + password with them directly.
          {' '}If your Supabase project requires email confirmation, disable it in Auth → Settings → "Enable email confirmations".
        </p>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Full name *</label>
            <input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
              placeholder="Jane Smith"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="jane@example.com"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="+27 82 000 0000"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Initial password *</label>
            <input required type="password" minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Min 6 characters"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Assign to contract</label>
            <select value={form.contract_id} onChange={e => setForm({ ...form, contract_id: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
              <option value="">Select contract (optional — can assign later)</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.sites?.name} — {c.name}{c.supervisor_id ? ' (already has supervisor)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving}
              className="bg-slate-800 text-white px-5 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50">
              {saving ? 'Creating account…' : 'Create supervisor account'}
            </button>
          </div>
        </form>
      </div>

      {/* Supervisor list */}
      {loading ? <p className="text-slate-500">Loading…</p> : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">All Supervisors ({supervisors.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {supervisors.map(s => (
              <div key={s.id} className="px-4 py-3">
                {editId === s.id ? (
                  <div className="space-y-2">
                    <input value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                      placeholder="Full name"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                    <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="Phone"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                    <select value={editForm.contract_id} onChange={e => setEditForm({ ...editForm, contract_id: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                      <option value="">Unassigned</option>
                      {contracts.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.sites?.name} — {c.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(s.id)}
                        className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700">Save</button>
                      <button onClick={() => setEditId(null)}
                        className="border border-slate-300 px-4 py-2 rounded text-sm hover:bg-slate-50">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800">{s.full_name || '—'}</p>
                      <p className="text-xs text-slate-500">{s.phone || 'No phone'}</p>
                      {s.contracts?.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {s.contracts.map(c => (
                            <span key={c.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {c.sites?.name} — {c.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-amber-500 mt-0.5">Not assigned to any contract</p>
                      )}
                    </div>
                    <button onClick={() => {
                      const currentContractId = s.contracts?.[0]?.id || ''
                      setEditId(s.id)
                      setEditForm({ full_name: s.full_name || '', phone: s.phone || '', contract_id: currentContractId })
                    }}
                      className="text-xs text-slate-500 hover:text-slate-800 underline shrink-0">Edit</button>
                  </div>
                )}
              </div>
            ))}
            {supervisors.length === 0 && (
              <p className="px-4 py-4 text-sm text-slate-500">No supervisors yet. Create one above.</p>
            )}
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>Note:</strong> After creating a supervisor account, go to <strong>Contracts</strong> and assign them to their contract(s).
      </div>
    </div>
  )
}
