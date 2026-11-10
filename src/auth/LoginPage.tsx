import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { signInWithPassword, signUpWithPassword } = useAuth()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)

    const result =
      mode === 'sign-in'
        ? await signInWithPassword(email, password)
        : await signUpWithPassword(email, password)

    if (result.error) {
      setError(result.error)
    } else if (mode === 'sign-up') {
      setInfo('Account created. Check your email to confirm, then sign in.')
    }
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl glass-strong border border-white/14 p-6 shadow-2xl shadow-black/50">
        <h1 className="mb-1 text-xl font-semibold text-slate-100">Songwriting</h1>
        <p className="mb-6 text-sm text-slate-400">
          {mode === 'sign-in' ? 'Sign in to your notebook.' : 'Create your notebook.'}
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
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg glass-input border border-white/12 px-3 py-2 text-slate-100 outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/15"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-emerald-400">{info}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-fuchsia-500 px-3 py-2 font-medium text-slate-950 shadow-lg shadow-fuchsia-500/25 transition hover:bg-fuchsia-400 disabled:opacity-60"
          >
            {submitting ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
            setError(null)
            setInfo(null)
          }}
          className="mt-4 text-sm text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
        >
          {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
