import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function MoveAssetForm({ asset, currentContractId, allContracts, onSuccess }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    to_contract_id: '',
    quantity: 1,
    condition: 'good',
    movement_type: 'placement',
    moved_on: new Date().toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleMove(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('asset_locations').insert({
      asset_id: asset.id,
      contract_id: form.movement_type === 'cross_site_transfer'
        ? form.to_contract_id
        : currentContractId,
      from_contract_id: currentContractId,
      quantity: parseInt(form.quantity),
      condition: form.condition,
      movement_type: form.movement_type,
      moved_on: form.moved_on,
      created_by: profile.id
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    onSuccess?.()
  }

  const otherContracts = allContracts.filter(c => c.id !== currentContractId)

  return (
    <form onSubmit={handleMove} className="space-y-3 mt-3">
      <div>
        <label className="text-xs text-gray-500">Movement type</label>
        <select
          value={form.movement_type}
          onChange={e => setForm({ ...form, movement_type: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm mt-1"
        >
          <option value="placement">Assign to this contract</option>
          <option value="cross_site_transfer">Transfer to another site / contract</option>
          <option value="return">Return to pool</option>
        </select>
      </div>

      {form.movement_type === 'cross_site_transfer' && (
        <div>
          <label className="text-xs text-gray-500">Transfer to contract</label>
          <select
            required
            value={form.to_contract_id}
            onChange={e => setForm({ ...form, to_contract_id: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm mt-1"
          >
            <option value="">Select contract...</option>
            {otherContracts.map(c => (
              <option key={c.id} value={c.id}>
                {c.sites?.name} — {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500">Quantity</label>
          <input
            type="number" min="1"
            value={form.quantity}
            onChange={e => setForm({ ...form, quantity: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm mt-1"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500">Condition</label>
          <select
            value={form.condition}
            onChange={e => setForm({ ...form, condition: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm mt-1"
          >
            <option value="good">Good</option>
            <option value="worn">Worn</option>
            <option value="damaged">Damaged</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500">Date</label>
          <input
            type="date"
            value={form.moved_on}
            onChange={e => setForm({ ...form, moved_on: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm mt-1"
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Log Movement'}
      </button>
    </form>
  )
}
