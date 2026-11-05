'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowUpRight, Bell, ChevronRight, LogOut, Menu, Plus, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { clearXanoSession, getXanoSession } from '@/lib/xano-auth'
import { getFirstValue, xanoAuthMe, xanoLedgerDashboard } from '@/lib/xano-client'

const positions = [
  { name: 'Gold Plan', status: 'Active', invested: '₦500,000', return: '+₦54,000', maturity: '18 Aug 2026' },
  { name: 'Starter Plan', status: 'Maturing soon', invested: '₦120,000', return: '+₦43,200', maturity: '02 Aug 2026' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const authToken = getXanoSession()?.authToken
    if (!authToken) {
      clearXanoSession()
      router.replace('/login?next=/dashboard')
      return
    }

    let mounted = true

    async function load() {
      try {
        const [meRes, ledgerRes] = await Promise.all([
          xanoAuthMe(authToken),
          xanoLedgerDashboard(authToken),
        ])
        if (!mounted) return
        setProfile(meRes)
        setSummary(ledgerRes)
        setReady(true)
      } catch (requestError) {
        if (!mounted) return
        const message = requestError instanceof Error ? requestError.message : 'Unable to load your dashboard.'
        if (/401|403|unauthenticated|not authenticated/i.test(message)) {
          clearXanoSession()
          router.replace('/login?next=/dashboard')
          return
        }
        setError(message)
        setReady(true)
      }
    }

    load()
    return () => { mounted = false }
  }, [router])

  const dashboardPayload = summary?.summary ?? summary?.data ?? summary ?? {}
  const portfolioValue = getFirstValue(dashboardPayload, ['portfolio_value', 'total_value', 'net_balance', 'balance']) ?? '₦724,200'
  const monthlyReturn = getFirstValue(dashboardPayload, ['monthly_return', 'returns_total']) ?? '₦68,400'
  const activePlans = getFirstValue(dashboardPayload, ['active_plans', 'plans_count']) ?? '03'
  const walletBalance = getFirstValue(dashboardPayload, ['wallet_balance', 'available_balance', 'balance']) ?? '₦240,500'

  if (!ready) {
    return <main className="flex min-h-screen items-center justify-center bg-[#eef5ef] text-[#10211b]"><p className="text-sm text-[#5d7068]">Checking your session…</p></main>
  }

  if (error) {
    return <main className="flex min-h-screen items-center justify-center bg-[#eef5ef] px-5 text-[#10211b]"><div className="rounded-2xl border border-[#f0d2cf] bg-white p-6 text-center shadow-sm"><h1 className="text-lg font-semibold">Dashboard unavailable</h1><p className="mt-2 max-w-sm text-sm text-[#6b7771]">{error}</p><button onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-[#0b4537] px-4 py-2 text-sm font-semibold text-white">Try again</button></div></main>
  }

  return (
    <main className="min-h-screen bg-[#eef5ef] text-[#10211b]">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-[#d9e7dc] bg-[#f8fbf7]/95 p-5 backdrop-blur-xl transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between"><Link href="/" className="font-bold text-[#0b4537]">Madallion fund</Link><button className="lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button></div>
        <nav className="mt-12 space-y-2" aria-label="Account navigation">
          {[
            ['/dashboard', 'Overview'],
            ['/dashboard/investments', 'My investments'],
            ['/dashboard/wallet', 'Wallet'],
            ['/dashboard/activity', 'Activity'],
          ].map(([href, label]) => <Link key={href} href={href} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-[#49615b] transition hover:bg-[#ecf4ee] hover:text-[#0b4537]">{label}<ChevronRight size={16} /></Link>)}
        </nav>
        <Link href="/" className="absolute bottom-7 left-5 flex items-center gap-2 text-sm font-semibold text-[#71847a]"><LogOut size={16} /> Exit dashboard</Link>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-[#dce9df]/80 bg-[#eef5ef]/85 px-5 py-4 backdrop-blur-xl"><div className="flex items-center justify-between"><button className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button><div><p className="text-xs uppercase tracking-[0.22em] text-[#799388]">Investor portal</p><h1 className="mt-1 text-xl font-semibold text-[#10211b]">{profile?.name ? `Welcome, ${profile.name}` : 'Good morning'}</h1></div><div className="flex items-center gap-3"><button className="rounded-full border border-[#d9e7dc] bg-white p-2" aria-label="Notifications"><Bell size={16} /></button><button className="rounded-full bg-[#0b4537] px-3 py-2 text-sm font-medium text-white">View report</button></div></div></header>
        <section className="mx-auto max-w-7xl p-5 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-3"><Metric label="Portfolio value" value={String(portfolioValue)} detail="+₦97,200 all time" /><Metric label="Monthly return" value={String(monthlyReturn)} detail="+8.4% this month" /><Metric label="Active plans" value={String(activePlans)} detail="2 maturing soon" /></div>
          <div className="mt-8 grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
            <div className="rounded-3xl border border-[#d8e6dc] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-[#7a8d87]">Performance</p><h2 className="mt-2 text-2xl font-semibold text-[#10211b]">₦1.32M</h2></div><div className="rounded-full bg-[#ebf9ea] px-3 py-1 text-sm font-medium text-[#1a6b48]">+12.8%</div></div><div className="mt-8 grid gap-5 sm:grid-cols-3"><div><p className="text-xs uppercase tracking-[0.2em] text-[#7a8d87]">Deposits</p><p className="mt-2 text-lg font-semibold text-[#10211b]">₦950,000</p></div><div><p className="text-xs uppercase tracking-[0.2em] text-[#7a8d87]">Returns</p><p className="mt-2 text-lg font-semibold text-[#10211b]">₦280,000</p></div><div><p className="text-xs uppercase tracking-[0.2em] text-[#7a8d87]">Available</p><p className="mt-2 text-lg font-semibold text-[#10211b]">{String(walletBalance)}</p></div></div></div>
            <div className="rounded-3xl border border-[#d8e6dc] bg-[#0b4537] p-5 text-white shadow-sm"><p className="text-xs uppercase tracking-[0.2em] text-[#b9f47f]">Wallet</p><h3 className="mt-3 text-3xl font-semibold">{String(walletBalance)}</h3><div className="mt-6 flex items-center justify-between rounded-2xl bg-white/5 p-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#b9f47f] p-2 text-[#0b4537]"><Wallet size={16} /></div><span className="text-sm">Primary wallet</span></div><ArrowUpRight size={16} /></div><button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#b9f47f] px-4 py-3 text-sm font-semibold text-[#0b4537]"><Plus size={16} /> Add funds</button></div>
          </div>
          <div className="mt-8 rounded-3xl border border-[#d8e6dc] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-[#10211b]">Investment positions</h2><Link href="/dashboard" className="text-sm font-medium text-[#0b4537]">View all</Link></div><div className="mt-5 space-y-3">{positions.map((position) => <div key={position.name} className="flex flex-col gap-3 rounded-2xl border border-[#e4efe6] bg-[#f8fbf7] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-[#10211b]">{position.name}</p><p className="text-sm text-[#62786d]">{position.status}</p></div><div className="flex items-center gap-6 text-sm"><div><span className="block text-[#7d8f88]">Invested</span><span className="font-semibold text-[#10211b]">{position.invested}</span></div><div><span className="block text-[#7d8f88]">Return</span><span className="font-semibold text-[#0c7d52]">{position.return}</span></div><div><span className="block text-[#7d8f88]">Maturity</span><span className="font-semibold text-[#10211b]">{position.maturity}</span></div></div></div>)}</div></div>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-[#d8e6dc] bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-[0.2em] text-[#7d8f88]">{label}</p><p className="mt-3 text-2xl font-semibold text-[#10211b]">{value}</p><p className="mt-1 text-sm text-[#5f7069]">{detail}</p></div>
}
