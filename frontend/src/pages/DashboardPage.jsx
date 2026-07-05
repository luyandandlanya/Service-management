import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [contracts, setContracts] = useState([])
  const [openIssues, setOpenIssues] = useState([])
  const [trackerAlerts, setTrackerAlerts] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10)
      const [
        { data: contractsData },
        { data: issuesData },
        { data: staffData },
        { data: sitesData },
        { data: alertsData }
      ] = await Promise.all([
        supabase.from('contracts').select('*, sites(name)').eq('is_active', true),
        supabase.from('issues').select('*, contracts(name, sites(name))').eq('status', 'open').order('created_at', { ascending: false }).limit(10),
        supabase.from('staff').select('id, active, contract_id').eq('active', true),
        supabase.from('sites').select('id'),
        supabase.from('tracked_items')
          .select('id, name, type, expiry_date, next_alert_date, status')
          .eq('status', 'active')
          .lte('next_alert_date', today)
          .order('expiry_date'),
      ])
      setContracts(contractsData || [])
      setOpenIssues(issuesData || [])
      setTrackerAlerts(alertsData || [])
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

      {trackerAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-600 font-semibold text-sm">Document Alerts</span>
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{trackerAlerts.length}</span>
          </div>
          {trackerAlerts.map(item => {
            const daysLeft = Math.ceil((new Date(item.expiry_date) - new Date()) / 86400000)
            const isExpired = daysLeft < 0
            return (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100 cursor-pointer hover:bg-red-50 transition"
                onClick={() => navigate(`/tracker/${item.id}`)}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.type === 'tender' ? 'bg-purple-100 text-purple-700' : item.type === 'certification' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                    {item.type}
                  </span>
                  <span className="text-sm font-medium text-slate-800">{item.name}</span>
                </div>
                <span className={`text-xs font-semibold shrink-0 ${isExpired ? 'text-red-700' : 'text-red-500'}`}>
                  {isExpired ? `Expired ${Math.abs(daysLeft)}d ago` : `${daysLeft}d left`}
                </span>
              </div>
            )
          })}
          <p className="text-xs text-red-400 pt-1">Click any item to view details or extend.</p>
        </div>
      )}

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
