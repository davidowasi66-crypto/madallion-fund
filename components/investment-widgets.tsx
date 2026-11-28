'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import { getXanoSession } from '@/lib/xano-auth'
import { clearPendingPlan, getPendingPlan, planDepositHref, type PendingPlan } from '@/lib/plan-links'
import { memberSafeError } from '@/lib/member-routes'
import { antiThrottleSwrConfig } from '@/lib/swr'
import {
  createInvestment,
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
export function MemberMaturityPreview({ walletBalance = 0 }: { walletBalance?: number }) {
  const [session, setSession] = useState<{ authenticated: boolean; cacheKey: string } | null>(null)
  const [pendingPlan, setPendingPlan] = useState<PendingPlan | null>(null)
  const [activating, setActivating] = useState(false)
  const [activationError, setActivationError] = useState('')
  const [activationMessage, setActivationMessage] = useState('')
  useEffect(() => {
    const current = getXanoSession()
    setSession(
      current?.authenticated
        ? { authenticated: true, cacheKey: `member-investments-${current.user_id || 'me'}` }
        : { authenticated: false, cacheKey: '' },
    )
    setPendingPlan(current?.authenticated ? getPendingPlan() : null)
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
  const dueSoon = active.filter((investment) => {
    const maturity = investment.ends_at ?? investment.maturity_at ?? investment.matures_at ?? investment.maturity_date ?? investment.end_date
    if (maturity == null) return false
    const remaining = toMs(maturity, 0) - Date.now()
    return remaining > 0 && remaining <= 14 * 86_400_000
  }).length
  const rateLimited = /(?:^|\D)429(?:\D|$)/.test(error instanceof Error ? error.message : '')
  const canActivate = pendingPlan != null && walletBalance >= pendingPlan.principal

  async function activatePlan() {
    if (!pendingPlan || activating) return
    setActivating(true)
    setActivationError('')
    setActivationMessage('')
    try {
      const result = await createInvestment({
        plan_id: pendingPlan.plan_id,
        principal: Math.round(pendingPlan.principal * 100),
        currency: pendingPlan.currency,
        rollover_enabled: true,
        rollover_mode: 'both',
      })
      if (!result) throw new Error('The investment route is not available yet.')
      clearPendingPlan()
      setPendingPlan(null)
      await mutate()
      setActivationMessage(`${pendingPlan.plan_name} is active. Maturity progress is now tracking.`)
    } catch (cause) {
      setActivationError(memberSafeError(cause, 'Unable to activate this plan. Please try again.'))
    } finally {
      setActivating(false)
    }
  }

  return (
    <section
      className="mt-5 rounded-3xl border border-[#dfe8e2] soft-3d p-5 sm:p-6"
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

      {session?.authenticated && !isLoading && !error && dueSoon > 0 && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#d7e8c9] bg-[#f1f9ea] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-[#315b3d]">
            <span className="font-semibold">{dueSoon} {dueSoon === 1 ? 'investment matures' : 'investments mature'} within 14 days.</span>{' '}
            Decide whether to reinvest or receive the payout.
          </p>
          <div className="flex shrink-0 gap-2">
            <Link href="/plans" className="rounded-lg bg-[#0b4537] px-3 py-1.5 text-[11px] font-semibold text-white">Reinvest</Link>
            <Link href="/dashboard/notifications" className="rounded-lg border border-[#c9dfb8] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#315b3d]">Reminders</Link>
          </div>
        </div>
      )}

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
      ) : pendingPlan ? (
        <div className="mt-5 rounded-2xl border border-[#d7e8c9] bg-[#f1f9ea] px-4 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2f7a4a]">Plan selected</p>
          <h3 className="mt-1 text-base font-semibold text-[#0b4537]">{pendingPlan.plan_name}</h3>
          <p className="mt-2 text-sm leading-6 text-[#315b3d]">
            {canActivate
              ? `Your wallet has the ${money(pendingPlan.principal)} needed. Activate the plan to start the maturity clock.`
              : `We are waiting for your ${money(pendingPlan.principal)} deposit to clear. Once your wallet balance covers it, activate the plan here.`}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void activatePlan()}
              disabled={!canActivate || activating}
              className="rounded-xl bg-[#0b4537] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activating ? 'Activating…' : 'Activate plan'}
            </button>
            <Link href="/dashboard/wallet?mode=deposit" className="text-sm font-semibold text-[#2f7a4a] underline underline-offset-4">
              Add funds
            </Link>
            <Link href="/plans" className="text-sm font-semibold text-[#2f7a4a] underline underline-offset-4">
              Change plan
            </Link>
          </div>
          {activationError && <p role="alert" className="mt-3 text-sm text-rose-700">{activationError}</p>}
          {activationMessage && <p role="status" className="mt-3 text-sm text-[#2f7a4a]">{activationMessage}</p>}
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
    <div className={`rounded-2xl border p-4 ${light ? 'border-[#e7eee8] soft-3d-soft' : 'border-white/10 soft-3d-dark'}`}>
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
  return <div className="rounded-2xl border border-white/10 soft-3d-dark p-4"><p className="text-xs text-[#8eaea0]">{label}</p><p className="mt-2 text-lg font-semibold text-white">{value}</p></div>
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfe8e2] soft-3d p-4">
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

  const week = amountIsValid ? Math.round(amount * (daily / 100) * 7) : 0
  const month = amountIsValid ? Math.round(amount * (daily / 100) * 30) : 0
  const termPercent = days > 0 && Number.isFinite(daily) ? daily * days : 0
  const opens = useMemo(() => new Date(), [])
  const firstCredit = useMemo(() => {
    const d = new Date(opens)
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }, [opens])
  const openedLabel = opens.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  const principalReturned = plan?.principal_returned !== false
  const cadence = String(plan?.payout_cadence ?? '').toLowerCase()
  const dailyPayout = cadence === 'daily'
  const payoutScheduleKnown = cadence.length > 0
  const totalAtMaturity = amountIsValid && plan ? (principalReturned ? amount + profit : profit) : 0
  const totalLabel = principalReturned ? 'Illustrative total at maturity' : 'Illustrative income'
  const firstCreditLabel = !payoutScheduleKnown ? 'Payout schedule' : dailyPayout ? 'First credit' : 'At maturity'
  const firstCreditValue = !payoutScheduleKnown ? 'Per plan terms' : dailyPayout ? firstCredit : maturity

  function choosePlan(index: number) {
    const nextPlan = plans[index]
    const nextMinimum = Math.max(0, Number(nextPlan?.min_amount ?? 10_000))
    const nextMaximum = Math.max(nextMinimum + 1, Number(nextPlan?.max_amount ?? 5_000_000))
    setSelected(index)
    setAmount((current) => Math.min(nextMaximum, Math.max(nextMinimum, current || nextMinimum)))
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-[#dfe8e2] soft-3d" aria-labelledby="plan-calculator-title">
      <div className="border-b border-[#e6eee8] bg-[#f7faf6] px-5 py-6 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Plan calculator</p>
        <h2 id="plan-calculator-title" className="mt-2 text-2xl font-semibold tracking-tight text-[#0b4537] sm:text-3xl">Choose a plan, see what it pays</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#60716b]">Income follows the plan&apos;s payout cadence, and principal treatment is shown before you commit. This is an estimate, not a promise.</p>
      </div>
      <div className="grid lg:grid-cols-[1.05fr_.95fr]">
        <div className="p-5 sm:p-7 lg:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#829088]">Plans</p>
          <div className="mt-3 flex flex-col gap-2" role="listbox" aria-label="Investment plans">
            {plans.length === 0 && <p className="rounded-2xl bg-[#f4f8f3] px-4 py-6 text-sm text-[#60716b]">Plans will show here when the catalogue is available.</p>}
            {plans.map((item, index) => {
              const rate = planDailyRate(item)
              const span = Math.max(0, Number(item.duration_days ?? 0))
              const active = index === selected
              return (
                <button
                  key={item.id ?? index}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choosePlan(index)}
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    active ? 'border-[#0b4537] bg-[#0b4537] text-white' : 'border-[#e1e9e3] bg-white text-[#173c30] hover:border-[#b9f47f]'
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold">{item.name}</span>
                    <span className={`mt-0.5 block text-xs ${active ? 'text-white/70' : 'text-[#708079]'}`}>
                      {span} days · {money(item.min_amount)} – {money(item.max_amount)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className={`block text-sm font-bold tabular-nums ${active ? 'text-[#b9f47f]' : 'text-[#0b4537]'}`}>{rate.toFixed(2)}% / day</span>
                    <span className={`block text-[11px] ${active ? 'text-white/70' : 'text-[#708079]'}`}>+{(rate * span).toFixed(1)}% over the term</span>
                  </span>
                </button>
              )
            })}
          </div>

          {plan && (
            <div className="mt-5">
              <label className="text-sm font-medium text-[#60716b]" htmlFor="plan-amount">
                Deposit amount
                <div className="mt-2 flex min-h-12 items-center rounded-xl border border-[#dfe8e2] bg-[#fbfcfa] px-3 focus-within:border-[#75b95c] focus-within:ring-2 focus-within:ring-[#75b95c]/20">
                  <span className="mr-2 text-sm font-semibold text-[#829088]">₦</span>
                  <input
                    id="plan-amount"
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
              </label>
              <span id="calculator-range" className="mt-1.5 block text-xs text-[#829088]">Min {money(minimum)} · Max {money(maximum)}</span>
              <input
                type="range"
                min={minimum}
                max={maximum}
                step={10_000}
                value={Math.min(maximum, Math.max(minimum, amount || minimum))}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="mt-3 h-2 w-full cursor-pointer accent-[#0b4537]"
                aria-label="Adjust deposit amount"
              />
              {!amountIsValid && <p className="mt-3 text-xs font-medium text-[#b34f43]" role="status">Enter an amount between {money(minimum)} and {money(maximum)}.</p>}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-5 bg-[#0b4537] p-5 text-white sm:p-7 lg:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#b9f47f]">What you receive</p>
            <p className="mt-3 text-sm text-white/75">{plan ? `${plan.name} · ${daily.toFixed(2)}% a day · ${days} days` : 'Pick a plan'}</p>
            <p className="mt-2 text-xs text-white/60">{totalLabel}</p>
            <p className="mt-1 break-words text-3xl font-semibold tracking-tight text-[#b9f47f] sm:text-4xl">{amountIsValid && plan ? money(totalAtMaturity) : '—'}</p>
            <p className="mt-1 text-xs text-[#b9f47f]/80">{plan && amountIsValid ? `+${termPercent.toFixed(1)}% illustrative return over the term` : 'Estimate appears when the amount fits the plan'}</p>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            {[
              ['Per day (illustrative)', amountIsValid ? money(Math.round(amount * (daily / 100))) : '—'],
              ['Per week (illustrative)', amountIsValid ? money(week) : '—'],
              ['Per month (illustrative)', amountIsValid ? money(month) : '—'],
              ['Whole term income', amountIsValid ? money(profit) : '—'],
              ['Principal', amountIsValid ? (principalReturned ? money(amount) : 'Not returned') : '—'],
              [principalReturned ? 'Total at maturity' : 'Illustrative income', amountIsValid ? money(totalAtMaturity) : '—'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/10 px-3 py-3">
                <dt className="text-[11px] text-white/65">{label}</dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="grid grid-cols-3 gap-2 text-[11px] leading-4 text-white/70">
            <p><span className="block text-white/45">Plan opens</span>{openedLabel}</p>
            <p><span className="block text-white/45">{firstCreditLabel}</span>{firstCreditValue}</p>
            <p><span className="block text-white/45">Principal</span>{plan ? (principalReturned ? `Back ${maturity}` : 'Per plan terms') : '—'}</p>
          </div>
          <a
            href={plan && amountIsValid ? planDepositHref(plan, amount) : '/dashboard/wallet?mode=deposit'}
            className="soft-3d-button inline-flex min-h-12 items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-semibold"
          >
            {plan && amountIsValid ? `Fund ${plan.name} with ${money(amount)}` : 'Open a funded account'}
          </a>
          <p className="text-[11px] leading-5 text-white/60">Estimate only. Actual returns follow the plan terms and your account ledger. {sourceNote ?? 'Figures follow the current plan catalogue.'}</p>
        </div>
      </div>
    </section>
  )
}
