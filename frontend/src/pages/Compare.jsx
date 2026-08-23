import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GitCompareArrows, Loader2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import FormattedAiText from '../components/FormattedAiText'
import * as kbService from '../services/knowledgeBase.service'
import * as docService from '../services/document.service'
import * as aiService from '../services/ai.service'

export default function Compare() {
  const [knowledgeBases, setKnowledgeBases] = useState([])
  const [kbId, setKbId] = useState('')
  const [documents, setDocuments] = useState([])
  const [documentIdA, setDocumentIdA] = useState('')
  const [documentIdB, setDocumentIdB] = useState('')
  const [result, setResult] = useState(null)
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [isComparing, setIsComparing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    kbService.listKnowledgeBases().then(setKnowledgeBases).catch(() => {})
  }, [])

  useEffect(() => {
    setDocumentIdA('')
    setDocumentIdB('')
    setResult(null)
    if (!kbId) {
      setDocuments([])
      return
    }
    setIsLoadingDocs(true)
    docService
      .listDocuments({ kbId })
      .then((docs) => setDocuments(docs.filter((d) => d.status === 'READY')))
      .catch(() => {})
      .finally(() => setIsLoadingDocs(false))
  }, [kbId])

  const canCompare = documentIdA && documentIdB && documentIdA !== documentIdB

  const handleCompare = async () => {
    if (!canCompare) return
    setIsComparing(true)
    setError('')
    setResult(null)
    try {
      const data = await aiService.compareDocuments(documentIdA, documentIdB)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not compare these documents.')
    } finally {
      setIsComparing(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Compare"
        title="Document comparison"
        subtitle="See what changed between two versions of a document — additions, removals, and changed requirements."
      />

      <div className="px-8 py-8 max-w-2xl">
        <select value={kbId} onChange={(e) => setKbId(e.target.value)} className="input-field mb-4">
          <option value="">Select a knowledge base…</option>
          {knowledgeBases.map((kb) => (
            <option key={kb._id} value={kb._id}>{kb.name}</option>
          ))}
        </select>

        {kbId && !isLoadingDocs && documents.length < 2 && (
          <p className="text-sm text-muted mb-4">
            You need at least two ready documents in this knowledge base to compare.{' '}
            <Link to={`/documents?kbId=${kbId}`} className="text-signal hover:underline">Upload more</Link>.
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="label-mono block mb-2">Document A</label>
            <select
              value={documentIdA}
              onChange={(e) => setDocumentIdA(e.target.value)}
              disabled={!kbId || isLoadingDocs}
              className="input-field disabled:opacity-60"
            >
              <option value="">Select…</option>
              {documents.map((doc) => (
                <option key={doc._id} value={doc._id} disabled={doc._id === documentIdB}>
                  {doc.originalFileName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-mono block mb-2">Document B</label>
            <select
              value={documentIdB}
              onChange={(e) => setDocumentIdB(e.target.value)}
              disabled={!kbId || isLoadingDocs}
              className="input-field disabled:opacity-60"
            >
              <option value="">Select…</option>
              {documents.map((doc) => (
                <option key={doc._id} value={doc._id} disabled={doc._id === documentIdA}>
                  {doc.originalFileName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={!canCompare || isComparing}
          className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-60 mb-6"
        >
          {isComparing ? <Loader2 size={15} className="animate-spin" /> : <GitCompareArrows size={15} />}
          {isComparing ? 'Comparing…' : 'Compare documents'}
        </button>

        {error && <p className="text-sm text-failed mb-4">{error}</p>}

        {result && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4 label-mono">
              <span>{result.documentA}</span>
              <GitCompareArrows size={13} />
              <span>{result.documentB}</span>
            </div>
            <FormattedAiText text={result.comparison} />
          </div>
        )}
      </div>
    </div>
  )
}
