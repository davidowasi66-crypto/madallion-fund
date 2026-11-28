import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PlanSubscribe } from '@/components/plan-subscribe'
import { planDailyRate, planIsPaused, type Plan } from '@/lib/investment-api'
import { registerForPlanHref } from '@/lib/plan-links'

const money = (value: number) => `₦${Number(value).toLocaleString('en-NG')}`

export function LandingPlanCard({ plan, featured }: { plan: Plan; featured: boolean }) {
  const rate = planDailyRate(plan)
  const days = Math.max(0, Number(plan.duration_days ?? 0))
  const minimum = Math.max(0, Number(plan.min_amount ?? 0))
  const maximum = Math.max(0, Number(plan.max_amount ?? 0))
  const illustrativeEarnings = minimum > 0 && rate > 0 ? Math.round(minimum * (rate / 100) * days) : null
  const unavailable = planIsPaused(plan) || plan.sold_out === true || plan.availability_status === 'sold_out'
  const principalLabel =
    plan.principal_returned == null ? 'Per plan terms' : plan.principal_returned ? 'Returned at maturity' : 'Not returned'
  const muted = featured ? 'text-[#315b3d]' : 'text-[#708079]'
  const rule = featured ? 'border-[#2f6a43]/20' : 'border-[#dfe8e2]'

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-3xl border p-6 sm:p-7 ${
        featured ? 'soft-3d-lime border-[#b9f47f] text-[#071a18]' : 'soft-3d border-[#dfe8e2] text-[#0b4537]'
      }`}
    >
      {featured && (
        <span className="absolute right-5 top-5 rounded-full bg-[#0b4537] px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#b9f47f]">
          Featured
        </span>
      )}
      <p className={`text-xs font-bold uppercase tracking-[.18em] ${featured ? 'text-[#2f6a43]' : 'text-[#65a85c]'}`}>
        {plan.name}
      </p>
      <p className={`mt-3 min-h-10 text-sm leading-6 ${muted}`}>
        {plan.description ?? 'A transparent plan for intentional growth.'}
      </p>

      <div className="mt-6 flex items-end gap-2">
        <span className="text-5xl font-semibold tracking-[-.055em]">{rate.toFixed(2)}%</span>
        <span className={`pb-2 text-sm font-medium ${muted}`}>/ day</span>
      </div>
      <p className={`mt-1 text-xs ${muted}`}>Illustrative rate over a {days}-day term</p>

      <dl className={`mt-6 space-y-3 border-t pt-5 text-sm ${rule}`}>
        <div className="flex items-center justify-between gap-4">
          <dt className={muted}>Minimum</dt>
          <dd className="font-semibold">{minimum ? money(minimum) : '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className={muted}>Maximum</dt>
          <dd className="font-semibold">{maximum ? money(maximum) : '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className={muted}>Term</dt>
          <dd className="font-semibold">{days} days</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className={muted}>Principal</dt>
          <dd className="text-right font-semibold">{principalLabel}</dd>
        </div>
      </dl>

      <div className={`mt-5 rounded-2xl p-4 ${featured ? 'bg-white/55' : 'bg-[#f4f8f3]'}`}>
        <p className={`text-[10px] font-bold uppercase tracking-[.15em] ${muted}`}>Illustrative at minimum</p>
        <p className="mt-1 text-lg font-semibold">{illustrativeEarnings == null ? '—' : money(illustrativeEarnings)}</p>
        <p className={`mt-1 text-[11px] leading-5 ${muted}`}>
          {minimum && days
            ? `${money(minimum)} for ${days} days. Not guaranteed.`
            : 'Minimum and term are shown when the live plan loads.'}
        </p>
      </div>

      <div className="mt-auto pt-5">
        {unavailable ? (
          <button
            type="button"
            disabled
            className={`flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold ${
              featured ? 'border-[#2f6a43]/20 bg-white/40 text-[#315b3d]' : 'border-[#dfe8e2] bg-[#f4f8f3] text-[#829088]'
            }`}
          >
            Plan unavailable
          </button>
        ) : plan.id && plan.id > 0 ? (
          <PlanSubscribe plan={plan} variant="dark" />
        ) : (
          <Link
            href={registerForPlanHref(plan, minimum || undefined)}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0b4537] px-4 py-3 text-sm font-semibold text-white"
          >
            Start with {plan.name} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  )
}
