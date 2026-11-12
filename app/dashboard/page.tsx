'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDownLeft, ArrowUpRight, ChevronRight, CircleCheck, Clock3, FileText, LogOut, Menu, Wallet } from 'lucide-react'
import { clearXanoSession, getXanoSession } from '@/lib/xano-auth'
import { ActivityTicker } from '@/components/activity-ticker'
import { MemberMaturityPreview } from '@/components/investment-widgets'
import { toMoney, toNumeric, toTitleCase } from '@/lib/xano-client'
import { getLedgerProfile, getMemberAccounts, getMemberLedgers, getMemberTransactions, getMemberAccountStatement, type XanoRecord } from '@/lib/xano-ledger'

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

  useEffect(() => {
    let mounted = true

    async function load() {
      if (!getXanoSession()?.authToken) {
        clearXanoSession()
        router.replace('/login?next=/dashboard')
        return
      }
      try {
        // Profile/role check runs first. Do not query admin dashboard as a member.
        const profileResponse = await getLedgerProfile()
        if (!mounted) return
        const user = profileFrom(profileResponse)
        setProfile(user)
        const role = String(user.role ?? '').toLowerCase()
        if (role === 'admin' || role === 'superadmin') {
          setReady(true)
          return
        }

        const [ledgerResponse, accountResponse, transactionResponse] = await Promise.all([
          getMemberLedgers(),
          getMemberAccounts(),
          getMemberTransactions(),
        ])
        if (!mounted) return
        const accountRows = rowsFrom(accountResponse, 'accounts', 'items', 'data')
        setLedgers(rowsFrom(ledgerResponse, 'ledgers', 'items', 'data'))
        setAccounts(accountRows)
        setTransactions(rowsFrom(transactionResponse, 'transactions', 'items', 'data'))
        setStatementAccount(String(accountRows[0]?.id ?? accountRows[0]?.account_id ?? ''))
        setReady(true)
      } catch (cause) {
        if (!mounted) return
        const message = cause instanceof Error ? cause.message : 'Unable to load your ledger.'
        if (expiredSession(message)) {
          clearXanoSession()
          router.replace('/login?next=/dashboard')
          return
        }
        // A 403 means this operation is forbidden; it does not mean the token expired.
        setError(message)
        setReady(true)
      }
    }

    void load()
    return () => { mounted = false }
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
  const balance = useMemo(() => accounts.reduce((sum, account) => sum + toNumeric(account.balance ?? account.current_balance ?? account.amount), 0), [accounts])
  const deposits = useMemo(() => transactionTotal(transactions, 'deposit'), [transactions])
  const withdrawals = useMemo(() => transactionTotal(transactions, 'withdraw'), [transactions])
  const statementRows = rowsFrom(statement, 'postings', 'entries', 'transactions', 'items', 'data')

  if (!ready) return <main className="min-h-screen bg-[#071a18] px-5 py-5 text-[#dcebe4]"><div className="mx-auto w-full max-w-7xl"><ActivityTicker variant="member" /><p className="mt-6 text-center text-sm text-[#9ab8ab]">Loading your account…</p></div></main>
  if (error) return <main className="min-h-screen bg-[#071a18] px-5 py-5 text-white"><div className="mx-auto w-full max-w-7xl"><ActivityTicker variant="member" /><div className="mx-auto mt-6 max-w-md rounded-3xl border border-white/10 bg-white/5 p-7 text-center"><h1 className="text-xl font-semibold">Dashboard unavailable</h1><p className="mt-2 text-sm text-[#aac1b7]">{error}</p><button onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-[#b9f47f] px-4 py-2 text-sm font-semibold text-[#071a18]">Try again</button></div></div></main>

  if (isAdmin) return <main className="min-h-screen bg-[#071a18] px-5 py-10 text-[#edf7f1]"><section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#0b2420] p-8"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b9f47f]">Administrator access</p><h1 className="mt-3 text-3xl font-semibold">Welcome{profile?.name ? `, ${profile.name}` : ''}</h1><p className="mt-3 text-sm text-[#aac1b7]">Open the admin workspace to manage ledger operations.</p><Link href="/admin" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#b9f47f] px-5 py-3 text-sm font-semibold text-[#071a18]">Open admin dashboard <ChevronRight size={16} /></Link><button onClick={() => { clearXanoSession(); router.replace('/login') }} className="ml-4 inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm text-white"><LogOut size={16} /> Log out</button></section></main>

  return <main className="min-h-screen bg-[#071a18] text-[#edf7f1]"><aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-[#0a211e] p-5 transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}><div className="flex items-center justify-between"><Link href="/" className="font-semibold tracking-tight">Madallion <span className="text-[#b9f47f]">fund</span></Link><button className="lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button></div><p className="mt-12 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6e9183]">Member workspace</p><nav className="mt-4 space-y-1" aria-label="Account navigation">{[['/dashboard', 'Overview'], ['/dashboard/investments', 'Investments'], ['/dashboard/wallet', 'Wallet'], ['/dashboard/activity', 'Activity']].map(([href, label]) => <Link key={href} href={href} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-[#aac1b7] hover:bg-white/5 hover:text-white">{label}<ChevronRight size={15} /></Link>)}</nav><button onClick={() => { clearXanoSession(); router.replace('/login') }} className="absolute bottom-7 left-5 flex items-center gap-2 text-sm text-[#789589]"><LogOut size={16} /> Log out</button></aside>
    <div className="lg:pl-72"><header className="border-b border-white/10 bg-[#071a18] px-5 py-5 sm:px-8"><div className="flex items-center justify-between"><button className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button><div><p className="text-xs uppercase tracking-[0.22em] text-[#719486]">Member ledger</p><h1 className="mt-1 text-xl font-semibold">{profile?.name ? `Welcome back, ${profile.name}` : 'Welcome back'}</h1></div><span className="rounded-full border border-[#315448] bg-[#0d2c26] px-3 py-1.5 text-xs text-[#b9f47f]">{role || 'member'}</span></div></header>
      <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-8"><ActivityTicker variant="member" /></div>
      <section className="mx-auto max-w-7xl p-5 sm:p-8"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><p className="text-sm text-[#8eaea0]">Your accounts and activity</p><h2 className="mt-1 text-3xl font-semibold tracking-tight">Financial overview</h2></div><span className="rounded-full border border-[#315448] bg-[#0d2c26] px-3 py-1.5 text-xs text-[#b9f47f]">{currency} ledger</span></div>
        <div className="mt-7 grid gap-4 md:grid-cols-3"><Metric label="Wallet balances" value={toMoney(balance, '₦0')} icon={<Wallet size={17} />} /><Metric label="Deposits" value={toMoney(deposits, '₦0')} icon={<ArrowDownLeft size={17} />} /><Metric label="Withdrawals" value={toMoney(withdrawals, '₦0')} icon={<ArrowUpRight size={17} />} /></div>
        <MemberMaturityPreview />
        <div className="mt-7 grid gap-6 xl:grid-cols-2"><section className="rounded-3xl border border-white/10 bg-[#0b2420] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-[#76998b]">Wallets & balances</p><h3 className="mt-2 text-xl font-semibold">Your accounts</h3></div><span className="text-sm text-[#8eaea0]">{accounts.length} total</span></div><div className="mt-5 space-y-2">{accounts.length ? accounts.slice(0, 6).map((account, index) => <AccountRow key={account.id ?? account.account_id ?? index} account={account} onStatement={() => void loadStatement(String(account.id ?? account.account_id ?? ''))} />) : <Empty text="No ledger accounts returned yet." />}</div></section>
          <section className="rounded-3xl border border-white/10 bg-[#0b2420] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-[#76998b]">Activity & transactions</p><h3 className="mt-2 text-xl font-semibold">Latest activity</h3></div><Link href="/dashboard/activity" className="text-sm font-semibold text-[#b9f47f]">View all</Link></div><div className="mt-5 divide-y divide-white/10">{transactions.slice(0, 6).map((transaction, index) => <TransactionRow key={transaction.id ?? transaction.transaction_id ?? index} transaction={transaction} />)}{!transactions.length && <Empty text="No transactions recorded yet." />}</div></section></div>
        <section className="mt-7 rounded-3xl border border-white/10 bg-[#0b2420] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-[#76998b]">Official statement</p><h3 className="mt-2 text-xl font-semibold">Account statement</h3></div><FileText size={18} className="text-[#b9f47f]" /></div><div className="mt-4 flex flex-wrap items-center gap-3"><select aria-label="Select account for statement" value={statementAccount} onChange={(event) => { setStatementAccount(event.target.value); setStatement(null); setStatementError('') }} className="rounded-xl border border-white/10 bg-[#0e2b26] px-3 py-2 text-sm text-white"><option value="">Select an account</option>{accounts.map((account, index) => { const id = String(account.id ?? account.account_id ?? ''); return <option key={id || index} value={id}>{String(account.name ?? account.account_name ?? account.type ?? `Account ${id}`)}</option> })}</select><button disabled={!statementAccount || statementLoading} onClick={() => void loadStatement(statementAccount)} className="rounded-xl bg-[#b9f47f] px-4 py-2 text-sm font-semibold text-[#071a18] disabled:opacity-50">{statementLoading ? 'Loading statement…' : 'Load statement'}</button></div>{statementError && <p role="alert" className="mt-4 text-sm text-red-300">{statementError}</p>}{statement && <div className="mt-5"><div className="grid gap-3 sm:grid-cols-2"><StatementBalance label="Opening balance" value={statement.opening_balance ?? statement.openingBalance} /><StatementBalance label="Closing balance" value={statement.closing_balance ?? statement.closingBalance} /></div><div className="mt-4 divide-y divide-white/10">{statementRows.map((entry, index) => <div key={entry.id ?? entry.transaction_id ?? index} className="flex justify-between gap-4 py-3 text-sm"><span className="text-[#aac1b7]">{String(entry.date ?? entry.created_at ?? entry.posted_at ?? '—')} · {String(entry.description ?? entry.narration ?? entry.reference ?? 'Posting')}</span><span>{toMoney(entry.amount ?? entry.value, '₦0')}</span></div>)}{!statementRows.length && <Empty text="No statement postings returned." />}</div></div>}</section>
      </section></div>
  </main>
}

function transactionTotal(transactions: Row[], kind: 'deposit' | 'withdraw') {
  return transactions.reduce((sum, transaction) => {
    const text = String(transaction.type ?? transaction.kind ?? transaction.description ?? '').toLowerCase()
    return text.includes(kind) ? sum + Math.abs(toNumeric(transaction.amount ?? transaction.value ?? transaction.total_amount)) : sum
  }, 0)
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <div className="rounded-2xl border border-white/10 bg-[#0b2420] p-5"><div className="flex items-center justify-between text-[#91b0a2]"><span className="text-xs uppercase tracking-[0.18em]">{label}</span><span className="rounded-lg bg-white/5 p-2">{icon}</span></div><p className="mt-4 text-2xl font-semibold">{value}</p></div> }
function AccountRow({ account, onStatement }: { account: Row; onStatement: () => void }) { const name = String(account.name ?? account.account_name ?? account.type ?? account.code ?? 'Account'); const amount = account.balance ?? account.current_balance ?? account.amount; const status = String(account.status ?? 'active'); return <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0e2b26] px-4 py-3"><div><p className="text-sm font-semibold">{name}</p><p className="mt-1 text-xs text-[#789589]">{account.currency ?? 'NGN'} · {toTitleCase(status)}</p></div><div className="text-right"><p className="text-sm font-semibold">{toMoney(amount, '₦0')}</p><button onClick={onStatement} className="mt-1 text-xs text-[#b9f47f]">View statement</button></div></div> }
function TransactionRow({ transaction }: { transaction: Row }) { const amount = toNumeric(transaction.amount ?? transaction.total_amount ?? transaction.value); const label = String(transaction.description ?? transaction.reference ?? transaction.type ?? 'Ledger transaction'); const date = transaction.created_at ?? transaction.createdAt ?? transaction.date; const pending = String(transaction.status ?? '').toLowerCase() === 'pending'; return <div className="flex items-center justify-between gap-4 py-4"><div className="flex min-w-0 items-center gap-3"><span className={`rounded-full p-2 ${amount >= 0 ? 'bg-[#183e31] text-[#b9f47f]' : 'bg-[#3c2925] text-[#ffb19d]'}`}>{amount >= 0 ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</span><div className="min-w-0"><p className="truncate text-sm font-medium">{label}</p><p className="mt-1 text-xs text-[#789589]">{date ? new Date(date).toLocaleDateString() : 'Recently recorded'}</p></div></div><div className="text-right"><p className={`text-sm font-semibold ${amount >= 0 ? 'text-[#b9f47f]' : 'text-[#ffb19d]'}`}>{amount >= 0 ? '+' : '-'}{toMoney(Math.abs(amount), '₦0')}</p><p className="mt-1 flex items-center justify-end gap-1 text-xs text-[#789589]">{pending ? <Clock3 size={12} /> : <CircleCheck size={12} />}{pending ? 'Pending' : 'Posted'}</p></div></div> }
function StatementBalance({ label, value }: { label: string; value: unknown }) { return <div className="rounded-xl border border-white/10 bg-[#0e2b26] p-4"><p className="text-xs text-[#789589]">{label}</p><p className="mt-2 font-semibold">{toMoney(value, '₦0')}</p></div> }
function Empty({ text }: { text: string }) { return <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-[#789589]">{text}</p> }
