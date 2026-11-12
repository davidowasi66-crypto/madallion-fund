'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import { Target } from 'lucide-react'
import { getXanoSession } from '@/lib/xano-auth'
import {
  getMyCashflow,
  getMyInvestments,
  getMyWallet,
  getPlans,
  planDailyRate,
  PLANS_KEY,
  unwrapList,
  type Investment,
  type Plan,
} from '@/lib/investment-api'

const money = (n: unknown) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
const date = (v: any) => (v ? new Date(Number(v) < 1e12 ? Number(v) * 1000 : v).toLocaleDateString('en-NG') : '—')
const toMs = (value: unknown, fallback: number) => {
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) return numeric < 1e12 ? numeric * 1000 : numeric
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export function LiveMoneyCounters() {
  const { data: wallet } = useSWR('my-wallet', getMyWallet)
  const { data: cashflow } = useSWR('my-cashflow', getMyCashflow)
  const rows = unwrapList(cashflow)
  const deposits = rows
    .filter((r: any) => String(r.type ?? r.kind ?? '').toLowerCase().includes('deposit'))
    .reduce((s: number, r: any) => s + Number(r.amount ?? r.value ?? 0), 0)
  const withdrawals = rows
    .filter((r: any) => String(r.type ?? r.kind ?? '').toLowerCase().includes('withdraw'))
    .reduce((s: number, r: any) => s + Number(r.amount ?? r.value ?? 0), 0)
  const balance = (wallet as any)?.balance ?? (wallet as any)?.available_balance ?? 0
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Counter label="Available balance" value={money(balance)} tone="lime" />
      <Counter label="Total deposits" value={money((wallet as any)?.total_deposits ?? deposits)} />
      <Counter label="Total withdrawals" value={money((wallet as any)?.total_withdrawals ?? withdrawals)} />
    </div>
  )
}

