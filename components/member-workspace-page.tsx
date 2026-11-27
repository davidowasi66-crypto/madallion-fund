'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  ChevronRight,
  Clock3,
  LogOut,
  Menu,
  Wallet,
} from 'lucide-react'
import { clearXanoSession, getXanoSession, xanoRequest } from '@/lib/xano-auth'
import { getMemberAccount, getMemberAccountEntries } from '@/lib/xano-ledger'
import { toMoney, toNumeric, toTitleCase } from '@/lib/xano-client'
import { getMyInvestments, initializeDeposit, requestWithdrawal, type Investment } from '@/lib/investment-api'
import { memberSafeError } from '@/lib/member-routes'
import { ActivityTicker } from '@/components/activity-ticker'
import { MemberTabBar } from '@/components/member-tab-bar'
import { AutoCompoundToggle, MaturityProgressBar, PortfolioSummary } from '@/components/investment-widgets'
import { InvestmentCertificate } from '@/components/investment-certificate'
import { PayoutDestinationCard } from '@/components/payout-destination-card'
import { FeeBreakdown } from '@/components/fee-breakdown'
import { MaturityActions } from '@/components/maturity-actions'
import { MaturityNudges } from '@/components/maturity-nudges'
import { DepositProof } from '@/components/deposit-proof'
import { WithdrawalProof } from '@/components/withdrawal-proof'

type Section = 'investments' | 'wallet' | 'activity'
type Row = Record<string, any>

