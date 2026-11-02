"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState } from "react"
import { saveXanoSession, xanoLogin } from "@/lib/xano-auth"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") || "/dashboard"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please enter your email and password.")
      return
    }

    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setError("Please use a valid email address.")
      return
    }

    setLoading(true)
    try {
      const session = await xanoLogin(trimmedEmail, trimmedPassword)
      saveXanoSession(session)
      router.push(nextPath)
    } catch {
      setError("Invalid email or password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-back">← Back to home</Link>
        <p className="eyebrow">Member access</p>
        <h1>Welcome back</h1>
        <p className="subhead">Sign in to continue to your account.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              autoComplete="current-password"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm text-[#5b706a]">
          <Link href="/forgot-password" className="hover:text-[#0b4537]">Forgot password?</Link>
          <Link href="/register" className="hover:text-[#0b4537]">Create account</Link>
        </div>
      </div>
    </main>
  )
}
