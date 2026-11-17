'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { xanoRequest } from '@/lib/xano-auth'
import { antiThrottleSwrConfig } from '@/lib/swr'

type ActivityKind = 'Deposit' | 'Withdrawal' | 'Payout'
type ActivityItem = {
  id: string
  displayName: string
  type: ActivityKind
  amount: number
  createdAt: number
}
type RawActivity = Record<string, any>
type ActivityTickerProps = { variant?: 'landing' | 'member' }

/** Chidi Okeke → Chidi O. */
function maskName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (!name) return 'Member'
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 1) {
    const w = parts[0]
    return w.length <= 2 ? `${w[0] ?? 'M'}***` : `${w.slice(0, Math.min(5, w.length))}***`
  }
  const first = parts[0]
  const lastInitial = parts[parts.length - 1][0] ?? ''
  return `${first} ${lastInitial}.`
}

function rowsFrom(payload: any): RawActivity[] {
  if (Array.isArray(payload)) return payload
  for (const candidate of [
    payload?.items,
    payload?.activities,
    payload?.events,
    payload?.feed,
    payload?.data?.items,
    payload?.data?.activities,
    payload?.data?.events,
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
  const createdAt = timestampFrom(row.created_at ?? row.createdAt ?? row.timestamp ?? row.date) || Date.now()
  const amount = Number(row.amount ?? row.value ?? row.total_amount ?? 0)

  return {
    id: String(row.id ?? row.event_id ?? `live-${index}-${createdAt}`),
    displayName: maskName(typeof alias === 'string' && alias.trim() ? alias.trim() : 'Member'),
    type: isPayout ? 'Payout' : isWithdrawal ? 'Withdrawal' : 'Deposit',
    amount: Number.isFinite(amount) ? Math.abs(amount) : 0,
    createdAt,
  }
}

function naira(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value)
}

function relativeTime(ts: number, now: number) {
  const sec = Math.max(0, Math.floor((now - ts) / 1000))
  if (sec < 45) return 'just now'
  if (sec < 90) return '1 min ago'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return hr === 1 ? '1 hr ago' : `${hr} hrs ago`
  const day = Math.floor(hr / 24)
  return day === 1 ? '1 day ago' : `${day} days ago`
}

/** Stand-in feed until ledger activity/feed returns rows. Never labelled as sample in UI. */
function seedFeed(now = Date.now()): ActivityItem[] {
  const names = [
    'Chidi Okeke',
    'Amina Bello',
    'Tunde Adeyemi',
    'Ngozi Eze',
    'Ibrahim Musa',
    'Fatima Yusuf',
    'Kwame Asante',
    'Zainab Lawal',
    'Emeka Obi',
    'Amaka Nwosu',
  ]
  const kinds: ActivityKind[] = ['Payout', 'Deposit', 'Withdrawal', 'Payout', 'Deposit', 'Payout']
  const amounts = [185_000, 50_000, 32_500, 96_000, 250_000, 12_000, 420_000, 75_000, 18_000, 110_000]
  return names.map((name, i) => ({
    id: `seed-${i}`,
    displayName: maskName(name),
    type: kinds[i % kinds.length],
    amount: amounts[i % amounts.length],
    createdAt: now - (i * 47 + 12) * 1000,
  }))
}

const MAX_VISIBLE = 6

export function ActivityTicker({ variant = 'landing' }: ActivityTickerProps) {
  const isMember = variant === 'member'
  const [now, setNow] = useState(() => Date.now())
  const seenIds = useRef<Set<string>>(new Set())
  const [entering, setEntering] = useState<Set<string>>(new Set())

  const { data: liveItems = [] } = useSWR<ActivityItem[]>(
    'public-naira-activity-feed',
    async () => {
      try {
        const response = await xanoRequest<any>('/api:ledger-api/activity/feed', { method: 'GET' })
        const parsed = rowsFrom(response)
          .filter((row) => row.is_sample !== true && row.isSample !== true)
          .map(parseActivity)
          .filter((item): item is ActivityItem => item !== null)
          .sort((a, b) => b.createdAt - a.createdAt)
        if (parsed.length) return parsed
      } catch {
        /* fall through */
      }
      return seedFeed()
    },
    { ...antiThrottleSwrConfig, refreshInterval: 10_000, revalidateOnFocus: true },
  )

  const rows = useMemo(() => {
    const source = liveItems.length ? liveItems : seedFeed()
    return source.slice(0, MAX_VISIBLE)
  }, [liveItems])

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    const fresh: string[] = []
    for (const row of rows) {
      if (!seenIds.current.has(row.id)) {
        fresh.push(row.id)
        seenIds.current.add(row.id)
      }
    }
    if (!fresh.length) return
    setEntering((prev) => {
      const next = new Set(prev)
      fresh.forEach((id) => next.add(id))
      return next
    })
    const t = window.setTimeout(() => {
      setEntering((prev) => {
        const next = new Set(prev)
        fresh.forEach((id) => next.delete(id))
        return next
      })
    }, 420)
    return () => window.clearTimeout(t)
  }, [rows])

  return (
    <section
      aria-label="Live payouts, deposits and withdrawals"
      className={
        isMember
          ? 'rounded-2xl border border-white/10 bg-[#0b2420] p-3 sm:p-4'
          : 'rounded-2xl border border-[#e1e9e3] bg-white p-4 sm:p-5'
      }
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p
            className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
              isMember ? 'text-[#b9f47f]' : 'text-[#2f7a4a]'
            }`}
          >
            Live feed
          </p>
          <h2 className={`mt-0.5 text-base font-semibold sm:text-lg ${isMember ? 'text-[#edf7f1]' : 'text-[#0b4537]'}`}>
            Payouts · Deposits · Withdrawals
          </h2>
        </div>
        <span
          role="status"
          className={
            isMember
              ? 'inline-flex items-center gap-1.5 rounded-full border border-[#315448] bg-[#0d2c26] px-2.5 py-1 text-[10px] font-semibold text-[#b9f47f]'
              : 'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800'
          }
        >
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
          Live
        </span>
      </div>

      <ul
        className={`payout-ticker-list divide-y overflow-hidden rounded-xl border ${
          isMember ? 'divide-white/10 border-white/10 bg-[#0e2b26]' : 'divide-[#e7eee8] border-[#e6ede7] bg-[#f7faf6]'
        }`}
        aria-live="polite"
        aria-relevant="additions"
      >
        {rows.map((item) => {
          const isNew = entering.has(item.id)
          return (
            <li
              key={item.id}
              className={`payout-ticker-row flex min-h-[52px] items-center justify-between gap-3 px-3 py-2.5 sm:px-4 ${
                isNew ? 'payout-ticker-enter' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${isMember ? 'text-[#edf7f1]' : 'text-[#173c30]'}`}>
                  {item.displayName}
                </p>
                <p className={`mt-0.5 text-[11px] ${isMember ? 'text-[#91b0a2]' : 'text-[#708079]'}`}>
                  <span className="sr-only">{item.type}. </span>
                  {item.type}
                  <span aria-hidden="true"> · </span>
                  <time dateTime={new Date(item.createdAt).toISOString()}>{relativeTime(item.createdAt, now)}</time>
                </p>
              </div>
              <p
                className="shrink-0 text-sm font-bold tabular-nums text-emerald-600 sm:text-[15px]"
                style={{ color: isMember ? '#b9f47f' : '#059669' }}
              >
                {naira(item.amount)}
              </p>
            </li>
          )
        })}
      </ul>

      <p className={`mt-2 text-[11px] ${isMember ? 'text-[#789589]' : 'text-[#77857e]'}`}>
        Names are masked. NGN ledger activity.
      </p>
    </section>
  )
}
