'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  CircleCheck,
  Clock3,
  FileText,
  Gift,
  Layers,
  LogOut,
  Menu,
  Users,
  Wallet,
} from 'lucide-react'
import { clearXanoSession, getXanoSession } from '@/lib/xano-auth'
import { ActivityTicker } from '@/components/activity-ticker'
import { MemberTabBar } from '@/components/member-tab-bar'
import { MemberMaturityPreview } from '@/components/investment-widgets'
import { toMoney, toNumeric, toTitleCase } from '@/lib/xano-client'
import {
  getLedgerProfile,
  getMemberAccounts,
  getMemberLedgers,
  getMemberTransactions,
  getMemberAccountStatement,
} from '@/lib/xano-ledger'

type Row = Record<string, any>

function profileFrom(response: Row): Row {
  const user = response?.user ?? response?.data?.user ?? response?.data ?? response
  return user && typeof user === 'object' && !Array.isArray(user) ? user : {}
}

function rowsFrom(response: any, ...keys: string[]): Row[] {
  if (Array.isArray(response)) return response
  for (const key of keys) {
    const value = key.split('.').reduce<any>((current, part) => current?.[part], response)
    if (Array.isArray(value)) return value
  }
  return []
}

function expiredSession(message: string) {
  return /(?:^|\D)401(?:\D|$)|unauthenticated|not authenticated|invalid token|token expired/i.test(message)
}

