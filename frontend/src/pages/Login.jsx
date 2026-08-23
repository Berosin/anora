import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AuthLayout from '../layouts/AuthLayout'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || '/dashboard'

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await login(form)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'The backend isn\u2019t connected yet — auth wiring lands in Phase 3.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in"
      subtitle="Pick up where you left off."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-signal hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label-mono block mb-2">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={handleChange}
            className="input-field"
            placeholder="you@college.edu"
          />
        </div>
        <div>
          <label htmlFor="password" className="label-mono block mb-2">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={handleChange}
            className="input-field"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-sm text-failed leading-relaxed" role="alert">{error}</p>
        )}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  )
}
