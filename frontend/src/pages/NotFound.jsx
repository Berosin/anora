import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ink text-text flex flex-col items-center justify-center px-6 text-center">
      <Logo className="mb-10" />
      <div className="label-mono mb-3">404</div>
      <h1 className="font-display text-3xl text-text mb-3">This page isn&apos;t in the index.</h1>
      <p className="text-sm text-muted mb-8 max-w-sm">
        Whatever you were looking for isn&apos;t at this address.
      </p>
      <Link to="/" className="btn-primary">Back to ANORA</Link>
    </div>
  )
}
