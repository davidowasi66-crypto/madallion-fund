'use client'

import useSWR from 'swr'
import { Award, Clock3 } from 'lucide-react'
import { getReferralCreditHistory, REFERRAL_TIERS, referralTier } from '@/lib/referral-program'
import { antiThrottleSwrConfig } from '@/lib/swr'
import { formatTimestamp } from '@/lib/pending-route'
import type { ReferralCreditStatus } from '@/lib/product-feature-contracts'

const money = (value: number, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : 'NGN',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)

const STATUS_STYLE: Record<ReferralCreditStatus, { label: string; tone: string }> = {
  available: { label: 'Available', tone: 'bg-emerald-50 text-emerald-800' },
  pending_hold: { label: 'On hold', tone: 'bg-amber-50 text-amber-800' },
  redeemed: { label: 'Redeemed', tone: 'bg-[#f2f4f1] text-[#60716b]' },
  reversed: { label: 'Reversed', tone: 'bg-red-50 text-red-700' },
}

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
  const { data, error, isLoading } = useSWR('referral-credit-history', getReferralCreditHistory, antiThrottleSwrConfig)
  const rows = data ?? []

  return (
    <section className="mt-4 rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm" aria-labelledby="referral-history-title">
      <h2 id="referral-history-title" className="text-lg font-semibold text-[#0b4537]">Credit history</h2>
      <p className="mt-1 text-xs text-[#708079]">Each commission credit, its hold window, and whether it is ready to use.</p>

      <div className="mt-4 divide-y divide-[#eef2ee]" aria-live="polite">
        {isLoading ? (
          <p className="py-4 text-xs text-[#708079]">Loading credits…</p>
        ) : error ? (
          <p role="alert" className="py-4 text-xs text-red-700">Credit history is temporarily unavailable.</p>
        ) : data === null ? (
          <p className="flex items-start gap-2 py-4 text-xs leading-5 text-[#708079]">
            <Clock3 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            Per-credit history needs the referrals credits route in Xano. Totals above still come from the ledger.
          </p>
        ) : rows.length === 0 ? (
          <p className="py-4 text-xs text-[#708079]">No credits recorded yet. Commission appears after an invite qualifies.</p>
        ) : (
          rows.slice(0, 8).map((credit) => {
            const style = STATUS_STYLE[credit.status]
            return (
              <div key={credit.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#0b4537]">{money(credit.amount, credit.currency)}</p>
                  <p className="mt-0.5 text-[11px] text-[#829088]">
                    {credit.created_at ? formatTimestamp(credit.created_at) : 'Date unavailable'}
                    {credit.status === 'pending_hold' && credit.hold_until
                      ? ` · available ${formatTimestamp(credit.hold_until)}`
                      : ''}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.tone}`}>{style.label}</span>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
