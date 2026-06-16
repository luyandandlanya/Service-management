import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function SupervisorsPage() {
  const [supervisors, setSupervisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' })

  async function load() {
    const { data } = await supabase
      .from('profiles')
      .select('*, contracts!contracts_supervisor_id_fkey(id, name)')
      .eq('role', 'supervisor')
      .order('full_name')
    setSupervisors(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    // Create auth user via Supabase admin API (requires service role — proxy through edge or use signUp)
    // We use signUp with a known password; owner will share credentials
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name },
        // emailRedirectTo not needed since owner sets password directly
      },
    })

    if (signUpErr) { setError(signUpErr.message); setSaving(false); return }

    const userId = data.user?.id
    if (!userId) { setError('User was created but no ID returned. Check email confirmation settings.'); setSaving(false); return }

    // Update profile with role + phone
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ role: 'supervisor', full_name: form.full_name, phone: form.phone || null })
      .eq('id', userId)

    if (profileErr) { setError(`Account created but profile update failed: ${profileErr.message}`); setSaving(false); return }

    setSuccess(`Supervisor account created for ${form.full_name} (${form.email}). Share the password with them.`)
    setForm({ full_name: '', email: '', phone: '', password: '' })
    load()
    setSaving(false)
  }

  async function saveEdit(id) {
    const { error } = await supabase.from('profiles').update(editForm).eq('id', id)
    if (error) setError(error.message)
    else { setEditId(null); load() }
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
                  <div className="flex flex-wrap gap-2 items-center">
                    <input value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                      className="border border-slate-300 rounded px-2 py-1 text-sm w-48" />
                    <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="Phone"
                      className="border border-slate-300 rounded px-2 py-1 text-sm w-40" />
                    <button onClick={() => saveEdit(s.id)}
                      className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700">Save</button>
                    <button onClick={() => setEditId(null)}
                      className="text-xs border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800">{s.full_name || '—'}</p>
                      <p className="text-xs text-slate-500">{s.phone || 'No phone'}</p>
                      {s.contracts?.length > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Contracts: {s.contracts.map(c => c.name).join(', ')}
                        </p>
                      )}
                      {(!s.contracts || s.contracts.length === 0) && (
                        <p className="text-xs text-amber-500 mt-0.5">Not assigned to any contract</p>
                      )}
                    </div>
                    <button onClick={() => { setEditId(s.id); setEditForm({ full_name: s.full_name || '', phone: s.phone || '' }) }}
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
