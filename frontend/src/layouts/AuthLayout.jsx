import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

export default function AuthLayout({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-ink text-text flex flex-col">
      <header className="px-6 py-6">
        <Link to="/">
          <Logo />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">
          <div className="label-mono mb-3">{eyebrow}</div>
          <h1 className="font-display text-3xl text-text mb-2">{title}</h1>
          {subtitle && <p className="text-sm text-muted mb-8">{subtitle}</p>}
          {children}
          {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
