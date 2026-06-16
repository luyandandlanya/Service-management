import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function SalaryPage() {
  const [contracts, setContracts] = useState([])
  const [selectedContract, setSelectedContract] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [salaries, setSalaries] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    supabase.from('contracts').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setContracts(data || []))
  }, [])

  async function loadSalaries() {
    if (!selectedContract) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('salaries')
      .select('*, staff(name, daily_rate)')
      .eq('month', selectedMonth)
      .in('staff_id',
        (await supabase.from('staff').select('id').eq('contract_id', selectedContract)).data?.map(s => s.id) || []
      )
      .order('created_at')
    if (error) setError(error.message)
    setSalaries(data || [])
    setLoading(false)
  }

  useEffect(() => { loadSalaries() }, [selectedContract, selectedMonth])

  async function generate() {
    setGenerating(true)
    setError(null)
    setMsg(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API_URL}/api/salary/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ contract_id: selectedContract, month: selectedMonth }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to generate salaries')
      }
      const result = await res.json()
      setMsg(`Generated ${result.count} salary drafts.`)
      loadSalaries()
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function approve(salaryId) {
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API_URL}/api/salary/${salaryId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to approve salary')
      }
      loadSalaries()
    } catch (err) {
      setError(err.message)
    }
  }

  async function approveAll() {
    const drafts = salaries.filter(s => s.status === 'draft')
    for (const s of drafts) await approve(s.id)
  }

  const totalApproved = salaries.filter(s => s.status === 'approved').reduce((sum, s) => sum + Number(s.amount), 0)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Salary Review</h1>
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
      {msg && <p className="text-sm text-green-700 bg-green-50 p-3 rounded">{msg}</p>}

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Contract</label>
          <select value={selectedContract} onChange={e => setSelectedContract(e.target.value)}
            className="border border-slate-300 rounded px-3 py-2 text-sm">
            <option value="">Select contract…</option>
            {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="border border-slate-300 rounded px-3 py-2 text-sm" />
        </div>
        {selectedContract && (
          <button onClick={generate} disabled={generating}
            className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50">
            {generating ? 'Generating…' : 'Generate salaries'}
          </button>
        )}
        {salaries.some(s => s.status === 'draft') && (
          <button onClick={approveAll}
            className="bg-green-700 text-white px-4 py-2 rounded text-sm hover:bg-green-600">
            Approve all drafts
          </button>
        )}
      </div>

      {selectedContract && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Salaries — {selectedMonth}</h2>
            {totalApproved > 0 && (
              <span className="text-sm font-medium text-slate-700">Approved total: R{totalApproved.toFixed(2)}</span>
            )}
          </div>
          {loading ? <p className="p-4 text-slate-500">Loading…</p> : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-2">Staff</th>
                  <th className="text-right px-4 py-2">Working days</th>
                  <th className="text-right px-4 py-2">Unpaid absent</th>
                  <th className="text-right px-4 py-2">Days worked</th>
                  <th className="text-right px-4 py-2">Daily rate</th>
                  <th className="text-right px-4 py-2">Amount</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salaries.map(s => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 text-slate-800">{s.staff?.name}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{s.working_days_in_month}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{s.days_absent_unpaid}</td>
                    <td className="px-4 py-2 text-right text-slate-700 font-medium">{s.days_worked}</td>
                    <td className="px-4 py-2 text-right text-slate-600">R{s.staff?.daily_rate}</td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-800">R{Number(s.amount).toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {s.status === 'draft' && (
                        <button onClick={() => approve(s.id)}
                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {salaries.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-3 text-slate-500">No salaries for this period. Click "Generate salaries" to create drafts.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
