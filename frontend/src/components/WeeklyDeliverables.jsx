import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function getMonday(d = new Date()) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

export default function WeeklyDeliverables({ contractId }) {
  const { profile } = useAuth()
  const [weekStart, setWeekStart] = useState(getMonday())
  const [deliverables, setDeliverables] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ task_name: '', description: '', estimated_hours: '' })
  const [error, setError] = useState(null)

  useEffect(() => { fetchDeliverables() }, [contractId, weekStart])

  async function fetchDeliverables() {
    setLoading(true)
    const { data, error } = await supabase
      .from('weekly_deliverables')
      .select('*')
      .eq('contract_id', contractId)
      .eq('week_start', weekStart)
      .order('created_at')
    if (!error) setDeliverables(data || [])
    setLoading(false)
  }

  async function addDeliverable(e) {
    e.preventDefault()
    const { error } = await supabase.from('weekly_deliverables').insert({
      contract_id: contractId,
      week_start: weekStart,
      task_name: form.task_name,
      description: form.description,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      created_by: profile.id
    })
    if (error) { setError(error.message); return }
    setForm({ task_name: '', description: '', estimated_hours: '' })
    setShowForm(false)
    fetchDeliverables()
  }

  async function updateStatus(id, status) {
    await supabase.from('weekly_deliverables').update({ status }).eq('id', id)
    fetchDeliverables()
  }

  async function deleteDeliverable(id) {
    await supabase.from('weekly_deliverables').delete().eq('id', id)
    fetchDeliverables()
  }

  const statusColors = {
    pending: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700'
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Weekly Deliverables</h2>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-500">Week of:</label>
          <input
            type="date"
            value={weekStart}
            onChange={e => setWeekStart(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            + Add Task
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={addDeliverable} className="mb-4 bg-gray-50 rounded-lg p-4 space-y-3">
          <input
            required
            placeholder="Task name"
            value={form.task_name}
            onChange={e => setForm({ ...form, task_name: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
            rows={2}
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Estimated hours"
              value={form.estimated_hours}
              onChange={e => setForm({ ...form, estimated_hours: e.target.value })}
              className="border rounded px-3 py-2 text-sm w-40"
              min="0"
              step="0.5"
            />
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
              Save
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 text-sm px-3 py-2">
              Cancel
            </button>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : deliverables.length === 0 ? (
        <p className="text-sm text-gray-400">No tasks logged for this week.</p>
      ) : (
        <div className="space-y-2">
          {deliverables.map(d => (
            <div key={d.id} className="flex items-start gap-3 border rounded-lg p-3">
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-800">{d.task_name}</p>
                {d.description && <p className="text-xs text-gray-500 mt-0.5">{d.description}</p>}
                {d.estimated_hours && (
                  <p className="text-xs text-gray-400 mt-1">Est: {d.estimated_hours}h</p>
                )}
              </div>
              <select
                value={d.status}
                onChange={e => updateStatus(d.id, e.target.value)}
                className={`text-xs rounded-full px-2 py-1 border-0 font-medium ${statusColors[d.status]}`}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <button
                onClick={() => deleteDeliverable(d.id)}
                className="text-gray-300 hover:text-red-500 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
