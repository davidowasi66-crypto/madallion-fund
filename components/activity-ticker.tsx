'use client'

import { useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import useSWR from 'swr'
import { xanoRequest } from '@/lib/xano-auth'

type ActivityKind = 'Deposit' | 'Withdrawal' | 'Payout'
type ActivityItem = {
  id: string
  displayName: string
  type: ActivityKind
  amount: number
  createdAt: number
  sample: boolean
}
type RawActivity = Record<string, any>
type ActivityTickerProps = { variant?: 'landing' | 'member' }

const sampleActivity: ActivityItem[] = [
  { id: 'sample-deposit-1', displayName: 'Sample member A', type: 'Deposit', amount: 250_000, createdAt: Date.now(), sample: true },
  { id: 'sample-payout-1', displayName: 'Sample member B', type: 'Payout', amount: 96_000, createdAt: Date.now(), sample: true },
  { id: 'sample-withdrawal-1', displayName: 'Sample member C', type: 'Withdrawal', amount: 75_000, createdAt: Date.now(), sample: true },
  { id: 'sample-deposit-2', displayName: 'Sample member D', type: 'Deposit', amount: 500_000, createdAt: Date.now(), sample: true },
  { id: 'sample-payout-2', displayName: 'Sample member E', type: 'Payout', amount: 142_500, createdAt: Date.now(), sample: true },
  { id: 'sample-withdrawal-2', displayName: 'Sample member F', type: 'Withdrawal', amount: 120_000, createdAt: Date.now(), sample: true },
]

function rowsFrom(payload: any): RawActivity[] {
  if (Array.isArray(payload)) return payload
  for (const candidate of [payload?.items, payload?.activities, payload?.feed, payload?.data?.items, payload?.data?.activities, payload?.data]) {
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
  return Date.now()
}

function parseActivity(row: RawActivity, index: number): ActivityItem | null {
  const kind = String(row.type ?? row.kind ?? row.event_type ?? row.transaction_type ?? '').toLowerCase().replace(/[_-]+/g, ' ')
  const isPayout = kind.includes('payout') || kind.includes('pay out') || kind.includes('maturity')
  const isWithdrawal = kind.includes('withdraw') || kind.includes('cash out') || kind.includes('cashout')
  const isDeposit = kind.includes('deposit')
  if (!isPayout && !isWithdrawal && !isDeposit) return null

  const rawCurrency = String(row.currency ?? row.currency_code ?? row.amount_currency ?? 'NGN').trim().toUpperCase()
  if (!['NGN', '₦', 'NAIRA', 'NIGERIAN NAIRA'].includes(rawCurrency)) return null

  const alias = row.display_name ?? row.displayName ?? row.alias ?? row.public_name
  const createdAt = timestampFrom(row.created_at ?? row.createdAt ?? row.timestamp ?? row.date)
  const amount = Number(row.amount ?? row.value ?? row.total_amount ?? 0)
  return {
    id: String(row.id ?? row.event_id ?? `live-${index}-${createdAt}`),
    displayName: typeof alias === 'string' && alias.trim() ? alias.trim() : 'Anonymous member',
    type: isPayout ? 'Payout' : isWithdrawal ? 'Withdrawal' : 'Deposit',
    amount: Number.isFinite(amount) ? Math.abs(amount) : 0,
    createdAt,
    sample: false,
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
      return rowsFrom(response).map(parseActivity).filter((item): item is ActivityItem => item !== null)
    },
    { refreshInterval: 60_000, revalidateOnFocus: true },
  )
  const activity = useMemo(() => liveItems.length ? liveItems : sampleActivity, [liveItems])
  const loopCount = activity.length > 1 ? 2 : 1
  const status = error
    ? liveItems.length ? 'Last live update · refresh unavailable' : 'Sample activity · live feed unavailable'
    : isLoading
      ? 'Sample activity · connecting to live feed'
      : liveItems.length
        ? 'Live activity · NGN'
        : 'Sample activity · waiting for live entries'
  const surfaceClass = isMember
    ? 'rounded-2xl border border-white/10 bg-[#0b2420] p-4 sm:p-5'
    : 'border-y border-[#e1e9e3] bg-white py-6'
  const contentClass = isMember ? '' : 'mx-auto max-w-7xl px-5 lg:px-8'
  const titleClass = isMember ? 'text-base font-semibold text-[#edf7f1] sm:text-lg' : 'text-xl font-semibold text-[#0b4537]'
  const statusClass = isMember
    ? 'rounded-full border border-[#315448] bg-[#0d2c26] px-3 py-1 text-[11px] font-semibold text-[#b9f47f]'
    : 'rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800'

  return (
    <section aria-label="Recent deposits, withdrawals and payouts" className={surfaceClass}>
      <div className={contentClass}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-[.18em] ${isMember ? 'text-[#b9f47f]' : 'text-[#65a85c]'}`}>Account activity</p>
            <h2 className={`mt-1 ${titleClass}`}>Deposits, withdrawals and payouts</h2>
          </div>
          <span role="status" className={statusClass}>{status}</span>
        </div>
        <div
          role="region"
          aria-label="Sliding Nigerian naira activity ticker. Focus this area to pause."
          tabIndex={0}
          className={`activity-window overflow-hidden rounded-xl border px-0 py-2 ${isMember ? 'border-white/10 bg-[#0e2b26]' : 'border-[#e6ede7] bg-[#f7faf6]'}`}
        >
          <div className={`activity-track flex w-max ${activity.length <= 1 ? 'activity-static' : ''}`} aria-live="off">
            {Array.from({ length: loopCount }, (_, group) => (
              <div key={group} aria-hidden={group === 1} className="flex shrink-0 gap-3 px-3">
                {activity.map((item) => {
                  const isOutgoing = item.type === 'Withdrawal'
                  return (
                    <article
                      key={`${item.id}-${group}`}
                      className={`flex min-w-[250px] max-w-[320px] items-center gap-3 rounded-xl border px-3 py-2.5 sm:min-w-[275px] ${isMember ? 'border-white/10 bg-[#0b2420]' : 'border-[#e6ede7] bg-white'}`}
                    >
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${isOutgoing ? 'bg-rose-400/10 text-rose-200' : 'bg-emerald-400/10 text-emerald-300'}`} aria-hidden="true">
                        {isOutgoing ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-semibold ${isMember ? 'text-[#edf7f1]' : 'text-[#173c30]'}`}>{item.displayName}</span>
                        <span className={`block text-xs ${isMember ? 'text-[#91b0a2]' : 'text-[#708079]'}`}>
                          {item.sample ? `${item.type} · Example activity` : `${item.type} · ${new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                      </span>
                      <span className={`whitespace-nowrap text-sm font-bold ${isMember ? 'text-[#b9f47f]' : 'text-[#0b4537]'}`}>{naira(item.amount)}</span>
                    </article>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <p className={`mt-2 text-[11px] ${isMember ? 'text-[#789589]' : 'text-[#77857e]'}`}>
          {liveItems.length > 0
            ? 'Live feed shows approved aliases and Nigerian naira values only.'
            : 'Sample entries are illustrative, not real transactions, and will be replaced when live Naira activity is available.'}
        </p>
      </div>
    </section>
  )
}
