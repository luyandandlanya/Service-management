import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function AttendancePage() {
  const { id: contractId } = useParams()
  const { user } = useAuth()
  const [staff, setStaff] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ staff_id: '', day: '', absence_type: 'unpaid', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7))

  async function load() {
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from('staff').select('id, name').eq('contract_id', contractId).eq('active', true).order('name'),
      supabase.from('attendance')
        .select('*, staff(name)')
        .in('staff_id',
          (await supabase.from('staff').select('id').eq('contract_id', contractId)).data?.map(x => x.id) || []
        )
        .gte('day', `${filterMonth}-01`)
        .lte('day', `${filterMonth}-31`)
        .order('day', { ascending: false }),
    ])
    setStaff(s || [])
    setRecords(r || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [contractId, filterMonth])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('attendance').upsert({
      ...form,
      created_by: user.id,
    }, { onConflict: 'staff_id,day' })
    if (error) setError(error.message)
    else { setForm({ staff_id: '', day: '', absence_type: 'unpaid', notes: '' }); load() }
    setSaving(false)
  }

  async function deleteRecord(id) {
    await supabase.from('attendance').delete().eq('id', id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/contracts/${contractId}`} className="text-slate-500 hover:text-slate-700 text-sm">← Contract</Link>
        <h1 className="text-xl font-bold text-slate-800">Attendance</h1>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-slate-700 mb-3">Log Absence</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Staff member *</label>
            <select required value={form.staff_id} onChange={e => setForm({ ...form, staff_id: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
              <option value="">Select…</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
            <input type="date" required value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
            <select value={form.absence_type} onChange={e => setForm({ ...form, absence_type: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
              <option value="unpaid">Unpaid</option>
              <option value="sick">Sick</option>
              <option value="authorized">Authorized</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={saving}
              className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Log absence'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Absences</h2>
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm" />
        </div>
        {loading ? <p className="p-4 text-slate-500">Loading…</p> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Staff</th>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Notes</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map(r => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-slate-800">{r.staff?.name}</td>
                  <td className="px-4 py-2 text-slate-600">{r.day}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.absence_type === 'unpaid' ? 'bg-red-100 text-red-700' :
                      r.absence_type === 'sick' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{r.absence_type}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{r.notes || '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => deleteRecord(r.id)}
                      className="text-xs text-red-400 hover:text-red-600 underline">Remove</button>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-3 text-slate-500">No absences recorded.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
