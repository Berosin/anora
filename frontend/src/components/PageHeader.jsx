export default function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-6 px-8 pt-8 pb-6 border-b border-hairline">
      <div>
        {eyebrow && <div className="label-mono mb-2">{eyebrow}</div>}
        <h1 className="font-display text-2xl text-text">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1.5 max-w-md">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
