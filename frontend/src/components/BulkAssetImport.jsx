import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function BulkAssetImport({ onSuccess }) {
  const [preview, setPreview] = useState([])
  const [error, setError] = useState(null)
  const [importing, setImporting] = useState(false)

  function parseCSV(text) {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim())
      return Object.fromEntries(headers.map((h, i) => [h, vals[i]]))
    })
  }

  function handleFile(e) {
    setError(null)
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const rows = parseCSV(ev.target.result)
        const required = ['name', 'category']
        const headers = Object.keys(rows[0] || {})
        const missing = required.filter(r => !headers.includes(r))
        if (missing.length) { setError(`Missing: ${missing.join(', ')}`); return }
        setPreview(rows)
      } catch { setError('Could not parse CSV') }
    }
    reader.readAsText(file)
  }

  async function doImport() {
    setImporting(true)
    const rows = preview.map(r => ({
      name: r.name,
      category: r.category,
      depletable: r.depletable?.toLowerCase() === 'true'
    }))
    const { error } = await supabase.from('assets').insert(rows)
    setImporting(false)
    if (error) { setError(error.message); return }
    setPreview([])
    onSuccess?.()
  }

  return (
    <div className="border-2 border-dashed rounded-lg p-4">
      <h3 className="font-medium text-gray-700 mb-2">Bulk Asset Import</h3>
      <p className="text-xs text-gray-400 mb-3">
        CSV format: <code>name,category,depletable</code>
      </p>
      <input type="file" accept=".csv" onChange={handleFile} className="text-sm" />
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      {preview.length > 0 && (
        <div className="mt-3">
          <p className="text-sm text-gray-600 mb-1">{preview.length} assets to import</p>
          <button
            onClick={doImport}
            disabled={importing}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {importing ? 'Importing...' : `Import ${preview.length} assets`}
          </button>
        </div>
      )}
    </div>
  )
}
