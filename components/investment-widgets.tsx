'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import { Target } from 'lucide-react'
import { getXanoSession } from '@/lib/xano-auth'
import { antiThrottleSwrConfig } from '@/lib/swr'
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

/** Dashboard maturity tracker — shows progress bars when the member has investments. */
export function MemberMaturityPreview() {
  const [session, setSession] = useState<{ authenticated: boolean; cacheKey: string } | null>(null)
  useEffect(() => {
    const current = getXanoSession()
    setSession(
      current?.authenticated
        ? { authenticated: true, cacheKey: `member-investments-${current.user_id || 'me'}` }
        : { authenticated: false, cacheKey: '' },
    )
  }, [])
  const { data: investments, error, isLoading, mutate, isValidating } = useSWR<Investment[]>(
    session?.authenticated ? session.cacheKey : null,
    getMyInvestments,
    { ...antiThrottleSwrConfig, revalidateOnFocus: false },
  )

  const active = (investments ?? []).filter((inv) => {
    const status = String(inv.status ?? 'active').toLowerCase()
    return status !== 'cancelled' && status !== 'closed' && status !== 'refunded'
  })
  const rateLimited = /(?:^|\D)429(?:\D|$)/.test(error instanceof Error ? error.message : '')

  return (
    <section
      className="mt-5 rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="maturity-preview-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#65a85c]">Investment tracking</p>
          <h2 id="maturity-preview-title" className="mt-1 text-lg font-semibold text-[#0b4537]">
            Progress to maturity
          </h2>
        </div>
        <Link href="/dashboard/investments" className="text-sm font-semibold text-[#0b4537]">
          View all
        </Link>
      </div>

      {session === null || isLoading ? (
        <div className="mt-5 rounded-2xl border border-[#e7eee8] bg-[#f7faf6] px-4 py-5 text-sm text-[#708079]" role="status">
          Loading investment progress…
        </div>
      ) : !session.authenticated ? (
        <p className="mt-5 text-sm text-[#708079]">Sign in to view your investment progress.</p>
      ) : error ? (
        <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800">
          <p className="max-w-md">{rateLimited ? 'The ledger is receiving too many requests. Wait a moment, then retry.' : 'Investment progress is temporarily unavailable. Your progress has not been changed.'}</p>
          <button
            type="button"
            onClick={() => void mutate()}
            disabled={isValidating}
            className="rounded-xl border border-rose-200 bg-white px-4 py-2 font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-wait disabled:opacity-60"
          >
            {isValidating ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      ) : active.length ? (
        <div className="mt-5 grid gap-4">
          {active.slice(0, 3).map((investment, index) => (
            <MaturityProgressBar key={investment.id ?? index} investment={investment} variant="light" />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-[#dfe8e2] bg-[#f4f8f3] px-4 py-6 text-center">
          <p className="text-sm text-[#60716b]">
            Maturity progress bars appear here after you subscribe to a plan.
          </p>
          <Link
            href="/plans"
            className="mt-4 inline-flex rounded-xl bg-[#0b4537] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Browse plans
          </Link>
        </div>
      )}
    </section>
  )
}

export function MaturityProgressBar({
  investment,
  variant = 'dark',
}: {
  investment: Investment
  variant?: 'dark' | 'light'
}) {
  const plan: Plan = investment.plan ?? { name: investment.plan_name ?? 'Investment', duration_days: 30 }
  const principal = Number(investment.principal ?? 0)
  const now = Date.now()
  const cohortStart = investment.scheduled_start_at ?? investment.cohort_start_at
  const startValue = cohortStart ?? investment.started_at ?? investment.start_date ?? investment.created_at
  const hasStart = startValue != null
  const startMs = toMs(startValue, now)
  const durationDays = Math.max(1, Number(plan.duration_days ?? 30) || 30)
  const maturityDate =
    investment.ends_at ?? investment.maturity_at ?? investment.matures_at ?? investment.maturity_date ?? investment.end_date
  const endMs = maturityDate ? toMs(maturityDate, startMs + durationDays * 86_400_000) : startMs + durationDays * 86_400_000
  const totalMs = Math.max(86_400_000, endMs - startMs)
  const scheduled = startMs > now
  const elapsedMs = scheduled ? 0 : Math.max(0, Math.min(totalMs, now - startMs))
  const computedPercent = Math.min(100, Math.round((elapsedMs / totalMs) * 100))
  const apiProgress = Number(investment.progress)
  const percent = scheduled
    ? 0
    : Number.isFinite(apiProgress) && apiProgress >= 0
      ? Math.min(100, Math.round(apiProgress <= 1 ? apiProgress * 100 : apiProgress))
      : hasStart ? computedPercent : 0
  const daysLeft = Math.max(0, Math.ceil((endMs - now) / 86_400_000))
  const daysUntilStart = Math.max(0, Math.ceil((startMs - now) / 86_400_000))
  const daysElapsed = Math.floor(elapsedMs / 86_400_000)
  const dailyPercent = investment.daily_rate_bps != null
    ? Number(investment.daily_rate_bps) / 100
    : planDailyRate(plan)
  const totalDays = Math.max(1, Math.round(totalMs / 86_400_000))
  const accrued = investment.net_accrued_total ?? investment.accrued_total
  const earnedToday = investment.earned_today
  const projected = Number.isFinite(dailyPercent) ? Math.round(principal * (dailyPercent / 100) * totalDays) : null
  const matured = !scheduled && (now >= endMs || percent >= 100)
  const light = variant === 'light'
  const planLabel = investment.plan_name ?? plan.name ?? (investment.plan_id ? `Plan #${investment.plan_id}` : 'Investment')
  const textTone = light ? 'text-[#0b4537]' : 'text-white'
  const mutedTone = light ? 'text-[#708079]' : 'text-[#789589]'
  const statusText = scheduled
    ? `Cohort starts in ${daysUntilStart} ${daysUntilStart === 1 ? 'day' : 'days'}`
    : !hasStart
      ? 'Start date pending'
      : matured
        ? 'Ready to settle'
        : `${percent}% to maturity`

  return (
    <div className={`rounded-2xl border p-4 ${light ? 'border-[#e7eee8] bg-[#f4f8f3]' : 'border-white/10 bg-[#0e2b26]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-semibold ${textTone}`}>{planLabel}</p>
          <p className={`mt-1 text-xs ${mutedTone}`}>
            {money(principal)} principal · {scheduled ? `Cohort starts ${date(startMs)} · ` : ''}Matures {date(endMs)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${matured ? light ? 'bg-sky-100 text-sky-800' : 'bg-sky-400/15 text-sky-300' : light ? 'bg-[#eef7eb] text-[#2f7a4a]' : 'bg-[#b9f47f]/15 text-[#b9f47f]'}`}>
          {statusText}
        </span>
      </div>

      <div className={`mt-4 h-3 overflow-hidden rounded-full ${light ? 'bg-[#dfe8e2]' : 'bg-[#183e31]'}`} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${planLabel} progress to maturity`}>
        <div className="h-full rounded-full bg-gradient-to-r from-[#8fe35c] to-[#b9f47f] transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-5">
        <div>
          <p className={mutedTone}>Elapsed</p>
          <p className={`mt-1 font-semibold ${textTone}`}>{daysElapsed} of {totalDays} days</p>
        </div>
        <div>
          <p className={mutedTone}>{matured ? 'Matured' : scheduled ? 'Starts in' : 'Days remaining'}</p>
          <p className={`mt-1 font-semibold ${textTone}`}>{matured ? '0' : scheduled ? daysUntilStart : daysLeft}</p>
        </div>
        <div>
          <p className={mutedTone}>{scheduled ? 'Daily earnings' : earnedToday == null ? 'Illustrative / day' : 'Today · ledger'}</p>
          <p className={`mt-1 font-semibold ${textTone}`}>
            {scheduled ? 'Begins at cohort start' : earnedToday == null ? money(Math.round(principal * (dailyPercent / 100))) : money(Number(earnedToday))}
          </p>
        </div>
        <div>
          <p className={mutedTone}>Accrued · ledger</p>
          <p className={`mt-1 font-semibold ${light ? 'text-[#2f7a4a]' : 'text-[#b9f47f]'}`}>{accrued == null ? 'Pending' : money(Number(accrued))}</p>
        </div>
        <div>
          <p className={mutedTone}>Illustrative at maturity</p>
          <p className={`mt-1 font-semibold ${textTone}`}>{projected == null ? 'Pending' : money(principal + projected)}</p>
        </div>
      </div>

      <div className={`mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t pt-3 text-[11px] ${light ? 'border-[#e7eee8] text-[#708079]' : 'border-white/10 text-[#789589]'}`}>
        <span>{investment.rollover_enabled == null ? 'Rollover preference pending' : `Auto-roll ${investment.rollover_enabled ? 'on' : 'off'}`}</span>
        {investment.withdrawal_window_ends_at != null && <span>Withdrawal window ends {date(investment.withdrawal_window_ends_at)}</span>}
        {investment.fee_total != null && <span>Fees recorded {money(Number(investment.fee_total))}</span>}
        <span>Projected values are illustrative; ledger totals are authoritative.</span>
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
      value > 0 ? window.localStorage.setItem(GOAL_KEY, String(value)) : window.localStorage.removeItem(GOAL_KEY)
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
          <div
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#183e31]"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
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
        <button
          onClick={() => save(Number(draft || 0))}
          className="rounded-xl bg-[#b9f47f] px-3 py-2 text-sm font-semibold text-[#071a18]"
        >
          Set
        </button>
      </div>
    </div>
  )
}

export function PortfolioSummary({ investments }: { investments: Investment[] }) {
  const principal = investments.reduce((sum, item) => sum + Number(item.principal ?? 0), 0)
  const accrued = investments.reduce((sum, item) => sum + Number(item.net_accrued_total ?? item.accrued_total ?? 0), 0)
  const dates = investments.map((item) => item.maturity_at ?? item.ends_at ?? item.matures_at ?? item.maturity_date ?? item.end_date).filter(Boolean)
  const nextMaturity = dates.map((value) => toMs(value, 0)).filter((value) => value > 0).sort((a, b) => a - b)[0]
  const nextPayouts = investments.map((item) => (item as any).next_payout_at ?? (item as any).next_payout_date).filter(Boolean)
  const nextPayout = nextPayouts.map((value) => toMs(value, 0)).filter((value) => value > 0).sort((a, b) => a - b)[0]
  const weightedApy = investments.reduce((sum, item) => {
    const itemPrincipal = Number(item.principal ?? 0)
    const dailyPercent = item.daily_rate_bps != null ? Number(item.daily_rate_bps) / 100 : planDailyRate(item.plan)
    if (itemPrincipal <= 0 || dailyPercent <= 0 || !Number.isFinite(dailyPercent)) return sum
    const dailyRate = dailyPercent / 100
    const compounds = Boolean(item.auto_compound_enabled ?? item.auto_compound ?? false)
    const apy = (compounds ? Math.pow(1 + dailyRate, 365) - 1 : dailyRate * 365) * 100
    return Number.isFinite(apy) ? sum + apy * itemPrincipal : sum
  }, 0)
  const rateWeightedPrincipal = investments.reduce((sum, item) => {
    const dailyPercent = item.daily_rate_bps != null ? Number(item.daily_rate_bps) / 100 : planDailyRate(item.plan)
    return Number.isFinite(dailyPercent) && dailyPercent > 0 ? sum + Number(item.principal ?? 0) : sum
  }, 0)
  const effectiveApy = rateWeightedPrincipal > 0 ? weightedApy / rateWeightedPrincipal : null
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Portfolio summary">
      <SummaryMetric label="Principal" value={money(principal)} />
      <SummaryMetric label="Accrued to date · ledger" value={money(accrued)} />
      <SummaryMetric label="Next payout" value={nextPayout ? date(nextPayout) : 'Not scheduled'} />
      <SummaryMetric label="Next maturity" value={nextMaturity ? date(nextMaturity) : 'Not scheduled'} />
      <SummaryMetric label="Illustrative effective APY" value={effectiveApy == null ? 'Rate unavailable' : `${effectiveApy.toLocaleString('en-NG', { maximumFractionDigits: 2 })}%`} />
    </section>
  )
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-[#0b2420] p-4"><p className="text-xs text-[#8eaea0]">{label}</p><p className="mt-2 text-lg font-semibold text-white">{value}</p></div>
}

export function AutoCompoundToggle({ investment }: { investment: Investment }) {
  const [enabled, setEnabled] = useState(Boolean(investment.auto_compound_enabled ?? investment.auto_compound ?? false))
  const dailyPercent = investment.daily_rate_bps != null ? Number(investment.daily_rate_bps) / 100 : planDailyRate(investment.plan)
  const dailyRate = dailyPercent / 100
  const simpleAnnualRate = dailyRate * 365
  const compoundAnnualRate = dailyRate > -1 ? Math.pow(1 + dailyRate, 365) - 1 : 0
  const effectiveRate = (enabled ? compoundAnnualRate : simpleAnnualRate) * 100
  const effectiveRateLabel = dailyPercent > 0 && Number.isFinite(effectiveRate)
    ? `${effectiveRate.toLocaleString('en-NG', { maximumFractionDigits: 2 })}%`
    : 'Rate unavailable'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfe8e2] bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-[#0b4537]">Auto-compound preview</p>
        <p className="mt-1 text-xs text-[#708079]">Compounding changes your effective rate. This preview is not saved; Xano must enable the rollover preference before it can apply to your investment.</p>
        <p className="mt-2 text-xs font-semibold text-[#0b4537]">Illustrative effective APY: {effectiveRateLabel}</p>
      </div>
      <button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled((value) => !value)} className={`relative h-7 w-12 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8b28] ${enabled ? 'bg-[#ff8b28]' : 'bg-[#cbd5cf]'}`}>
        <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        <span className="sr-only">{enabled ? 'Turn off' : 'Turn on'} auto-compound preview for {investment.plan_name ?? investment.plan?.name ?? 'this investment'}</span>
      </button>
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
  const [amount, setAmount] = useState(50_000)
  const [selected, setSelected] = useState(0)
  const plan = plans[selected] ?? plans[0]
  const daily = planDailyRate(plan)
  const days = Math.max(0, Number(plan?.duration_days ?? 0))
  const minimum = Math.max(0, Number(plan?.min_amount ?? 10_000))
  const maximum = Math.max(minimum + 1, Number(plan?.max_amount ?? 5_000_000))
  const amountIsValid = Number.isFinite(amount) && amount >= minimum && amount <= maximum
  const profit = amountIsValid && Number.isFinite(daily) ? Math.round(amount * (daily / 100) * days) : 0
  const maturity = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }, [days])

  return (
    <section className="overflow-hidden rounded-3xl border border-[#dfe8e2] bg-white shadow-[0_18px_55px_rgba(16,45,33,.08)]" aria-labelledby="plan-calculator-title">
      <div className="grid lg:grid-cols-[1.05fr_.95fr]">
        <div className="p-5 sm:p-7 lg:p-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Plan calculator</p>
          <h2 id="plan-calculator-title" className="mt-2 text-2xl font-semibold tracking-tight text-[#0b4537] sm:text-3xl">Explore your estimate</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-[#708079]">Compare plan terms and see an illustrative simple-return estimate before you decide.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-[#60716b]">
              Investment amount
              <div className="mt-2 flex min-h-12 items-center rounded-xl border border-[#dfe8e2] bg-[#fbfcfa] px-3 focus-within:border-[#75b95c] focus-within:ring-2 focus-within:ring-[#75b95c]/20">
                <span className="mr-2 text-sm font-semibold text-[#829088]">₦</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={minimum}
                  max={maximum}
                  step={10_000}
                  value={Number.isFinite(amount) ? amount : ''}
                  onChange={(event) => setAmount(event.target.value === '' ? 0 : Number(event.target.value))}
                  className="min-w-0 w-full bg-transparent py-2 text-base font-semibold text-[#0b4537] outline-none"
                  aria-describedby="calculator-range"
                />
              </div>
              <span id="calculator-range" className="mt-1.5 block text-xs font-normal text-[#829088]">
                {plan ? `${money(minimum)} minimum · ${money(maximum)} maximum` : 'Select a plan to see its range'}
              </span>
            </label>
            <label className="text-sm font-medium text-[#60716b]">
              Investment plan
              <select
                value={Math.min(selected, Math.max(0, plans.length - 1))}
                onChange={(event) => {
                  const nextIndex = Number(event.target.value)
                  const nextPlan = plans[nextIndex]
                  const nextMinimum = Math.max(0, Number(nextPlan?.min_amount ?? 10_000))
                  const nextMaximum = Math.max(nextMinimum + 1, Number(nextPlan?.max_amount ?? 5_000_000))
                  setSelected(nextIndex)
                  setAmount((current) => Math.min(nextMaximum, Math.max(nextMinimum, current)))
                }}
                className="mt-2 min-h-12 w-full rounded-xl border border-[#dfe8e2] bg-[#fbfcfa] px-3 py-2 text-sm font-semibold text-[#0b4537] outline-none focus:border-[#75b95c] focus:ring-2 focus:ring-[#75b95c]/20"
              >
                {plans.length === 0 && <option value={0}>No plans available</option>}
                {plans.map((item, index) => (
                  <option key={item.id ?? index} value={index}>
                    {item.name} · {planDailyRate(item).toFixed(2)}% daily
                  </option>
                ))}
              </select>
              <span className="mt-1.5 block text-xs font-normal text-[#829088]">Terms are provided by the plan catalogue.</span>
            </label>
          </div>

          {plan && (
            <div className="mt-5 rounded-xl bg-[#f4f8f3] px-4 py-3">
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-[#708079]">Adjust amount</span>
                <span className="font-semibold tabular-nums text-[#0b4537]">{money(amount)}</span>
              </div>
              <input
                type="range"
                min={minimum}
                max={maximum}
                step={Math.max(1_000, Math.round((maximum - minimum) / 100))}
                value={Math.min(maximum, Math.max(minimum, amount || minimum))}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="mt-3 h-2 w-full cursor-pointer accent-[#0b4537]"
                aria-label="Adjust investment amount"
              />
            </div>
          )}
          {!amountIsValid && plan && <p className="mt-3 text-xs font-medium text-[#b34f43]" role="status">Enter an amount between {money(minimum)} and {money(maximum)} to calculate.</p>}
        </div>

        <div className="flex flex-col justify-between gap-5 bg-[#0b4537] p-5 text-white sm:p-7 lg:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#b9f47f]">Illustrative estimate</p>
            <p className="mt-5 text-sm text-white/70">Potential return over {days || '—'} days</p>
            <p className="mt-1 break-words text-3xl font-semibold tracking-tight text-[#b9f47f] sm:text-4xl">{amountIsValid && plan ? money(profit) : '—'}</p>
            <p className="mt-2 text-xs text-white/65">{plan ? `${plan.name} · ${daily.toFixed(2)}% daily target` : 'No plan selected'}</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
            <div>
              <dt className="text-xs text-white/65">Illustrative total</dt>
              <dd className="mt-1 break-words text-base font-semibold">{amountIsValid && plan ? money(amount + profit) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/65">Estimated maturity</dt>
              <dd className="mt-1 text-base font-semibold">{plan ? maturity : '—'}</dd>
            </div>
          </dl>
          <p className="text-[11px] leading-5 text-white/65">Estimate only—not a promise or ledger balance. Actual returns, fees, and settlement are determined by the investment terms and account ledger. {sourceNote ?? (catalogue?.source === 'live' ? 'Rates from live Xano catalogue.' : 'Illustrative catalogue rates.')}</p>
        </div>
      </div>
    </section>
  )
}
