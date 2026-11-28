import Link from 'next/link'
import { ArrowRight, Crown, LockKeyhole } from 'lucide-react'
import { PlanSubscribe } from '@/components/plan-subscribe'
import { planDailyRate, planIsPaused, type Plan } from '@/lib/investment-api'
import { registerForPlanHref } from '@/lib/plan-links'

const money = (value: number) => `₦${Number(value).toLocaleString('en-NG')}`

export function LandingPlanCard({
  plan,
  featured,
  best = false,
}: {
  plan: Plan
  featured: boolean
  best?: boolean
}) {
  const rate = planDailyRate(plan)
  const days = Math.max(0, Number(plan.duration_days ?? 0))
  const hasMinimum = Number(plan.min_amount) > 0
  const hasMaximum = Number(plan.max_amount) > 0
  const minimum = hasMinimum ? Math.round(Number(plan.min_amount)) : 0
  const maximum = hasMaximum ? Math.round(Number(plan.max_amount)) : 0
  const illustrativeEarnings = minimum > 0 && rate > 0 ? Math.round(minimum * (rate / 100) * days) : null
  const unavailable = planIsPaused(plan) || plan.sold_out === true || plan.availability_status === 'sold_out'
  const principalLabel =
    plan.principal_returned == null ? 'Per plan terms' : plan.principal_returned ? 'Returned at maturity' : 'Not returned'

  const accent = featured || best
  const shell = accent
    ? 'border-[#b9f47f]/70 bg-[#b9f47f]/95 text-[#071a18] shadow-[0_24px_70px_rgba(185,244,127,.28)]'
    : 'border-white/60 bg-white/[.95] text-[#0b4537] shadow-[0_18px_55px_rgba(3,20,14,.35)]'
  const muted = accent ? 'text-[#315b3d]' : 'text-[#708079]'
  const rule = accent ? 'border-[#2f6a43]/20' : 'border-[#dfe8e2]'

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-3xl border p-6 backdrop-blur-xl transition duration-300 motion-safe:hover:-translate-y-1 sm:p-7 ${shell} ${
        unavailable ? 'opacity-70' : ''
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-px ${accent ? 'bg-[#0b4537]/25' : 'bg-white/70'}`}
      />

      <div className="absolute right-4 top-4 flex flex-col items-end gap-1.5">
        {best && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#071a18] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#b9f47f]">
            <Crown size={11} aria-hidden="true" /> Best rate
          </span>
        )}
        {featured && (
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] ${
              accent ? 'bg-[#0b4537] text-[#b9f47f]' : 'bg-[#eef7eb] text-[#2f7a4a]'
            }`}
          >
            Featured
          </span>
        )}
      </div>

      <p className={`text-xs font-bold uppercase tracking-[.18em] ${accent ? 'text-[#2f6a43]' : 'text-[#65a85c]'}`}>
        {plan.name}
      </p>
      <p className={`mt-3 min-h-10 pr-2 text-sm leading-6 ${muted}`}>
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
          <dd className="font-semibold">{hasMinimum ? money(minimum) : 'Set at deposit'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className={muted}>Maximum</dt>
          <dd className="font-semibold">{hasMaximum ? money(maximum) : 'No stated cap'}</dd>
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

      <div
        className={`mt-5 rounded-2xl border p-4 backdrop-blur ${
          accent ? 'border-[#0b4537]/10 bg-white/55' : 'border-[#e3ebe4] bg-[#f4f8f3]'
        }`}
      >
        <p className={`text-[10px] font-bold uppercase tracking-[.15em] ${muted}`}>Illustrative at minimum</p>
        <p className="mt-1 text-lg font-semibold">{illustrativeEarnings == null ? '—' : money(illustrativeEarnings)}</p>
        <p className={`mt-1 text-[11px] leading-5 ${muted}`}>
          {minimum && days
            ? `${money(minimum)} for ${days} days. Not guaranteed.`
            : 'Set the amount at deposit to see illustrative numbers.'}
        </p>
      </div>

      <div className="mt-auto pt-5">
        {unavailable ? (
          <button
            type="button"
            disabled
            className={`flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
              accent ? 'border-[#2f6a43]/20 bg-white/40 text-[#315b3d]' : 'border-[#dfe8e2] bg-[#f4f8f3] text-[#829088]'
            }`}
          >
            <LockKeyhole size={14} aria-hidden="true" /> Plan unavailable
          </button>
        ) : plan.id && plan.id > 0 ? (
          <PlanSubscribe plan={plan} variant="dark" />
        ) : (
          <Link
            href={registerForPlanHref(plan, minimum || undefined)}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0b4537] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#123f34]"
          >
            Start with {plan.name} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  )
}
