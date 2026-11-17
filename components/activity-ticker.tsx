'use client'

import { useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight, Banknote } from 'lucide-react'
import useSWR from 'swr'
import { xanoRequest } from '@/lib/xano-auth'
import { antiThrottleSwrConfig } from '@/lib/swr'

type ActivityKind = 'Deposit' | 'Withdrawal' | 'Payout'
type ActivityItem = {
  id: string
  displayName: string
  type: ActivityKind
  planName?: string
  amount: number
  createdAt: number
  bankHint: string
}
type RawActivity = Record<string, any>
type ActivityTickerProps = { variant?: 'landing' | 'member' }

/** Mask given name: Chioma → Chi***a, Adebayo → Ade***o */
function maskName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (!name) return 'Member ••••'
  const parts = name.split(' ')
  const first = parts[0]
  if (first.length <= 3) return `${first[0] ?? 'M'}***`
  return `${first.slice(0, 3)}***${first.slice(-1)}`
}

/** Mask an actual bank account identifier, if the ledger includes one. */
function maskAccountTail(value: unknown): string | null {
  if (value == null) return null
  const digits = String(value).replace(/\D/g, '')
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : null
}

function rowsFrom(payload: any): RawActivity[] {
  if (Array.isArray(payload)) return payload
  for (const candidate of [
    payload?.items,
    payload?.activities,
    payload?.feed,
    payload?.data?.items,
    payload?.data?.activities,
    payload?.data,
  ]) {
    if (Array.isArray(candidate)) return candidate
  }
  return []
}

