'use client'

import { useEffect, useMemo, useState } from 'react'
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
type ActivityTickerProps = { variant?: 'landing' | 'member' | 'header' | 'memberHeader' }

const MAX_LIVE = 12
const MIN_MARQUEE_ITEMS = 12
const MIN_DEPOSIT = 5_000
const MIN_WITHDRAWAL = 3_000

function meetsDisplayFloor(item: ActivityItem) {
  return item.amount >= (item.type === 'Deposit' ? MIN_DEPOSIT : MIN_WITHDRAWAL)
}

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
  if (day < 7) return day === 1 ? '1 day ago' : `${day} days ago`
  const week = Math.floor(day / 7)
  return week === 1 ? '1 week ago' : `${week} weeks ago`
}

function verb(type: ActivityKind) {
  if (type === 'Withdrawal') return 'withdrew'
  if (type === 'Deposit') return 'deposited'
  return 'received'
}

const SAMPLE_NAMES = [
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
]

const SAMPLE_AMOUNTS = [
  12_000, 18_500, 25_000, 32_500, 45_000, 50_000, 68_000, 75_000, 85_000, 96_000, 110_000, 125_000, 150_000,
  185_000, 210_000, 250_000, 320_000, 420_000, 500_000, 750_000, 1_250_000, 2_500_000, 5_000_000, 8_500_000,
]

const SAMPLE_KINDS: ActivityKind[] = [
  'Payout',
  'Deposit',
  'Payout',
  'Withdrawal',
  'Payout',
  'Deposit',
  'Payout',
  'Withdrawal',
]

// Mix recent, day-scale and week-scale activity so the first screen shows variety.
const SAMPLE_AGES = [
  18,
  2 * 86_400,
  95,
  4 * 86_400,
  240,
  2 * 604_800,
  600,
  6 * 86_400,
  1_500,
  3 * 604_800,
  3_600,
  8 * 86_400,
  2 * 3_600,
  4 * 604_800,
  4 * 3_600,
  11 * 86_400,
  7 * 3_600,
  6 * 604_800,
  11 * 3_600,
  18 * 86_400,
  16 * 3_600,
  8 * 604_800,
  22 * 3_600,
  12 * 604_800,
]

function sampleActivity(now: number): ActivityItem[] {
  return Array.from({ length: 24 }, (_, index) => ({
    id: `sample-${index}`,
    displayName: maskName(SAMPLE_NAMES[index % SAMPLE_NAMES.length] ?? 'Member'),
    type: SAMPLE_KINDS[index % SAMPLE_KINDS.length] ?? 'Payout',
    amount: SAMPLE_AMOUNTS[(index * 3 + 1) % SAMPLE_AMOUNTS.length] ?? 50_000,
    createdAt: now - (SAMPLE_AGES[index] ?? 86_400) * 1000,
  }))
}

function repeatToFill(items: ActivityItem[]): ActivityItem[] {
  if (!items.length) return []
  const out: ActivityItem[] = []
  while (out.length < MIN_MARQUEE_ITEMS) out.push(...items)
  return out
}

function typeTone(type: ActivityKind) {
  if (type === 'Withdrawal') return 'text-[#a15f18] bg-[#fff4df]'
  if (type === 'Deposit') return 'text-[#28668a] bg-[#eaf6fb]'
  return 'text-[#2f7a4a] bg-[#eef7eb]'
}

function memberTypeTone(type: ActivityKind) {
  if (type === 'Withdrawal') return 'text-[#ffd38a] bg-[#3a2c1c]'
  if (type === 'Deposit') return 'text-[#9ed7f2] bg-[#12303a]'
  return 'text-[#b9f47f] bg-[#183e31]'
}

function MemberActivityCard({ item, now }: { item: ActivityItem; now: number }) {
  return (
    <article className="w-[300px] shrink-0 rounded-xl border border-white/10 bg-[#0e2b26] px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.12em] ${memberTypeTone(item.type)}`}>
          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
          {item.type}
        </span>
        <time dateTime={new Date(item.createdAt).toISOString()} className="text-[10px] font-medium text-[#91b0a2]">
          {relativeTime(item.createdAt, now)}
        </time>
      </div>
      <p className="mt-2 truncate text-sm text-[#91b0a2]">
        <span className="font-semibold text-[#edf7f1]">{item.displayName}</span> {verb(item.type)}
      </p>
      <p className="mt-1 text-2xl font-semibold leading-none tabular-nums text-[#b9f47f]">{naira(item.amount)}</p>
    </article>
  )
}

