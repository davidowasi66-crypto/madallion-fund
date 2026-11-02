import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, Bell, ChevronDown, CircleDollarSign, FileText, LayoutDashboard, Menu, Search, Settings, ShieldCheck, Users, Wallet, X, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { clearXanoSession, getXanoSession } from '@/lib/xano-auth'

const groups = [
  { label: 'Overview', items: [{ href: '/admin', label: 'Command Centre', icon: LayoutDashboard }] },
  { label: 'People', items: [{ href: '/admin/users', label: 'Users', icon: Users }] },
  { label: 'Money', items: [{ href: '/admin/deposits', label: 'Deposits', icon: Wallet }, { href: '/admin/withdrawals', label: 'Withdrawals', icon: CircleDollarSign }] },
  { label: 'Accounting', items: [{ href: '/admin/ledger', label: 'Ledger', icon: FileText }, { href: '/admin/treasury', label: 'Treasury', icon: BarChart3 }] },
  { label: 'System', items: [{ href: '/admin/settings', label: 'Settings', icon: Settings }] },
]

export function AdminShell({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [role, setRole] = useState('')

  useEffect(() => {
    const session = getXanoSession()
    if (!session?.authToken) {
      clearXanoSession()
      router.replace('/login?next=/admin')
      return
    }

    fetch(`${(process.env.NEXT_PUBLIC_XANO_BASE_URL ?? '').replace(/\/$/, '')}/api:r2YmAApr/auth/me`, {
      headers: { Authorization: `Bearer ${session.authToken}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unauthorized')
        const user = await response.json()
        const resolvedRole = String(user?.role ?? user?.user?.role ?? user?.data?.role ?? '').toLowerCase()
        if (!['admin', 'superadmin'].includes(resolvedRole)) throw new Error('Forbidden')
        setRole(resolvedRole)
        setAllowed(true)
      })
      .catch(() => {
        clearXanoSession()
        router.replace('/login?next=/admin')
      })
      .finally(() => setChecking(false))
  }, [router])

  if (checking || !allowed) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0a111c] text-sm text-slate-400">Verifying administrator access…</div>
  }

  return (
    <div className="min-h-screen bg-[#0a111c] text-slate-100">
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 overflow-y-auto border-r border-slate-800 bg-[#0d1522] p-4 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#182a3d] text-sm text-emerald-300">M</span>
            Madallion
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={16} /></button>
        </div>

        <div className="mt-7 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
          <p className="text-[9px] uppercase tracking-[.18em] text-slate-500">Environment</p>
          <p className="mt-1 text-sm text-slate-200">{process.env.NEXT_PUBLIC_XANO_BASE_URL ? 'Xano connected' : 'Config pending'}</p>
        </div>

        <nav className="mt-7 space-y-6" aria-label="Admin navigation">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">{group.label}</p>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = pathname === item.href
                  return (
                    <Link key={item.href} href={item.href} className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-sm transition ${active ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}>
                      <span className="flex items-center gap-2.5">
                        <Icon size={15} />
                        {item.label}
                      </span>
                      {item.href === '/admin' && <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">Live</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-8 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <ShieldCheck size={14} /> Role: {role || 'admin'}
          </div>
        </div>

        <button
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300"
          onClick={() => {
            clearXanoSession()
            router.push('/login')
          }}
        >
          <LogOut size={14} /> Log out
        </button>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0a111c]/90 px-5 py-3 backdrop-blur-xl sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open admin menu"><Menu size={18} /></button>
              <div>
                <p className="text-[9px] uppercase tracking-[.2em] text-slate-500">{eyebrow}</p>
                <h1 className="mt-1 text-xl font-semibold text-white">{title}</h1>
              </div>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300">
                <Search size={14} />
                Search
              </div>
              <button className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-300" aria-label="Notifications">
                <Bell size={14} />
              </button>
              <button className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-[#08150f]">Export</button>
            </div>
          </div>
        </header>

        <main className="p-5 sm:p-7">{children}</main>
      </div>
    </div>
  )
}

export function Metric({ label, value, detail, tone = 'default' }: { label: string; value: string; detail: string; tone?: 'default' | 'good' | 'warn' }) {
  const toneClasses = {
    default: 'border-slate-800 bg-[#101a29] text-slate-100',
    good: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200',
    warn: 'border-amber-500/20 bg-amber-500/5 text-amber-200',
  }

  return (
    <div className={`rounded-xl border p-4 ${toneClasses[tone]}`}>
      <div className="text-[10px] uppercase tracking-[.18em] text-slate-400">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{detail}</div>
    </div>
  )
}

export function SectionCard({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-[#101a29] p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        {action && <span className="text-[10px] uppercase tracking-[.18em] text-slate-400">{action}</span>}
      </div>
      {children}
    </section>
  )
}
