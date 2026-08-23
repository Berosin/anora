// The hero's signature element: a document silhouette swept by a scan
// line, its text resolving into an answer with a source citation — a
// literal picture of "From Information to Insight."
export default function InsightScan() {
  const lines = [92, 68, 84, 55, 78, 40]

  return (
    <div className="relative w-full max-w-md mx-auto lg:mx-0 select-none" aria-hidden="true">
      <div className="card relative overflow-hidden p-6" style={{ height: '220px' }}>
        <div className="label-mono mb-4">Student_Handbook.pdf — p.4</div>
        <div className="space-y-3">
          {lines.map((w, i) => (
            <div
              key={i}
              className="h-2 rounded-full bg-hairline"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
        <div
          className="animate-scan-sweep pointer-events-none absolute left-0 right-0 h-px"
          style={{
            top: '70px',
            background: 'linear-gradient(90deg, transparent, var(--color-signal), transparent)',
            boxShadow: '0 0 12px 1px var(--color-signal)',
          }}
        />
      </div>

      <div
        className="card animate-card-rise absolute -bottom-8 -right-4 w-64 p-4"
        style={{ animationDelay: '900ms', backgroundColor: 'var(--color-surface-raised)' }}
      >
        <div className="label-mono mb-2" style={{ color: 'var(--color-vector)' }}>Answer</div>
        <p className="text-sm text-text leading-snug">
          Minimum aggregate of 60% is required for placement eligibility.
        </p>
        <div className="mt-3 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--color-signal)' }} />
          <span className="label-mono">Student_Handbook.pdf · p.4</span>
        </div>
      </div>
    </div>
  )
}
