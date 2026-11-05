'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useActionState } from 'react'
import { loginAction, type LoginState } from './actions'
import { saveXanoSession } from '@/lib/xano-auth'

const initialState: LoginState | null = null

export default function LoginPage() {
  return <Suspense fallback={<main className="auth-page"><div className="auth-card">Loading sign in…</div></main>}><LoginForm /></Suspense>
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  useEffect(() => {
    if (!state?.ok) return
    saveXanoSession(state.session)
    const next = searchParams.get('next')
    router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard')
  }, [router, searchParams, state])

  return <main className="auth-page"><div className="auth-orb auth-orb-one" /><div className="auth-orb auth-orb-two" /><section className="auth-card glass-panel" aria-labelledby="login-title"><Link href="/" className="auth-back">← Back to home</Link><div className="auth-badge">Madallion / secure access</div><p className="eyebrow">Member access</p><h1 id="login-title">Welcome back</h1><p className="auth-description">Sign in to your account and keep your capital moving with clarity.</p><form action={formAction} className="auth-form"><label htmlFor="email">Email address<input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label><label htmlFor="password">Password<input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Enter your password" /></label>{state && !state.ok ? <p role="alert" className="auth-error">{state.error}</p> : null}<button type="submit" disabled={pending}>{pending ? <><span className="auth-spinner" aria-hidden="true" /> Signing in…</> : 'Sign in securely'}</button></form><p className="auth-footer">New to Madallion? <Link href="/register">Create an account</Link></p></section></main>
}
