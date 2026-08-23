export default function Logo({ withWordmark = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="14" fill="var(--color-surface-raised)" stroke="var(--color-hairline)" />
        <path d="M18 44 L32 16 L46 44" stroke="var(--color-signal)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="24" y1="34" x2="40" y2="34" stroke="var(--color-signal)" strokeWidth="4" strokeLinecap="round" />
      </svg>
      {withWordmark && (
        <span className="font-display text-lg tracking-tight text-text">ANORA</span>
      )}
    </div>
  )
}
