import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import BulkAssetImport from '../../components/BulkAssetImport'

// ─── Generic CRUD table ───────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h2 className="font-semibold text-slate-700">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ─── Consumables ──────────────────────────────────────────────────────────────
function ConsumablesSection() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ name: '', unit: '', reorder_threshold: 0 })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    const { data } = await supabase.from('consumables').select('*').order('name')
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { ...form, reorder_threshold: parseFloat(form.reorder_threshold) || 0 }
    if (editId) {
      const { error } = await supabase.from('consumables').update(payload).eq('id', editId)
      if (error) setError(error.message)
      else { setEditId(null); setForm({ name: '', unit: '', reorder_threshold: 0 }) }
    } else {
      const { error } = await supabase.from('consumables').insert(payload)
      if (error) setError(error.message)
      else setForm({ name: '', unit: '', reorder_threshold: 0 })
    }
    load()
    setSaving(false)
  }

  function startEdit(r) {
    setEditId(r.id)
    setForm({ name: r.name, unit: r.unit, reorder_threshold: r.reorder_threshold })
  }

  return (
    <Section title="Consumables">
      {error && <p className="text-sm text-red-600 px-4 pt-3">{error}</p>}
      <form onSubmit={save} className="px-4 py-3 flex flex-wrap gap-2 items-end border-b border-slate-100">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Name *</label>
          <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Petrol"
            className="border border-slate-300 rounded px-3 py-1.5 text-sm w-40" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Unit *</label>
          <input required value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
            placeholder="litres / rolls…"
            className="border border-slate-300 rounded px-3 py-1.5 text-sm w-28" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Reorder threshold</label>
          <input type="number" step="0.01" value={form.reorder_threshold} onChange={e => setForm({ ...form, reorder_threshold: e.target.value })}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm w-28" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving}
            className="bg-slate-800 text-white px-3 py-1.5 rounded text-sm hover:bg-slate-700 disabled:opacity-50">
            {saving ? '…' : editId ? 'Update' : 'Add'}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm({ name: '', unit: '', reorder_threshold: 0 }) }}
              className="px-3 py-1.5 rounded text-sm border border-slate-300 hover:bg-slate-50">Cancel</button>
          )}
        </div>
      </form>
      <table className="w-full text-sm">
        <thead className="text-slate-500 text-xs">
          <tr>
            <th className="text-left px-4 py-2">Name</th>
            <th className="text-left px-4 py-2">Unit</th>
            <th className="text-right px-4 py-2">Reorder threshold</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map(r => (
            <tr key={r.id}>
              <td className="px-4 py-2 text-slate-800">{r.name}</td>
              <td className="px-4 py-2 text-slate-600">{r.unit}</td>
              <td className="px-4 py-2 text-right text-slate-600">{r.reorder_threshold}</td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => startEdit(r)} className="text-xs text-slate-400 hover:text-slate-700 underline">Edit</button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-3 text-slate-400">No consumables yet.</td></tr>}
        </tbody>
      </table>
    </Section>
  )
}

