import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Upload, Trash2, FileText, Search } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import * as kbService from '../services/knowledgeBase.service'
import * as docService from '../services/document.service'

const ACTIVE_STATUSES = new Set(['UPLOADING', 'PROCESSING', 'INDEXING'])

function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(0)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Documents() {
  const [searchParams, setSearchParams] = useSearchParams()
  const kbId = searchParams.get('kbId') || ''

  const [knowledgeBases, setKnowledgeBases] = useState([])
  const [documents, setDocuments] = useState([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    kbService.listKnowledgeBases().then(setKnowledgeBases).catch(() => {})
  }, [])

  const loadDocuments = useCallback(async () => {
    if (!kbId) {
      setDocuments([])
      setIsLoading(false)
      return
    }
    try {
      const data = await docService.listDocuments({ kbId, search: search || undefined })
      setDocuments(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load documents.')
    } finally {
      setIsLoading(false)
    }
  }, [kbId, search])

  useEffect(() => {
    setIsLoading(true)
    loadDocuments()
  }, [loadDocuments])

  // Poll while any document is still UPLOADING/PROCESSING/INDEXING, so a
  // status change (e.g. once the AI service exists in a later phase)
  // shows up without a manual refresh.
  useEffect(() => {
    const hasActive = documents.some((d) => ACTIVE_STATUSES.has(d.status))
    if (!hasActive) return
    const interval = setInterval(loadDocuments, 4000)
    return () => clearInterval(interval)
  }, [documents, loadDocuments])

  const handleSelectKb = (id) => {
    setSearchParams(id ? { kbId: id } : {})
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !kbId) return
    setIsUploading(true)
    setError('')
    try {
      const document = await docService.uploadDocument({ file, kbId })
      setDocuments((prev) => [document, ...prev])
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return
    const previous = documents
    setDocuments((prev) => prev.filter((d) => d._id !== id))
    try {
      await docService.deleteDocument(id)
    } catch (err) {
      setDocuments(previous)
      setError(err.response?.data?.message || 'Could not delete the document.')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Documents"
        title="Documents"
        subtitle="Upload PDFs, Word documents, and text files into a knowledge base."
      />

      <div className="px-8 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={kbId}
            onChange={(e) => handleSelectKb(e.target.value)}
            className="input-field w-auto min-w-[220px]"
          >
            <option value="">Select a knowledge base…</option>
            {knowledgeBases.map((kb) => (
              <option key={kb._id} value={kb._id}>{kb.name}</option>
            ))}
          </select>

          {kbId && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                className="input-field pl-8 w-56"
                placeholder="Search documents"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          <div className="ml-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleUpload}
              className="hidden"
              id="file-upload"
              disabled={!kbId || isUploading}
            />
            <label
              htmlFor="file-upload"
              className={`btn-primary inline-flex items-center gap-2 text-sm cursor-pointer ${
                !kbId || isUploading ? 'opacity-60 pointer-events-none' : ''
              }`}
            >
              <Upload size={16} />
              {isUploading ? 'Uploading…' : 'Upload document'}
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-failed mb-4">{error}</p>}

        {!kbId ? (
          <div className="card p-10 text-center text-sm text-muted">
            {knowledgeBases.length === 0 ? (
              <>
                You need a knowledge base first.{' '}
                <Link to="/knowledge-bases" className="text-signal hover:underline">Create one</Link>.
              </>
            ) : (
              'Select a knowledge base above to see and upload documents.'
            )}
          </div>
        ) : isLoading ? (
          <div className="text-sm text-muted">Loading…</div>
        ) : documents.length === 0 ? (
          <div className="card p-10 text-center text-sm text-muted">
            No documents yet. Upload a PDF, DOCX, or TXT file to get started.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left">
                  <th className="label-mono font-normal px-5 py-3">Name</th>
                  <th className="label-mono font-normal px-5 py-3">Status</th>
                  <th className="label-mono font-normal px-5 py-3">Size</th>
                  <th className="label-mono font-normal px-5 py-3">Uploaded</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc._id} className="border-b border-hairline last:border-0">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2 text-text">
                        <FileText size={14} className="text-faint shrink-0" />
                        <span className="truncate max-w-xs">{doc.originalFileName}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={doc.status} /></td>
                    <td className="px-5 py-3 font-mono text-xs text-muted">{formatBytes(doc.fileSizeBytes)}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted">{formatDate(doc.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="text-faint hover:text-failed transition-colors"
                        aria-label={`Delete ${doc.originalFileName}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
