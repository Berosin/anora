import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Plus, Send, Trash2, Loader2, MessageSquareText } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ChatMessage from '../components/ChatMessage'
import * as kbService from '../services/knowledgeBase.service'
import * as chatService from '../services/chat.service'

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams()
  const kbId = searchParams.get('kbId') || ''

  const [knowledgeBases, setKnowledgeBases] = useState([])
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    kbService.listKnowledgeBases().then(setKnowledgeBases).catch(() => {})
  }, [])

  useEffect(() => {
    setActiveConversationId(null)
    setMessages([])
    if (!kbId) {
      setConversations([])
      return
    }
    chatService.listConversations(kbId).then(setConversations).catch(() => {})
  }, [kbId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSelectKb = (id) => {
    setSearchParams(id ? { kbId: id } : {})
  }

  const openConversation = async (id) => {
    setActiveConversationId(id)
    setIsLoadingConversation(true)
    setError('')
    try {
      const { messages: loaded } = await chatService.getConversation(id)
      setMessages(loaded.map(normalizeMessage))
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load this conversation.')
    } finally {
      setIsLoadingConversation(false)
    }
  }

  const startNewConversation = () => {
    setActiveConversationId(null)
    setMessages([])
    setError('')
  }

  const handleDeleteConversation = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Delete this conversation?')) return
    const previous = conversations
    setConversations((prev) => prev.filter((c) => c._id !== id))
    if (activeConversationId === id) startNewConversation()
    try {
      await chatService.deleteConversation(id)
    } catch (err) {
      setConversations(previous)
      setError(err.response?.data?.message || 'Could not delete the conversation.')
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const question = input.trim()
    if (!question || !kbId || isSending) return

    setInput('')
    setError('')
    setMessages((prev) => [...prev, { role: 'user', content: question, sources: [] }])
    setIsSending(true)

    try {
      const result = await chatService.sendMessage({
        kbId,
        conversationId: activeConversationId,
        question,
      })
      setMessages((prev) => [...prev.slice(0, -1), normalizeMessage(result.userMessage), normalizeMessage(result.assistantMessage)])

      if (!activeConversationId) {
        setActiveConversationId(result.conversation._id)
        setConversations((prev) => [result.conversation, ...prev])
      } else {
        setConversations((prev) =>
          prev.map((c) => (c._id === result.conversation._id ? result.conversation : c))
        )
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send that message.')
      setMessages((prev) => prev.slice(0, -1))
      setInput(question)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex h-screen">
      <aside className="w-72 shrink-0 border-r border-hairline flex flex-col">
        <div className="p-4 border-b border-hairline">
          <select
            value={kbId}
            onChange={(e) => handleSelectKb(e.target.value)}
            className="input-field text-sm mb-3"
          >
            <option value="">Select a knowledge base…</option>
            {knowledgeBases.map((kb) => (
              <option key={kb._id} value={kb._id}>{kb.name}</option>
            ))}
          </select>
          <button
            onClick={startNewConversation}
            disabled={!kbId}
            className="btn-primary w-full text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Plus size={15} /> New conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((c) => (
            <button
              key={c._id}
              onClick={() => openConversation(c._id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm mb-1 flex items-center justify-between gap-2 group transition-colors ${
                activeConversationId === c._id ? 'bg-surface-raised text-text' : 'text-muted hover:bg-surface hover:text-text'
              }`}
            >
              <span className="truncate">{c.title || 'New conversation'}</span>
              <Trash2
                size={13}
                onClick={(e) => handleDeleteConversation(c._id, e)}
                className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-failed transition-opacity"
              />
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <PageHeader eyebrow="AI Chat" title="Ask your documents" />

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {!kbId ? (
            <div className="h-full flex items-center justify-center text-center text-sm text-muted">
              {knowledgeBases.length === 0 ? (
                <span>
                  You need a knowledge base first.{' '}
                  <Link to="/knowledge-bases" className="text-signal hover:underline">Create one</Link>.
                </span>
              ) : (
                'Select a knowledge base to start chatting.'
              )}
            </div>
          ) : isLoadingConversation ? (
            <div className="text-sm text-muted">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2">
              <MessageSquareText size={22} className="text-faint mb-1" />
              <p className="text-sm text-muted max-w-xs">
                Ask a question about the documents in this knowledge base. Answers are grounded in
                your documents, with sources cited.
              </p>
            </div>
          ) : (
            messages.map((m, i) => <ChatMessage key={m._id || i} message={m} />)
          )}

          {isSending && (
            <div className="flex gap-3">
              <div className="h-7 w-7 rounded-full border border-hairline flex items-center justify-center shrink-0">
                <Loader2 size={13} className="animate-spin text-signal" />
              </div>
              <div className="card px-4 py-2.5 text-sm text-muted">Thinking…</div>
            </div>
          )}
        </div>

        {error && <p className="px-8 text-sm text-failed mb-2">{error}</p>}

        <form onSubmit={handleSend} className="p-4 border-t border-hairline flex items-center gap-3">
          <input
            className="input-field"
            placeholder={kbId ? 'Ask a question about your documents…' : 'Select a knowledge base first'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!kbId || isSending}
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!kbId || !input.trim() || isSending}
            className="btn-primary inline-flex items-center gap-2 shrink-0 disabled:opacity-60"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  )
}

function normalizeMessage(message) {
  return {
    _id: message._id,
    role: message.role,
    content: message.content,
    sources: message.sources || [],
  }
}
