import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function ContractsMgmtPage() {
  const [grouped, setGrouped] = useState({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, sites(name, client_name), profiles(full_name)')
        .order('name')
      if (!error && data) {
        const groups = {}
        data.forEach(c => {
          const siteName = c.sites?.name || 'Unknown Site'
          if (!groups[siteName]) groups[siteName] = []
          groups[siteName].push(c)
        })
        const sorted = Object.fromEntries(
          Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
        )
        setGrouped(sorted)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Contracts</h1>

      <div className="space-y-6">
        {Object.entries(grouped).map(([siteName, contracts]) => (
          <div key={siteName} className="bg-white rounded-xl shadow overflow-hidden">
            <div className="bg-gray-50 border-b px-5 py-3">
              <h2 className="font-semibold text-gray-800">{siteName}</h2>
              {contracts[0]?.sites?.client_name && (
                <p className="text-xs text-gray-500">Client: {contracts[0].sites.client_name}</p>
              )}
            </div>
            <div className="divide-y">
              {contracts.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/contracts/${c.id}`)}
                >
                  <div>
                    <p className="font-medium text-sm text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">
                      Supervisor: {c.profiles?.full_name || 'Unassigned'} · {c.working_days}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.end_date && (
                      <p className="text-xs text-gray-400">Ends: {c.end_date}</p>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-gray-400">→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
