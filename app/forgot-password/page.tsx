"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { UserPlus } from 'lucide-react'

export default function CreateAccountPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/register")
  }, [router])

  return (
    <main className="auth-page">
      <div className="auth-card">
        <p className="eyebrow inline-flex items-center gap-1.5"><UserPlus size={14} aria-hidden="true" /> Redirecting</p>
        <h1>Opening your account</h1>
        <p className="subhead">You’ll be sent to the registration page.</p>
        <Link href="/register" className="auth-button mt-6 inline-flex items-center justify-center gap-2">
          <UserPlus size={16} aria-hidden="true" />
          Go to account creation
        </Link>
      </div>
    </main>
  )
}
