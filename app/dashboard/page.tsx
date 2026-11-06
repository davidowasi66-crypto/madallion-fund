'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Bell, ChevronRight, CircleCheck, Clock3, LogOut, Menu, Plus, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { clearXanoSession, getXanoSession } from '@/lib/xano-auth'
import { InvestmentProgress, LiveMoneyCounters } from '@/components/investment-widgets'
import { chooseArray, getFirstValue, toMoney, toNumeric, toTitleCase, xanoAuthMe, xanoLedgerAccounts, xanoLedgerDashboard, xanoLedgerTransactions } from '@/lib/xano-client'

export default function DashboardPage() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const authToken = getXanoSession()?.authToken
    if (!authToken) {
      clearXanoSession()
      router.replace('/login?next=/dashboard')
      return
    }
    let mounted = true
    Promise.all([xanoAuthMe(authToken), xanoLedgerDashboard(authToken), xanoLedgerAccounts(authToken), xanoLedgerTransactions(authToken)])
      .then(([me, dashboard, accountResponse, transactionResponse]) => {
        if (!mounted) return
        setProfile(me)
        setSummary(dashboard)
        setAccounts(chooseArray(accountResponse?.accounts ?? accountResponse?.data ?? accountResponse, []))
        setTransactions(chooseArray(transactionResponse?.transactions ?? transactionResponse?.data ?? transactionResponse, []))
        setReady(true)
      })
      .catch((requestError) => {
        if (!mounted) return
        const message = requestError instanceof Error ? requestError.message : 'Unable to load your ledger.'
        if (/401|403|unauthenticated|not authenticated/i.test(message)) {
          clearXanoSession()
          router.replace('/login?next=/dashboard')
          return
        }
        setError(message)
        setReady(true)
      })
    return () => { mounted = false }
  }, [router])

  const payload = summary?.dashboard ?? summary?.summary ?? summary?.data ?? summary ?? {}
  const currency = String(getFirstValue(payload, ['currency', 'base_currency']) ?? 'NGN')
  const balance = getFirstValue(payload, ['total_balance', 'net_balance', 'balance', 'portfolio_value'])
  const assets = getFirstValue(payload, ['total_assets', 'assets', 'total_value'])
  const liabilities = getFirstValue(payload, ['total_liabilities', 'liabilities'])
  const accountRows = useMemo(() => accounts.slice(0, 4), [accounts])

  if (!ready) return <main className="flex min-h-screen items-center justify-center bg-[#071a18] text-[#dcebe4]"><p className="text-sm text-[#9ab8ab]">Loading your ledger…</p></main>
  if (error) return <main className="flex min-h-screen items-center justify-center bg-[#071a18] px-5 text-white"><div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-7 text-center"><h1 className="text-xl font-semibold">Ledger unavailable</h1><p className="mt-2 text-sm text-[#aac1b7]">{error}</p><button onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-[#b9f47f] px-4 py-2 text-sm font-semibold text-[#071a18]">Try again</button></div></main>

  return (
    <main className="min-h-screen bg-[#071a18] text-[#edf7f1]">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-[#0a211e] p-5 transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between"><Link href="/" className="font-semibold tracking-tight">Madallion <span className="text-[#b9f47f]">fund</span></Link><button className="lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button></div>
        <p className="mt-12 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6e9183]">Ledger workspace</p>
        <nav className="mt-4 space-y-1" aria-label="Account navigation">{[['/dashboard', 'Overview'], ['/dashboard/investments', 'Investments'], ['/dashboard/wallet', 'Wallet'], ['/dashboard/activity', 'Activity']].map(([href, label]) => <Link key={href} href={href} className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm ${href === '/dashboard' ? 'bg-[#b9f47f] font-semibold text-[#071a18]' : 'text-[#aac1b7] hover:bg-white/5 hover:text-white'}`}>{label}<ChevronRight size={15} /></Link>)}</nav>
        <Link href="/" className="absolute bottom-7 left-5 flex items-center gap-2 text-sm text-[#789589]"><LogOut size={16} /> Exit dashboard</Link>
      </aside>
      <div className="lg:pl-72"><header className="border-b border-white/10 bg-[#071a18] px-5 py-5 sm:px-8"><div className="flex items-center justify-between"><button className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button><div><p className="text-xs uppercase tracking-[0.22em] text-[#719486]">User ledger</p><h1 className="mt-1 text-xl font-semibold">{profile?.name ? `Welcome back, ${profile.name}` : 'Welcome back'}</h1></div><button className="rounded-full border border-white/10 p-2 text-[#aac1b7]" aria-label="Notifications"><Bell size={17} /></button></div></header>
        <section className="mx-auto max-w-7xl p-5 sm:p-8"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><p className="text-sm text-[#8eaea0]">Live from ledger-api</p><h2 className="mt-1 text-3xl font-semibold tracking-tight">Financial overview</h2></div><span className="rounded-full border border-[#315448] bg-[#0d2c26] px-3 py-1.5 text-xs text-[#b9f47f]">{currency} ledger</span></div>
          <div className="mt-7"><LiveMoneyCounters /></div><div className="mt-7 grid gap-4 md:grid-cols-3"><Metric label="Net balance" value={toMoney(balance, '₦0')} icon={<Wallet size={17} />} /><Metric label="Total assets" value={toMoney(assets, '₦0')} icon={<ArrowUpRight size={17} />} /><Metric label="Liabilities" value={toMoney(liabilities, '₦0')} icon={<ArrowDownLeft size={17} />} /></div>
          <div className="mt-7 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]"><section className="rounded-3xl border border-white/10 bg-[#0b2420] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-[#76998b]">Accounts</p><h3 className="mt-2 text-xl font-semibold">Your ledger accounts</h3></div><span className="text-sm text-[#8eaea0]">{accounts.length} total</span></div><div className="mt-5 space-y-2">{accountRows.length ? accountRows.map((account, index) => <AccountRow key={account.id ?? account.account_id ?? index} account={account} />) : <Empty text="No ledger accounts returned yet." />}</div></section>
            <section className="rounded-3xl bg-[#b9f47f] p-6 text-[#071a18]"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#37613a]">Quick action</p><h3 className="mt-3 text-2xl font-semibold">Move money with confidence.</h3><p className="mt-2 text-sm leading-6 text-[#35563c]">Create a balanced transaction or review your account statement from the ledger.</p><button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#071a18] px-4 py-3 text-sm font-semibold text-white"><Plus size={16} /> New transaction</button></section></div>
          <section className="mt-7 rounded-3xl border border-white/10 bg-[#0b2420] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-[#76998b]">Plan progress</p><h3 className="mt-2 text-xl font-semibold">Your active investments</h3></div></div><div className="mt-5"><InvestmentProgress /></div></section><section className="mt-7 rounded-3xl border border-white/10 bg-[#0b2420] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-[#76998b]">Recent activity</p><h3 className="mt-2 text-xl font-semibold">Latest transactions</h3></div><Link href="/dashboard/activity" className="text-sm font-semibold text-[#b9f47f]">View all</Link></div><div className="mt-5 divide-y divide-white/10">{transactions.slice(0, 5).map((transaction, index) => <TransactionRow key={transaction.id ?? transaction.transaction_id ?? index} transaction={transaction} />)}{!transactions.length && <Empty text="No transactions recorded yet." />}</div></section>
        </section></div>
    </main>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <div className="rounded-2xl border border-white/10 bg-[#0b2420] p-5"><div className="flex items-center justify-between text-[#91b0a2]"><span className="text-xs uppercase tracking-[0.18em]">{label}</span><span className="rounded-lg bg-white/5 p-2">{icon}</span></div><p className="mt-4 text-2xl font-semibold">{value}</p></div> }
function AccountRow({ account }: { account: any }) { const name = String(account.name ?? account.account_name ?? account.code ?? 'Account'); const amount = account.balance ?? account.current_balance ?? account.amount; const status = String(account.status ?? 'active'); return <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0e2b26] px-4 py-3"><div><p className="text-sm font-semibold">{name}</p><p className="mt-1 text-xs text-[#789589]">{account.currency ?? 'NGN'} · {toTitleCase(status)}</p></div><p className="text-sm font-semibold">{toMoney(amount, '₦0')}</p></div> }
function TransactionRow({ transaction }: { transaction: any }) { const amount = toNumeric(transaction.amount ?? transaction.total_amount ?? transaction.value); const label = String(transaction.description ?? transaction.reference ?? transaction.type ?? 'Ledger transaction'); const date = transaction.created_at ?? transaction.createdAt ?? transaction.date; const pending = String(transaction.status ?? '').toLowerCase() === 'pending'; return <div className="flex items-center justify-between gap-4 py-4"><div className="flex min-w-0 items-center gap-3"><span className={`rounded-full p-2 ${amount >= 0 ? 'bg-[#183e31] text-[#b9f47f]' : 'bg-[#3c2925] text-[#ffb19d]'}`}>{amount >= 0 ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</span><div className="min-w-0"><p className="truncate text-sm font-medium">{label}</p><p className="mt-1 text-xs text-[#789589]">{date ? new Date(date).toLocaleDateString() : 'Recently recorded'}</p></div></div><div className="text-right"><p className={`text-sm font-semibold ${amount >= 0 ? 'text-[#b9f47f]' : 'text-[#ffb19d]'}`}>{amount >= 0 ? '+' : '-'}{toMoney(Math.abs(amount), '₦0')}</p><p className="mt-1 flex items-center justify-end gap-1 text-xs text-[#789589]">{pending ? <Clock3 size={12} /> : <CircleCheck size={12} />}{pending ? 'Pending' : 'Posted'}</p></div></div> }
function Empty({ text }: { text: string }) { return <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-[#789589]">{text}</p> }
