'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { clearXanoSession, xanoMe } from '@/lib/xano-auth'

const navigation = [
  { href: '/admin', label: 'Command Centre' },
  { href: '/admin/approvals', label: 'Approvals' },
  { href: '/admin/treasury', label: 'Treasury' },
  { href: '/admin/plans', label: 'Plans' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/kyc', label: 'KYC Queue' },
  { href: '/admin/referrals', label: 'Referrals' },
  { href: '/admin/deposits', label: 'Deposits' },
  { href: '/admin/withdrawals', label: 'Withdrawals' },
  { href: '/admin/investments', label: 'Investments' },
  { href: '/admin/ledger', label: 'Ledger' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/audit', label: 'Audit trail' },
]

export function AdminShell({ children, title, eyebrow }: { children: ReactNode; title: string; eyebrow: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [role, setRole] = useState('')

  useEffect(() => {
    let active = true

    xanoMe()
      .then((user) => {
        const nextRole = String(user?.role ?? user?.user?.role ?? user?.data?.role ?? '').toLowerCase()
        if (!['admin', 'superadmin'].includes(nextRole)) throw new Error('Forbidden')
        if (!active) return
        setRole(nextRole)
        setAllowed(true)
      })
      .catch(() => {
        if (!active) return
        clearXanoSession()
        router.replace(`/login?next=${encodeURIComponent(pathname || '/admin')}`)
      })
      .finally(() => {
        if (active) setChecking(false)
      })

    return () => { active = false }
  }, [pathname, router])

  if (checking || !allowed) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0a111c] text-sm text-slate-400">Verifying administrator access…</div>
  }

  return (
    <div className="min-h-screen bg-[#0a111c] text-slate-100 lg:pl-60">
      <aside className="fixed inset-y-0 left-0 hidden w-60 overflow-y-auto border-r border-slate-800 bg-[#0d1522] p-4 lg:block">
        <Link href="/" className="font-semibold text-white">Madallion</Link>
        <nav className="mt-8 space-y-1" aria-label="Admin navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className={`block rounded-lg px-3 py-2 text-sm ${pathname === item.href ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 rounded-lg border border-slate-800 p-3 text-sm">Access role: {role}</div>
      </aside>
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-[#0a111c]/90 px-5 py-4 backdrop-blur-xl">
        <p className="text-[10px] uppercase tracking-[.18em] text-slate-500">{eyebrow}</p>
        <h1 className="mt-1 text-xl font-semibold text-white">{title}</h1>
      </header>
      <main className="p-5 sm:p-7">{children}</main>
    </div>
  )
}

export function Metric({ label, value, detail, tone = 'default' }: { label: string; value: string; detail: string; tone?: 'default' | 'good' | 'warn' }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#101a29] p-4">
      <p className="text-[10px] uppercase tracking-[.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className={`mt-1 text-xs ${tone === 'good' ? 'text-emerald-300' : tone === 'warn' ? 'text-amber-300' : 'text-slate-400'}`}>{detail}</p>
    </div>
  )
}

export function SectionCard({ title, action, children }: { title: string; action?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-[#101a29] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {action ? <span className="text-[10px] uppercase tracking-[.18em] text-slate-500">{action}</span> : null}
      </div>
      {children}
    </section>
  )
}
