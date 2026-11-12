'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useEffect, useState } from 'react'
import { getXanoSession } from '@/lib/xano-auth'
import { getReferralLeaderboard } from '@/lib/investment-api'

const commissions = [
  ['Starter referrals', '5% of qualifying first deposit'],
  ['Gold referrals', '7% of qualifying first deposit'],
  ['Diamond referrals', '10% of qualifying first deposit'],
]

const money = (value: unknown) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(
    Number.isFinite(Number(value)) ? Number(value) : 0,
  )

export default function AffiliatePage() {
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  useEffect(() => setHasSession(Boolean(getXanoSession()?.authToken)), [])

  const { data, isLoading } = useSWR(
    hasSession ? 'referral-leaderboard' : null,
    getReferralLeaderboard,
  )

  return (
    <main className="min-h-screen bg-[#f4f8f3] px-5 py-8 text-[#101d1a] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="font-bold text-[#0b4537]">Madallion fund</Link>
        <section className="mt-20 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Affiliate programme</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-[-.06em] text-[#0b4537]">Grow your network. Earn when they grow.</h1>
          <p className="mt-6 text-lg leading-8 text-[#60716b]">Share a clearer way to invest with your community and earn transparent commissions on qualified referrals.</p>
          <Link href="/register" className="mt-8 inline-flex rounded-xl bg-[#0b4537] px-5 py-3.5 text-sm font-semibold text-white">Become an affiliate</Link>
        </section>

        <section className="mt-16 rounded-3xl border border-[#dfe8e2] bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-semibold text-[#0b4537]">Commission table</h2>
          <div className="mt-7 divide-y divide-[#dfe8e2]">
            {commissions.map(([label, detail]) => (
              <div key={label} className="flex flex-col justify-between gap-2 py-5 sm:flex-row">
                <span className="font-semibold text-[#0b4537]">{label}</span>
                <span className="text-sm text-[#60716b]">{detail}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs leading-5 text-[#829088]">Commissions are subject to programme terms, identity checks, and qualifying activity. We do not pay for misleading claims or guaranteed-return promises.</p>
        </section>

        <section id="leaderboard" className="mt-8 scroll-mt-24 rounded-3xl border border-[#dfe8e2] bg-white p-6 shadow-sm sm:p-8" aria-labelledby="leaderboard-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Community rankings</p>
              <h2 id="leaderboard-title" className="mt-2 text-2xl font-semibold text-[#0b4537]">Referral leaderboard</h2>
            </div>
            {data?.available && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Live rankings</span>}
          </div>
          <div className="mt-6" aria-live="polite">
            {hasSession === null || isLoading ? (
              <p className="py-8 text-center text-sm text-[#60716b]">Loading leaderboard…</p>
            ) : !hasSession ? (
              <div className="rounded-2xl bg-[#f4f8f3] px-5 py-8 text-center">
                <p className="text-sm text-[#60716b]">Sign in to view current member rankings.</p>
                <Link href="/login?next=%2Faffiliate%23leaderboard" className="mt-4 inline-flex rounded-xl bg-[#0b4537] px-4 py-2.5 text-sm font-semibold text-white">Log in to continue</Link>
              </div>
            ) : data?.available && data.rows.length > 0 ? (
              <ol className="divide-y divide-[#e7eee8]">
                {data.rows.map((row, index) => {
                  const rank = Number(row.rank ?? index + 1)
                  const alias = row.display_name ?? row.displayName ?? row.alias ?? row.public_name
                  const displayName = typeof alias === 'string' && alias.trim() ? alias.trim() : `Member ${rank}`
                  const referrals = Number(row.referrals ?? row.referral_count ?? row.total_referrals ?? 0)
                  const earned = row.referral_earned ?? row.commission_earned ?? row.total_earned ?? 0
                  return (
                    <li key={`${rank}-${index}`} className="flex items-center gap-4 py-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef7eb] text-sm font-bold text-[#0b4537]">{rank}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[#173c30]">{displayName}</p>
                        <p className="mt-1 text-xs text-[#708079]">{Number.isFinite(referrals) ? referrals : 0} qualified referrals</p>
                      </div>
                      <p className="whitespace-nowrap text-sm font-semibold text-[#0b4537]">{money(earned)}</p>
                    </li>
                  )
                })}
              </ol>
            ) : data?.available ? (
              <p className="rounded-2xl bg-[#f4f8f3] px-5 py-8 text-center text-sm text-[#60716b]">No qualified referrals have been ranked yet.</p>
            ) : (
              <p role="status" className="rounded-2xl bg-[#f4f8f3] px-5 py-8 text-center text-sm text-[#60716b]">The live leaderboard is temporarily unavailable. Please try again later.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
