import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function DashboardPage() {
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      let q = supabase
        .from('contracts')
        .select('*, sites(name, client_name), profiles!contracts_supervisor_id_fkey(full_name)')
        .order('name')

      if (!isOwner) {
        q = q.eq('supervisor_id', profile?.id)
      }

      const { data, error } = await q
      if (error) setError(error.message)
      else setContracts(data)
      setLoading(false)
    }
    if (profile) load()
  }, [profile, isOwner])

  if (loading) return <p className="text-slate-500">Loading…</p>
  if (error) return <p className="text-red-600">Error: {error}</p>

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">
        {isOwner ? 'All Contracts' : 'My Contracts'}
      </h1>
      {contracts.length === 0 && <p className="text-slate-500">No contracts found.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {contracts.map(c => (
          <Link
            key={c.id}
            to={`/contracts/${c.id}`}
            className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">{c.name}</p>
                <p className="text-sm text-slate-500 mt-1">{c.sites?.client_name || c.sites?.name}</p>
                <p className="text-xs text-slate-400 mt-1">Supervisor: {c.profiles?.full_name || '—'}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {c.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Working days: {c.working_days}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
