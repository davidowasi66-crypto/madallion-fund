'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Clock3,
  LogOut,
  Menu,
  Wallet,
} from 'lucide-react'
import { clearXanoSession, getXanoSession, xanoRequest } from '@/lib/xano-auth'
import { toMoney, toNumeric, toTitleCase } from '@/lib/xano-client'
import { getMyInvestments, type Investment } from '@/lib/investment-api'
import { ActivityTicker } from '@/components/activity-ticker'
import { MemberTabBar } from '@/components/member-tab-bar'
import { MaturityProgressBar, SavingsGoalCard } from '@/components/investment-widgets'

type Section = 'investments' | 'wallet' | 'activity'
type Row = Record<string, any>

const navigation = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/investments', label: 'Investments' },
  { href: '/dashboard/wallet', label: 'Wallet' },
  { href: '/dashboard/activity', label: 'Activity' },
  { href: '/affiliate', label: 'Team' },
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
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!getXanoSession()?.authenticated) {
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
          setRows(
            section === 'wallet'
              ? rowsFrom(response, 'accounts', 'items', 'data.accounts', 'data.items', 'data')
              : rowsFrom(response, 'transactions', 'items', 'data.transactions', 'data.items', 'data'),
          )
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
    return () => {
      mounted = false
    }
  }, [router, section])

  const title = section === 'wallet' ? 'Wallet' : section === 'activity' ? 'Activity' : 'Investments'
  const subtitle =
    section === 'wallet'
      ? 'Deposit, withdraw, and review your ledger balances.'
      : section === 'activity'
        ? 'Recent transactions recorded on your ledger.'
        : 'Your investment positions, maturity progress, and savings goal.'

  const investments = rows as Investment[]
  const portfolioValue = useMemo(
    () => investments.reduce((sum, inv) => sum + toNumeric(inv.principal) + toNumeric(inv.accrued_total), 0),
    [investments],
  )

  const walletBalance = useMemo(
    () =>
      section === 'wallet'
        ? rows.reduce((sum, row) => sum + toNumeric(row.balance ?? row.current_balance ?? row.amount), 0)
        : 0,
    [rows, section],
  )

  const amountNum = Number(String(amount).replace(/[^0-9.]/g, '')) || 0

  return (
    <main className="min-h-screen bg-[#f4f8f3] text-[#101d1a] pb-24 lg:bg-[#071a18] lg:pb-8 lg:text-[#edf7f1]">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-[#0a211e] p-5 text-[#edf7f1] transition-transform lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            Madallion <span className="text-[#b9f47f]">fund</span>
          </Link>
          <button className="lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            ×
          </button>
        </div>
        <p className="mt-12 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6e9183]">Member workspace</p>
        <nav className="mt-4 space-y-1" aria-label="Account navigation">
          {navigation.map((item) => {
            const active =
              item.href === `/dashboard/${section}` || (section === 'wallet' && item.href === '/dashboard/wallet')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm transition ${
                  active ? 'bg-white/10 text-white' : 'text-[#aac1b7] hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.label}
                <ChevronRight size={15} />
              </Link>
            )
          })}
        </nav>
        <button
          onClick={() => {
            clearXanoSession()
            router.replace('/login')
          }}
          className="absolute bottom-7 left-5 flex items-center gap-2 text-sm text-[#789589]"
        >
          <LogOut size={16} /> Log out
        </button>
      </aside>

      <div className="lg:pl-72">
        {section === 'wallet' ? (
          <>
            <header className="bg-gradient-to-b from-[#0b4537] via-[#0d3d32] to-[#123f34] px-5 pb-6 pt-5 text-white sm:px-8">
              <div className="mx-auto max-w-lg">
                <div className="flex items-center justify-between gap-3">
                  <button className="lg:hidden rounded-full bg-white/10 p-2" onClick={() => setMenuOpen(true)} aria-label="Open menu">
                    <Menu size={18} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8fbfa8]">
                      {mode === 'deposit' ? 'Deposit' : 'Withdraw'}
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                      {mode === 'deposit' ? 'Add funds' : 'Cash out'}
                    </h1>
                    <p className="mt-1 text-sm text-[#a8c7b8]">
                      {mode === 'deposit'
                        ? 'Move money into your Madallion ledger'
                        : 'Request a payout to your linked bank'}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/activity"
                    className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-[#dcebe4]"
                  >
                    History
                  </Link>
                </div>

                <div className="mt-5 flex rounded-2xl bg-black/25 p-1">
                  <button
                    type="button"
                    onClick={() => setMode('deposit')}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                      mode === 'deposit' ? 'bg-[#b9f47f] text-[#071a18]' : 'text-[#a8c7b8]'
                    }`}
                  >
                    Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('withdraw')}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                      mode === 'withdraw' ? 'bg-[#b9f47f] text-[#071a18]' : 'text-[#a8c7b8]'
                    }`}
                  >
                    Withdraw
                  </button>
                </div>

                <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5">
                  <p className="text-xs text-[#8eaea0]">Enter amount</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-[#b9f47f]">₦</span>
                    <input
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full bg-transparent text-4xl font-semibold text-white outline-none placeholder:text-white/30"
                      aria-label="Amount"
                    />
                  </div>
                  <p className="mt-3 text-xs text-[#8eaea0]">Available: {toMoney(walletBalance, '₦0')}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(mode === 'deposit' ? [5000, 10000, 25000, 50000] : [1000, 5000, 10000, 25000]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#dcebe4]"
                    >
                      ₦{preset.toLocaleString('en-NG')}
                    </button>
                  ))}
                </div>
              </div>
            </header>

            <div className="mx-auto max-w-lg px-5 sm:px-8">
              <div className="-mt-2 rounded-2xl border border-[#dfe8e2] bg-white px-4 py-3 text-center text-sm text-[#60716b] shadow-sm">
                {mode === 'deposit' ? 'Min deposit · programme rules apply' : 'Min · ₦1,000.00'}
              </div>

              {mode === 'withdraw' && (
                <section className="mt-4 rounded-3xl border border-[#dfe8e2] bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#65a85c]">Destination</p>
                  <div className="mt-3 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Bank payout</p>
                      <p className="mt-0.5 text-xs text-amber-800/80">Link or confirm bank details in account settings when available</p>
                    </div>
                    <ChevronRight size={16} className="text-amber-800" />
                  </div>
                  <ul className="mt-4 space-y-2 text-xs text-[#60716b]">
                    <li className="flex items-center gap-2">
                      <Clock3 size={14} className="text-[#65a85c]" />
                      Processing follows ledger settlement windows
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowUpRight size={14} className="text-[#65a85c]" />
                      Amounts subject to available balance and programme limits
                    </li>
                  </ul>
                </section>
              )}

              {mode === 'deposit' && (
                <section className="mt-4 rounded-3xl border border-[#dfe8e2] bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#65a85c]">How deposits work</p>
                  <p className="mt-2 text-sm leading-6 text-[#60716b]">
                    Choose an amount, then complete funding through your configured payment channel. Credited balances
                    appear on your ledger accounts below.
                  </p>
                </section>
              )}

              <button
                type="button"
                disabled={amountNum <= 0}
                className="mt-5 w-full rounded-2xl bg-[#b9f47f] py-4 text-sm font-semibold text-[#071a18] disabled:opacity-40"
                onClick={() => {
                  window.alert(
                    mode === 'deposit'
                      ? `Deposit request UI: ₦${amountNum.toLocaleString('en-NG')}. Connect your payment endpoint next.`
                      : `Withdraw request UI: ₦${amountNum.toLocaleString('en-NG')}. Connect your payout endpoint next.`,
                  )
                }}
              >
                {mode === 'deposit' ? 'Continue deposit' : 'Withdraw'}
              </button>

              {error && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <section className="mt-6 mb-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#0b4537] lg:text-[#edf7f1]">Your accounts</h2>
                  <span className="text-xs text-[#708079]">{loading ? '…' : `${rows.length} total`}</span>
                </div>
                {loading && <p className="mt-4 text-sm text-[#708079]">Loading accounts…</p>}
                {!loading && !error && (
                  <div className="mt-4 grid gap-3">
                    {rows.length ? (
                      rows.map((row, index) => (
                        <article
                          key={row.id ?? row.account_id ?? index}
                          className="rounded-2xl border border-[#dfe8e2] bg-white p-5 shadow-sm lg:border-white/10 lg:bg-[#0b2420]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-[#0b4537] lg:text-white">
                                {String(row.name ?? row.account_name ?? row.type ?? 'Account')}
                              </h3>
                              <p className="mt-1 text-xs text-[#708079]">
                                {row.currency ?? 'NGN'} · {toTitleCase(String(row.status ?? 'active'))}
                              </p>
                            </div>
                            <Wallet className="text-[#2f7a4a] lg:text-[#b9f47f]" size={19} />
                          </div>
                          <p className="mt-4 text-2xl font-semibold text-[#0b4537] lg:text-white">
                            {toMoney(row.balance ?? row.current_balance ?? row.amount, '₦0')}
                          </p>
                        </article>
                      ))
                    ) : (
                      <Empty text="No accounts were returned for your profile." />
                    )}
                  </div>
                )}
              </section>
            </div>
          </>
        ) : (
          <>
            <header className="border-b border-[#dfe8e2] bg-white px-5 py-5 sm:px-8 lg:border-white/10 lg:bg-transparent">
              <div className="mx-auto flex max-w-7xl items-center gap-4">
                <button className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
                  <Menu size={20} />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#65a85c] lg:text-[#719486]">Member workspace</p>
                  <h1 className="mt-1 text-xl font-semibold text-[#0b4537] lg:text-white">{title}</h1>
                </div>
              </div>
            </header>
            <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-8">
              <ActivityTicker variant="member" />
            </div>
            <section className="mx-auto max-w-7xl p-5 sm:p-8">
              <p className="text-sm text-[#60716b] lg:text-[#8eaea0]">{subtitle}</p>
              {error && section !== 'investments' && (
                <div role="alert" className="mt-5 rounded-xl border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-700 lg:text-red-200">
                  <p>{error}</p>
                </div>
              )}
              {loading && <p className="mt-6 text-sm text-[#708079]">Loading {section}…</p>}
              {!loading && section === 'investments' && (
                <div className="mt-6 space-y-6">
                  <SavingsGoalCard currentValue={portfolioValue} />
                  {investments.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-[#dfe8e2] bg-white p-7 lg:border-white/10 lg:bg-transparent">
                      <p className="font-medium text-[#0b4537] lg:text-white">No investments yet</p>
                      <p className="mt-2 text-sm text-[#708079]">
                        Your investments will appear here after you subscribe to a plan.
                        {error ? ' (Ledger is still syncing — try again shortly.)' : ''}
                      </p>
                      <Link
                        href="/plans"
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#b9f47f] px-4 py-3 text-sm font-semibold text-[#071a18]"
                      >
                        Explore plans <ArrowRight size={15} />
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {investments.map((investment, index) => (
                        <MaturityProgressBar key={investment.id ?? index} investment={investment} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!loading && !error && section === 'activity' && (
                <div className="mt-6 divide-y divide-[#e7eee8] rounded-2xl border border-[#dfe8e2] bg-white px-5 lg:divide-white/10 lg:border-white/10 lg:bg-[#0b2420]">
                  {rows.length ? (
                    rows.map((row, index) => <Transaction key={row.id ?? index} row={row} />)
                  ) : (
                    <Empty text="No transactions have been recorded yet." />
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <MemberTabBar />
    </main>
  )
}

function Transaction({ row }: { row: Row }) {
  const amount = toNumeric(row.amount ?? row.total_amount ?? row.value)
  const label = String(row.description ?? row.reference ?? row.type ?? 'Ledger transaction')
  const created = row.created_at ?? row.createdAt ?? row.date
  const timestamp = created ? (Number(created) < 1e12 ? Number(created) * 1000 : created) : null
  return (
    <article className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`rounded-full p-2 ${
            amount >= 0
              ? 'bg-[#eef7eb] text-[#2f7a4a] lg:bg-[#183e31] lg:text-[#b9f47f]'
              : 'bg-[#fff0e8] text-[#c45c2a] lg:bg-[#3c2925] lg:text-[#ffb19d]'
          }`}
        >
          {amount >= 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#0b4537] lg:text-white">{label}</p>
          <p className="mt-1 text-xs text-[#708079]">
            {timestamp ? new Date(timestamp).toLocaleString() : 'Date unavailable'} · {String(row.status ?? 'recorded')}
          </p>
        </div>
      </div>
      <p className="whitespace-nowrap text-sm font-semibold text-[#0b4537] lg:text-white">{toMoney(Math.abs(amount), '₦0')}</p>
    </article>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-[#dfe8e2] px-4 py-8 text-center text-sm text-[#708079] lg:border-white/10">
      {text}
    </p>
  )
}
