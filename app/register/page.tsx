'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useState } from 'react'
import { saveXanoSession, xanoSignup } from '@/lib/xano-auth'

export default function RegisterPage() {
  return <Suspense fallback={<main className="auth-page"><div className="auth-card">Loading account form…</div></main>}><RegisterForm /></Suspense>
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password
    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      setError('Complete all fields to create your account.')
      return
    }
    setLoading(true)
    try {
      const session = await xanoSignup(trimmedName, trimmedEmail, trimmedPassword)
      if (!session?.authenticated) throw new Error('Xano created the account but did not establish a session. Try signing in, or check whether email verification is required.')
      saveXanoSession(session)
      const next = searchParams.get('next')
      router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create the account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-page"><div className="auth-card"><Link href="/" className="auth-back">← Back to home</Link><p className="eyebrow">Start building</p><h1>Create your account</h1><p className="auth-description">Set up your Madallion investor account.</p><form onSubmit={handleSubmit} className="auth-form"><label>Full name<input type="text" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error ? <p role="alert" className="auth-error">{error}</p> : null}<button type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button></form><p className="auth-footer">Already registered? <Link href="/login">Sign in</Link></p></div></main>
}
