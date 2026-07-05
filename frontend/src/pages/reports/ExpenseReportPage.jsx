import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function ExpenseReportPage() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [report, setReport] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { loadReport() }, [selectedMonth])

  async function loadReport() {
    setLoading(true)
    setError(null)

    const [year, month] = selectedMonth.split('-').map(Number)
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`

    // Fetch all active contracts with site info
    const { data: contracts, error: cErr } = await supabase
      .from('contracts')
      .select('id, name, sites(id, name, client_name)')
      .eq('is_active', true)
      .order('name')
    if (cErr) { setError(cErr.message); setLoading(false); return }

    const contractIds = (contracts || []).map(c => c.id)
    if (!contractIds.length) { setReport([]); setLoading(false); return }

    // Fetch approved/paid salaries for the month
    const { data: salaries } = await supabase
      .from('salaries')
      .select('contract_id:staff(contract_id), amount, status, staff(contract_id)')
      .in('status', ['approved', 'paid'])
      .eq('month', selectedMonth)

    // Salary totals per contract — join via staff
    // Re-fetch with explicit staff join
    const { data: salaryRows } = await supabase
      .from('salaries')
      .select('amount, status, staff!inner(contract_id)')
      .in('status', ['approved', 'paid'])
      .eq('month', selectedMonth)
      .in('staff.contract_id', contractIds)

    const salaryByContract = {}
    ;(salaryRows || []).forEach(s => {
      const cid = s.staff?.contract_id
      if (cid) salaryByContract[cid] = (salaryByContract[cid] || 0) + Number(s.amount)
    })

    // Fetch stock deliveries for the month (delivered = spend)
    const { data: stockRows } = await supabase
      .from('stock_movements')
      .select('contract_id, quantity, consumables(unit_cost)')
      .eq('type', 'delivered')
      .gte('day', monthStart)
      .lte('day', monthEnd)
      .in('contract_id', contractIds)

    const stockByContract = {}
    ;(stockRows || []).forEach(s => {
      const cost = Number(s.consumables?.unit_cost || 0) * Number(s.quantity)
      stockByContract[s.contract_id] = (stockByContract[s.contract_id] || 0) + cost
    })

    // Fetch open issue counts for the month
    const { data: issueRows } = await supabase
      .from('issues')
      .select('contract_id')
      .in('contract_id', contractIds)
      .gte('created_at', `${monthStart}T00:00:00`)
      .lte('created_at', `${monthEnd}T23:59:59`)

    const issuesByContract = {}
    ;(issueRows || []).forEach(i => {
      issuesByContract[i.contract_id] = (issuesByContract[i.contract_id] || 0) + 1
    })

    // Build report rows grouped by site
    const siteMap = {}
    ;(contracts || []).forEach(c => {
      const siteName = c.sites?.name || 'Unknown Site'
      const clientName = c.sites?.client_name || ''
      if (!siteMap[siteName]) siteMap[siteName] = { clientName, contracts: [] }
      const salary = salaryByContract[c.id] || 0
      const stock = stockByContract[c.id] || 0
      const issues = issuesByContract[c.id] || 0
      siteMap[siteName].contracts.push({ id: c.id, name: c.name, salary, stock, issues, total: salary + stock })
    })

    // Sort sites alphabetically
    const rows = Object.entries(siteMap).sort(([a], [b]) => a.localeCompare(b))
    setReport(rows)
    setLoading(false)
  }

  const grandTotalSalary = report.reduce((s, [, site]) => s + site.contracts.reduce((a, c) => a + c.salary, 0), 0)
  const grandTotalStock  = report.reduce((s, [, site]) => s + site.contracts.reduce((a, c) => a + c.stock, 0), 0)
  const grandTotal       = grandTotalSalary + grandTotalStock

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-800">Monthly Expense Report</h1>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="border border-slate-300 rounded px-3 py-2 text-sm" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      {/* Grand total tiles */}
      {!loading && report.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-600 font-medium">Total Salaries</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">R{grandTotalSalary.toLocaleString()}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <p className="text-xs text-amber-600 font-medium">Total Consumables</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">R{grandTotalStock.toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs text-slate-600 font-medium">Grand Total</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">R{grandTotal.toLocaleString()}</p>
          </div>
        </div>
      )}

      {loading ? <p className="text-slate-500">Loading…</p> : (
        <div className="space-y-4">
          {report.length === 0 && (
            <p className="text-slate-500">No data for {selectedMonth}.</p>
          )}
          {report.map(([siteName, site]) => {
            const siteSalary = site.contracts.reduce((a, c) => a + c.salary, 0)
            const siteStock  = site.contracts.reduce((a, c) => a + c.stock, 0)
            const siteTotal  = siteSalary + siteStock
            const siteIssues = site.contracts.reduce((a, c) => a + c.issues, 0)
            return (
              <div key={siteName} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Site header */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-800">{siteName}</h2>
                    {site.clientName && <p className="text-xs text-slate-500">Client: {site.clientName}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">R{siteTotal.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{siteIssues} issue{siteIssues !== 1 ? 's' : ''} logged</p>
                  </div>
                </div>

                {/* Contract rows */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
                      <tr>
                        <th className="text-left px-4 py-2">Contract</th>
                        <th className="text-right px-4 py-2">Salaries</th>
                        <th className="text-right px-4 py-2">Consumables</th>
                        <th className="text-right px-4 py-2">Issues</th>
                        <th className="text-right px-4 py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {site.contracts.map(c => (
                        <tr key={c.id}>
                          <td className="px-4 py-2 text-slate-700 font-medium">{c.name}</td>
                          <td className="px-4 py-2 text-right text-slate-600">
                            {c.salary > 0 ? `R${c.salary.toLocaleString()}` : '—'}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-600">
                            {c.stock > 0 ? `R${c.stock.toLocaleString()}` : '—'}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-600">{c.issues || '—'}</td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-800">
                            {c.total > 0 ? `R${c.total.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                      <tr>
                        <td className="px-4 py-2 text-xs font-medium text-slate-500">Site total</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-700">R{siteSalary.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-700">R{siteStock.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-700">{siteIssues}</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-800">R{siteTotal.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && grandTotalStock === 0 && report.length > 0 && (
        <p className="text-xs text-slate-400">
          Note: consumable costs show R0 unless a <code>unit_cost</code> is set on each consumable in Admin → Setup.
        </p>
      )}
    </div>
  )
}
