import { useState } from 'react'
import { Copy, Check, User, Sparkles } from 'lucide-react'
import SourceCitation from './SourceCitation'
import FormattedAiText from './FormattedAiText'

export default function ChatMessage({ message }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className="h-7 w-7 rounded-full border border-hairline flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: 'var(--color-surface-raised)' }}
      >
        {isUser ? (
          <User size={13} className="text-muted" />
        ) : (
          <Sparkles size={13} className="text-signal" />
        )}
      </div>

      <div className={`max-w-2xl ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed rounded-xl ${isUser ? 'text-text' : 'card'}`}
          style={isUser ? { backgroundColor: 'var(--color-surface-raised)' } : undefined}
        >
          {isUser ? message.content : <FormattedAiText text={message.content} />}
        </div>

        {!isUser && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-faint hover:text-muted transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy answer'}
          </button>
        )}

        {message.sources?.length > 0 && (
          <div className="grid gap-2 w-full sm:grid-cols-2">
            {message.sources.map((source, i) => (
              <SourceCitation key={i} source={source} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
