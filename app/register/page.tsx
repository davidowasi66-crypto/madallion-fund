"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState } from "react"
import { saveXanoSession, xanoSignup } from "@/lib/xano-auth"

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") || "/dashboard"
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      setError("Please fill in your name, email, and password.")
      return
    }

    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setError("Please use a valid email address.")
      return
    }

    if (trimmedPassword.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }

    setLoading(true)
    try {
      const session = await xanoSignup(trimmedName, trimmedEmail, trimmedPassword)
      saveXanoSession(session)
      router.push(nextPath)
    } catch {
      setError("We could not create your account. Check your details and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-back">← Back to home</Link>
        <p className="eyebrow">Start building</p>
        <h1>Create your account</h1>
        <p className="subhead">Open an account and start investing with confidence.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="sr-only">Full name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              className="auth-input"
              autoComplete="name"
            />
          </label>

          <label className="block">
            <span className="sr-only">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              className="auth-input"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="sr-only">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="auth-input"
              autoComplete="new-password"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-sm text-[#5b706a]">
          Already have an account? <Link href="/login" className="font-semibold text-[#0b4537]">Sign in</Link>
        </p>
      </div>
    </main>
  )
}
