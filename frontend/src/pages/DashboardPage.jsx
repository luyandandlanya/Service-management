import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [contracts, setContracts] = useState([])
  const [openIssues, setOpenIssues] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const [
        { data: contractsData },
        { data: issuesData },
        { data: staffData },
        { data: sitesData }
      ] = await Promise.all([
        supabase.from('contracts').select('*, sites(name)').eq('is_active', true),
        supabase.from('issues').select('*, contracts(name, sites(name))').eq('status', 'open').order('created_at', { ascending: false }).limit(10),
        supabase.from('staff').select('id, active, contract_id').eq('active', true),
        supabase.from('sites').select('id')
      ])
      setContracts(contractsData || [])
      setOpenIssues(issuesData || [])
      setStats({
        totalSites: sitesData?.length || 0,
        activeContracts: contractsData?.length || 0,
        totalStaff: staffData?.length || 0,
        openIssues: issuesData?.length || 0
      })
    }
    load()
  }, [])

  const issueTypeColor = {
    broken: 'bg-red-100 text-red-700',
    low_stock: 'bg-amber-100 text-amber-700',
    service: 'bg-blue-100 text-blue-700'
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {profile?.role === 'owner' ? 'Operations Overview' : 'My Contracts'}
      </h1>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {profile?.role === 'owner' && (
            <StatCard label="Sites" value={stats.totalSites} color="blue" />
          )}
          <StatCard label="Active Contracts" value={stats.activeContracts} color="green" />
          <StatCard label="Active Staff" value={stats.totalStaff} color="purple" />
          <StatCard label="Open Issues" value={stats.openIssues} color={stats.openIssues > 0 ? 'red' : 'green'} />
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-semibold text-gray-800 mb-3">
          {profile?.role === 'owner' ? 'All Active Contracts' : 'Your Contracts'}
        </h2>
        <div className="divide-y">
          {contracts.map(c => (
            <div
              key={c.id}
              className="flex justify-between items-center py-2.5 cursor-pointer hover:bg-gray-50 px-2 rounded"
              onClick={() => navigate(`/contracts/${c.id}`)}
            >
              <p className="text-sm font-medium text-gray-800">{c.sites?.name} — {c.name}</p>
              <span className="text-gray-400 text-sm">→</span>
            </div>
          ))}
          {contracts.length === 0 && (
            <p className="py-3 text-sm text-gray-400">No active contracts.</p>
          )}
        </div>
      </div>

      {openIssues.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Open Issues</h2>
          <div className="space-y-2">
            {openIssues.map(issue => (
              <div key={issue.id} className="flex items-center gap-3 border rounded-lg p-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${issueTypeColor[issue.type] || 'bg-gray-100 text-gray-700'}`}>
                  {issue.type?.replace('_', ' ')}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{issue.subject}</p>
                  <p className="text-xs text-gray-400">{issue.contracts?.sites?.name} — {issue.contracts?.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    red: 'bg-red-50 text-red-700'
  }
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-80">{label}</p>
    </div>
  )
}