const navigation = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/investments', label: 'Investments' },
  { href: '/dashboard/wallet', label: 'Wallet' },
  { href: '/dashboard/activity', label: 'Activity' },
  { href: '/dashboard/notifications', label: 'Notifications' },
  { href: '/affiliate', label: 'Referrals' }
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
  const [submitting, setSubmitting] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [payoutReady, setPayoutReady] = useState(false)
  const [planContext, setPlanContext] = useState('')
  const handlePayoutReady = useCallback((ready: boolean) => setPayoutReady(ready), [])
  const [accountDetail, setAccountDetail] = useState<{ account: Row; entries: Row[] } | null>(null)
  const [accountLoading, setAccountLoading] = useState(false)
  const [accountError, setAccountError] = useState('')

  async function openAccount(row: Row) {
    const id = row.id ?? row.account_id
    if (id == null) return
    setAccountDetail({ account: row, entries: [] })
    setAccountLoading(true)
    setAccountError('')
    try {
      const [account, entries] = await Promise.all([getMemberAccount(id), getMemberAccountEntries(id)])
      setAccountDetail({
        account: (account?.data ?? account ?? row) as Row,
        entries: rowsFrom(entries, 'entries', 'items', 'data.entries', 'data.items', 'data'),
      })
    } catch (cause) {
      setAccountError(memberSafeError(cause, 'Unable to load the account ledger.'))
    } finally {
      setAccountLoading(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedMode = params.get('mode')
    if (requestedMode === 'deposit' || requestedMode === 'withdraw') setMode(requestedMode)
    const requestedAmount = Number((params.get('amount') ?? '').replace(/[^0-9.]/g, ''))
    if (Number.isFinite(requestedAmount) && requestedAmount > 0) setAmount(String(requestedAmount))
    const plan = params.get('plan')?.trim()
    if (plan) setPlanContext(plan)
  }, [])

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!getXanoSession()?.authenticated) {
        clearXanoSession()
        const next = `/dashboard/${section}${window.location.search}`
        router.replace(`/login?next=${encodeURIComponent(next)}`)
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
          const next = `/dashboard/${section}${window.location.search}`
          router.replace(`/login?next=${encodeURIComponent(next)}`)
          return
        }
        setError(memberSafeError(cause, 'Unable to load this workspace page.'))
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
        : 'Your investment positions and maturity progress.'

  const investments = rows as Investment[]
  const walletBalance = useMemo(
    () =>
      section === 'wallet'
        ? rows.reduce((sum, row) => sum + toNumeric(row.balance ?? row.current_balance ?? row.amount), 0)
        : 0,
    [rows, section],
  )

  const amountNum = Number(String(amount).replace(/[^0-9.]/g, '')) || 0
  const amountError = mode === 'deposit'
    ? amountNum > 0 && amountNum < 10_000
      ? 'Minimum deposit is ₦10,000.'
      : amountNum > 5_000_000
        ? 'Maximum deposit is ₦5,000,000.'
        : ''
    : amountNum > 0 && amountNum < 1_000
      ? 'Minimum withdrawal is ₦1,000.'
      : amountNum > walletBalance
        ? 'Amount exceeds your available balance.'
        : ''

  async function submitWalletAction() {
    setError('')
    setActionMessage('')
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount greater than zero.')
      return
    }
    if (mode === 'deposit' && amountNum < 10_000) {
      setError('The minimum deposit is ₦10,000.')
      return
    }
    if (mode === 'deposit' && amountNum > 5_000_000) {
      setError('The maximum deposit is ₦5,000,000.')
      return
    }
    if (mode === 'withdraw' && amountNum < 1000) {
      setError('The minimum withdrawal is ₦1,000.')
      return
    }
    if (mode === 'withdraw' && amountNum > walletBalance) {
      setError('The withdrawal amount is greater than your available balance.')
      return
    }
    if (mode === 'withdraw' && !payoutReady) {
      setError('Save a bank payout destination before requesting a withdrawal.')
      return
    }
    setSubmitting(true)
    try {
      const minorUnits = Math.round(amountNum * 100)
      const result: any = mode === 'deposit'
        ? await initializeDeposit({ amount: minorUnits, currency: 'NGN' })
        : await requestWithdrawal({ amount: minorUnits, currency: 'NGN' })
      const redirect = result?.checkout_url ?? result?.payment_url ?? result?.authorization_url ?? result?.data?.checkout_url ?? result?.data?.payment_url
      if (mode === 'deposit' && typeof redirect === 'string' && /^https:\/\//i.test(redirect)) {
        window.location.assign(redirect)
        return
      }
      setActionMessage(mode === 'deposit'
        ? 'Deposit initialized. Follow the payment instructions returned by your payment provider.'
        : 'Withdrawal request submitted. You can follow its status in History.')
      setAmount('')
    } catch (cause) {
      setError(memberSafeError(cause, `Unable to submit your ${mode} request. Please try again.`))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="member-tab-page min-h-screen bg-[#f4f8f3] text-[#101d1a] lg:bg-[#071a18] lg:text-[#edf7f1]">
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
            <header className="rounded-b-[2rem] bg-[radial-gradient(ellipse_at_top_right,_rgba(160,98,39,.55),_transparent_52%),linear-gradient(145deg,#21160f_0%,#100c08_70%,#271607_100%)] px-5 pb-6 pt-5 text-white shadow-[0_22px_44px_rgba(30,20,10,.24)] sm:mx-4 sm:mt-4 sm:rounded-[2rem] sm:px-8">
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
                    {planContext && mode === 'deposit' && (
                      <p className="mt-2 rounded-xl bg-white/10 px-3 py-2 text-[11px] leading-5 text-[#dcebe4]">
                        Funding plan #{planContext}. After the deposit clears, activate it from the plan table.
                      </p>
                    )}
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
                      mode === 'deposit' ? 'bg-[#ff8b28] text-white' : 'text-[#e2c8a9]'
                    }`}
                  >
                    Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('withdraw')}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                      mode === 'withdraw' ? 'bg-[#ff8b28] text-white' : 'text-[#e2c8a9]'
                    }`}
                  >
                    Withdraw
                  </button>
                </div>

                <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-5">
                  <p className="text-xs text-[#8eaea0]">Enter amount</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-[#ff9c38]">₦</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={mode === 'deposit' ? 10_000 : 1_000}
                      max={mode === 'deposit' ? 5_000_000 : walletBalance}
                      step="1"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value)
                        setError('')
                      }}
                      className="w-full min-w-0 bg-transparent text-4xl font-semibold text-white outline-none placeholder:text-white/30"
                      aria-label="Amount"
                      aria-invalid={Boolean(amountError)}
                      aria-describedby={amountError ? 'amount-error' : undefined}
                    />
                  </div>
                  {amountError && <p id="amount-error" role="alert" className="mt-2 text-xs font-medium text-rose-300">{amountError}</p>}
                  <p className="mt-3 text-xs text-[#8eaea0]">Available: {toMoney(walletBalance, '₦0')}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(mode === 'deposit' ? [10_000, 25_000, 100_000, 500_000] : [1000, 5000, 10000, 25000]).map((preset) => (
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

            <div className="mx-auto max-w-lg bg-[#f6f1e8] px-5 pb-8 sm:px-8">

              {mode === 'withdraw' && (
                <>
                  <PayoutDestinationCard onReady={handlePayoutReady} />
                  <section className="mt-3 rounded-3xl border border-[#dfe8e2] bg-white p-4 shadow-sm">
                    <ul className="flex flex-col gap-2 text-xs text-[#60716b]">
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
                </>
              )}

              {mode === 'deposit' && (
                <>
                  <section className="mt-4 rounded-3xl border border-[#dfe8e2] bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#65a85c]">How deposits work</p>
                    <p className="mt-2 text-sm leading-6 text-[#60716b]">
                      Choose an amount, then complete funding through your configured payment channel. Credited balances
                      appear on your ledger accounts below.
                    </p>
                  </section>
                  <DepositProof amount={amountNum} />
                </>
              )}

              <button
                type="button"
                disabled={amountNum <= 0 || Boolean(amountError) || submitting || (mode === 'withdraw' && !payoutReady)}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#ffae4f] to-[#f56810] py-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(245,104,16,.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                onClick={submitWalletAction}
              >
                {submitting ? 'Submitting…' : mode === 'deposit' ? 'Continue deposit' : 'Withdraw'}
              </button>
              {actionMessage && (
                <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  {actionMessage}
                </p>
              )}

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
                          <button
                            type="button"
                            onClick={() => void openAccount(row)}
                            className="mt-3 text-xs font-medium text-[#2f7a4a] underline lg:text-[#b9f47f]"
                          >
                            View ledger
                          </button>
                        </article>
                      ))
                    ) : (
                      <Empty text="No accounts were returned for your profile." />
                    )}
                  </div>
                )}
              </section>

              {accountDetail && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
                  <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#dfe8e2] bg-white p-5 shadow-2xl">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[#65a85c]">Account ledger</p>
                        <h2 className="mt-1 text-lg font-semibold text-[#0b4537]">
                          {String(accountDetail.account.name ?? accountDetail.account.account_name ?? 'Account')}
                        </h2>
                        <p className="mt-1 text-sm text-[#60716b]">
                          {toMoney(accountDetail.account.balance ?? accountDetail.account.current_balance, '₦0')}
                        </p>
                      </div>
                      <button type="button" onClick={() => setAccountDetail(null)} className="rounded-lg border border-[#dfe8e2] px-3 py-2 text-xs text-[#0b4537]">
                        Close
                      </button>
                    </div>
                    {accountLoading && <p className="mt-4 text-sm text-[#60716b]">Loading entries…</p>}
                    {accountError && <p className="mt-4 text-sm text-red-600">{accountError}</p>}
                    {!accountLoading && !accountError && (
                      <div className="mt-4 divide-y divide-[#e7eee8]">
                        {accountDetail.entries.length ? (
                          accountDetail.entries.map((entry, index) => (
                            <div key={entry.id ?? index} className="flex items-center justify-between gap-3 py-3 text-sm">
                              <div className="min-w-0">
                                <p className="truncate font-medium text-[#0b4537]">
                                  {String(entry.description ?? entry.reference ?? entry.type ?? 'Entry')}
                                </p>
                                <p className="mt-1 text-xs text-[#708079]">
                                  {entry.created_at
                                    ? new Date(Number(entry.created_at) < 1e12 ? Number(entry.created_at) * 1000 : entry.created_at).toLocaleString('en-NG')
                                    : '—'}
                                </p>
                              </div>
                              <span className="shrink-0 font-semibold text-[#0b4537]">
                                {toMoney(entry.amount ?? entry.debit ?? entry.credit, '₦0')}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="py-6 text-sm text-[#708079]">No entries returned for this account.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                <Link href="/dashboard/notifications" aria-label="Notifications" className="ml-auto inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-[#dfe8e2] text-[#0b4537] hover:bg-[#f4f8f3] lg:border-white/15 lg:text-[#b9f47f] lg:hover:bg-white/5">
                  <Bell size={18} aria-hidden="true" />
                </Link>
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
                  <PortfolioSummary investments={investments} />
                  <MaturityNudges investments={investments} />
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
                        <div
                          key={investment.id ?? index}
                          id={investment.id != null ? `investment-${investment.id}` : undefined}
                          className="scroll-mt-24 space-y-3"
                        >
                          <MaturityProgressBar investment={investment} />
                          <MaturityActions investment={investment} />
                          <AutoCompoundToggle investment={investment} />
                          <FeeBreakdown investment={investment} />
                          <InvestmentCertificate investment={investment} />
                        </div>
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
  const kind = String(row.type ?? row.kind ?? row.description ?? '').toLowerCase()
  const shareablePayout = /withdraw|cash.?out|payout|disburs/.test(kind)
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
      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className="whitespace-nowrap text-sm font-semibold text-[#0b4537] lg:text-white">{toMoney(Math.abs(amount), '₦0')}</p>
        {shareablePayout && <WithdrawalProof transaction={row} />}
      </div>
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
