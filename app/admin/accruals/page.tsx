'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { AdminShell, Metric, SectionCard } from '@/components/admin-shell'
import { getAdminInvestments, type AdminInvestmentsResponse } from '@/lib/xano-admin'
import { toTimestamp } from '@/lib/pending-route'

type Investment = AdminInvestmentsResponse['items'][number]

type PlanSummary = {
  planId: number
  planName: string
  dailyRateBps: number
  durationDays: number
  count: number
  principal: number
  accrued: number
  projectedYield: number
  active: number
  matured: number
  nextMaturity: number | null
}

const naira = (value: number) => `₦${Math.round(value || 0).toLocaleString('en-NG')}`
const rate = (bps: number) => `${((bps || 0) / 100).toFixed(2)}% / day`
const dateLabel = (value: number | null) => (value ? new Date(value).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '—')

const isMatured = (investment: Investment, now: number | null) => {
  if (investment.status === 'completed') return true
  const maturity = toTimestamp(investment.ends_at)
  return maturity != null && now != null && maturity <= now
}

const daysLeft = (maturity: number | null, now: number | null) => {
  if (maturity == null || now == null) return null
  return Math.ceil((maturity - now) / 86_400_000)
}

export default function AccrualsPage() {
  const { data, error, isLoading } = useSWR<AdminInvestmentsResponse>(
    'admin-accruals-investments',
    () => getAdminInvestments({ per_page: 100 }),
    { revalidateOnFocus: false },
  )
  const [now, setNow] = useState<number | null>(null)
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'matured'>('all')

  useEffect(() => {
    setNow(Date.now())
  }, [])

  const investments = data?.items ?? []

  const summaries = useMemo<PlanSummary[]>(() => {
    const map = new Map<number, PlanSummary>()
    for (const investment of investments) {
      const plan = investment.plan
      const key = plan?.id ?? -1
      const current = map.get(key) ?? {
        planId: key,
        planName: plan?.name ?? 'Unassigned plan',
        dailyRateBps: investment.daily_rate_bps ?? plan?.daily_rate_bps ?? 0,
        durationDays: plan?.duration_days ?? 0,
        count: 0,
        principal: 0,
        accrued: 0,
        projectedYield: 0,
        active: 0,
        matured: 0,
        nextMaturity: null,
      }
      const principal = Number(investment.principal ?? 0)
      const accrued = Number(investment.accrued_total ?? 0)
      const bps = investment.daily_rate_bps ?? plan?.daily_rate_bps ?? 0
      const duration = plan?.duration_days ?? 0
      const maturity = toTimestamp(investment.ends_at)
      const matured = isMatured(investment, now)

      current.count += 1
      current.principal += principal
      current.accrued += accrued
      current.projectedYield += principal * (bps / 10_000) * duration
      if (matured) current.matured += 1
      else if (investment.status === 'active') current.active += 1
      if (!matured && maturity != null && (current.nextMaturity == null || maturity < current.nextMaturity)) {
        current.nextMaturity = maturity
      }
      map.set(key, current)
    }
    return [...map.values()].sort((a, b) => b.principal - a.principal)
  }, [investments, now])

  const totals = useMemo(() => {
    const principal = summaries.reduce((sum, plan) => sum + plan.principal, 0)
    const accrued = summaries.reduce((sum, plan) => sum + plan.accrued, 0)
    const projected = summaries.reduce((sum, plan) => sum + plan.projectedYield, 0)
    const dueSoon = now == null
      ? 0
      : investments.filter((investment) => {
          if (isMatured(investment, now)) return false
          const maturity = toTimestamp(investment.ends_at)
          if (maturity == null) return false
          return maturity - now <= 7 * 86_400_000
        }).length
    return { principal, accrued, projected, dueSoon }
  }, [summaries, investments, now])

  const rows = useMemo(() => {
    return investments
      .filter((investment) => {
        const planMatch = planFilter === 'all' || String(investment.plan?.id ?? -1) === planFilter
        const matured = isMatured(investment, now)
        const statusMatch =
          statusFilter === 'all' ||
          (statusFilter === 'active' && !matured && investment.status === 'active') ||
          (statusFilter === 'matured' && matured)
        return planMatch && statusMatch
      })
      .sort((a, b) => (toTimestamp(a.ends_at) ?? 0) - (toTimestamp(b.ends_at) ?? 0))
  }, [investments, planFilter, statusFilter, now])

  return (
    <AdminShell eyebrow="Treasury controls" title="Accruals & Maturity">
      <p className="max-w-3xl text-sm leading-6 text-slate-400">
        Accruals come from the ledger&apos;s investment records. Each row shows the principal, interest accrued to date, projected
        yield at maturity, and the maturity date. Use the filters to review one plan at a time.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Metric label="Total principal" value={naira(totals.principal)} detail="Across returned investments" tone="good" />
        <Metric label="Accrued to date" value={naira(totals.accrued)} detail="Posted by the ledger" />
        <Metric label="Projected yield" value={naira(totals.projected)} detail="At each plan's maturity" />
        <Metric label="Due in 7 days" value={String(totals.dueSoon)} detail="Active contracts maturing soon" tone="warn" />
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">
          Unable to load investments: {error.message}
        </p>
      )}

      <div className="mt-6">
        <SectionCard title="Accruals by plan" action={isLoading ? 'Loading' : `${summaries.length} plans`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="pb-3 pr-4">Plan</th>
                  <th className="pb-3 pr-4">Daily rate</th>
                  <th className="pb-3 pr-4">Duration</th>
                  <th className="pb-3 pr-4">Active</th>
                  <th className="pb-3 pr-4">Matured</th>
                  <th className="pb-3 pr-4">Principal</th>
                  <th className="pb-3 pr-4">Accrued</th>
                  <th className="pb-3 pr-4">Projected yield</th>
                  <th className="pb-3">Next maturity</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((plan) => (
                  <tr key={plan.planId} className="border-t border-slate-800 text-slate-200">
                    <td className="py-3 pr-4 font-medium text-white">{plan.planName}</td>
                    <td className="py-3 pr-4 text-emerald-300">{rate(plan.dailyRateBps)}</td>
                    <td className="py-3 pr-4">{plan.durationDays ? `${plan.durationDays} days` : '—'}</td>
                    <td className="py-3 pr-4">{plan.active}</td>
                    <td className="py-3 pr-4">{plan.matured}</td>
                    <td className="py-3 pr-4">{naira(plan.principal)}</td>
                    <td className="py-3 pr-4">{naira(plan.accrued)}</td>
                    <td className="py-3 pr-4">{naira(plan.projectedYield)}</td>
                    <td className="py-3 text-slate-400">{dateLabel(plan.nextMaturity)}</td>
                  </tr>
                ))}
                {!isLoading && summaries.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">No investment records returned from the ledger.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Maturity tracker" action={isLoading ? 'Loading' : `${rows.length} contracts`}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Plan
              <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                <option value="all">All plans</option>
                {summaries.map((plan) => (
                  <option key={plan.planId} value={String(plan.planId)}>{plan.planName}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'matured')} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="matured">Matured</option>
              </select>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="pb-3 pr-4">Member</th>
                  <th className="pb-3 pr-4">Plan</th>
                  <th className="pb-3 pr-4">Principal</th>
                  <th className="pb-3 pr-4">Accrued</th>
                  <th className="pb-3 pr-4">Projected yield</th>
                  <th className="pb-3 pr-4">Maturity</th>
                  <th className="pb-3 pr-4">Days left</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((investment) => {
                  const maturity = toTimestamp(investment.ends_at)
                  const remaining = daysLeft(maturity, now)
                  const matured = isMatured(investment, now)
                  const principal = Number(investment.principal ?? 0)
                  const bps = investment.daily_rate_bps ?? investment.plan?.daily_rate_bps ?? 0
                  const duration = investment.plan?.duration_days ?? 0
                  const projected = principal * (bps / 10_000) * duration
                  return (
                    <tr key={investment.id} className="border-t border-slate-800 text-slate-200">
                      <td className="py-3 pr-4">{investment.user?.name ?? investment.user?.email ?? '—'}</td>
                      <td className="py-3 pr-4">{investment.plan?.name ?? '—'}</td>
                      <td className="py-3 pr-4">{naira(principal)}</td>
                      <td className="py-3 pr-4">{naira(Number(investment.accrued_total ?? 0))}</td>
                      <td className="py-3 pr-4">{naira(projected)}</td>
                      <td className="py-3 pr-4 text-slate-400">{dateLabel(maturity)}</td>
                      <td className={`py-3 pr-4 ${remaining != null && remaining <= 7 ? 'text-amber-300' : 'text-slate-400'}`}>
                        {remaining == null ? '—' : remaining < 0 ? `${Math.abs(remaining)}d overdue` : `${remaining}d`}
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs ${matured ? 'bg-slate-700 text-slate-300' : 'bg-emerald-400/10 text-emerald-300'}`}>
                          {matured ? 'Matured' : investment.status ?? 'active'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {!isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">No contracts match these filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </AdminShell>
  )
}
