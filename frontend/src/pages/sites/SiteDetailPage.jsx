import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function SiteDetailPage() {
  const { id } = useParams()
  const [site, setSite] = useState(null)
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    const [{ data: s, error: se }, { data: c, error: ce }] = await Promise.all([
      supabase.from('sites').select('*').eq('id', id).single(),
      supabase.from('contracts')
        .select('*, profiles!contracts_supervisor_id_fkey(full_name), staff(id, active)')
        .eq('site_id', id)
        .order('name'),
    ])
    if (se) setError(se.message)
    if (ce) setError(ce.message)
    setSite(s)
    setContracts(c || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  if (loading) return <p className="text-slate-500">Loading…</p>
  if (error) return <p className="text-red-600">Error: {error}</p>
  if (!site) return <p className="text-slate-500">Site not found.</p>

  return (
    <div className="space-y-6">
      <div>
        <Link to="/sites" className="text-xs text-slate-500 hover:underline">&larr; Back to sites</Link>
        <h1 className="text-xl font-bold text-slate-800 mt-1">{site.name}</h1>
        <p className="text-sm text-slate-500">{site.client_name || '—'} · {site.address || '—'}</p>
      </div>

      <section className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Contracts ({contracts.length})</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {contracts.map(c => (
            <Link key={c.id} to={`/contracts/${c.id}`}
              className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition">
              <div>
                <span className="text-sm font-medium text-slate-800">{c.name}</span>
                <span className="ml-2 text-xs text-slate-500">
                  Supervisor: {c.profiles?.full_name || '—'} · {(c.staff || []).filter(s => s.active).length} active staff
                </span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {c.is_active ? 'Active' : 'Inactive'}
              </span>
            </Link>
          ))}
          {contracts.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">No contracts for this site yet.</p>}
        </div>
      </section>
    </div>
  )
}
