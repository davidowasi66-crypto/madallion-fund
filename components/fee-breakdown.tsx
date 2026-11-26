'use client'

import useSWR from 'swr'
import { ReceiptText } from 'lucide-react'
import type { Investment } from '@/lib/investment-api'
import { getFeePolicy, getInvestmentFeeSummary } from '@/lib/investment-controls-api'
import { antiThrottleSwrConfig } from '@/lib/swr'
import { formatTimestamp, toTimestamp } from '@/lib/pending-route'

const money = (value: number, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : 'NGN',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)

const rate = (bps?: number) =>
  bps == null || bps === 0 ? 'Free' : `${(bps / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}%`

const FEE_ROWS = [
  ['management_fee_bps', 'Management fee'],
  ['withdrawal_fee_bps', 'Withdrawal fee'],
  ['early_exit_fee_bps', 'Early exit penalty'],
  ['deposit_fee_bps', 'Deposit fee'],
  ['rollover_fee_bps', 'Rollover fee'],
] as const

function effectiveLabel(value?: string): string {
  if (!value) return ''
  if (toTimestamp(value)) return `Effective from ${formatTimestamp(value)}`
  return value.toLowerCase() === 'now' ? 'Effective now' : `Effective ${value}`
}

export function FeeBreakdown({ investment }: { investment: Investment }) {
  const investmentId = investment.id
  const { data: policy, isLoading: policyLoading } = useSWR('investment-fee-policy', getFeePolicy, antiThrottleSwrConfig)
  const { data: summary, isLoading: summaryLoading } = useSWR(
    investmentId == null ? null : ['investment-fee-summary', investmentId],
    () => getInvestmentFeeSummary(investmentId!),
    antiThrottleSwrConfig,
  )

  const currency = summary?.currency ?? policy?.currency ?? 'NGN'
  const settlementRows = summary
    ? ([
        ['Early exit penalty', summary.early_exit_fee],
        ['Withdrawal fee', summary.withdrawal_fee],
        ['Management fee', summary.management_fee],
        ['Rollover fee', summary.rollover_fee],
      ].filter(([, value]) => value != null) as Array<[string, number]>)
    : []

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
          </dl>
          {policy.withdrawal_fee_bps != null && (policy.min_withdrawal_fee != null || policy.max_withdrawal_fee != null) && (
            <p className="mt-2 text-[11px] text-[#829088]">
              Withdrawal fee
              {policy.min_withdrawal_fee != null && policy.max_withdrawal_fee != null
                ? ` is between ${money(policy.min_withdrawal_fee, currency)} and ${money(policy.max_withdrawal_fee, currency)}.`
                : policy.min_withdrawal_fee != null
                  ? ` is at least ${money(policy.min_withdrawal_fee, currency)}.`
                  : ` is at most ${money(policy.max_withdrawal_fee as number, currency)}.`}
            </p>
          )}
          {policy.effective_from && <p className="mt-2 text-[11px] text-[#829088]">{effectiveLabel(policy.effective_from)}</p>}
        </>
      ) : (
        <p className="mt-3 rounded-xl bg-[#f4f8f3] px-3 py-2 text-xs leading-5 text-[#60716b]">
          The published fee schedule is not connected yet. Ask operations to enable the fee policy route before
          relying on these figures.
        </p>
      )}

      <div className="mt-3 border-t border-[#eef2ee] pt-3">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#829088]">If settled today</p>
        {summaryLoading ? (
          <p className="mt-2 text-xs text-[#708079]">Calculating settlement fees…</p>
        ) : summary ? (
          <>
            <dl className="mt-2 space-y-2 text-xs">
              {settlementRows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <dt className="text-[#60716b]">{label}</dt>
                  <dd className="font-semibold text-[#0b4537]">{money(value, currency)}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-t border-[#eef2ee] pt-2">
                <dt className="font-semibold text-[#31574b]">Total fees</dt>
                <dd className="font-semibold text-[#0b4537]">{money(summary.total_fees ?? 0, currency)}</dd>
              </div>
              {summary.net_payout != null && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#60716b]">Net payout</dt>
                  <dd className="font-semibold text-[#2f7a4a]">{money(summary.net_payout, currency)}</dd>
                </div>
              )}
            </dl>
            {summary.is_early_exit && (
              <p className="mt-2 text-[11px] leading-4 text-[#a36d2c]">This calculation includes the early-exit penalty.</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-xs text-[#708079]">
            Settlement fees are not available yet.
            {investment.fee_total != null ? ` Ledger total: ${money(Number(investment.fee_total), currency)}.` : ''}
          </p>
        )}
      </div>
    </section>
  )
}
