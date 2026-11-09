'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ChevronRight, LogOut, Menu, Wallet } from 'lucide-react'
import { clearXanoSession, getXanoSession, xanoRequest } from '@/lib/xano-auth'
import { toMoney, toNumeric, toTitleCase } from '@/lib/xano-client'
import { getMyInvestments, type Investment } from '@/lib/investment-api'

type Section = 'investments' | 'wallet' | 'activity'
type Row = Record<string, any>

const navigation = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/investments', label: 'Investments' },
  { href: '/dashboard/wallet', label: 'Wallet' },
  { href: '/dashboard/activity', label: 'Activity' },
]

function rowsFrom(response: any, ...keys: string[]): Row[] {
  if (Array.isArray(response)) return response
  for (const key of keys) {
    const value = key.split('.').reduce<any>((current, part) => current?.[part], response)
    if (Array.isArray(value)) return value
  }
  return []
}

function authFailure(message: string) {
  return /(?:^|\D)401(?:\D|$)|unauthenticated|not authenticated|invalid token|token expired/i.test(message)
}

export default function MemberWorkspacePage({ section }: { section: Section }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!getXanoSession()?.authToken) {
        clearXanoSession()
        router.replace(`/login?next=/dashboard/${section}`)
        return
      }

      try {
        if (section === 'investments') {
          const investments = await getMyInvestments()
          if (mounted) setRows(investments as Row[])
        } else {
          const path = section === 'wallet' ? '/api:ledger-api/accounts' : '/api:ledger-api/transactions'
          const response = await xanoRequest<any>(path, { method: 'GET' }, { auth: true })
          if (!mounted) return
          setRows(section === 'wallet'
            ? rowsFrom(response, 'accounts', 'items', 'data.accounts', 'data.items', 'data')
            : rowsFrom(response, 'transactions', 'items', 'data.transactions', 'data.items', 'data'))
        }
      } catch (cause) {
        if (!mounted) return
        const message = cause instanceof Error ? cause.message : 'Unable to load this workspace page.'
        if (authFailure(message)) {
          clearXanoSession()
          router.replace(`/login?next=/dashboard/${section}`)
          return
        }
        setError(message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [router, section])

  const title = section === 'wallet' ? 'Wallet' : section === 'activity' ? 'Activity' : 'Investments'
  const subtitle = section === 'wallet'
    ? 'Your ledger accounts and current balances.'
    : section === 'activity'
      ? 'Recent transactions recorded on your ledger.'
      : 'Your investment positions and their current status.'

  return <main className="min-h-screen bg-[#071a18] text-[#edf7f1]">
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-[#0a211e] p-5 transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <div className="flex items-center justify-between"><Link href="/" className="font-semibold tracking-tight">Madallion <span className="text-[#b9f47f]">fund</span></Link><button className="lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button></div>
      <p className="mt-12 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6e9183]">Member workspace</p>
      <nav className="mt-4 space-y-1" aria-label="Account navigation">{navigation.map((item) => {
        const active = item.href === '/dashboard' ? false : item.href === `/dashboard/${section}`
        return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} aria-current={active ? 'page' : undefined} className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm transition ${active ? 'bg-white/10 text-white' : 'text-[#aac1b7] hover:bg-white/5 hover:text-white'}`}>{item.label}<ChevronRight size={15} /></Link>
      })}</nav>
      <button onClick={() => { clearXanoSession(); router.replace('/login') }} className="absolute bottom-7 left-5 flex items-center gap-2 text-sm text-[#789589]"><LogOut size={16} /> Log out</button>
    </aside>
    <div className="lg:pl-72"><header className="border-b border-white/10 px-5 py-5 sm:px-8"><div className="mx-auto flex max-w-7xl items-center gap-4"><button className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button><div><p className="text-xs uppercase tracking-[0.22em] text-[#719486]">Member workspace</p><h1 className="mt-1 text-xl font-semibold">{title}</h1></div></div></header>
      <section className="mx-auto max-w-7xl p-5 sm:p-8"><p className="text-sm text-[#8eaea0]">{subtitle}</p>
        {error && <div role="alert" className="mt-5 rounded-xl border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-200"><p>{error}</p>{section === 'investments' && <p className="mt-2 text-xs text-red-100/80">Confirm that the authenticated Xano ledger API exposes GET /investments for the signed-in member.</p>}</div>}
        {loading && <p className="mt-6 text-sm text-[#789589]">Loading {section}…</p>}
        {!loading && !error && section === 'investments' && <InvestmentList investments={rows as Investment[]} />}
        {!loading && !error && section === 'wallet' && <div className="mt-6 grid gap-3 md:grid-cols-2">{rows.length ? rows.map((row, index) => <article key={row.id ?? row.account_id ?? index} className="rounded-2xl border border-white/10 bg-[#0b2420] p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{String(row.name ?? row.account_name ?? row.type ?? row.code ?? 'Account')}</h2><p className="mt-1 text-xs text-[#789589]">{row.currency ?? 'NGN'} · {toTitleCase(String(row.status ?? 'active'))}</p></div><Wallet className="text-[#b9f47f]" size={19} /></div><p className="mt-5 text-2xl font-semibold">{toMoney(row.balance ?? row.current_balance ?? row.amount, '₦0')}</p><p className="mt-1 text-xs text-[#789589]">Account balance</p></article>) : <Empty text="No accounts were returned for your profile." />}</div>}
        {!loading && !error && section === 'activity' && <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#0b2420] px-5">{rows.length ? rows.map((row, index) => <Transaction key={row.id ?? row.transaction_id ?? index} row={row} />) : <Empty text="No transactions have been recorded yet." />}</div>}
      </section>
    </div>
  </main>
}

function InvestmentList({ investments }: { investments: Investment[] }) {
  if (!investments.length) return <div className="mt-6 rounded-3xl border border-dashed border-white/10 p-7"><p className="font-medium">No investments yet</p><p className="mt-2 text-sm text-[#789589]">Your investments will appear here after you subscribe to a plan.</p><Link href="/plans" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#b9f47f] px-4 py-3 text-sm font-semibold text-[#071a18]">Explore plans <ArrowRight size={15} /></Link></div>
  return <div className="mt-6 grid gap-4 lg:grid-cols-2">{investments.map((investment, index) => {
    const plan = investment.plan?.name ?? investment.plan_name ?? (investment.plan_id ? `Plan ${investment.plan_id}` : 'Investment')
    const principal = toNumeric(investment.principal)
    const accrued = toNumeric(investment.accrued_total)
    const status = toTitleCase(String(investment.status ?? 'active'))
    const currency = String(investment.currency ?? investment.plan?.currency ?? 'NGN')
    const ends = investment.ends_at ?? investment.maturity_at
    const maturity = ends ? new Date(Number(ends) < 1e12 ? Number(ends) * 1000 : ends).toLocaleDateString() : 'Not specified'
    return <article key={investment.id ?? index} className="rounded-2xl border border-white/10 bg-[#0b2420] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[.16em] text-[#789589]">{plan}</p><p className="mt-2 text-2xl font-semibold">{toMoney(principal, currency === 'GHS' ? 'GH₵0' : '₦0')}</p><p className="mt-1 text-xs text-[#789589]">Principal</p></div><span className="rounded-full border border-[#b9f47f]/20 bg-[#b9f47f]/10 px-3 py-1 text-xs font-medium text-[#c7f5a1]">{status}</span></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4"><div><p className="text-xs text-[#789589]">Accrued</p><p className="mt-1 text-sm font-semibold">{toMoney(accrued, currency === 'GHS' ? 'GH₵0' : '₦0')}</p></div><div><p className="text-xs text-[#789589]">Maturity</p><p className="mt-1 text-sm font-semibold">{maturity}</p></div></div></article>
  })}</div>
}

function Transaction({ row }: { row: Row }) {
  const amount = toNumeric(row.amount ?? row.total_amount ?? row.value)
  const label = String(row.description ?? row.reference ?? row.type ?? row.kind ?? 'Ledger transaction')
  const created = row.created_at ?? row.createdAt ?? row.date
  const timestamp = created ? Number(created) < 1e12 ? Number(created) * 1000 : created : null
  return <article className="flex items-center justify-between gap-4 py-4"><div className="flex min-w-0 items-center gap-3"><span className={`rounded-full p-2 ${amount >= 0 ? 'bg-[#183e31] text-[#b9f47f]' : 'bg-[#3c2925] text-[#ffb19d]'}`}>{amount >= 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><div className="min-w-0"><p className="truncate text-sm font-medium">{label}</p><p className="mt-1 text-xs text-[#789589]">{timestamp ? new Date(timestamp).toLocaleString() : 'Date unavailable'} · {String(row.status ?? 'recorded')}</p></div></div><p className="whitespace-nowrap text-sm font-semibold">{toMoney(Math.abs(amount), '₦0')}</p></article>
}

function Empty({ text }: { text: string }) { return <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-[#789589]">{text}</p> }