function Counter({ label, value, tone = 'default' }: { label: string; value: string; tone?: string }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        tone === 'lime' ? 'border-[#b9f47f]/30 bg-[#b9f47f]/10' : 'border-white/10 bg-[#0b2420]'
      }`}
    >
      <p className="text-xs uppercase tracking-[.16em] text-[#8eaea0]">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

export function MemberMaturityPreview() {
  const [session, setSession] = useState<{ authenticated: boolean; cacheKey: string } | null>(null)
  useEffect(() => {
    const current = getXanoSession()
    setSession(current?.authToken
      ? { authenticated: true, cacheKey: `member-investments-${current.user_id || Date.now()}` }
      : { authenticated: false, cacheKey: '' })
  }, [])
  const { data: investments, error, isLoading } = useSWR<Investment[]>(
    session?.authenticated ? session.cacheKey : null,
    getMyInvestments,
  )

  return (
    <section className="mt-7 rounded-3xl border border-white/10 bg-[#0b2420] p-5 sm:p-6" aria-labelledby="maturity-preview-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#76998b]">Investment tracking</p>
          <h2 id="maturity-preview-title" className="mt-2 text-xl font-semibold">Progress to maturity</h2>
        </div>
        <Link href="/dashboard/investments" className="text-sm font-semibold text-[#b9f47f]">View all investments</Link>
      </div>
      {session === null || isLoading ? (
        <p className="mt-5 text-sm text-[#8eaea0]">Loading investment progress…</p>
      ) : !session.authenticated ? (
        <p className="mt-5 text-sm text-[#8eaea0]">Sign in to view your investment progress.</p>
      ) : error ? (
        <p role="alert" className="mt-5 text-sm text-red-200">Investment progress could not be loaded. Please try again shortly.</p>
      ) : investments?.length ? (
        <div className="mt-5 grid gap-4">
          {investments.slice(0, 2).map((investment, index) => (
            <MaturityProgressBar key={investment.id ?? index} investment={investment} />
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-[#8eaea0]">Your investment progress will appear here after you subscribe to a plan.</p>
      )}
    </section>
  )
}

export function MaturityProgressBar({ investment }: { investment: Investment }) {
  const plan: Plan = investment.plan ?? { name: 'Investment', duration_days: 30 }
  const principal = Number(investment.principal ?? 0)
  const startMs = toMs(investment.started_at ?? investment.start_date ?? investment.created_at, Date.now())
  const durationDays = Number(plan.duration_days ?? 0)
  const maturityDate = investment.ends_at ?? investment.maturity_at ?? investment.matures_at ?? investment.maturity_date ?? investment.end_date
  const endMs = maturityDate
    ? toMs(maturityDate, startMs + durationDays * 86_400_000)
    : startMs + durationDays * 86_400_000
  const totalMs = Math.max(86_400_000, endMs - startMs)
  const elapsedMs = Math.max(0, Math.min(totalMs, Date.now() - startMs))
  const percent = Math.min(100, Math.round((elapsedMs / totalMs) * 100))
  const daysLeft = Math.max(0, Math.ceil((endMs - Date.now()) / 86_400_000))
  const daysElapsed = Math.floor(elapsedMs / 86_400_000)
  const dailyPercent = investment.daily_rate_bps
    ? Number(investment.daily_rate_bps) / 100
    : planDailyRate(plan)
  const totalDays = Math.round(totalMs / 86_400_000)
  const accrued =
    investment.accrued_total != null
      ? Number(investment.accrued_total)
      : Math.round(principal * (dailyPercent / 100) * daysElapsed)
  const projected = Math.round(principal * (dailyPercent / 100) * totalDays)
  const matured = Date.now() >= endMs

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e2b26] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">
            {plan.name ?? investment.plan_name ?? (investment.plan_id ? `Plan #${investment.plan_id}` : 'Investment')}
          </p>
          <p className="mt-1 text-xs text-[#789589]">
            {money(principal)} principal · Matures {date(endMs)}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            matured ? 'bg-sky-400/15 text-sky-300' : 'bg-[#b9f47f]/15 text-[#b9f47f]'
          }`}
        >
          {matured ? 'Ready to settle' : `${Math.round(percent)}% to maturity`}
        </span>
      </div>
      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#183e31]"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress to maturity"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#8fe35c] to-[#b9f47f] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div>
          <p className="text-[#789589]">Elapsed</p>
          <p className="mt-1 font-semibold text-white">
            {daysElapsed} of {totalDays} days
          </p>
        </div>
        <div>
          <p className="text-[#789589]">{matured ? 'Matured' : 'Days remaining'}</p>
          <p className="mt-1 font-semibold text-white">{matured ? '0' : daysLeft}</p>
        </div>
        <div>
          <p className="text-[#789589]">Accrued so far</p>
          <p className="mt-1 font-semibold text-[#b9f47f]">{money(accrued)}</p>
        </div>
        <div>
          <p className="text-[#789589]">Projected at maturity</p>
          <p className="mt-1 font-semibold text-white">{money(principal + projected)}</p>
        </div>
      </div>
    </div>
  )
}

const GOAL_KEY = 'madallion_savings_goal'

export function SavingsGoalCard({ currentValue }: { currentValue: number }) {
  const [goal, setGoal] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(GOAL_KEY) ?? 0)
      if (saved > 0) {
        setGoal(saved)
        setDraft(String(saved))
      }
    } catch {}
  }, [])
  const save = (value: number) => {
    setGoal(value > 0 ? value : null)
    try {
      value > 0
        ? window.localStorage.setItem(GOAL_KEY, String(value))
        : window.localStorage.removeItem(GOAL_KEY)
    } catch {}
  }
  const percent = goal && goal > 0 ? Math.min(100, Math.round((currentValue / goal) * 100)) : 0
  return (
    <div className="rounded-2xl border border-[#b9f47f]/20 bg-[#0b2420] p-4">
      <div className="flex items-center gap-2">
        <Target size={16} className="text-[#b9f47f]" />
        <p className="text-sm font-semibold text-white">Savings goal</p>
      </div>
      {goal && goal > 0 ? (
        <div className="mt-3">
          <div className="flex items-end justify-between">
            <p className="text-2xl font-semibold text-white">{money(currentValue)}</p>
            <p className="text-xs text-[#789589]">
              of {money(goal)} · {percent}%
            </p>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#183e31]" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-[#b9f47f]" style={{ width: `${percent}%` }} />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-[#789589]">Set a target amount to track progress.</p>
      )}
      <div className="mt-3 flex gap-2">
        <input
          inputMode="numeric"
          placeholder="Goal amount (₦)"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
          className="w-full rounded-xl border border-white/10 bg-[#0e2b26] px-3 py-2 text-sm text-white outline-none"
        />
        <button onClick={() => save(Number(draft || 0))} className="rounded-xl bg-[#b9f47f] px-3 py-2 text-sm font-semibold text-[#071a18]">
          Set
        </button>
      </div>
    </div>
  )
}

export function InvestmentProgress() {
  const { data, error, isLoading } = useSWR('my-investments', getMyInvestments)
  if (isLoading) return <p className="text-sm text-[#789589]">Loading active plans…</p>
  if (error) return <p className="text-sm text-[#ffb19d]">Investment data is temporarily unavailable.</p>
  const items = data ?? []
  if (!items.length)
    return (
      <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-[#789589]">
        Your subscribed plans will appear here after you fund one.
      </p>
    )
  return (
    <div className="space-y-4">
      {items.map((investment, index) => (
        <MaturityProgressBar key={investment.id ?? index} investment={investment} />
      ))}
    </div>
  )
}

export function PlanCalculator({
  plans: plansProp,
  sourceNote,
}: {
  plans?: Plan[]
  sourceNote?: string
}) {
  const { data: catalogue } = useSWR(PLANS_KEY, getPlans)
  const plans = plansProp?.length ? plansProp : catalogue?.plans ?? []
  const [amount, setAmount] = useState(500_000)
  const [selected, setSelected] = useState(0)
  const plan = plans[selected] ?? plans[0]
  const daily = planDailyRate(plan)
  const days = Number(plan?.duration_days ?? 30)
  const profit = Math.round(amount * (daily / 100) * days)
  const maturity = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toLocaleDateString('en-NG')
  }, [days])

  return (
    <div className="rounded-3xl border border-[#dfe8e2] bg-white p-6">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Plan calculator</p>
      <h2 className="mt-2 text-2xl font-semibold text-[#0b4537]">See an illustrative outcome</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-[#60716b]">
          Amount (₦)
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-2 w-full rounded-xl border border-[#dfe8e2] px-3 py-3 text-[#0b4537]"
          />
        </label>
        <label className="text-sm text-[#60716b]">
          Plan
          <select
            value={Math.min(selected, Math.max(0, plans.length - 1))}
            onChange={(e) => setSelected(Number(e.target.value))}
            className="mt-2 w-full rounded-xl border border-[#dfe8e2] px-3 py-3 text-[#0b4537]"
          >
            {plans.length === 0 && <option value={0}>No plans loaded</option>}
            {plans.map((p, i) => (
              <option key={p.id ?? i} value={i}>
                {p.name} · {planDailyRate(p).toFixed(2)}%/day · {p.duration_days}d
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-[#eef7eb] p-4">
          <p className="text-xs text-[#60716b]">Illustrative return</p>
          <p className="mt-1 text-xl font-semibold text-[#0b4537]">{money(profit)}</p>
        </div>
        <div className="rounded-xl bg-[#eef7eb] p-4">
          <p className="text-xs text-[#60716b]">At maturity</p>
          <p className="mt-1 text-xl font-semibold text-[#0b4537]">{money(amount + profit)}</p>
        </div>
        <div className="rounded-xl bg-[#eef7eb] p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-[#60716b]">Maturity date</p>
          <p className="mt-1 text-xl font-semibold text-[#0b4537]">{maturity}</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-[#829088]">
        Illustration only. Returns are not guaranteed.
        {sourceNote ? ` ${sourceNote}` : catalogue?.source === 'live' ? ' Rates from live Xano catalogue.' : ''}
      </p>
    </div>
  )
}
