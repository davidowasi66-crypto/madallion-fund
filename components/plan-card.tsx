import Link from 'next/link'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { planDailyRate, planIsPaused, type Plan } from '@/lib/investment-api'

const money = (value: number) => `₦${value.toLocaleString('en-NG')}`

export function PlanCard({ plan }: { plan: Plan }) {
  const soldOut = plan.sold_out === true || plan.availability_status === 'sold_out'
  const paused = planIsPaused(plan)
  const unavailable = soldOut || paused
  const limits = plan.soft_limits ?? []

  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border bg-white p-7 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(25,78,53,.13)] ${
        plan.featured
          ? 'border-[#b9f47f] shadow-[0_0_0_1px_rgba(185,244,127,.28)]'
          : 'border-[#dfe8e2]'
      } ${soldOut ? 'opacity-50' : ''}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[#b9f47f] opacity-0 transition-opacity group-hover:opacity-100"
      />
      {plan.featured && (
        <span className="absolute right-0 top-0 rounded-bl-2xl bg-[#b9f47f] px-4 py-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#071a18]">
          Featured
        </span>
      )}
      {soldOut && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rotate-[-14deg] whitespace-nowrap border-[3px] border-[#e26f5f] px-5 py-2 text-4xl font-black tracking-[.18em] text-[#d75e4f] opacity-[.12] sm:text-5xl"
        >
          CLOSED
        </span>
      )}

      <div className="relative z-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#65a85c]">{plan.name}</p>
          {unavailable && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f5f2] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-[#708079]">
              <LockKeyhole size={12} aria-hidden="true" /> {soldOut ? 'Closed' : 'Paused'}
            </span>
          )}
        </div>
        <h2 className="mt-8 text-3xl font-semibold tracking-tight text-[#0b4537]">
          {planDailyRate(plan).toFixed(2)}% daily ROI
        </h2>
        <p className="mt-3 min-h-12 text-sm leading-6 text-[#708079]">
          {plan.description ?? 'A transparent plan for intentional growth.'}
        </p>

        <dl className="mt-8 space-y-4 border-t border-[#dfe8e2] pt-6 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[#829088]">Duration</dt>
            <dd className="font-semibold text-[#0b4537]">{plan.duration_days} days</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#829088]">Investment range</dt>
            <dd className="text-right font-semibold text-[#0b4537]">
              {plan.min_amount ? money(Number(plan.min_amount)) : 'Minimum not specified'}
              {plan.max_amount ? ` – ${money(Number(plan.max_amount))}` : ' · no maximum specified'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#829088]">Lock period</dt>
            <dd className="font-semibold text-[#0b4537]">{plan.lock_period_days ?? plan.duration_days} days</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#829088]">Payout cadence</dt>
            <dd className="font-semibold capitalize text-[#0b4537]">
              {plan.payout_cadence?.replaceAll('_', ' ') ?? 'Plan terms not provided'}
            </dd>
          </div>
        </dl>

        {(() => {
          const capacityPercent = plan.capacity_percent != null
            ? Math.min(100, Math.max(0, Number(plan.capacity_percent)))
            : plan.capacity && plan.capacity_used != null
              ? Math.min(100, Math.max(0, (Number(plan.capacity_used) / Number(plan.capacity)) * 100))
              : null
          if (capacityPercent == null || !Number.isFinite(capacityPercent)) return null
          return (
            <section className="mt-6 border-t border-[#dfe8e2] pt-5" aria-label={`${plan.name} capacity`}>
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#0b4537]">Plan capacity</span>
                <span className="text-[#708079]">{Math.round(capacityPercent)}% allocated</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eaf0eb]" role="progressbar" aria-label={`${plan.name} capacity allocated`} aria-valuenow={Math.round(capacityPercent)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-gradient-to-r from-[#8edc67] to-[#ff9c38]" style={{ width: `${capacityPercent}%` }} />
              </div>
            </section>
          )
        })()}

        {limits.length > 0 && (
          <section className="mt-6 border-t border-[#dfe8e2] pt-5" aria-label={`${plan.name} usage limits`}>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#829088]">Included limits</p>
            <ul className="mt-3 flex flex-col gap-3">
              {limits.map((limit) => {
                const usage = typeof limit.used === 'number' ? Math.max(0, limit.used) : null
                const percent = usage === null || limit.limit <= 0 ? null : Math.min(100, Math.round((usage / limit.limit) * 100))
                return (
                  <li key={limit.key}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-[#60716b]">{limit.label}</span>
                      <span className="font-semibold text-[#0b4537]">
                        {usage === null ? `${limit.limit.toLocaleString('en-NG')} ${limit.unit ?? ''}` : `${usage.toLocaleString('en-NG')} / ${limit.limit.toLocaleString('en-NG')}`}
                      </span>
                    </div>
                    {percent !== null && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eaf0eb]" role="progressbar" aria-label={`${limit.label} usage`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full rounded-full bg-[#8edc67] transition-[width]" style={{ width: `${percent}%` }} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-[11px] leading-5 text-[#829088]">Approaching a limit? <Link href="/plans#catalogue" className="font-semibold text-[#0b4537] underline underline-offset-2">Compare investment plans</Link> to find more room.</p>
          </section>
        )}

        {unavailable ? (
          <button
            type="button"
            disabled
            className="mt-8 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#dfe8e2] bg-[#f4f8f3] py-3 text-sm font-semibold text-[#829088]"
          >
            {soldOut ? 'Currently closed' : 'Temporarily paused'}
          </button>
        ) : (
          <Link
            href="/register"
            className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-center text-sm font-semibold transition ${
              plan.featured
                ? 'bg-[#b9f47f] text-[#071a18] hover:bg-[#a9e86d]'
                : 'bg-[#0b4537] text-white hover:bg-[#123f34]'
            }`}
          >
            Start with {plan.name} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  )
}
