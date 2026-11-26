'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ArrowDownLeft, ArrowUpRight, Bell, Settings2 } from 'lucide-react'
import { NotificationPreferences } from '@/components/notification-preferences'
import { getMemberTransactions } from '@/lib/xano-ledger'
import { clearXanoSession, getXanoSession } from '@/lib/xano-auth'
import { toNumeric, toTitleCase } from '@/lib/xano-client'
import { MemberTabBar } from '@/components/member-tab-bar'

type Row = Record<string, any>

function rowsFrom(response: any): Row[] {
  if (Array.isArray(response)) return response
  for (const key of ['transactions', 'items', 'data.transactions', 'data.items', 'data']) {
    const rows = key.split('.').reduce<any>((current, part) => current?.[part], response)
    if (Array.isArray(rows)) return rows
  }
  return []
}

function expiredSession(message: string) {
  return /(?:^|\D)401(?:\D|$)|unauthenticated|not authenticated|invalid token|token expired/i.test(message)
}

function eventDate(value: unknown) {
  if (value == null || value === '') return 'Date unavailable'
  const numeric = Number(value)
  const dateValue = Number.isFinite(numeric) ? new Date(numeric < 1e12 ? numeric * 1000 : numeric) : new Date(String(value))
  return Number.isNaN(dateValue.getTime()) ? 'Date unavailable' : dateValue.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
}

function transactionTitle(row: Row) {
  return String(row.description ?? row.narration ?? row.reference ?? toTitleCase(String(row.type ?? row.kind ?? 'Ledger activity')))
}

export function NotificationCenter() {
  const router = useRouter()
  const [sessionReady, setSessionReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  useEffect(() => {
    const session = getXanoSession()
    setAuthenticated(Boolean(session?.authenticated))
    setSessionReady(true)
    if (!session?.authenticated) router.replace('/login?next=/dashboard/notifications')
  }, [router])

  const { data, error, isLoading } = useSWR(
    sessionReady && authenticated ? 'notification-center-ledger-events' : null,
    getMemberTransactions,
  )
  const rows = useMemo(() => rowsFrom(data).slice(0, 30), [data])
  const errorMessage = error instanceof Error ? error.message : ''
  useEffect(() => {
    if (errorMessage && expiredSession(errorMessage)) {
      clearXanoSession()
      router.replace('/login?next=/dashboard/notifications')
    }
  }, [errorMessage, router])

  return (
    <main className="member-tab-page min-h-screen bg-[#f4f8f3] text-[#101d1a]">
      <header className="bg-gradient-to-b from-[#0b4537] via-[#0d3d32] to-[#123f34] px-5 py-6 text-white sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white">Dashboard</Link>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#8fbfa8]">Member workspace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Notifications</h1>
            </div>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#b9f47f]" aria-hidden="true"><Bell size={18} /></span>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[1.4fr_.8fr]">
        <section className="rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="ledger-events-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#65a85c]">Live account data</p>
              <h2 id="ledger-events-title" className="mt-1 text-lg font-semibold text-[#0b4537]">Recent ledger activity</h2>
            </div>
            <Link href="/dashboard/activity" className="text-sm font-semibold text-[#0b4537]">View activity</Link>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#708079]">These entries come from your authenticated ledger. Delivery, unread state, and product alerts will appear when the notification API is available.</p>

          <div className="mt-5 divide-y divide-[#e7eee8]" aria-live="polite">
            {!sessionReady || isLoading ? (
              <p className="py-10 text-center text-sm text-[#708079]">Loading account activity…</p>
            ) : error ? (
              <p role="alert" className="py-8 text-sm text-red-700">Unable to load account activity. Try again shortly.</p>
            ) : rows.length ? rows.map((row, index) => {
              const amount = toNumeric(row.amount ?? row.total_amount ?? row.value)
              const description = transactionTitle(row)
              return (
                <article key={row.id ?? row.transaction_id ?? index} className="flex items-start gap-3 py-4">
                  <span className={`mt-0.5 rounded-full p-2 ${amount >= 0 ? 'bg-[#eef7eb] text-[#2f7a4a]' : 'bg-[#fff0e8] text-[#c45c2a]'}`} aria-hidden="true">
                    {amount >= 0 ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#173c30]">{description}</p>
                    <p className="mt-1 text-xs text-[#829088]">{eventDate(row.created_at ?? row.createdAt ?? row.posted_at ?? row.date)} · {toTitleCase(String(row.type ?? row.kind ?? 'Ledger entry'))}</p>
                  </div>
                </article>
              )
            }) : (
              <div className="py-10 text-center">
                <Bell className="mx-auto text-[#8ca697]" size={21} aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-[#60716b]">No ledger activity yet</p>
                <p className="mt-1 text-xs text-[#829088]">Account updates will appear here when recorded.</p>
              </div>
            )}
          </div>
        </section>

        <section className="h-fit rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="notification-preferences-title">
          <div className="flex items-center gap-2 text-[#65a85c]"><Settings2 size={16} aria-hidden="true" /><p className="text-[10px] font-bold uppercase tracking-[.18em]">Preferences</p></div>
          <h2 id="notification-preferences-title" className="mt-2 text-lg font-semibold text-[#0b4537]">Preferences</h2>
          <NotificationPreferences />
        </section>
      </div>
      {authenticated && <MemberTabBar />}
    </main>
  )
}
