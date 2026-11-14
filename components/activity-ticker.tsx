'use client'

import { useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight, Banknote } from 'lucide-react'
import useSWR from 'swr'
import { xanoRequest } from '@/lib/xano-auth'

type ActivityKind = 'Deposit' | 'Withdrawal' | 'Payout'
type ActivityItem = {
  id: string
  displayName: string
  type: ActivityKind
  amount: number
  createdAt: number
  bankHint: string
  sample: boolean
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

/** Mask Nigerian account-style tail: ****4521 */
function maskAccountTail(seed: string | number): string {
  const digits = String(seed).replace(/\D/g, '') || '0000'
  return `****${digits.slice(-4).padStart(4, '0')}`
}

const ngBanks = ['GTBank', 'Access', 'Zenith', 'UBA', 'FirstBank', 'Opay', 'PalmPay', 'Kuda', 'Moniepoint'] as const

const sampleActivity: ActivityItem[] = [
  { id: 's1', displayName: maskName('Chioma'), type: 'Deposit', amount: 250_000, createdAt: Date.now() - 120_000, bankHint: `GTBank ${maskAccountTail(4521)}`, sample: true },
  { id: 's2', displayName: maskName('Adebayo'), type: 'Payout', amount: 96_000, createdAt: Date.now() - 300_000, bankHint: `Access ${maskAccountTail(8832)}`, sample: true },
  { id: 's3', displayName: maskName('Ngozi'), type: 'Withdrawal', amount: 75_000, createdAt: Date.now() - 480_000, bankHint: `Opay ${maskAccountTail(1109)}`, sample: true },
  { id: 's4', displayName: maskName('Kwame'), type: 'Deposit', amount: 500_000, createdAt: Date.now() - 600_000, bankHint: `Zenith ${maskAccountTail(7740)}`, sample: true },
  { id: 's5', displayName: maskName('Fatima'), type: 'Payout', amount: 142_500, createdAt: Date.now() - 900_000, bankHint: `UBA ${maskAccountTail(3301)}`, sample: true },
  { id: 's6', displayName: maskName('Ibrahim'), type: 'Withdrawal', amount: 120_000, createdAt: Date.now() - 1_100_000, bankHint: `PalmPay ${maskAccountTail(6622)}`, sample: true },
  { id: 's7', displayName: maskName('Amaka'), type: 'Deposit', amount: 85_000, createdAt: Date.now() - 1_400_000, bankHint: `Kuda ${maskAccountTail(9188)}`, sample: true },
  { id: 's8', displayName: maskName('Tunde'), type: 'Payout', amount: 210_000, createdAt: Date.now() - 1_700_000, bankHint: `Moniepoint ${maskAccountTail(5544)}`, sample: true },
  { id: 's9', displayName: maskName('Zainab'), type: 'Withdrawal', amount: 45_000, createdAt: Date.now() - 2_000_000, bankHint: `FirstBank ${maskAccountTail(2210)}`, sample: true },
  { id: 's10', displayName: maskName('Emeka'), type: 'Deposit', amount: 1_000_000, createdAt: Date.now() - 2_400_000, bankHint: `GTBank ${maskAccountTail(7099)}`, sample: true },
  { id: 's11', displayName: maskName('Aisha'), type: 'Payout', amount: 58_000, createdAt: Date.now() - 2_800_000, bankHint: `Access ${maskAccountTail(4412)}`, sample: true },
  { id: 's12', displayName: maskName('Olumide'), type: 'Withdrawal', amount: 320_000, createdAt: Date.now() - 3_200_000, bankHint: `Zenith ${maskAccountTail(8801)}`, sample: true },
]

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
  return Date.now()
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
  const bank =
    row.bank_name ?? row.bank ?? row.provider ?? ngBanks[index % ngBanks.length]
  const accountSeed = row.account_last4 ?? row.account_mask ?? row.id ?? index

  return {
    id: String(row.id ?? row.event_id ?? `live-${index}-${createdAt}`),
    displayName: maskName(typeof alias === 'string' && alias.trim() ? alias.trim() : 'Member'),
    type: isPayout ? 'Payout' : isWithdrawal ? 'Withdrawal' : 'Deposit',
    amount: Number.isFinite(amount) ? Math.abs(amount) : 0,
    createdAt,
    bankHint: `${String(bank).slice(0, 12)} ${maskAccountTail(accountSeed)}`,
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
      return rowsFrom(response)
        .map(parseActivity)
        .filter((item): item is ActivityItem => item !== null)
    },
    { refreshInterval: 60_000, revalidateOnFocus: true },
  )

  const activity = useMemo(() => (liveItems.length ? liveItems : sampleActivity), [liveItems])
  const loopCount = activity.length > 1 ? 2 : 1

  const status = error
    ? liveItems.length
      ? 'Last live update'
      : 'Sample · live feed offline'
    : isLoading
      ? 'Connecting…'
      : liveItems.length
        ? 'Live · NGN'
        : 'Sample activity'

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
          aria-label="Scrolling Nigerian naira activity. Names and accounts are masked."
          className={`activity-window overflow-hidden rounded-xl border ${isMember ? 'border-white/10 bg-[#0e2b26]' : 'border-[#e6ede7] bg-[#f7faf6]'}`}
        >
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
                          {item.type} · {item.bankHint}
                          {item.sample ? ' · Example' : ''}
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
        </div>

        <p className={`mt-2 text-[11px] ${isMember ? 'text-[#789589]' : 'text-[#77857e]'}`}>
          Names and account numbers are masked. NGN only.
          {liveItems.length === 0 ? ' Sample entries until live feed is available.' : ''}
        </p>
      </div>
    </section>
  )
}
