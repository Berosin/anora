export default function SourceCitation({ source }) {
  const location = source.page ? `p.${source.page}` : source.section || null

  return (
    <div className="card p-3" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-signal shrink-0" />
        <span className="label-mono truncate">
          {source.documentName}
          {location ? ` · ${location}` : ''}
        </span>
      </div>
      <p className="text-xs text-muted leading-relaxed line-clamp-3">{source.excerpt}</p>
    </div>
  )
}
