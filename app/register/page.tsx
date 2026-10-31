"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { saveXanoSession, xanoSignup } from "@/lib/xano-auth"

export default function RegisterPage() {
  const router = useRouter()
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
      router.push("/dashboard")
    } catch {
      setError("We could not create your account. Check your details and try again.")
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-page"><div className="auth-card"><Link href="/" className="auth-back">← Back to home</Link><p className="eyebrow">Start building</p><h1>Create your account</h1><p className="auth-copy">Join the private community building toward consistent returns.</p><form onSubmit={handleSubmit} className="auth-form"><label>Full name<input required value={name} onChange={(e) => setName(e.target.value)} /></label><label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Password<input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button></form><p className="auth-legal">By continuing, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</p><p className="auth-footer">Already a member? <Link href="/login">Sign in</Link></p></div></main>
}
