import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AuthLayout from '../layouts/AuthLayout'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { registerAccount } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      await registerAccount(form)
      navigate('/dashboard', { replace: true })
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
      eyebrow="Get started"
      title="Create your account"
      subtitle="Free to use. No credit card, no paid tier."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-signal hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="label-mono block mb-2">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={form.name}
            onChange={handleChange}
            className="input-field"
            placeholder="Ada Lovelace"
          />
        </div>
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
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={handleChange}
            className="input-field"
            placeholder="At least 8 characters"
          />
        </div>

        {error && (
          <p className="text-sm text-failed leading-relaxed" role="alert">{error}</p>
        )}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}
