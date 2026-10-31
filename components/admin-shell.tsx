'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, Bell, ChevronDown, CircleDollarSign, FileText, LayoutDashboard, Menu, Search, Settings, ShieldCheck, Users, Wallet, X, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'

const groups = [
  { label: 'Overview', items: [{ href: '/admin', label: 'Command Centre', icon: LayoutDashboard }, { href: '/admin/approvals', label: 'Approvals', icon: ShieldCheck, badge: '7' }, { href: '/admin/alerts', label: 'Alerts', icon: Bell }] },
  { label: 'People', items: [{ href: '/admin/users', label: 'Users', icon: Users }, { href: '/admin/kyc', label: 'KYC Queue', icon: ShieldCheck }, { href: '/admin/referrals', label: 'Referrals', icon: Users }, { href: '/admin/support', label: 'Support', icon: FileText }] },
  { label: 'Money', items: [{ href: '/admin/deposits', label: 'Deposits', icon: Wallet }, { href: '/admin/withdrawals', label: 'Withdrawals', icon: CircleDollarSign }, { href: '/admin/investments', label: 'Investments', icon: BarChart3 }, { href: '/admin/plans', label: 'Plans', icon: BarChart3 }] },
  { label: 'Accounting', items: [{ href: '/admin/ledger', label: 'Ledger', icon: FileText }, { href: '/admin/liabilities', label: 'Liabilities', icon: CircleDollarSign }, { href: '/admin/reconciliation', label: 'Reconciliation', icon: ShieldCheck }, { href: '/admin/reports', label: 'Reports', icon: BarChart3 }] },
  { label: 'System', items: [{ href: '/admin/announcements', label: 'Announcements', icon: Bell }, { href: '/admin/settings', label: 'Settings', icon: Settings }, { href: '/admin/audit', label: 'Audit Log', icon: FileText }] },
]

function getToken() { return typeof window === 'undefined' ? null : sessionStorage.getItem('madallion_auth_token') }

export function AdminShell({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [role, setRole] = useState('')

  useEffect(() => {
    const token = getToken()
    if (!token) { router.replace('/login?next=/admin'); return }
    fetch(`${(process.env.NEXT_PUBLIC_XANO_BASE_URL ?? '').replace(/\/$/, '')}/api:r2YmAApr/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unauthorized')
        const user = await response.json()
        const role = String(user?.role ?? user?.user?.role ?? user?.data?.role ?? '').toLowerCase()
        if (!['admin', 'superadmin', 'support'].includes(role)) throw new Error('Forbidden')
        setRole(role)
        if (role === 'support' && pathname !== '/admin/support' && !pathname.startsWith('/admin/users')) throw new Error('Forbidden')
        setAllowed(true)
      })
      .catch(() => { sessionStorage.removeItem('madallion_auth_token'); sessionStorage.removeItem('madallion_user_id'); router.replace('/login?next=/admin') })
      .finally(() => setChecking(false))
  }, [router])

  if (checking || !allowed) return <div className="flex min-h-screen items-center justify-center bg-[#0a111c] text-sm text-slate-400">Verifying administrator access…</div>

  return <div className="min-h-screen bg-[#0a111c] text-slate-100">
    <aside className={`fixed inset-y-0 left-0 z-50 w-60 overflow-y-auto border-r border-slate-800 bg-[#0d1522] p-4 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between"><Link href="/" className="flex items-center gap-2 font-semibold text-white"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400 font-bold text-slate-950">M</span> Madallion</Link><button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
      <div className="mt-7 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2"><p className="text-[9px] uppercase tracking-[.18em] text-slate-500">Environment</p><p className="mt-1 text-xs font-semibold text-emerald-300">Production operations</p></div>
      <nav className="mt-7 space-y-6" aria-label="Admin navigation">{groups.map((group) => <div key={group.label}><p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">{group.label}</p><div className="space-y-0.5">{group.items.map(({ href, label, icon: Icon, badge }) => { const active = pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`)); return <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs transition ${active ? 'bg-emerald-400/10 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Icon size={15} />{label}{badge && <span className="ml-auto rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">{badge}</span>}</Link> })}</div></div>)}</nav>
      <div className="mt-8 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><ShieldCheck size={14} /> Restricted access</div><p className="mt-1 text-[10px] leading-4 text-slate-500">Admin activity is monitored and logged.</p></div>
    </aside>
    <div className="lg:pl-60"><header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0a111c]/90 px-5 py-3 backdrop-blur-xl sm:px-7"><div className="flex items-center gap-4"><button className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={19} /></button><div className="relative hidden max-w-md flex-1 sm:block"><Search size={15} className="absolute left-3 top-2.5 text-slate-500" /><input aria-label="Global search" placeholder="Search users, transactions, references" className="w-full rounded-lg border border-slate-800 bg-slate-900/70 py-2 pl-9 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-emerald-400/50" /></div><div className="ml-auto flex items-center gap-4"><span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300 sm:inline">LIVE</span><Bell size={17} className="text-slate-400" /><div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-300 text-xs font-bold text-slate-950">AO</div><button aria-label="Sign out" onClick={() => { sessionStorage.clear(); router.replace('/login') }} className="text-slate-500 hover:text-white"><LogOut size={16} /></button></div></div><div className="mt-3 ml-2 lg:ml-0"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">{eyebrow}</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-white">{title}</h1></div></header><main className="mx-auto max-w-[1600px] p-5 sm:p-7">{children}</main></div>
  </div>
}

export function Metric({ label, value, detail, tone = 'default' }: { label: string; value: string; detail: string; tone?: 'default' | 'good' | 'warn' }) { return <div className="rounded-xl border border-slate-800 bg-[#101a29]/80 p-4"><p className="text-[11px] text-slate-500">{label}</p><p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-white">{value}</p><p className={`mt-2 text-[11px] ${tone === 'warn' ? 'text-amber-300' : tone === 'good' ? 'text-emerald-300' : 'text-slate-500'}`}>{detail}</p></div> }

export function SectionCard({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) { return <section className="rounded-xl border border-slate-800 bg-[#101a29]/80 p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-white">{title}</h2>{action && <button className="text-[11px] font-semibold text-emerald-300">{action}</button>}</div><div className="mt-5">{children}</div></section> }
