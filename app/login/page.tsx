'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useState } from 'react'
import { saveXanoSession, xanoLogin } from '@/lib/xano-auth'

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="auth-page"><div className="auth-card">Loading sign in…</div></main>}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const session = await xanoLogin(email, password)
      saveXanoSession(session)

      const next = searchParams.get('next')
      router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard')
    } catch {
      setError('Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-page"><div className="auth-card"><Link href="/" className="auth-back">← Back to home</Link><p className="eyebrow">Member access</p><h1>Welcome back</h1><p className="subtitle">Sign in to track your investments and manage your account.</p><form onSubmit={handleSubmit} className="auth-form"><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /></label>{error ? <p className="auth-error" role="alert">{error}</p> : null}<button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button></form><div className="auth-links"><Link href="/forgot-password">Forgot password?</Link><span>New here? <Link href="/register">Create account</Link></span></div></div></main>
}
