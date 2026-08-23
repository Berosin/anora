import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, FileText, Loader2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import * as kbService from '../services/knowledgeBase.service'

export default function KnowledgeBases() {
  const [knowledgeBases, setKnowledgeBases] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [isSaving, setIsSaving] = useState(false)

  const load = async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await kbService.listKnowledgeBases()
      setKnowledgeBases(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load knowledge bases.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setIsSaving(true)
    setError('')
    try {
      const created = await kbService.createKnowledgeBase(form)
      setKnowledgeBases((prev) => [created, ...prev])
      setForm({ name: '', description: '' })
      setShowForm(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create the knowledge base.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this knowledge base and all its documents? This cannot be undone.')) return
    const previous = knowledgeBases
    setKnowledgeBases((prev) => prev.filter((kb) => kb._id !== id))
    try {
      await kbService.deleteKnowledgeBase(id)
    } catch (err) {
      setKnowledgeBases(previous)
      setError(err.response?.data?.message || 'Could not delete the knowledge base.')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Knowledge bases"
        title="Knowledge bases"
        subtitle="Group documents by topic. Each knowledge base has its own private index."
        action={
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus size={16} /> New knowledge base
          </button>
        }
      />

      <div className="px-8 py-8">
        {showForm && (
          <form onSubmit={handleCreate} className="card p-6 mb-6 space-y-4 max-w-lg">
            <div>
              <label className="label-mono block mb-2">Name</label>
              <input
                className="input-field"
                placeholder="Placement Preparation"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                maxLength={120}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label-mono block mb-2">Description (optional)</label>
              <input
                className="input-field"
                placeholder="Placement policy, eligibility rules, past interview notes"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                maxLength={500}
              />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={isSaving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {isSaving ? 'Creating…' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}

        {error && <p className="text-sm text-failed mb-6">{error}</p>}

        {isLoading ? (
          <div className="text-sm text-muted">Loading…</div>
        ) : knowledgeBases.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-sm text-muted mb-4">
              You don&apos;t have any knowledge bases yet. Create one to start uploading documents.
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2 text-sm">
              <Plus size={16} /> New knowledge base
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {knowledgeBases.map((kb) => (
              <div key={kb._id} className="card p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-display text-lg text-text">{kb.name}</h3>
                  <button
                    onClick={() => handleDelete(kb._id)}
                    className="text-faint hover:text-failed transition-colors shrink-0"
                    aria-label={`Delete ${kb.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {kb.description && (
                  <p className="text-sm text-muted mb-4 flex-1 line-clamp-2">{kb.description}</p>
                )}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-hairline">
                  <span className="label-mono flex items-center gap-1.5">
                    <FileText size={13} /> {kb.documentCount} document{kb.documentCount === 1 ? '' : 's'}
                  </span>
                  <Link to={`/documents?kbId=${kb._id}`} className="text-sm text-signal hover:underline">
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
