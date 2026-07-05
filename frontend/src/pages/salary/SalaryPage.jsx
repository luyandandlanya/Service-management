import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// Hardcoded daily rates by staff type
const DAILY_RATES = {
  team_member: 450,
  supervisor: 550,
  relief_staff: 350,
}

const STAFF_TYPE_LABELS = {
  team_member: 'Team member',
  supervisor: 'Supervisor',
  relief_staff: 'Relief staff',
}

// Parse "mon-fri" / "mon-sat" / "mon-sun" into JS getDay() numbers (0=Sun)
function parseWorkingDays(str) {
  const map = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
  const parts = (str || 'mon-fri').toLowerCase().split('-').map(s => s.trim())
  if (parts.length === 2 && map[parts[0]] !== undefined && map[parts[1]] !== undefined) {
    const days = new Set()
    for (let d = map[parts[0]]; d <= map[parts[1]]; d++) days.add(d)
    return days
  }
  return new Set([1, 2, 3, 4, 5]) // default mon-fri
}

function countWorkingDays(year, month, workingDayNums, holidaySet) {
  let count = 0
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    const iso = d.toISOString().split('T')[0]
    if (workingDayNums.has(d.getDay()) && !holidaySet.has(iso)) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function SalaryPage() {
  const { profile } = useAuth()
  const [contracts, setContracts] = useState([])
  const [selectedContract, setSelectedContract] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [salaries, setSalaries] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    supabase.from('contracts').select('id, name, working_days, pays_public_holidays')
      .eq('is_active', true).order('name')
      .then(({ data }) => setContracts(data || []))
  }, [])

  async function loadSalaries() {
    if (!selectedContract) { setSalaries([]); return }
    setLoading(true)
    setError(null)
    const { data: staffIds } = await supabase
      .from('staff').select('id').eq('contract_id', selectedContract)
    const ids = (staffIds || []).map(s => s.id)
    if (!ids.length) { setSalaries([]); setLoading(false); return }

    const { data, error } = await supabase
      .from('salaries')
      .select('*, staff(name, surname, staff_type)')
      .eq('month', selectedMonth)
      .in('staff_id', ids)
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
      const contract = contracts.find(c => c.id === selectedContract)
      if (!contract) throw new Error('Contract not found')

      const [year, month] = selectedMonth.split('-').map(Number)
      const workingDayNums = parseWorkingDays(contract.working_days)

      // Fetch public holidays if contract doesn't pay them
      let holidaySet = new Set()
      if (!contract.pays_public_holidays) {
        const { data: ph } = await supabase.from('public_holidays').select('date')
        ;(ph || []).forEach(h => holidaySet.add(h.date))
      }

      const workingDaysCount = countWorkingDays(year, month, workingDayNums, holidaySet)
      if (workingDaysCount === 0) throw new Error('No working days in selected month')

      // Active staff for this contract
      const { data: staffList, error: staffErr } = await supabase
        .from('staff').select('*').eq('contract_id', selectedContract).eq('active', true)
      if (staffErr) throw new Error(staffErr.message)
      if (!staffList?.length) throw new Error('No active staff on this contract')

      const staffIds = staffList.map(s => s.id)

      // Unpaid absences this month
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
      const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`
      const { data: absences } = await supabase
        .from('attendance')
        .select('staff_id')
        .in('staff_id', staffIds)
        .eq('absence_type', 'unpaid')
        .gte('day', monthStart)
        .lte('day', monthEnd)

      const unpaidCounts = {}
      ;(absences || []).forEach(a => {
        unpaidCounts[a.staff_id] = (unpaidCounts[a.staff_id] || 0) + 1
      })

      // Build salary records
      const records = staffList.map(s => {
        const dailyRate = DAILY_RATES[s.staff_type] ?? DAILY_RATES.team_member
        const unpaid = unpaidCounts[s.id] || 0
        const daysWorked = Math.max(workingDaysCount - unpaid, 0)
        const grossPay = dailyRate * workingDaysCount
        const deductions = unpaid * dailyRate
        const amount = daysWorked * dailyRate
        return {
          staff_id: s.id,
          month: selectedMonth,
          working_days_in_month: workingDaysCount,
          days_absent_unpaid: unpaid,
          days_worked: daysWorked,
          gross_pay: grossPay,
          day_rate: dailyRate,
          deductions,
          amount,
          status: 'draft',
        }
      })

      const { error: upsertErr } = await supabase
        .from('salaries')
        .upsert(records, { onConflict: 'staff_id,month', ignoreDuplicates: false })
      if (upsertErr) throw new Error(upsertErr.message)

      setMsg(`Generated ${records.length} salary draft${records.length !== 1 ? 's' : ''} · ${workingDaysCount} working days in ${selectedMonth}.`)
      loadSalaries()
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function approve(salaryId) {
    const { error } = await supabase
      .from('salaries')
      .update({ status: 'approved', approved_by: profile.id, approved_at: new Date().toISOString() })
      .eq('id', salaryId)
      .eq('status', 'draft')
    if (error) setError(error.message)
    else loadSalaries()
  }

  async function approveAll() {
    const drafts = salaries.filter(s => s.status === 'draft')
    for (const s of drafts) {
      await supabase.from('salaries')
        .update({ status: 'approved', approved_by: profile.id, approved_at: new Date().toISOString() })
        .eq('id', s.id)
    }
    loadSalaries()
  }

  async function markPaid(salaryId) {
    const { error } = await supabase
      .from('salaries').update({ status: 'paid' }).eq('id', salaryId).eq('status', 'approved')
    if (error) setError(error.message)
    else loadSalaries()
  }

  async function markAllPaid() {
    const approved = salaries.filter(s => s.status === 'approved')
    for (const s of approved) {
      await supabase.from('salaries').update({ status: 'paid' }).eq('id', s.id)
    }
    loadSalaries()
  }

  const totalDraft = salaries.filter(s => s.status === 'draft').reduce((sum, s) => sum + Number(s.amount), 0)
  const totalApproved = salaries.filter(s => s.status === 'approved').reduce((sum, s) => sum + Number(s.amount), 0)
  const totalPaid = salaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + Number(s.amount), 0)
  const hasDrafts = salaries.some(s => s.status === 'draft')
  const hasApproved = salaries.some(s => s.status === 'approved')

  const statusStyle = {
    draft: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    paid: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Salary Review</h1>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
      {msg && <p className="text-sm text-green-700 bg-green-50 p-3 rounded">{msg}</p>}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Contract</label>
          <select value={selectedContract} onChange={e => setSelectedContract(e.target.value)}
            className="border border-slate-300 rounded px-3 py-2 text-sm min-w-[200px]">
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
        {hasDrafts && (
          <button onClick={approveAll}
            className="bg-green-700 text-white px-4 py-2 rounded text-sm hover:bg-green-600">
            Approve all
          </button>
        )}
        {hasApproved && (
          <button onClick={markAllPaid}
            className="bg-blue-700 text-white px-4 py-2 rounded text-sm hover:bg-blue-600">
            Mark all paid
          </button>
        )}
      </div>

      {/* Summary tiles */}
      {salaries.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {totalDraft > 0 && (
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-xs text-amber-600 font-medium">Draft</p>
              <p className="text-2xl font-bold text-amber-800 mt-1">R{totalDraft.toLocaleString()}</p>
            </div>
          )}
          {totalApproved > 0 && (
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs text-green-600 font-medium">Approved</p>
              <p className="text-2xl font-bold text-green-800 mt-1">R{totalApproved.toLocaleString()}</p>
            </div>
          )}
          {totalPaid > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-blue-600 font-medium">Paid</p>
              <p className="text-2xl font-bold text-blue-800 mt-1">R{totalPaid.toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {selectedContract && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">Salaries — {selectedMonth}</h2>
          </div>
          {loading ? <p className="p-4 text-slate-500">Loading…</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs">
                  <tr>
                    <th className="text-left px-4 py-2">Name</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-right px-4 py-2">Day rate</th>
                    <th className="text-right px-4 py-2">Working days</th>
                    <th className="text-right px-4 py-2">Absent (unpaid)</th>
                    <th className="text-right px-4 py-2">Days worked</th>
                    <th className="text-right px-4 py-2">Deductions</th>
                    <th className="text-right px-4 py-2 font-semibold">Total pay</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salaries.map(s => (
                    <tr key={s.id}>
                      <td className="px-4 py-2 text-slate-800 font-medium">{s.staff?.name} {s.staff?.surname}</td>
                      <td className="px-4 py-2 text-slate-500 text-xs">{STAFF_TYPE_LABELS[s.staff?.staff_type] || '—'}</td>
                      <td className="px-4 py-2 text-right text-slate-600">R{Number(s.day_rate).toFixed(0)}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{s.working_days_in_month}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{s.days_absent_unpaid}</td>
                      <td className="px-4 py-2 text-right text-slate-700 font-medium">{s.days_worked}</td>
                      <td className="px-4 py-2 text-right text-red-600">
                        {Number(s.deductions) > 0 ? `-R${Number(s.deductions).toFixed(0)}` : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-slate-800">R{Number(s.amount).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[s.status]}`}>
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
                        {s.status === 'approved' && (
                          <button onClick={() => markPaid(s.id)}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                            Mark paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {salaries.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-4 text-slate-500">
                        No salaries for this period. Click "Generate salaries" to create drafts.
                      </td>
                    </tr>
                  )}
                </tbody>
                {salaries.length > 0 && (
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={7} className="px-4 py-2 text-xs text-slate-500 font-medium">Total payroll</td>
                      <td className="px-4 py-2 text-right font-bold text-slate-800">
                        R{salaries.reduce((sum, s) => sum + Number(s.amount), 0).toLocaleString()}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