function ActivityCard({ item, now }: { item: ActivityItem; now: number }) {
  return (
    <article className="w-[224px] shrink-0 rounded-2xl border border-[#e7eee8] bg-[#f7faf6] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[.12em] ${typeTone(item.type)}`}>
          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
          {item.type}
        </span>
        <time dateTime={new Date(item.createdAt).toISOString()} className="text-[10px] font-medium text-[#829088]">
          {relativeTime(item.createdAt, now)}
        </time>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-[#0b4537]">{item.displayName}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-[#0b4537]">{naira(item.amount)}</p>
    </article>
  )
}

export function ActivityTicker({ variant = 'landing' }: ActivityTickerProps) {
  const isMember = variant === 'member'
  const isHeader = variant === 'header' || variant === 'memberHeader'
  const isMemberHeader = variant === 'memberHeader'
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [sampleAnchor] = useState(() => Date.now())
  const sampleItems = useMemo(() => sampleActivity(sampleAnchor), [sampleAnchor])

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: liveItems = [] } = useSWR<ActivityItem[]>(
    'public-naira-activity-feed',
    async () => {
      try {
        const response = await xanoRequest<any>('/api:ledger-api/activity/feed', { method: 'GET' })
        return rowsFrom(response)
          .filter((row) => row.is_sample !== true && row.isSample !== true && row.is_demo !== true)
          .map(parseActivity)
          .filter((item): item is ActivityItem => item !== null)
          .filter(meetsDisplayFloor)
          .sort((a, b) => b.createdAt - a.createdAt)
      } catch {
        return []
      }
    },
    { ...antiThrottleSwrConfig, refreshInterval: 120_000, revalidateOnFocus: false },
  )

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 12_000)
    return () => clearInterval(tick)
  }, [])

  const usingLive = liveItems.length > 0
  const showSample = !usingLive
  const items = useMemo(() => {
    if (isHeader) return usingLive ? [...liveItems.slice(0, 8), ...sampleItems.slice(0, 8)] : sampleItems
    return usingLive ? liveItems.slice(0, MAX_LIVE) : showSample ? sampleItems : []
  }, [isHeader, liveItems, sampleItems, showSample, usingLive])
  const half = useMemo(() => repeatToFill(items), [items])

  if (isHeader) {
    return (
      <div
        className={isMemberHeader ? 'overflow-hidden rounded-xl border border-white/10 bg-[#0a211e] py-2' : 'border-t border-[#dfe8e2]/80 bg-[#fbfcfa] py-2'}
        aria-label="Recent member activity"
      >
        <div className="relative overflow-hidden activity-marquee-mask">
          {mounted ? (
            <div className="activity-marquee flex w-max" style={{ animationDuration: `${Math.max(32, half.length * 3.2)}s` }}>
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0 items-center gap-6 pr-6" aria-hidden={copy === 1 ? true : undefined}>
                  {half.map((item, index) => (
                    <span key={`${item.id}-header-${copy}-${index}`} className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] ${isMemberHeader ? 'text-[#91b0a2]' : 'text-[#60716b]'}`}>
                      <span className={`size-1.5 rounded-full ${isMemberHeader ? 'bg-[#b9f47f]' : 'bg-[#65a85c]'}`} aria-hidden="true" />
                      <span className={`font-semibold ${isMemberHeader ? 'text-[#edf7f1]' : 'text-[#0b4537]'}`}>{item.displayName}</span>
                      <span className={isMemberHeader ? 'text-[#91b0a2]' : undefined}>{verb(item.type)}</span>
                      <span className={`font-semibold ${isMemberHeader ? 'text-[#b9f47f]' : 'text-[#0b4537]'}`}>{naira(item.amount)}</span>
                      <span className={isMemberHeader ? 'text-[#789589]' : 'text-[#9aa8a1]'}>· {relativeTime(item.createdAt, now)}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className={`h-4 w-full animate-pulse rounded ${isMemberHeader ? 'bg-[#12342d]' : 'bg-[#eef4ec]'}`} />
          )}
        </div>
      </div>
    )
  }

  return (
    <section
      aria-label="Live ledger activity"
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
            Live ledger activity
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
          <span className={`size-1.5 animate-pulse rounded-full ${isMember ? 'bg-[#b9f47f]' : 'bg-emerald-500'}`} aria-hidden="true" />
          Live
        </span>
      </div>

      {isMember ? (
        <div className="relative mt-3 overflow-hidden activity-marquee-mask" aria-live="polite" aria-relevant="additions">
          {mounted ? (
            <div className="activity-marquee flex w-max gap-2" style={{ animationDuration: `${Math.max(30, half.length * 3.4)}s` }}>
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0 gap-2 pr-2" aria-hidden={copy === 1 ? true : undefined}>
                  {half.map((item, index) => (
                    <MemberActivityCard key={`${item.id}-member-${copy}-${index}`} item={item} now={now} />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-[100px] w-[300px] shrink-0 animate-pulse rounded-xl bg-[#12342d]" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="relative mt-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden activity-marquee-mask">
          {mounted ? (
            <div
              className="activity-marquee flex w-max"
              style={{ animationDuration: `${Math.max(36, half.length * 4)}s` }}
            >
              <div className="flex shrink-0 gap-3 pr-3">
                {half.map((item, index) => (
                  <ActivityCard key={`${item.id}-a-${index}`} item={item} now={now}  />
                ))}
              </div>
              <div className="flex shrink-0 gap-3 pr-3" aria-hidden="true">
                {half.map((item, index) => (
                  <ActivityCard key={`${item.id}-b-${index}`} item={item} now={now}  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-[112px] w-[224px] shrink-0 animate-pulse rounded-2xl bg-[#f4f8f3]" />
              ))}
            </div>
          )}
        </div>
      )}

    </section>
  )
}
