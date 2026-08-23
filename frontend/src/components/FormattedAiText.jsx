import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

// The LLM naturally formats summaries/comparisons as Markdown (tables,
// bold section labels, bullet lists) — rendering real Markdown is more
// robust than trying to force a specific plain-text shape via prompting.
export default function FormattedAiText({ text }) {
  return (
    <div className="text-sm text-text leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          p: (props) => <p className="mb-3 last:mb-0" {...props} />,
          strong: (props) => (
            <strong className="font-semibold" style={{ color: 'var(--color-signal)' }} {...props} />
          ),
          h1: (props) => <div className="label-mono mt-5 mb-2 first:mt-0" {...props} />,
          h2: (props) => <div className="label-mono mt-5 mb-2 first:mt-0" {...props} />,
          h3: (props) => <div className="label-mono mt-4 mb-2 first:mt-0" {...props} />,
          ul: (props) => <ul className="list-disc list-inside space-y-1 mb-3" {...props} />,
          ol: (props) => <ol className="list-decimal list-inside space-y-1 mb-3" {...props} />,
          li: (props) => <li className="text-text" {...props} />,
          table: (props) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-hairline">
              <table className="w-full text-sm border-collapse" {...props} />
            </div>
          ),
          thead: (props) => <thead style={{ backgroundColor: 'var(--color-surface-raised)' }} {...props} />,
          th: (props) => (
            <th className="label-mono text-left px-3 py-2 border-b border-hairline" {...props} />
          ),
          td: (props) => (
            <td className="px-3 py-2 border-b border-hairline align-top text-text" {...props} />
          ),
          code: (props) => (
            <code className="font-mono text-xs px-1 py-0.5 rounded bg-surface-raised" {...props} />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}