'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { PlanCard } from '@/components/plan-card'
import { PlanCalculator } from '@/components/investment-widgets'
import { getPlans, PLANS_KEY } from '@/lib/investment-api'

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
            Plan terms and availability are loaded from the investment system, so every page stays in sync. Any usage limits attach to an investment plan; they are not separate membership subscriptions.
          </p>
        </div>
        {isLoading ? (
          <p className="mt-12 text-sm text-[#60716b]">Loading available plans…</p>
        ) : (
          <div id="catalogue" className="mt-12 grid gap-5 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <PlanCard key={plan.id ?? index} plan={plan} />
            ))}
          </div>
        )}
        <div className="mt-10">
          <PlanCalculator plans={plans} sourceNote={sourceNote} />
        </div>
        <p className="mt-10 text-xs leading-5 text-[#829088]">
          Returns shown are illustrative targets, not guarantees. Investment involves risk and capital may be at risk.{' '}
          {sourceNote}
        </p>
      </div>
    </main>
  )
}
