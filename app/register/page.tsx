'use client'

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState } from "react"
import { saveXanoSession, xanoSignup } from "@/lib/xano-auth"

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      const session = await xanoSignup(name, email, password)
      saveXanoSession(session)

      const next = searchParams.get("next")
      router.push(next && next.startsWith("/") ? next : "/dashboard")
    } catch {
      setError("We could not create your account. Check your details and try again.")
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-page"><div className="auth-card"><Link href="/" className="auth-back">← Back to home</Link><p className="eyebrow">Start building</p><h1>Create your account</h1><p className="subtitle">Join Madallion fund and start building a smarter investment plan.</p><form onSubmit={handleSubmit} className="auth-form"><label>Full name<input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" required /></label><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a password" required /></label>{error ? <p className="auth-error">{error}</p> : null}<button type="submit" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button></form><div className="auth-links"><span>Already have an account? <Link href="/login">Sign in</Link></span></div></div></main>
}