function timestampFrom(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value < 1e12 ? value * 1000 : value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const numeric = Number(trimmed)
    if (trimmed && Number.isFinite(numeric)) return numeric < 1e12 ? numeric * 1000 : numeric
    const parsed = Date.parse(trimmed)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function parseActivity(row: RawActivity, index: number): ActivityItem | null {
  const kind = String(row.type ?? row.kind ?? row.event_type ?? row.transaction_type ?? '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
  const isPayout = kind.includes('payout') || kind.includes('pay out') || kind.includes('maturity')
  const isWithdrawal = kind.includes('withdraw') || kind.includes('cash out') || kind.includes('cashout')
  const isDeposit = kind.includes('deposit')
  if (!isPayout && !isWithdrawal && !isDeposit) return null

  const rawCurrency = String(row.currency ?? row.currency_code ?? row.amount_currency ?? 'NGN')
    .trim()
    .toUpperCase()
  if (!['NGN', '₦', 'NAIRA', 'NIGERIAN NAIRA'].includes(rawCurrency)) return null

  const alias = row.display_name ?? row.displayName ?? row.alias ?? row.public_name ?? row.name
  const createdAt = timestampFrom(row.created_at ?? row.createdAt ?? row.timestamp ?? row.date)
  const amount = Number(row.amount ?? row.value ?? row.total_amount ?? 0)
  const bank = row.bank_name ?? row.bank ?? row.provider
  const accountTail = maskAccountTail(row.account_last4 ?? row.account_mask ?? row.account_number)
  const bankHint = [bank ? String(bank).slice(0, 24) : null, accountTail].filter(Boolean).join(' · ')

  return {
    id: String(row.id ?? row.event_id ?? `live-${index}-${createdAt}`),
    displayName: maskName(typeof alias === 'string' && alias.trim() ? alias.trim() : 'Member'),
    type: isPayout ? 'Payout' : isWithdrawal ? 'Withdrawal' : 'Deposit',
    planName: typeof (row.plan_name ?? row.plan) === 'string' ? String(row.plan_name ?? row.plan).trim() : undefined,
    amount: Number.isFinite(amount) ? Math.abs(amount) : 0,
    createdAt,
    bankHint: bankHint || 'Verified ledger activity',
  }
}

function naira(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value)
}

export function ActivityTicker({ variant = 'landing' }: ActivityTickerProps) {
  const isMember = variant === 'member'
  const { data: liveItems = [], error, isLoading } = useSWR<ActivityItem[]>(
    'public-naira-activity-feed',
    async () => {
      const response = await xanoRequest<any>('/api:ledger-api/activity/feed', { method: 'GET' })
      return rowsFrom(response)
        .map(parseActivity)
        .filter((item): item is ActivityItem => item !== null)
        .sort((left, right) => right.createdAt - left.createdAt)
    },
    { ...antiThrottleSwrConfig, refreshInterval: 60_000, revalidateOnFocus: false },
  )

  const activity = useMemo(() => liveItems, [liveItems])
  const loopCount = activity.length > 1 ? 2 : 1

  const status = error
    ? 'Feed unavailable'
    : isLoading
      ? 'Connecting…'
      : liveItems.length
        ? 'Ledger activity'
        : 'No recent activity'

  const surfaceClass = isMember
    ? 'rounded-2xl border border-white/10 bg-[#0b2420] p-3 sm:p-4'
    : 'border-y border-[#e1e9e3] bg-white py-5'
  const contentClass = isMember ? '' : 'mx-auto max-w-7xl px-5 lg:px-8'
  const titleClass = isMember
    ? 'text-sm font-semibold text-[#edf7f1] sm:text-base'
    : 'text-lg font-semibold text-[#0b4537]'
  const statusClass = isMember
    ? 'rounded-full border border-[#315448] bg-[#0d2c26] px-2.5 py-0.5 text-[10px] font-semibold text-[#b9f47f]'
    : 'rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800'

  return (
    <section aria-label="Recent deposits, withdrawals and payouts" className={surfaceClass}>
      <div className={contentClass}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p
              className={`text-[10px] font-bold uppercase tracking-[.18em] ${
                isMember ? 'text-[#b9f47f]' : 'text-[#65a85c]'
              }`}
            >
              Live feed
            </p>
            <h2 className={`mt-0.5 ${titleClass}`}>Deposits · Withdrawals · Payouts</h2>
          </div>
          <span role="status" className={statusClass}>
            {status}
          </span>
        </div>

        <div
          role="region"
          aria-label="Recent ledger activity. Investor names are masked."
          className={`activity-window overflow-hidden rounded-2xl border ${isMember ? 'border-white/10 bg-[#0e2b26]' : 'border-[#e6ede7] bg-[#f7faf6]'}`}
        >
          {activity.length ? (
            <div
              className={`activity-track flex w-max ${activity.length <= 1 ? 'activity-static' : ''}`}
              aria-live="off"
            >
              {Array.from({ length: loopCount }, (_, group) => (
                <div key={group} aria-hidden={group === 1} className="flex shrink-0 gap-3 px-3 py-2.5">
                  {activity.map((item) => {
                  const isOut = item.type === 'Withdrawal'
                  const isPayout = item.type === 'Payout'
                  return (
                    <article
                      key={`${item.id}-${group}`}
                      className={`flex min-w-[260px] max-w-[300px] items-center gap-3 rounded-xl border px-3 py-2.5 sm:min-w-[280px] ${
                        isMember ? 'border-white/10 bg-[#0b2420]' : 'border-[#e6ede7] bg-white'
                      }`}
                    >
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                          isOut
                            ? 'bg-rose-400/15 text-rose-300'
                            : isPayout
                              ? 'bg-sky-400/15 text-sky-300'
                              : 'bg-emerald-400/15 text-emerald-300'
                        }`}
                        aria-hidden="true"
                      >
                        {isOut ? (
                          <ArrowUpRight size={16} />
                        ) : isPayout ? (
                          <Banknote size={16} />
                        ) : (
                          <ArrowDownLeft size={16} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm font-semibold ${
                            isMember ? 'text-[#edf7f1]' : 'text-[#173c30]'
                          }`}
                        >
                          {item.displayName}
                        </span>
                        <span className={`block truncate text-[11px] ${isMember ? 'text-[#91b0a2]' : 'text-[#708079]'}`}>
                          {item.type}{item.planName ? ` · ${item.planName} plan` : ''} · {item.bankHint}
                        </span>
                      </span>
                      <span
                        className={`whitespace-nowrap text-sm font-bold ${
                          isMember ? 'text-[#b9f47f]' : 'text-[#0b4537]'
                        }`}
                      >
                        {naira(item.amount)}
                      </span>
                    </article>
                  )
                })}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-20 items-center justify-center px-4 py-6 text-center">
              <p className={`text-sm ${isMember ? 'text-[#91b0a2]' : 'text-[#708079]'}`}>
                {error ? 'Ledger activity is temporarily unavailable.' : isLoading ? 'Connecting to the ledger…' : 'Confirmed activity will appear here.'}
              </p>
            </div>
          )}
        </div>

        <p className={`mt-2 text-[11px] ${isMember ? 'text-[#789589]' : 'text-[#77857e]'}`}>
          Names and account numbers are masked where provided. Only ledger activity is shown.
        </p>
      </div>
    </section>
  )
}
