import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function StockPage() {
  const { id: contractId } = useParams()
  const { user } = useAuth()
  const [consumables, setConsumables] = useState([])
  const [balances, setBalances] = useState({})
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ consumable_id: '', type: 'delivered', quantity: '', day: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from('consumables').select('*').order('name'),
      supabase.from('stock_movements')
        .select('*, consumables(name, unit)')
        .eq('contract_id', contractId)
        .order('day', { ascending: false })
        .limit(50),
    ])
    setConsumables(c || [])
    setMovements(m || [])

    // Compute balances
    const bal = {}
    ;(m || []).forEach(mv => {
      if (!bal[mv.consumable_id]) bal[mv.consumable_id] = 0
      bal[mv.consumable_id] += mv.type === 'delivered' ? Number(mv.quantity) : -Number(mv.quantity)
    })
    // Also fetch all movements (not just last 50) for accurate balance
    const { data: all } = await supabase.from('stock_movements')
      .select('consumable_id, type, quantity')
      .eq('contract_id', contractId)
    const allBal = {}
    ;(all || []).forEach(mv => {
      if (!allBal[mv.consumable_id]) allBal[mv.consumable_id] = 0
      allBal[mv.consumable_id] += mv.type === 'delivered' ? Number(mv.quantity) : -Number(mv.quantity)
    })
    setBalances(allBal)
    setLoading(false)
  }

  useEffect(() => { load() }, [contractId])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('stock_movements').insert({
      ...form,
      quantity: parseFloat(form.quantity),
      contract_id: contractId,
      created_by: user.id,
    })
    if (error) { setError(error.message); setSaving(false); return }

    // After a "used" movement, check if balance is now below reorder threshold
    if (form.type === 'used') {
      await checkAndRaiseLowStockIssue(form.consumable_id)
    }

    setForm({ consumable_id: '', type: 'delivered', quantity: '', day: '', notes: '' })
    load()
    setSaving(false)
  }

  async function checkAndRaiseLowStockIssue(consumableId) {
    // Compute current balance for this consumable on this contract
    const { data: allMoves } = await supabase
      .from('stock_movements')
      .select('type, quantity')
      .eq('contract_id', contractId)
      .eq('consumable_id', consumableId)

    const balance = (allMoves || []).reduce((sum, m) =>
      sum + (m.type === 'delivered' ? Number(m.quantity) : -Number(m.quantity)), 0)

    const consumable = consumables.find(c => c.id === consumableId)
    if (!consumable || balance >= (consumable.reorder_threshold ?? 0)) return

    // Check if an open low_stock issue already exists for this consumable + contract
    const { data: existing } = await supabase
      .from('issues')
      .select('id')
      .eq('contract_id', contractId)
      .eq('type', 'low_stock')
      .eq('status', 'open')
      .ilike('subject', consumable.name)
      .limit(1)

    if (existing?.length) return // already open, don't duplicate

    await supabase.from('issues').insert({
      contract_id: contractId,
      type: 'low_stock',
      subject: consumable.name,
      description: `Balance is ${balance.toFixed(1)} ${consumable.unit} — below reorder threshold of ${consumable.reorder_threshold} ${consumable.unit}.`,
      status: 'open',
      created_by: user.id,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/contracts/${contractId}`} className="text-slate-500 hover:text-slate-700 text-sm">← Contract</Link>
        <h1 className="text-xl font-bold text-slate-800">Stock Movements</h1>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      {/* Balances */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {consumables.map(c => {
            const bal = balances[c.id] ?? 0
            const low = bal < c.reorder_threshold
            return (
              <div key={c.id} className={`bg-white rounded-lg shadow p-3 ${low ? 'border border-amber-300' : ''}`}>
                <p className="text-xs text-slate-500">{c.name}</p>
                <p className={`text-xl font-bold ${low ? 'text-amber-600' : 'text-slate-800'}`}>{bal.toFixed(1)}</p>
                <p className="text-xs text-slate-400">{c.unit} {low ? '⚠ Low' : ''}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Log movement */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-slate-700 mb-3">Log Movement</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Item *</label>
            <select required value={form.consumable_id} onChange={e => setForm({ ...form, consumable_id: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
              <option value="">Select…</option>
              {consumables.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
              <option value="delivered">Delivered</option>
              <option value="used">Used</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Quantity *</label>
            <input type="number" step="0.01" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
            <input type="date" required value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <button type="submit" disabled={saving}
              className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Log movement'}
            </button>
          </div>
        </form>
      </div>

      {/* Movement log */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Recent Movements</h2>
        </div>
        {loading ? <p className="p-4 text-slate-500">Loading…</p> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Item</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-right px-4 py-2">Qty</th>
                <th className="text-left px-4 py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map(m => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-slate-600">{m.day}</td>
                  <td className="px-4 py-2 text-slate-800">{m.consumables?.name}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.type === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-700">{m.quantity} {m.consumables?.unit}</td>
                  <td className="px-4 py-2 text-slate-500">{m.notes || '—'}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-3 text-slate-500">No movements logged.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
