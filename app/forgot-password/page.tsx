"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { xanoRequestReset } from "@/lib/xano-auth"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setLoading(true)
    try {
      await xanoRequestReset(email)
      setSent(true)
    } catch {
      setError("We could not send the reset link. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-page"><div className="auth-card"><Link href="/login" className="auth-back">← Back to sign in</Link><p className="eyebrow">Account recovery</p><h1>Reset your password</h1>{sent ? <><p className="auth-copy">If an account exists for that email, a reset link is on its way.</p><Link href="/login" className="primary-button button-link">Return to sign in</Link></> : <><p className="auth-copy">Enter your email and we&apos;ll send a secure reset link.</p><form onSubmit={handleSubmit} className="auth-form"><label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</button></form></>}</div></main>
}
