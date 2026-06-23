import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function SitesPage() {
  const [sites, setSites] = useState([])
  const [contracts, setContracts] = useState([])
  const [expanded, setExpanded] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAddSite, setShowAddSite] = useState(false)
  const [siteForm, setSiteForm] = useState({ name: '', address: '', client_name: '' })
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const [{ data: s }, { data: c }] = await Promise.all([
        supabase.from('sites').select('*').order('name'),
        supabase.from('contracts').select('*, profiles(full_name)').order('name')
      ])
      setSites(s || [])
      setContracts(c || [])
      const exp = {}
      ;(s || []).forEach(site => { exp[site.id] = true })
      setExpanded(exp)
      setLoading(false)
    }
    load()
  }, [])

  async function addSite(e) {
    e.preventDefault()
    const { error } = await supabase.from('sites').insert(siteForm)
    if (!error) {
      setSiteForm({ name: '', address: '', client_name: '' })
      setShowAddSite(false)
      window.location.reload()
    }
  }

  const contractsFor = siteId => contracts.filter(c => c.site_id === siteId)

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sites & Contracts</h1>
        <button
          onClick={() => setShowAddSite(!showAddSite)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Add Site
        </button>
      </div>

      {showAddSite && (
        <form onSubmit={addSite} className="bg-white rounded-xl shadow p-5 mb-6 space-y-3">
          <h2 className="font-semibold text-gray-700">New Site</h2>
          <input required placeholder="Site name" value={siteForm.name}
            onChange={e => setSiteForm({ ...siteForm, name: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm" />
          <input placeholder="Address" value={siteForm.address}
            onChange={e => setSiteForm({ ...siteForm, address: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm" />
          <input placeholder="Client name" value={siteForm.client_name}
            onChange={e => setSiteForm({ ...siteForm, client_name: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm">Save</button>
            <button type="button" onClick={() => setShowAddSite(false)} className="text-gray-500 text-sm px-3">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {sites.map(site => {
          const siteContracts = contractsFor(site.id)
          const isExpanded = expanded[site.id]
          return (
            <div key={site.id} className="bg-white rounded-xl shadow overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded({ ...expanded, [site.id]: !isExpanded })}
              >
                <div>
                  <h2 className="font-semibold text-gray-900">{site.name}</h2>
                  {site.client_name && (
                    <p className="text-sm text-gray-500">Client: {site.client_name}</p>
                  )}
                  {site.address && (
                    <p className="text-xs text-gray-400">{site.address}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-1 rounded-full">
                    {siteContracts.length} contract{siteContracts.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t divide-y">
                  {siteContracts.length === 0 ? (
                    <p className="px-6 py-3 text-sm text-gray-400">No contracts yet.</p>
                  ) : (
                    siteContracts.map(c => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/contracts/${c.id}`)}
                      >
                        <div>
                          <p className="font-medium text-sm text-gray-800">{c.name}</p>
                          <p className="text-xs text-gray-400">
                            Supervisor: {c.profiles?.full_name || 'Unassigned'} · {c.working_days}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {c.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-gray-400 text-sm">→</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
