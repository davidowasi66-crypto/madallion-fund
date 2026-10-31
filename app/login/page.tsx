"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { saveXanoSession, xanoLogin } from "@/lib/xano-auth"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setLoading(true)
    try {
      const session = await xanoLogin(email, password)
      saveXanoSession(session)
      router.push("/dashboard")
    } catch {
      setError("Invalid email or password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-page"><div className="auth-card"><Link href="/" className="auth-back">← Back to home</Link><p className="eyebrow">Member access</p><h1>Welcome back</h1><p className="auth-copy">Sign in to view your account and fund activity.</p><form onSubmit={handleSubmit} className="auth-form"><label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Password<input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button></form><Link href="/forgot-password" className="text-link">Forgot password?</Link><p className="auth-footer">New to Madallion? <Link href="/register">Create an account</Link></p></div></main>
}
