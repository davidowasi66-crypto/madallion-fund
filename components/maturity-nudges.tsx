'use client'

import Link from 'next/link'
import { Bell, CalendarClock, RotateCw } from 'lucide-react'
import type { Investment } from '@/lib/investment-api'
import { formatTimestamp, toTimestamp } from '@/lib/pending-route'

const DAY = 24 * 60 * 60 * 1000
const money = (value: unknown) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(
    Number.isFinite(Number(value)) ? Number(value) : 0,
  )

function maturityOf(investment: Investment): number | null {
  return toTimestamp(
    investment.maturity_at ??
      investment.ends_at ??
      investment.matures_at ??
      investment.maturity_date ??
      investment.end_date,
  )
}

function planName(investment: Investment): string {
  return investment.plan?.name ?? investment.plan_name ?? 'Investment'
}

export function MaturityNudges({ investments }: { investments: Investment[] }) {
  const now = Date.now()
  const dated = investments
    .map((investment) => ({ investment, maturity: maturityOf(investment) }))
    .filter((item): item is { investment: Investment; maturity: number } => item.maturity != null)
  const matured = dated.filter((item) => item.maturity <= now)
  const dueSoon = dated
    .filter((item) => item.maturity > now && item.maturity - now <= 14 * DAY)
    .sort((a, b) => a.maturity - b.maturity)
  const next = dated.filter((item) => item.maturity > now).sort((a, b) => a.maturity - b.maturity)[0]

  if (!next && !matured.length) return null

  const focus = dueSoon[0] ?? next
  const days = focus ? Math.max(1, Math.ceil((focus.maturity - now) / DAY)) : null
  const maturedFirst = matured[0]
  const maturedHref = maturedFirst?.investment.id != null ? `#investment-${maturedFirst.investment.id}` : '#maturity-actions'

  return (
    <section className="rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm lg:border-white/10 lg:bg-[#0b2420]" aria-labelledby="maturity-watch-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#65a85c] lg:text-[#b9f47f]">Maturity watch</p>
          <h2 id="maturity-watch-title" className="mt-1 text-lg font-semibold text-[#0b4537] lg:text-white">
            {matured.length ? 'A plan is ready for your decision' : `${days} days until your next maturity`}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#708079] lg:text-[#a8c7b8]">
            {matured.length
              ? `${matured.length} matured ${matured.length === 1 ? 'investment needs' : 'investments need'} a payout or rollover instruction.`
              : `${focus ? planName(focus.investment) : 'Your investment'} matures ${focus ? formatTimestamp(focus.maturity) : 'soon'}. Reinvest or set a reminder now so the decision is not rushed.`}
          </p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef7eb] text-[#2f7a4a] lg:bg-[#183e31] lg:text-[#b9f47f]" aria-hidden="true">
          <CalendarClock size={18} />
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#f4f8f3] p-3 lg:bg-[#071a18]">
          <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#829088]">Due in 14 days</p>
          <p className="mt-1 text-lg font-semibold text-[#0b4537] lg:text-white">{dueSoon.length}</p>
        </div>
        <div className="rounded-2xl bg-[#f4f8f3] p-3 lg:bg-[#071a18]">
          <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#829088]">Matured</p>
          <p className="mt-1 text-lg font-semibold text-[#0b4537] lg:text-white">{matured.length}</p>
        </div>
        <div className="rounded-2xl bg-[#f4f8f3] p-3 lg:bg-[#071a18]">
          <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#829088]">Next principal</p>
          <p className="mt-1 text-lg font-semibold text-[#0b4537] lg:text-white">{focus ? money(focus.investment.principal) : '—'}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/plans" className="inline-flex items-center gap-1.5 rounded-xl bg-[#b9f47f] px-3 py-2 text-xs font-semibold text-[#071a18]">
          <RotateCw size={13} aria-hidden="true" /> Reinvest in a plan
        </Link>
        <Link href="/dashboard/notifications" className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe8e2] px-3 py-2 text-xs font-semibold text-[#0b4537] lg:border-white/15 lg:text-white">
          <Bell size={13} aria-hidden="true" /> Maturity reminders
        </Link>
        {matured.length > 0 && (
          <a href={maturedHref} className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe8e2] px-3 py-2 text-xs font-semibold text-[#0b4537] lg:border-white/15 lg:text-white">
            Review matured plans
          </a>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[#829088]">
        Reminder delivery follows your notification preferences. Rollover choices stay editable until the maturity instruction is confirmed.
      </p>
    </section>
  )
}
