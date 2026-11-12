'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { PlanCalculator } from '@/components/investment-widgets'
import { getPlans, PLANS_KEY, planDailyRate } from '@/lib/investment-api'

export default function PlansPage() {
  const { data: catalogue, isLoading } = useSWR(PLANS_KEY, getPlans)
  const plans = catalogue?.plans ?? []
  const sourceNote =
    catalogue?.source === 'live'
      ? 'Rates from live Xano catalogue.'
      : 'Showing illustrative catalogue until an admin session loads live tiers.'

  return (
    <main className="min-h-screen bg-[#f4f8f3] px-5 py-8 text-[#101d1a] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="font-bold text-[#0b4537]">
          Madallion fund
        </Link>
        <div className="mt-20 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Live plan table</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-[-.06em] text-[#0b4537]">
            Choose your pace of growth.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[#60716b]">
            Plan terms and availability are loaded from the investment system, so every page stays in
            sync.
          </p>
        </div>
        {isLoading ? (
          <p className="mt-12 text-sm text-[#60716b]">Loading available plans…</p>
        ) : (
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <article key={plan.id ?? index} className="glass-panel rounded-3xl p-7">
                <p className="text-sm font-semibold text-[#65a85c]">{plan.name}</p>
                <h2 className="mt-8 text-3xl font-semibold text-[#0b4537]">
                  {planDailyRate(plan).toFixed(2)}% daily ROI
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#708079]">
                  {plan.description ?? 'A transparent plan for intentional growth.'}
                </p>
                <dl className="mt-8 space-y-4 border-t border-[#dfe8e2] pt-6 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[#829088]">Duration</dt>
                    <dd className="font-semibold text-[#0b4537]">{plan.duration_days} days</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#829088]">Range</dt>
                    <dd className="font-semibold text-[#0b4537]">
                      {plan.min_amount ? `₦${plan.min_amount.toLocaleString()}` : 'Flexible'}
                      {plan.max_amount ? ` – ₦${plan.max_amount.toLocaleString()}` : ''}
                    </dd>
                  </div>
                </dl>
                <Link
                  href="/register"
                  className="mt-8 block rounded-xl bg-[#0b4537] py-3 text-center text-sm font-semibold text-white"
                >
                  Start with {plan.name}
                </Link>
              </article>
            ))}
          </div>
        )}
        <div className="mt-10">
          <PlanCalculator plans={plans} sourceNote={sourceNote} />
        </div>
        <p className="mt-10 text-xs leading-5 text-[#829088]">
          Returns shown are illustrative targets, not guarantees. Investment involves risk and
          capital may be at risk. {sourceNote}
        </p>
      </div>
    </main>
  )
}
