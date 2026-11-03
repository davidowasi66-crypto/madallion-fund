'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { clearXanoSession, xanoMe } from '@/lib/xano-auth'

type JsonRecord = Record<string, unknown>

function getNestedRole(value: unknown): unknown {
  if (!value || typeof value !== 'object') return undefined
  return (value as JsonRecord).role
}

const groups = [
  { label: 'Overview', items: [{ href: '/admin', label: 'Command Centre' }, { href: '/admin/approvals', label: 'Approvals' }, { href: '/admin/treasury', label: 'Treasury' }, { href: '/admin/plans', label: 'Plans' }] },
  { label: 'People', items: [{ href: '/admin/users', label: 'Users' }, { href: '/admin/kyc', label: 'KYC Queue' }, { href: '/admin/referrals', label: 'Referrals' }] },
  { label: 'Money', items: [{ href: '/admin/deposits', label: 'Deposits' }, { href: '/admin/withdrawals', label: 'Withdrawals' }, { href: '/admin/investments', label: 'Investments' }] },
  { label: 'System', items: [{ href: '/admin/announcements', label: 'Announcements' }, { href: '/admin/settings', label: 'Settings' }, { href: '/admin/audit', label: 'Audit trail' }] },
]

export function AdminShell({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [role, setRole] = useState('')

  useEffect(() => {
    xanoMe()
      .then((user) => {
        const root = user as JsonRecord
        const nextRole = String(root.role ?? getNestedRole(root.user) ?? getNestedRole(root.data) ?? '').toLowerCase()
        if (!['admin', 'superadmin'].includes(nextRole)) throw new Error('Forbidden')
        setRole(nextRole)
        setAllowed(true)
      })
      .catch(() => {
        clearXanoSession()
        router.replace('/login?next=/admin')
      })
      .finally(() => setChecking(false))
  }, [router])

  if (checking || !allowed) return <div className="flex min-h-screen items-center justify-center bg-[#0a111c] text-sm text-slate-400">Verifying administrator access…</div>

  return <div className="min-h-screen bg-[#0a111c] text-slate-100">
    <aside className={`fixed inset-y-0 left-0 z-50 w-60 overflow-y-auto border-r border-slate-800 bg-[#0d1522] p-4 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between"><Link href="/" className="flex items-center gap-2 font-semibold text-white"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-xs font-bold text-emerald-300">M</span> Madallion</Link><button className="rounded-lg border border-slate-700 p-2 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">✕</button></div>
      <div className="mt-7 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2"><p className="text-[9px] uppercase tracking-[.18em] text-slate-500">Environment</p><p className="mt-1 text-sm font-medium text-slate-200">Production</p></div>
      <nav className="mt-7 space-y-6" aria-label="Admin navigation">{groups.map((group) => <div key={group.label}><p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">{group.label}</p><div className="space-y-1">{group.items.map((item) => <Link key={item.href} href={item.href} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${pathname === item.href ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60'}`}><span>{item.label}</span></Link>)}</div></div>)}</nav>
      <div className="mt-8 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3"><p className="text-xs font-semibold text-emerald-300">Access role</p><p className="mt-1 text-sm text-white">{role}</p></div>
    </aside>
    <div className="lg:pl-60"><header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0a111c]/90 px-5 py-3 backdrop-blur-xl sm:px-7"><div className="flex items-center gap-4"><button className="rounded-xl border border-slate-700 p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">☰</button><div><p className="text-[10px] uppercase tracking-[.18em] text-slate-500">{eyebrow}</p><h1 className="mt-1 text-xl font-semibold text-white">{title}</h1></div></div></header><main className="p-5 sm:p-7">{children}</main></div>
  </div>
}

export function Metric({ label, value, detail, tone = 'default' }: { label: string; value: string; detail: string; tone?: 'default' | 'good' | 'warn' }) {
  return <div className="rounded-xl border border-slate-800 bg-[#101a29] p-4"><p className="text-[10px] uppercase tracking-[.18em] text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold text-white">{value}</p><p className={`mt-1 text-xs ${tone === 'good' ? 'text-emerald-300' : tone === 'warn' ? 'text-amber-300' : 'text-slate-400'}`}>{detail}</p></div>
}

export function SectionCard({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-800 bg-[#101a29] p-4 sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-white">{title}</h2>{action ? <span className="text-[10px] uppercase tracking-[.18em] text-slate-500">{action}</span> : null}</div>{children}</section>
}
