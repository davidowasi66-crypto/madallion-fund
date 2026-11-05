'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useState } from 'react'
import { saveXanoSession, xanoLogin } from '@/lib/xano-auth'

export default function LoginPage() {
  return <Suspense fallback={<main className="auth-page"><div className="auth-card">Loading sign in…</div></main>}><LoginForm /></Suspense>
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
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()
    if (!trimmedEmail || !trimmedPassword) {
      setError('Enter your email and password.')
      return
    }
    setLoading(true)
    try {
      const session = await xanoLogin(trimmedEmail, trimmedPassword)
      saveXanoSession(session)
      const next = searchParams.get('next')
      router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard')
    } catch {
      setError('Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-page"><div className="auth-card"><Link href="/" className="auth-back">← Back to home</Link><p className="eyebrow">Member access</p><h1>Welcome back</h1><p className="auth-description">Sign in to your Madallion account.</p><form onSubmit={handleSubmit} className="auth-form"><label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error ? <p role="alert" className="auth-error">{error}</p> : null}<button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button></form><p className="auth-footer">New to Madallion? <Link href="/register">Create an account</Link></p></div></main>
}
