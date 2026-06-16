import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function ContractDetailPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const [contract, setContract] = useState(null)
  const [staff, setStaff] = useState([])
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [staffForm, setStaffForm] = useState({ name: '', daily_rate: '', start_date: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: c, error: ce }, { data: s, error: se }, { data: i, error: ie }] = await Promise.all([
      supabase.from('contracts').select('*, sites(name, client_name), profiles!contracts_supervisor_id_fkey(full_name)').eq('id', id).single(),
      supabase.from('staff').select('*').eq('contract_id', id).order('name'),
      supabase.from('issues').select('*').eq('contract_id', id).eq('status', 'open').order('created_at', { ascending: false }).limit(5),
    ])
    if (ce) setError(ce.message)
    setContract(c)
    setStaff(s || [])
    setIssues(i || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function addStaff(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('staff').insert({ ...staffForm, contract_id: id, daily_rate: parseFloat(staffForm.daily_rate) })
    if (error) setError(error.message)
    else { setStaffForm({ name: '', daily_rate: '', start_date: '' }); load() }
    setSaving(false)
  }

  async function toggleStaff(s) {
    await supabase.from('staff').update({ active: !s.active }).eq('id', s.id)
    load()
  }

  if (loading) return <p className="text-slate-500">Loading…</p>
  if (error) return <p className="text-red-600">Error: {error}</p>
  if (!contract) return <p className="text-slate-500">Contract not found.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{contract.name}</h1>
          <p className="text-sm text-slate-500">{contract.sites?.client_name} · {contract.working_days} · Supervisor: {contract.profiles?.full_name || '—'}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${contract.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
          {contract.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-2">
        {[
          { to: `/contracts/${id}/attendance`, label: 'Attendance' },
          { to: `/contracts/${id}/stock`, label: 'Stock' },
          { to: `/contracts/${id}/assets`, label: 'Assets' },
          { to: `/contracts/${id}/issues`, label: 'Issues' },
        ].map(l => (
          <Link key={l.to} to={l.to}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-sm transition">
            {l.label}
          </Link>
        ))}
      </div>

      {/* Staff */}
      <section className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Staff ({staff.filter(s => s.active).length} active)</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {staff.map(s => (
            <div key={s.id} className="px-4 py-2 flex items-center justify-between">
              <div>
                <span className={`text-sm font-medium ${s.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{s.name}</span>
                <span className="ml-2 text-xs text-slate-500">R{s.daily_rate}/day</span>
              </div>
              {isOwner && (
                <button onClick={() => toggleStaff(s)}
                  className="text-xs text-slate-400 hover:text-slate-700 underline">
                  {s.active ? 'Deactivate' : 'Reactivate'}
                </button>
              )}
            </div>
          ))}
          {staff.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">No staff yet.</p>}
        </div>

        {isOwner && (
          <form onSubmit={addStaff} className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-2">
            <input required placeholder="Name" value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm flex-1 min-w-[120px]" />
            <input required type="number" step="0.01" placeholder="Daily rate (R)" value={staffForm.daily_rate} onChange={e => setStaffForm({ ...staffForm, daily_rate: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-32" />
            <input required type="date" value={staffForm.start_date} onChange={e => setStaffForm({ ...staffForm, start_date: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-36" />
            <button type="submit" disabled={saving}
              className="bg-slate-800 text-white px-3 py-1.5 rounded text-sm hover:bg-slate-700 disabled:opacity-50">
              {saving ? '…' : 'Add staff'}
            </button>
          </form>
        )}
      </section>

      {/* Recent open issues */}
      {issues.length > 0 && (
        <section className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Open Issues</h2>
            <Link to={`/contracts/${id}/issues`} className="text-xs text-slate-500 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {issues.map(i => (
              <div key={i.id} className="px-4 py-2 flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  i.type === 'broken' ? 'bg-red-100 text-red-700' :
                  i.type === 'low_stock' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>{i.type}</span>
                <span className="text-sm text-slate-700">{i.subject}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
