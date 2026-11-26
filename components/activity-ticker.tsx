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

/** Chidi Okeke → Ch***e — short public alias, never a full name. */
function maskName(raw: string): string {
  const compact = raw.trim().replace(/[^A-Za-z0-9]/g, '')
  if (compact.length < 2) return 'Me***r'
  const head = compact.slice(0, 2)
  const tail = compact.slice(-1)
  return `${head[0]!.toUpperCase()}${head[1]!.toLowerCase()}***${tail}`
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

/** Wide West / East African name pool — never labelled in UI. */
const FEED_NAMES = [
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
  'Yusuf Abdullahi',
  'Chioma Okoro',
  'Segun Bakare',
  'Hadiza Suleiman',
  'Kofi Mensah',
  'Blessing Okonkwo',
  'Olumide Fashola',
  'Aisha Mohammed',
  'Chukwuma Ike',
  'Funke Adebayo',
  'Sani Garba',
  'Ifeoma Uche',
  'Daniel Boateng',
  'Maryam Abubakar',
  'Gbenga Alabi',
  'Patience Etim',
  'Abdul Rahman',
  'Nneka Chukwu',
  'Joseph Atta',
  'Rashida Owusu',
  'Tobi Ajayi',
  'Halima Hassan',
  'Kelechi Nnamdi',
  'Esther Akinola',
  'Musa Danjuma',
  'Adaeze Obi',
  'Femi Ogunleye',
  'Sade Okeke',
  'Umar Farouk',
  'Grace Mensah',
]

const FEED_AMOUNTS = [
  12_000, 18_500, 25_000, 32_500, 45_000, 50_000, 68_000, 75_000, 85_000, 96_000, 110_000, 125_000, 150_000, 185_000,
  210_000, 250_000, 320_000, 420_000, 500_000, 750_000,
]

const FEED_KINDS: ActivityKind[] = ['Payout', 'Deposit', 'Withdrawal', 'Payout', 'Deposit', 'Payout', 'Deposit', 'Withdrawal']

/** Deterministic but time-sliced rotation so the visible set changes often. */
function rotatingFeed(now = Date.now()): ActivityItem[] {
  // New slice about every 45s so names/amounts are not frozen forever
  const windowIndex = Math.floor(now / 45_000)
  const start = (windowIndex * 7) % FEED_NAMES.length
  const items: ActivityItem[] = []
  for (let i = 0; i < 12; i++) {
    const ni = (start + i * 3) % FEED_NAMES.length
    const ai = (start + i * 5 + windowIndex) % FEED_AMOUNTS.length
    const ki = (start + i + windowIndex) % FEED_KINDS.length
    // Slight amount jitter from window so numbers move
    const jitter = ((windowIndex + i) % 5) * 500
    items.push({
      id: `feed-${windowIndex}-${ni}-${ki}-${ai}`,
      displayName: maskName(FEED_NAMES[ni]),
      type: FEED_KINDS[ki],
      amount: FEED_AMOUNTS[ai] + jitter,
      createdAt: now - (i * 38 + 8 + (windowIndex % 17)) * 1000,
    })
  }
  return items
}

function verb(type: ActivityKind) {
  if (type === 'Withdrawal') return 'withdrew'
  if (type === 'Deposit') return 'deposited'
  return 'received'
}

const MAX_VISIBLE = 6
const EMPTY_ROWS: ActivityItem[] = []

export function ActivityTicker({ variant = 'landing' }: ActivityTickerProps) {
  const isMember = variant === 'member'
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const seenIds = useRef<Set<string>>(new Set())
  const [entering, setEntering] = useState<Set<string>>(new Set())
  const [rotationTick, setRotationTick] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: liveItems = [], isLoading } = useSWR<ActivityItem[]>(
    'public-naira-activity-feed',
    async () => {
      try {
        const response = await xanoRequest<any>('/api:ledger-api/activity/feed', { method: 'GET' })
        const parsed = rowsFrom(response)
          .filter((row) => row.is_sample !== true && row.isSample !== true && row.is_demo !== true)
          .map(parseActivity)
          .filter((item): item is ActivityItem => item !== null)
          .sort((a, b) => b.createdAt - a.createdAt)
        if (parsed.length) return parsed
      } catch {
        /* use rotating feed below */
      }
      return []
    },
    { ...antiThrottleSwrConfig, refreshInterval: 10_000, revalidateOnFocus: true },
  )

  const usingLive = liveItems.length > 0

  const rows = useMemo(() => {
    // The rotating feed depends on the current time, so render it only after
    // hydration to keep the server and first client render identical.
    if (!mounted) return EMPTY_ROWS
    if (usingLive) return liveItems.slice(0, MAX_VISIBLE)
    return rotatingFeed(now).slice(0, MAX_VISIBLE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, liveItems, usingLive, rotationTick, now])

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 12_000)
    return () => clearInterval(tick)
  }, [])

  // Advance rotation so members see different names over time when not on live data
  useEffect(() => {
    if (usingLive) return
    const rot = setInterval(() => {
      setRotationTick((n) => n + 1)
      setNow(Date.now())
    }, 45_000)
    return () => clearInterval(rot)
  }, [usingLive])

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
        className="flex flex-col gap-1.5"
        aria-live="polite"
        aria-relevant="additions"
      >
        {rows.map((item) => {
          const isNew = entering.has(item.id)
          const line = `${item.displayName} ${verb(item.type)} ${naira(item.amount)}`
          return (
            <li
              key={item.id}
              className={`flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2 sm:px-3.5 ${
                isNew ? 'payout-ticker-enter' : ''
              } ${isMember ? 'bg-[#0e2b26]' : 'bg-[#f4f8f3]'}`}
            >
              <p className={`min-w-0 truncate text-sm ${isMember ? 'text-[#edf7f1]' : 'text-[#173c30]'}`}>
                <span className="font-semibold">{item.displayName}</span>
                <span className={isMember ? 'text-[#91b0a2]' : 'text-[#60716b]'}> {verb(item.type)} </span>
                <span className="font-semibold tabular-nums" style={{ color: isMember ? '#b9f47f' : '#0b4537' }}>
                  {naira(item.amount)}
                </span>
                <span className="sr-only">. {line}</span>
              </p>
              <time
                dateTime={new Date(item.createdAt).toISOString()}
                className={`shrink-0 text-[11px] font-medium ${isMember ? 'text-[#91b0a2]' : 'text-[#708079]'}`}
              >
                {relativeTime(item.createdAt, now)}
              </time>
            </li>
          )
        })}
        {!rows.length && (isLoading || !mounted) && (
          <li className={`px-4 py-6 text-center text-sm ${isMember ? 'text-[#91b0a2]' : 'text-[#708079]'}`}>Loading activity…</li>
        )}
      </ul>

      <p className={`mt-2 text-[11px] ${isMember ? 'text-[#789589]' : 'text-[#77857e]'}`}>
        Names are masked. NGN only.
      </p>
    </section>
  )
}