// ─── Assets ───────────────────────────────────────────────────────────────────
function AssetsSection() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ name: '', category: 'tool', depletable: false })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    const { data } = await supabase.from('assets').select('*').order('name')
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    if (editId) {
      const { error } = await supabase.from('assets').update(form).eq('id', editId)
      if (error) setError(error.message)
      else { setEditId(null); setForm({ name: '', category: 'tool', depletable: false }) }
    } else {
      const { error } = await supabase.from('assets').insert(form)
      if (error) setError(error.message)
      else setForm({ name: '', category: 'tool', depletable: false })
    }
    load()
    setSaving(false)
  }

  function startEdit(r) {
    setEditId(r.id)
    setForm({ name: r.name, category: r.category, depletable: r.depletable })
  }

  return (
    <Section title="Asset Types">
      {error && <p className="text-sm text-red-600 px-4 pt-3">{error}</p>}
      <form onSubmit={save} className="px-4 py-3 flex flex-wrap gap-2 items-end border-b border-slate-100">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Name *</label>
          <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Chainsaw"
            className="border border-slate-300 rounded px-3 py-1.5 text-sm w-40" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Category *</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm">
            <option value="tool">Tool</option>
            <option value="machinery">Machinery</option>
          </select>
        </div>
        <label className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer pb-1">
          <input type="checkbox" checked={form.depletable} onChange={e => setForm({ ...form, depletable: e.target.checked })}
            className="rounded" />
          Depletable
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={saving}
            className="bg-slate-800 text-white px-3 py-1.5 rounded text-sm hover:bg-slate-700 disabled:opacity-50">
            {saving ? '…' : editId ? 'Update' : 'Add'}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm({ name: '', category: 'tool', depletable: false }) }}
              className="px-3 py-1.5 rounded text-sm border border-slate-300 hover:bg-slate-50">Cancel</button>
          )}
        </div>
      </form>
      <table className="w-full text-sm">
        <thead className="text-slate-500 text-xs">
          <tr>
            <th className="text-left px-4 py-2">Name</th>
            <th className="text-left px-4 py-2">Category</th>
            <th className="text-left px-4 py-2">Depletable</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map(r => (
            <tr key={r.id}>
              <td className="px-4 py-2 text-slate-800">{r.name}</td>
              <td className="px-4 py-2 text-slate-600">{r.category}</td>
              <td className="px-4 py-2 text-slate-500">{r.depletable ? 'Yes' : 'No'}</td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => startEdit(r)} className="text-xs text-slate-400 hover:text-slate-700 underline">Edit</button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-3 text-slate-400">No assets yet.</td></tr>}
        </tbody>
      </table>
    </Section>
  )
}

// ─── Public Holidays ──────────────────────────────────────────────────────────
function HolidaysSection() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ date: '', name: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    const { data } = await supabase.from('public_holidays').select('*').order('date')
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('public_holidays').upsert(form, { onConflict: 'date' })
    if (error) setError(error.message)
    else { setForm({ date: '', name: '' }); load() }
    setSaving(false)
  }

  async function remove(id) {
    await supabase.from('public_holidays').delete().eq('id', id)
    load()
  }

  return (
    <Section title="Public Holidays">
      {error && <p className="text-sm text-red-600 px-4 pt-3">{error}</p>}
      <form onSubmit={save} className="px-4 py-3 flex flex-wrap gap-2 items-end border-b border-slate-100">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Date *</label>
          <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Name *</label>
          <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Youth Day"
            className="border border-slate-300 rounded px-3 py-1.5 text-sm w-52" />
        </div>
        <button type="submit" disabled={saving}
          className="bg-slate-800 text-white px-3 py-1.5 rounded text-sm hover:bg-slate-700 disabled:opacity-50">
          {saving ? '…' : 'Add'}
        </button>
      </form>
      <table className="w-full text-sm">
        <thead className="text-slate-500 text-xs">
          <tr>
            <th className="text-left px-4 py-2">Date</th>
            <th className="text-left px-4 py-2">Name</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map(r => (
            <tr key={r.id}>
              <td className="px-4 py-2 text-slate-700">{r.date}</td>
              <td className="px-4 py-2 text-slate-800">{r.name}</td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => remove(r.id)} className="text-xs text-red-400 hover:text-red-600 underline">Remove</button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={3} className="px-4 py-3 text-slate-400">No holidays loaded.</td></tr>}
        </tbody>
      </table>
    </Section>
  )
}

// ─── My Profile ───────────────────────────────────────────────────────────────
function ProfileSection() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setForm({ full_name: data?.full_name || '', phone: data?.phone || '' })
    }
    load()
  }, [])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('profiles').update(form).eq('id', profile.id)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
    setSaving(false)
  }

  return (
    <Section title="My Profile">
      <form onSubmit={save} className="px-4 py-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Full name</label>
          <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm w-52" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Phone</label>
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm w-40" />
        </div>
        <button type="submit" disabled={saving}
          className="bg-slate-800 text-white px-3 py-1.5 rounded text-sm hover:bg-slate-700 disabled:opacity-50">
          {success ? 'Saved ✓' : saving ? '…' : 'Save'}
        </button>
      </form>
    </Section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Admin / Setup</h1>
      <ProfileSection />
      <ConsumablesSection />
      <AssetsSection />
      <Section title="Bulk Asset Import">
        <div className="p-4">
          <BulkAssetImport onSuccess={() => window.location.reload()} />
        </div>
      </Section>
      <HolidaysSection />
    </div>
  )
}
