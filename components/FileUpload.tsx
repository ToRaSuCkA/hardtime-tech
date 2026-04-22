'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, Loader2, X } from 'lucide-react'

interface Props {
  onResults: (results: unknown[]) => void
  onError: (msg: string) => void
}

const ACCEPTED = '.csv,.xlsx,.xls,.docx,.doc,.txt'

export function FileUpload({ onResults, onError }: Props) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  async function handleUpload() {
    if (!file || loading) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onResults(data.results)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition
          ${dragging ? 'border-ht-accent bg-ht-accent/5' : 'border-ht-border hover:border-ht-accent/40 hover:bg-ht-card/50'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
        />
        <Upload className="w-8 h-8 text-ht-muted mx-auto mb-3" />
        <p className="text-sm text-ht-text font-medium">
          {file ? file.name : 'Drop a file here or click to browse'}
        </p>
        <p className="text-xs text-ht-muted mt-1">CSV, Excel (.xlsx), Word (.docx), or plain text</p>
      </div>

      {file && (
        <div className="flex items-center justify-between bg-ht-card border border-ht-border rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-ht-text">
            <FileText className="w-4 h-4 text-ht-accent" />
            <span className="truncate max-w-xs">{file.name}</span>
            <span className="text-ht-muted text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={e => { e.stopPropagation(); setFile(null) }}
              className="text-ht-muted hover:text-ht-text transition"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleUpload() }}
              disabled={loading}
              className="flex items-center gap-1.5 bg-ht-accent hover:bg-red-600 disabled:opacity-40 text-white text-xs font-medium px-3 py-1.5 rounded-md transition"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {loading ? 'Processing…' : 'Process File'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