export default function DashboardPage() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<Row | null>(null)
  const [ledgers, setLedgers] = useState<Row[]>([])
  const [accounts, setAccounts] = useState<Row[]>([])
  const [transactions, setTransactions] = useState<Row[]>([])
  const [statementAccount, setStatementAccount] = useState('')
  const [statement, setStatement] = useState<Row | null>(null)
  const [statementLoading, setStatementLoading] = useState(false)
  const [statementError, setStatementError] = useState('')
  const [error, setError] = useState('')
  const [hideBalance, setHideBalance] = useState(false)

  useEffect(() => {
    let mounted = true

    async function load() {
      if (!getXanoSession()?.authenticated) {
        clearXanoSession()
        router.replace('/login?next=/dashboard')
        return
      }

      let user: Row = {}
      try {
        const profileResponse = await getLedgerProfile()
        if (!mounted) return
        user = profileFrom(profileResponse)
        setProfile(user)
      } catch (cause) {
        if (!mounted) return
        const message = cause instanceof Error ? cause.message : 'Unable to load your profile.'
        if (expiredSession(message)) {
          clearXanoSession()
          router.replace('/login?next=/dashboard')
          return
        }
        setProfile({ name: 'Member', role: 'member' })
        user = { role: 'member' }
      }

      const role = String(user.role ?? '').toLowerCase()
      if (role === 'admin' || role === 'superadmin') {
        setReady(true)
        return
      }

      const settled = await Promise.allSettled([
        getMemberLedgers(),
        getMemberAccounts(),
        getMemberTransactions(),
      ])
      if (!mounted) return

      const [ledgerResult, accountResult, transactionResult] = settled
      let softNotice = ''

      if (ledgerResult.status === 'fulfilled') {
        setLedgers(rowsFrom(ledgerResult.value, 'ledgers', 'items', 'data'))
      } else {
        const msg = ledgerResult.reason instanceof Error ? ledgerResult.reason.message : 'Ledgers unavailable'
        if (expiredSession(msg)) {
          clearXanoSession()
          router.replace('/login?next=/dashboard')
          return
        }
        softNotice = msg
      }

      if (accountResult.status === 'fulfilled') {
        const accountRows = rowsFrom(accountResult.value, 'accounts', 'items', 'data')
        setAccounts(accountRows)
        setStatementAccount(String(accountRows[0]?.id ?? accountRows[0]?.account_id ?? ''))
      } else {
        const msg = accountResult.reason instanceof Error ? accountResult.reason.message : 'Accounts unavailable'
        if (expiredSession(msg)) {
          clearXanoSession()
          router.replace('/login?next=/dashboard')
          return
        }
        softNotice = softNotice || msg
      }

      if (transactionResult.status === 'fulfilled') {
        setTransactions(rowsFrom(transactionResult.value, 'transactions', 'items', 'data'))
      } else {
        const msg = transactionResult.reason instanceof Error ? transactionResult.reason.message : 'Transactions unavailable'
        if (expiredSession(msg)) {
          clearXanoSession()
          router.replace('/login?next=/dashboard')
          return
        }
        softNotice = softNotice || msg
      }

      const allFailed =
        ledgerResult.status === 'rejected' &&
        accountResult.status === 'rejected' &&
        transactionResult.status === 'rejected'
      if (allFailed && softNotice) {
        setError(
          softNotice.includes('timed out')
            ? 'Some ledger data is slow right now. Tap Retry to refresh.'
            : softNotice,
        )
      } else {
        setError('')
      }
      setReady(true)
    }

    void load()
    return () => {
      mounted = false
    }
  }, [router])

  async function loadStatement(accountId: string) {
    setStatementAccount(accountId)
    setStatement(null)
    setStatementError('')
    if (!accountId) return
    setStatementLoading(true)
    try {
      const response = await getMemberAccountStatement(accountId)
      setStatement(response?.statement ?? response?.data ?? response)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to load this account statement.'
      if (expiredSession(message)) {
        clearXanoSession()
        router.replace('/login?next=/dashboard')
      } else {
        setStatementError(message)
      }
    } finally {
      setStatementLoading(false)
    }
  }

  const role = String(profile?.role ?? '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'superadmin'
  const currency = String(profile?.currency ?? profile?.base_currency ?? ledgers[0]?.currency ?? 'NGN')
  const balance = useMemo(
    () => accounts.reduce((sum, account) => sum + toNumeric(account.balance ?? account.current_balance ?? account.amount), 0),
    [accounts],
  )
  const deposits = useMemo(() => transactionTotal(transactions, 'deposit'), [transactions])
  const withdrawals = useMemo(() => transactionTotal(transactions, 'withdraw'), [transactions])
  const statementRows = rowsFrom(statement, 'postings', 'entries', 'transactions', 'items', 'data')
  const displayName = String(profile?.name ?? profile?.full_name ?? profile?.email ?? 'Member')
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#071a18] px-5 py-5 text-[#dcebe4]">
        <div className="mx-auto w-full max-w-7xl">
          <ActivityTicker variant="member" />
          <p className="mt-6 text-center text-sm text-[#9ab8ab]">Loading your account…</p>
        </div>
      </main>
    )
  }

  if (isAdmin) {
    return (
      <main className="min-h-screen bg-[#071a18] px-5 py-10 text-[#edf7f1]">
        <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#0b2420] p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b9f47f]">Administrator access</p>
          <h1 className="mt-3 text-3xl font-semibold">Welcome{profile?.name ? `, ${profile.name}` : ''}</h1>
          <p className="mt-3 text-sm text-[#aac1b7]">Open the admin workspace to manage ledger operations.</p>
          <Link
            href="/admin"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#b9f47f] px-5 py-3 text-sm font-semibold text-[#071a18]"
          >
            Open admin dashboard <ChevronRight size={16} />
          </Link>
          <button
            onClick={() => {
              clearXanoSession()
              router.replace('/login')
            }}
            className="ml-4 inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm text-white"
          >
            <LogOut size={16} /> Log out
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f4f8f3] text-[#101d1a] pb-24 lg:pb-8">
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
          {[
            ['/dashboard', 'Overview'],
            ['/dashboard/investments', 'Investments'],
            ['/dashboard/wallet', 'Wallet'],
            ['/dashboard/activity', 'Activity'],
            ['/affiliate', 'Team'],
            ['/plans', 'Plans'],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-[#aac1b7] hover:bg-white/5 hover:text-white"
            >
              {label}
              <ChevronRight size={15} />
            </Link>
          ))}
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
        <header className="bg-gradient-to-b from-[#0b4537] via-[#0d3d32] to-[#123f34] px-5 pb-8 pt-5 text-white sm:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between gap-3">
              <button className="lg:hidden rounded-full bg-white/10 p-2" onClick={() => setMenuOpen(true)} aria-label="Open menu">
                <Menu size={18} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8fbfa8]">{greeting}</p>
                <p className="mt-1 truncate text-lg font-semibold">{displayName}</p>
              </div>
              <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-[#b9f47f]">
                {role || 'member'}
              </span>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.16em] text-[#8eaea0]">Available balance</p>
                <button
                  type="button"
                  onClick={() => setHideBalance((v) => !v)}
                  className="text-xs text-[#b9f47f]"
                  aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
                >
                  {hideBalance ? 'Show' : 'Hide'}
                </button>
              </div>
              <p className="mt-3 text-4xl font-semibold tracking-tight">
                {hideBalance ? '••••••' : toMoney(balance, '₦0')}
              </p>
              <p className="mt-2 text-xs text-[#8eaea0]">{currency} ledger · funds on your Madallion accounts</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Link
                  href="/dashboard/wallet"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-semibold text-[#0b4537]"
                >
                  + Deposit
                </Link>
                <Link
                  href="/dashboard/wallet"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3.5 text-sm font-semibold text-white"
                >
                  <ArrowUpRight size={16} /> Withdraw
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-2xl bg-white/5 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#8eaea0]">Deposits</p>
                  <p className="mt-1 text-sm font-semibold">{hideBalance ? '•••' : toMoney(deposits, '₦0')}</p>
                </div>
                <div className="rounded-2xl bg-white/5 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#8eaea0]">Withdrawals</p>
                  <p className="mt-1 text-sm font-semibold">{hideBalance ? '•••' : toMoney(withdrawals, '₦0')}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="pt-4">
            <ActivityTicker variant="member" />
          </div>
          {error && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span>{error}</span>
              <button type="button" onClick={() => window.location.reload()} className="font-semibold underline">
                Retry
              </button>
            </div>
          )}

          <div className="mt-5 grid grid-cols-4 gap-3">
            <QuickTile href="/dashboard/investments" label="Invest" icon={<Layers size={18} />} tone="violet" />
            <QuickTile href="/dashboard/activity" label="Activity" icon={<FileText size={18} />} tone="blue" />
            <QuickTile href="/affiliate" label="Team" icon={<Users size={18} />} tone="amber" />
            <QuickTile href="/plans" label="Plans" icon={<Gift size={18} />} tone="rose" />
          </div>

          <div className="mt-2">
            <MemberMaturityPreview />
          </div>

          <section className="mt-6 rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#65a85c]">Activity center</p>
                <h2 className="mt-1 text-lg font-semibold text-[#0b4537]">Latest movements</h2>
              </div>
              <Link href="/dashboard/activity" className="text-sm font-semibold text-[#0b4537]">
                View all
              </Link>
            </div>
            <div className="mt-4 divide-y divide-[#e7eee8]">
              {transactions.slice(0, 5).map((transaction, index) => (
                <TransactionRow key={transaction.id ?? transaction.transaction_id ?? index} transaction={transaction} />
              ))}
              {!transactions.length && <Empty text="No transactions recorded yet." />}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#65a85c]">Wallets</p>
                <h2 className="mt-1 text-lg font-semibold text-[#0b4537]">Your accounts</h2>
              </div>
              <span className="text-xs text-[#708079]">{accounts.length} total</span>
            </div>
            <div className="mt-4 space-y-2">
              {accounts.length ? (
                accounts.slice(0, 6).map((account, index) => (
                  <AccountRow
                    key={account.id ?? account.account_id ?? index}
                    account={account}
                    onStatement={() => void loadStatement(String(account.id ?? account.account_id ?? ''))}
                  />
                ))
              ) : (
                <Empty text="No ledger accounts returned yet." />
              )}
            </div>
          </section>

          <section className="mt-6 mb-8 rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#65a85c]">Official statement</p>
                <h2 className="mt-1 text-lg font-semibold text-[#0b4537]">Account statement</h2>
              </div>
              <FileText size={18} className="text-[#65a85c]" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select
                aria-label="Select account for statement"
                value={statementAccount}
                onChange={(event) => {
                  setStatementAccount(event.target.value)
                  setStatement(null)
                  setStatementError('')
                }}
                className="rounded-xl border border-[#dfe8e2] bg-[#f4f8f3] px-3 py-2 text-sm text-[#0b4537]"
              >
                <option value="">Select an account</option>
                {accounts.map((account, index) => {
                  const id = String(account.id ?? account.account_id ?? '')
                  return (
                    <option key={id || index} value={id}>
                      {String(account.name ?? account.account_name ?? account.type ?? `Account ${id}`)}
                    </option>
                  )
                })}
              </select>
              <button
                disabled={!statementAccount || statementLoading}
                onClick={() => void loadStatement(statementAccount)}
                className="rounded-xl bg-[#0b4537] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {statementLoading ? 'Loading…' : 'Load statement'}
              </button>
            </div>
            {statementError && (
              <p role="alert" className="mt-4 text-sm text-red-600">
                {statementError}
              </p>
            )}
            {statement && (
              <div className="mt-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatementBalance label="Opening balance" value={statement.opening_balance ?? statement.openingBalance} />
                  <StatementBalance label="Closing balance" value={statement.closing_balance ?? statement.closingBalance} />
                </div>
                <div className="mt-4 divide-y divide-[#e7eee8]">
                  {statementRows.map((entry, index) => (
                    <div key={entry.id ?? entry.transaction_id ?? index} className="flex justify-between gap-4 py-3 text-sm">
                      <span className="text-[#60716b]">
                        {String(entry.date ?? entry.created_at ?? entry.posted_at ?? '—')} ·{' '}
                        {String(entry.description ?? entry.narration ?? entry.reference ?? 'Posting')}
                      </span>
                      <span className="font-medium text-[#0b4537]">{toMoney(entry.amount ?? entry.value, '₦0')}</span>
                    </div>
                  ))}
                  {!statementRows.length && <Empty text="No statement postings returned." />}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <MemberTabBar />
    </main>
  )
}

function transactionTotal(transactions: Row[], kind: 'deposit' | 'withdraw') {
  return transactions.reduce((sum, transaction) => {
    const text = String(transaction.type ?? transaction.kind ?? transaction.description ?? '').toLowerCase()
    return text.includes(kind) ? sum + Math.abs(toNumeric(transaction.amount ?? transaction.value ?? transaction.total_amount)) : sum
  }, 0)
}

function QuickTile({
  href,
  label,
  icon,
  tone,
}: {
  href: string
  label: string
  icon: React.ReactNode
  tone: 'violet' | 'blue' | 'amber' | 'rose'
}) {
  const tones = {
    violet: 'bg-[#f0ebff] text-[#6b5cff]',
    blue: 'bg-[#e8f0ff] text-[#3b6dff]',
    amber: 'bg-[#eef7eb] text-[#2f7a4a]',
    rose: 'bg-[#fff0e8] text-[#c45c2a]',
  }
  return (
    <Link href={href} className="flex flex-col items-center gap-2 rounded-2xl border border-[#e7eee8] bg-white p-3 shadow-sm">
      <span className={`rounded-xl p-2.5 ${tones[tone]}`}>{icon}</span>
      <span className="text-[11px] font-medium text-[#0b4537]">{label}</span>
    </Link>
  )
}

function AccountRow({ account, onStatement }: { account: Row; onStatement: () => void }) {
  const name = String(account.name ?? account.account_name ?? account.type ?? account.code ?? 'Account')
  const amount = account.balance ?? account.current_balance ?? account.amount
  const status = String(account.status ?? 'active')
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e7eee8] bg-[#f4f8f3] px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-[#0b4537]">{name}</p>
        <p className="mt-1 text-xs text-[#708079]">
          {account.currency ?? 'NGN'} · {toTitleCase(status)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-[#0b4537]">{toMoney(amount, '₦0')}</p>
        <button onClick={onStatement} className="mt-1 text-xs font-medium text-[#2f7a4a]">
          View statement
        </button>
      </div>
    </div>
  )
}

function TransactionRow({ transaction }: { transaction: Row }) {
  const amount = toNumeric(transaction.amount ?? transaction.total_amount ?? transaction.value)
  const label = String(transaction.description ?? transaction.reference ?? transaction.type ?? 'Ledger transaction')
  const date = transaction.created_at ?? transaction.createdAt ?? transaction.date
  const pending = String(transaction.status ?? '').toLowerCase() === 'pending'
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`rounded-full p-2 ${
            amount >= 0 ? 'bg-[#eef7eb] text-[#2f7a4a]' : 'bg-[#fff0e8] text-[#c45c2a]'
          }`}
        >
          {amount >= 0 ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#0b4537]">{label}</p>
          <p className="mt-1 text-xs text-[#708079]">{date ? new Date(date).toLocaleDateString() : 'Recently recorded'}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${amount >= 0 ? 'text-[#2f7a4a]' : 'text-[#c45c2a]'}`}>
          {amount >= 0 ? '+' : '-'}
          {toMoney(Math.abs(amount), '₦0')}
        </p>
        <p className="mt-1 flex items-center justify-end gap-1 text-xs text-[#708079]">
          {pending ? <Clock3 size={12} /> : <CircleCheck size={12} />}
          {pending ? 'Pending' : 'Posted'}
        </p>
      </div>
    </div>
  )
}

function StatementBalance({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-xl border border-[#e7eee8] bg-[#f4f8f3] p-4">
      <p className="text-xs text-[#708079]">{label}</p>
      <p className="mt-2 font-semibold text-[#0b4537]">{toMoney(value, '₦0')}</p>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-[#dfe8e2] px-4 py-8 text-center text-sm text-[#708079]">{text}</p>
}
