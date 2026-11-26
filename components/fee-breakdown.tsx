'use client'

import useSWR from 'swr'
import { ReceiptText } from 'lucide-react'
import type { Investment } from '@/lib/investment-api'
import { getFeePolicy, getInvestmentFees } from '@/lib/investment-controls-api'
import { antiThrottleSwrConfig } from '@/lib/swr'
import { formatTimestamp } from '@/lib/pending-route'

const money = (value: number, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : 'NGN',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)

const rate = (bps?: number) =>
  bps == null ? '—' : `${(bps / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}%`

const FEE_ROWS = [
  ['management_fee_bps', 'Management fee'],
  ['performance_fee_bps', 'Performance fee'],
  ['withdrawal_fee_bps', 'Withdrawal fee'],
  ['early_exit_fee_bps', 'Early exit fee'],
  ['referral_commission_bps', 'Referral commission'],
] as const

export function FeeBreakdown({ investment }: { investment: Investment }) {
  const investmentId = investment.id
  const { data: policy, isLoading: policyLoading } = useSWR('investment-fee-policy', getFeePolicy, antiThrottleSwrConfig)
  const { data: entries, isLoading: entriesLoading } = useSWR(
    investmentId == null ? null : ['investment-fees', investmentId],
    () => getInvestmentFees(investmentId!),
    antiThrottleSwrConfig,
  )

  const recorded = entries ?? []
  const recordedTotal = recorded.reduce((sum, entry) => sum + entry.amount, 0)
  const currency = policy?.currency ?? 'NGN'

  return (
    <section className="rounded-2xl border border-[#dfe8e2] bg-white p-4" aria-labelledby={`fees-${investmentId ?? 'new'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#65a85c]">Fee transparency</p>
          <h3 id={`fees-${investmentId ?? 'new'}`} className="mt-1 text-sm font-semibold text-[#0b4537]">
            What this investment charges
          </h3>
        </div>
        <ReceiptText size={18} className="shrink-0 text-[#65a85c]" aria-hidden="true" />
      </div>

      {policyLoading ? (
        <p className="mt-3 text-xs text-[#708079]">Loading the published fee schedule…</p>
      ) : policy ? (
        <>
          <dl className="mt-3 divide-y divide-[#eef2ee] text-xs">
            {FEE_ROWS.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-3 py-2">
                <dt className="text-[#60716b]">{label}</dt>
                <dd className="font-semibold text-[#0b4537]">{rate(policy[key])}</dd>
              </div>
            ))}
            {policy.performance_hurdle_bps != null && (
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="text-[#60716b]">Performance hurdle</dt>
                <dd className="font-semibold text-[#0b4537]">{rate(policy.performance_hurdle_bps)}</dd>
              </div>
            )}
          </dl>
          {policy.effective_from && (
            <p className="mt-2 text-[11px] text-[#829088]">Effective from {formatTimestamp(policy.effective_from)}</p>
          )}
        </>
      ) : (
        <p className="mt-3 rounded-xl bg-[#f4f8f3] px-3 py-2 text-xs leading-5 text-[#60716b]">
          The published fee schedule is not connected yet. Ask operations to enable the fee policy route before
          relying on these figures.
        </p>
      )}

      <div className="mt-3 border-t border-[#eef2ee] pt-3">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#829088]">Fees already posted</p>
        {entriesLoading ? (
          <p className="mt-2 text-xs text-[#708079]">Checking posted fees…</p>
        ) : recorded.length ? (
          <>
            <ul className="mt-2 space-y-2 text-xs">
              {recorded.slice(0, 4).map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3">
                  <span className="capitalize text-[#60716b]">{entry.fee_type.replace(/[_-]+/g, ' ')}</span>
                  <span className="font-semibold text-[#0b4537]">{money(entry.amount, entry.currency)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs font-semibold text-[#0b4537]">Total posted: {money(recordedTotal, currency)}</p>
          </>
        ) : (
          <p className="mt-2 text-xs text-[#708079]">
            No fees have been posted to this investment yet.
            {investment.fee_total != null ? ` Ledger total: ${money(Number(investment.fee_total), currency)}.` : ''}
          </p>
        )}
      </div>
    </section>
  )
}
