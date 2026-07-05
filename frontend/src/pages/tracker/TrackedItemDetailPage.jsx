import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function TrackedItemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [extensions, setExtensions] = useState([])
  const [alerts, setAlerts] = useState([])
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [extending, setExtending] = useState(false)
  const [extReason, setExtReason] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  async function load() {
    const [{ data: it }, { data: ex }, { data: al }, { data: fi }] = await Promise.all([
      supabase.from('tracked_items').select('*').eq('id', id).single(),
      supabase.from('extensions').select('*').eq('tracked_item_id', id).order('created_at', { ascending: false }),
      supabase.from('alerts').select('*').eq('tracked_item_id', id).order('scheduled_for', { ascending: false }),
      supabase.from('document_files').select('*').eq('tracked_item_id', id).order('uploaded_at', { ascending: false }),
    ])
    setItem(it)
    setExtensions(ex || [])
    setAlerts(al || [])
    setFiles(fi || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function extendOneMonth() {
    if (!item) return
    setExtending(true)
    setError(null)
    const oldAlert = item.next_alert_date
    const newExpiry = new Date(item.expiry_date)
    newExpiry.setMonth(newExpiry.getMonth() + 1)
    const newExpiryStr = newExpiry.toISOString().slice(0, 10)
    const nd = new Date(newExpiryStr)
    nd.setDate(nd.getDate() - parseInt(item.alert_lead_days || 30))
    const newAlertStr = nd.toISOString().slice(0, 10)

    const { error: e1 } = await supabase.from('tracked_items')
      .update({ expiry_date: newExpiryStr, next_alert_date: newAlertStr })
      .eq('id', id)

    if (!e1) {
      await supabase.from('extensions').insert({
        tracked_item_id: id,
        original_alert_date: oldAlert,
        new_alert_date: newAlertStr,
        reason: extReason || 'Extended by 1 month',
      })
      setExtReason('')
      load()
    } else {
      setError(e1.message)
    }
    setExtending(false)
  }

  async function uploadFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const path = `tracked-items/${id}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
    if (upErr) { setError(upErr.message); setUploading(false); return }
    await supabase.from('document_files').insert({ tracked_item_id: id, filename: file.name, storage_path: path })
    load()
    setUploading(false)
    fileRef.current.value = ''
  }

  async function getFileUrl(path) {
    const { data } = await supabase.storage.from('documents').createSignedUrl(path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function markStatus(status) {
    await supabase.from('tracked_items').update({ status }).eq('id', id)
    navigate('/tracker')
  }

  if (loading) return <p className="text-slate-500">Loading…</p>
  if (!item) return <p className="text-slate-500">Not found.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/tracker" className="text-slate-500 hover:text-slate-700 text-sm">← Tracker</Link>
        <h1 className="text-xl font-bold text-slate-800">{item.name}</h1>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      <div className="bg-white rounded-lg shadow p-4 space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><span className="text-xs text-slate-500 block">Type</span>{item.type}</div>
          <div><span className="text-xs text-slate-500 block">Institution</span>{item.institution || '—'}</div>
          <div><span className="text-xs text-slate-500 block">Effective</span>{item.effective_date || '—'}</div>
          <div><span className="text-xs text-slate-500 block">Expires</span><strong>{item.expiry_date}</strong></div>
          <div><span className="text-xs text-slate-500 block">Alert lead</span>{item.alert_lead_days} days</div>
          <div><span className="text-xs text-slate-500 block">Next alert</span>{item.next_alert_date}</div>
          <div><span className="text-xs text-slate-500 block">Status</span>{item.status}</div>
        </div>
        {item.notes && <p className="text-sm text-slate-600 pt-2">{item.notes}</p>}

        <div className="flex flex-wrap gap-2 pt-2">
          <div className="flex gap-2">
            <input value={extReason} onChange={e => setExtReason(e.target.value)}
              placeholder="Reason (optional)"
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-48" />
            <button onClick={extendOneMonth} disabled={extending}
              className="bg-blue-700 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-600 disabled:opacity-50">
              {extending ? '…' : 'Extend 1 month'}
            </button>
          </div>
          <button onClick={() => markStatus('renewed')}
            className="bg-green-700 text-white px-3 py-1.5 rounded text-sm hover:bg-green-600">
            Mark renewed
          </button>
          <button onClick={() => markStatus('expired')}
            className="bg-red-100 text-red-700 px-3 py-1.5 rounded text-sm hover:bg-red-200">
            Mark expired
          </button>
        </div>
      </div>

      {/* Document upload */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-slate-700 mb-3">Documents</h2>
        <div className="mb-3">
          <input ref={fileRef} type="file" onChange={uploadFile} disabled={uploading}
            className="text-sm text-slate-600" />
          {uploading && <span className="ml-2 text-sm text-slate-500">Uploading…</span>}
        </div>
        <div className="space-y-1">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-2 text-sm">
              <button onClick={() => getFileUrl(f.storage_path)}
                className="text-blue-600 hover:underline">{f.filename}</button>
              <span className="text-slate-400 text-xs">{new Date(f.uploaded_at).toLocaleDateString()}</span>
            </div>
          ))}
          {files.length === 0 && <p className="text-sm text-slate-500">No documents uploaded.</p>}
        </div>
      </div>

      {/* Extension history */}
      {extensions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-slate-700 mb-3">Extension History</h2>
          <div className="space-y-2">
            {extensions.map(ex => (
              <div key={ex.id} className="text-sm border-b border-slate-100 pb-2">
                <p className="text-slate-700">{ex.reason || 'No reason'}</p>
                <p className="text-xs text-slate-400">{new Date(ex.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert history */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-slate-700 mb-3">Alert History</h2>
          <div className="space-y-1">
            {alerts.map(a => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'sent' ? 'bg-green-100 text-green-700' : a.status === 'acknowledged' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                  {a.status}
                </span>
                <span className="text-slate-600">{a.scheduled_for}</span>
                <span className="text-slate-400 text-xs">{a.channel}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
