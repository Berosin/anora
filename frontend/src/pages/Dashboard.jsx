import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Layers, MessagesSquare, HardDrive, Plus } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import * as kbService from '../services/knowledgeBase.service'
import * as docService from '../services/document.service'
import * as chatService from '../services/chat.service'

function formatBytes(bytes) {
  if (!bytes) return '0 MB'
  const mb = bytes / (1024 * 1024)
  return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const { user } = useAuth()
  const firstName = user?.name?.split(' ')[0]

  const [knowledgeBases, setKnowledgeBases] = useState([])
  const [documents, setDocuments] = useState([])
  const [conversations, setConversations] = useState([])
  const [usage, setUsage] = useState({ questionsAsked: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      kbService.listKnowledgeBases(),
      docService.listDocuments(),
      chatService.listConversations(),
      api.get('/usage/summary'),
    ])
      .then(([kbs, docs, convos, usageRes]) => {
        setKnowledgeBases(kbs)
        setDocuments(docs)
        setConversations(convos)
        setUsage(usageRes.data.usage)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const storageUsedBytes = documents.reduce((sum, d) => sum + (d.fileSizeBytes || 0), 0)

  const stats = [
    { label: 'Knowledge bases', value: String(knowledgeBases.length), icon: Layers },
    { label: 'Documents', value: String(documents.length), icon: FileText },
    { label: 'Questions asked', value: String(usage.questionsAsked ?? 0), icon: MessagesSquare },
    { label: 'Storage used', value: formatBytes(storageUsedBytes), icon: HardDrive },
  ]

  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  const recentConversations = [...conversations]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5)

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={firstName ? `Welcome, ${firstName}` : 'Welcome to ANORA'}
        subtitle="A snapshot of your knowledge bases, documents, and activity."
        action={
          <Link to="/knowledge-bases" className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus size={16} /> New knowledge base
          </Link>
        }
      />

      <div className="px-8 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="card p-5">
              <Icon size={18} className="text-signal mb-4" strokeWidth={1.75} />
              <div className="font-display text-2xl text-text mb-1">{isLoading ? '—' : value}</div>
              <div className="label-mono">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="label-mono mb-4">Recent documents</div>
            {isLoading ? (
              <div className="py-10 text-center text-sm text-muted">Loading…</div>
            ) : recentDocuments.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted">
                No documents yet. Once you upload one, its processing status will show up here.
              </div>
            ) : (
              <div className="space-y-3">
                {recentDocuments.map((doc) => (
                  <div key={doc._id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-text truncate">{doc.originalFileName}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={doc.status} />
                      <span className="font-mono text-xs text-faint">{formatDate(doc.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="label-mono mb-4">Recent conversations</div>
            {isLoading ? (
              <div className="py-10 text-center text-sm text-muted">Loading…</div>
            ) : recentConversations.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted">
                No conversations yet. Ask a question in a knowledge base to start one.
              </div>
            ) : (
              <div className="space-y-3">
                {recentConversations.map((c) => (
                  <Link
                    key={c._id}
                    to={`/chat?kbId=${c.knowledgeBaseId}`}
                    className="flex items-center justify-between gap-3 hover:text-signal transition-colors"
                  >
                    <span className="text-sm text-text truncate">{c.title || 'New conversation'}</span>
                    <span className="font-mono text-xs text-faint shrink-0">{formatDate(c.updatedAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}