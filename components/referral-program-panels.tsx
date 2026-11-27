'use client'

import useSWR from 'swr'
import { Award, Clock3, Wallet } from 'lucide-react'
import { getReferralCredits } from '@/lib/member-routes'
import { REFERRAL_TIERS, referralTier } from '@/lib/referral-program'
import { antiThrottleSwrConfig } from '@/lib/swr'

const money = (value: number, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : 'NGN',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)

export function ReferralTierProgress({ qualified }: { qualified: number | null }) {
  const hasCount = qualified != null && Number.isFinite(Number(qualified))
  const tier = referralTier(qualified ?? 0)

  return (
    <section className="mt-4 rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm" aria-labelledby="referral-tier-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#65a85c]">Milestone progress</p>
          <h2 id="referral-tier-title" className="mt-1 text-lg font-semibold text-[#0b4537]">
            {hasCount ? `${tier.current.name} milestone` : 'Milestone rewards'}
          </h2>
        </div>
        <Award size={18} className="shrink-0 text-[#65a85c]" aria-hidden="true" />
      </div>

      {hasCount ? (
        <>
          <p className="mt-1 text-xs text-[#708079]">
            {tier.count} qualified {tier.count === 1 ? 'referral' : 'referrals'} · {tier.current.perk}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef2ee]" role="presentation">
            <div className="h-full rounded-full bg-gradient-to-r from-[#8fe35c] to-[#0b4537] transition-all" style={{ width: `${tier.progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-[#60716b]">
            {tier.next
              ? `${tier.toNext} more qualified ${tier.toNext === 1 ? 'referral' : 'referrals'} to reach ${tier.next.name} — ${tier.next.perk.toLowerCase()}.`
              : 'You have reached the top milestone.'}
          </p>
          <ol className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
            {REFERRAL_TIERS.map((step) => (
              <li
                key={step.level}
                className={`rounded-full px-2.5 py-1 font-semibold ${step.level <= tier.current.level ? 'bg-[#eef7eb] text-[#0b4537]' : 'bg-[#f4f8f3] text-[#829088]'}`}
              >
                {step.name} · {step.minQualified}+
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="mt-2 text-xs leading-5 text-[#708079]">
          Tier progress appears once the referral ledger reports your qualified invites. Tiers start at{' '}
          {REFERRAL_TIERS[1].minQualified} qualified referrals.
        </p>
      )}
    </section>
  )
}

export function ReferralCreditsHistory() {
  const { data, error, isLoading } = useSWR('referral-credit-summary', getReferralCredits, antiThrottleSwrConfig)

  const qualifiedCount = Number(data?.qualified)
  const capProgress =
    data && data.cap > 0 ? Math.min(100, Math.round((data.lifetime / data.cap) * 100)) : null

  return (
    <section className="mt-4 rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm" aria-labelledby="referral-history-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="referral-history-title" className="text-lg font-semibold text-[#0b4537]">Credit summary</h2>
          <p className="mt-1 text-xs leading-5 text-[#708079]">Commission available now, on hold, and earned over the life of your account. Credit is earned when an invited member opens an account and makes a deposit or subscribes to a plan.</p>
        </div>
        <Wallet size={18} className="shrink-0 text-[#65a85c]" aria-hidden="true" />
      </div>

      <div className="mt-4" aria-live="polite">
        {isLoading ? (
          <p className="py-4 text-xs text-[#708079]">Loading referral credits…</p>
        ) : error ? (
          <p role="alert" className="py-4 text-xs text-red-700">Referral credits are temporarily unavailable.</p>
        ) : data == null ? (
          <p className="flex items-start gap-2 py-4 text-xs leading-5 text-[#708079]">
            <Clock3 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            Credit totals are not available yet. Your referral code above still works.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f4f8f3] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#829088]">Available</p>
                <p className="mt-1 text-lg font-semibold text-[#0b4537]">{money(data.available, data.currency)}</p>
                {data.pending_hold > 0 && (
                  <p className="mt-1 text-[11px] text-[#a36d2c]">{money(data.pending_hold, data.currency)} on hold</p>
                )}
              </div>
              <div className="rounded-2xl bg-[#f4f8f3] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#829088]">Lifetime earned</p>
                <p className="mt-1 text-lg font-semibold text-[#0b4537]">{money(data.lifetime, data.currency)}</p>
                {data.cap > 0 && <p className="mt-1 text-[11px] text-[#829088]">Cap {money(data.cap, data.currency)}</p>}
              </div>
              <div className="rounded-2xl bg-[#f4f8f3] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#829088]">Referrals</p>
                <p className="mt-1 text-lg font-semibold text-[#0b4537]">{data.referrals ?? '—'}</p>
                <p className="mt-1 text-[11px] text-[#829088]">
                  {Number.isFinite(qualifiedCount) ? `${qualifiedCount} qualified` : 'Qualification pending'}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f4f8f3] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#829088]">Hold policy</p>
                <p className="mt-1 text-sm font-semibold text-[#0b4537]">
                  {data.pending_hold > 0 ? 'Some credit is still on hold' : 'No credit on hold'}
                </p>
                <p className="mt-1 text-[11px] text-[#829088]">
                  Commission becomes available after the invited member opens an account and makes a deposit or subscribes to a plan.
                </p>
              </div>
            </div>

            {capProgress != null && (
              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-[#eef2ee]" role="presentation">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#8fe35c] to-[#0b4537]" style={{ width: `${capProgress}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-[#829088]">{capProgress}% of the lifetime commission cap used.</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
