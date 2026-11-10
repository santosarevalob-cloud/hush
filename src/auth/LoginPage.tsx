import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { signInWithPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await signInWithPassword(email, password)
    if (result.error) setError(result.error)
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl glass-strong border border-white/14 p-6 shadow-2xl shadow-black/50">
        <h1 className="mb-1 text-xl font-semibold text-slate-100">Songwriting</h1>
        <p className="mb-6 text-sm text-slate-400">
          Sign in to your notebook.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg glass-input border border-white/12 px-3 py-2 text-slate-100 outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/15"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg glass-input border border-white/12 px-3 py-2 text-slate-100 outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/15"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-fuchsia-500 px-3 py-2 font-medium text-slate-950 shadow-lg shadow-fuchsia-500/25 transition hover:bg-fuchsia-400 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
