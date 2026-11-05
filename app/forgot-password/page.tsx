"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function CreateAccountPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/register")
  }, [router])

  return (
    <main className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Redirecting</p>
        <h1>Opening your account</h1>
        <p className="subhead">You’ll be sent to the registration page.</p>
        <Link href="/register" className="auth-button mt-6 inline-flex items-center justify-center">
          Go to account creation
        </Link>
      </div>
    </main>
  )
}
