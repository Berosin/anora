import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Loader2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import FormattedAiText from '../components/FormattedAiText'
import * as kbService from '../services/knowledgeBase.service'
import * as docService from '../services/document.service'
import * as aiService from '../services/ai.service'

export default function Summarize() {
  const [knowledgeBases, setKnowledgeBases] = useState([])
  const [kbId, setKbId] = useState('')
  const [documents, setDocuments] = useState([])
  const [documentId, setDocumentId] = useState('')
  const [result, setResult] = useState(null)
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    kbService.listKnowledgeBases().then(setKnowledgeBases).catch(() => {})
  }, [])

  useEffect(() => {
    setDocumentId('')
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

  const handleGenerate = async () => {
    if (!documentId) return
    setIsGenerating(true)
    setError('')
    setResult(null)
    try {
      const data = await aiService.summarizeDocument(documentId)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate a summary for this document.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Summarize"
        title="Document summarization"
        subtitle="Turn a long document into an overview, key points, and important terms."
      />

      <div className="px-8 py-8 max-w-2xl">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select value={kbId} onChange={(e) => setKbId(e.target.value)} className="input-field w-auto min-w-[220px]">
            <option value="">Select a knowledge base…</option>
            {knowledgeBases.map((kb) => (
              <option key={kb._id} value={kb._id}>{kb.name}</option>
            ))}
          </select>

          <select
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            disabled={!kbId || isLoadingDocs}
            className="input-field w-auto min-w-[220px] disabled:opacity-60"
          >
            <option value="">
              {isLoadingDocs ? 'Loading documents…' : 'Select a document…'}
            </option>
            {documents.map((doc) => (
              <option key={doc._id} value={doc._id}>{doc.originalFileName}</option>
            ))}
          </select>

          <button
            onClick={handleGenerate}
            disabled={!documentId || isGenerating}
            className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-60"
          >
            {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {isGenerating ? 'Generating…' : 'Generate summary'}
          </button>
        </div>

        {kbId && !isLoadingDocs && documents.length === 0 && (
          <p className="text-sm text-muted">
            No ready documents in this knowledge base yet.{' '}
            <Link to={`/documents?kbId=${kbId}`} className="text-signal hover:underline">Upload one</Link>.
          </p>
        )}

        {error && <p className="text-sm text-failed mb-4">{error}</p>}

        {result && (
          <div className="card p-6">
            <div className="label-mono mb-3">{result.documentName}</div>
            <FormattedAiText text={result.summary} />
          </div>
        )}
      </div>
    </div>
  )
}
