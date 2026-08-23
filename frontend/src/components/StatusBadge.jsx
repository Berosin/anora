const STYLES = {
  UPLOADING: { label: 'Uploading', color: 'var(--color-muted)', pulse: true },
  PROCESSING: { label: 'Processing', color: 'var(--color-signal)', pulse: true },
  INDEXING: { label: 'Indexing', color: 'var(--color-vector)', pulse: true },
  READY: { label: 'Ready', color: 'var(--color-ready)', pulse: false },
  FAILED: { label: 'Failed', color: 'var(--color-failed)', pulse: false },
}

export default function StatusBadge({ status }) {
  const style = STYLES[status] || STYLES.UPLOADING
  return (
    <span className="inline-flex items-center gap-1.5 label-mono" style={{ color: style.color }}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.pulse ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: style.color }}
      />
      {style.label}
    </span>
  )
}
