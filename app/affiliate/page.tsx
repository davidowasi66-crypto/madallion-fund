'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, Copy, TrendingUp, Users } from 'lucide-react'
import { getXanoSession, xanoMe } from '@/lib/xano-auth'
import { getReferralCredits, getReferralMe } from '@/lib/member-routes'
import { getReferralLeaderboard } from '@/lib/investment-api'

/** Programme tier labels — percentages are illustrative until admin overrides. */
const programmeTiers = [
  { level: 1, name: 'Direct', hint: 'People you invite', rateLabel: 'Tier A' },
  { level: 2, name: 'Network', hint: 'Their invites', rateLabel: 'Tier B' },
  { level: 3, name: 'Extended', hint: 'Second-degree network', rateLabel: 'Tier C' },
]

const money = (value: unknown, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : 'NGN',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0)

function pickReferralCode(profile: Record<string, unknown> | null, userId: string): string {
  if (profile) {
    const candidates = [
      profile.referral_code,
      profile.referralCode,
      profile.invite_code,
      profile.inviteCode,
      profile.ref_code,
      profile.refCode,
      profile.code,
      (profile.user as any)?.referral_code,
      (profile.user as any)?.referralCode,
      (profile.data as any)?.referral_code,
      (profile.data as any)?.referralCode,
    ]
    for (const c of candidates) {
      if (c == null) continue
      const value = String(c).trim()
      if (value && /^[A-Za-z0-9_-]{1,64}$/.test(value)) return value
    }
  }
  // Stable fallback: authenticated member id (accepted by signup as referral_code)
  if (userId && /^[A-Za-z0-9_-]{1,64}$/.test(userId)) return userId
  return ''
}

function referralSiteOrigin(): string {
  if (typeof window === 'undefined') return 'https://madallion-fund.vercel.app'
  const hostname = window.location.hostname.toLowerCase()
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')
  const isPreview = hostname.endsWith('.v0.build') ||
    (hostname.endsWith('.vercel.app') && hostname !== 'madallion-fund.vercel.app')
  return isLocalhost || isPreview ? 'https://madallion-fund.vercel.app' : window.location.origin
}

export default function AffiliatePage() {
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [userId, setUserId] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const session = getXanoSession()
    setHasSession(Boolean(session?.authenticated))
    setUserId(session?.user_id ? String(session.user_id) : '')
  }, [])

  const { data: referralInfo, isLoading: referralInfoLoading } = useSWR(
    hasSession ? ['referral-info', userId] : null,
    async () => {
      const [memberResult, profileResult] = await Promise.allSettled([getReferralMe(), xanoMe()])
      return {
        member: memberResult.status === 'fulfilled' ? memberResult.value : null,
        profile: profileResult.status === 'fulfilled' ? (profileResult.value as Record<string, unknown>) : null,
      }
    },
  )
  const { data: credits, isLoading: creditsLoading } = useSWR(
    hasSession ? 'referral-credits' : null,
    getReferralCredits,
  )
  const { data, isLoading } = useSWR(hasSession ? 'referral-leaderboard' : null, getReferralLeaderboard)

  const inviteUrl = useMemo(() => {
    if (!hasSession) return ''
    const memberCode = referralInfo?.member?.referral_code?.trim()
    const validMemberCode = memberCode && /^[A-Za-z0-9_-]{1,64}$/.test(memberCode) ? memberCode : ''
    const code = validMemberCode || pickReferralCode(referralInfo?.profile ?? null, userId)
    if (!code) return ''
    return `${referralSiteOrigin()}/register?ref=${encodeURIComponent(code)}`
  }, [hasSession, referralInfo, userId])

  const myStats = useMemo(() => {
    const rows = data?.rows ?? []
    if (!userId || !rows.length) {
      return { available: false, earned: null as number | null, referrals: null as number | null, rank: null as number | null }
    }
    const mine = rows.find((row) => {
      const id = String(row.user_id ?? row.member_id ?? row.id ?? '')
      return id && id === userId
    })
    if (!mine) return { available: false, earned: null, referrals: null, rank: null }
    return {
      available: true,
      earned: Number(mine.referral_earned ?? mine.commission_earned ?? mine.total_earned ?? 0),
      referrals: Number(mine.referrals ?? mine.referral_count ?? mine.total_referrals ?? 0),
      rank: Number(mine.rank ?? 0) || null,
    }
  }, [data, userId])

  async function copyInvite() {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const inviteDisplay =
    !hasSession
      ? 'Sign in to check referral access'
      : referralInfoLoading
        ? 'Preparing your invite link…'
        : inviteUrl || 'Unable to issue invite link — check that your account is signed in'

  return (
    <main className="min-h-screen bg-[#f4f8f3] text-[#101d1a]">
      <div className="bg-gradient-to-b from-[#0b4537] via-[#0d3d32] to-[#123f34] px-5 pb-8 pt-6 text-white sm:px-8">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={hasSession ? '/dashboard' : '/'}
              className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </Link>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b9f47f]/90">Referrals</p>
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-[#dcebe4]">
              {myStats.available ? money(myStats.earned) : '—'}
            </span>
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Invite & earn</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#a8c7b8]">
            Grow your network and earn referral commission when people you invite qualify under programme rules.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 sm:px-8">
        <section className="-mt-5 rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#65a85c]">Your invite link</p>
          <p className="mt-3 break-all rounded-2xl bg-[#f4f8f3] px-4 py-3 font-mono text-xs leading-5 text-[#0b4537]">
            {inviteDisplay}
          </p>
          {hasSession ? (
            <button
              type="button"
              disabled={!inviteUrl}
              onClick={() => void copyInvite()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#b9f47f] py-3.5 text-sm font-semibold text-[#071a18] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy invite link'}
            </button>
          ) : (
            <Link
              href="/login?next=%2Faffiliate"
              className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[#0b4537] py-3.5 text-sm font-semibold text-white"
            >
              Sign in to get your link
            </Link>
          )}
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#0b4537] p-4 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fbfa8]">Leaderboard earnings</p>
            <p className="mt-2 text-xl font-semibold">{myStats.available ? money(myStats.earned) : '—'}</p>
          </div>
          <div className="rounded-2xl border border-[#dfe8e2] bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#65a85c]">Referrals</p>
            <p className="mt-2 text-xl font-semibold text-[#0b4537]">{myStats.available ? myStats.referrals : '—'}</p>
          </div>
          <div className="rounded-2xl border border-[#dfe8e2] bg-white p-4">
            <div className="flex items-center gap-2 text-[#65a85c]">
              <Users size={14} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Active</p>
            </div>
            <p className="mt-2 text-xl font-semibold text-[#0b4537]">{myStats.available ? myStats.referrals : '—'}</p>
          </div>
          <div className="rounded-2xl border border-[#dfe8e2] bg-white p-4">
            <div className="flex items-center gap-2 text-[#65a85c]">
              <TrendingUp size={14} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Rank</p>
            </div>
            <p className="mt-2 text-xl font-semibold text-[#0b4537]">{myStats.rank ?? '—'}</p>
          </div>
        </div>

        <section className="mt-4 rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm" aria-labelledby="referral-credit-title">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#65a85c]">Referral ledger</p>
          <h2 id="referral-credit-title" className="mt-1 text-lg font-semibold text-[#0b4537]">Credit status</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ['Available to use', credits?.available],
              ['Pending hold', credits?.pending_hold],
              ['Lifetime credited', credits?.lifetime],
              ['Per-member cap', credits?.cap],
            ].map(([label, amount]) => (
              <div key={label} className="rounded-2xl bg-[#f4f8f3] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#829088]">{label}</p>
                <p className="mt-2 text-sm font-semibold text-[#60716b]">
                  {!hasSession ? 'Sign in' : creditsLoading ? 'Loading…' : credits ? money(amount, credits.currency) : 'Unavailable'}
                </p>
              </div>
            ))}
          </div>
          <p role="status" className="mt-4 text-xs leading-5 text-[#708079]">
            {!hasSession
              ? 'Sign in to view your referral credit balance.'
              : creditsLoading
                ? 'Loading your latest ledger credits.'
                : credits
                  ? 'Balances come from the referral ledger and update as qualified invites are recorded.'
                  : 'Credit details are temporarily unavailable. Your invite link remains ready to share.'}
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0b4537]">Commission tiers</h2>
          <p className="mt-1 text-xs text-[#708079]">
            Exact percentages are set in your admin programme settings. Structure only shown here.
          </p>
          <ul className="mt-4 divide-y divide-[#e7eee8]">
            {programmeTiers.map((tier) => (
              <li key={tier.level} className="flex items-center gap-3 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#eef7eb] text-sm font-bold text-[#0b4537]">
                  {tier.level}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#173c30]">
                    Level {tier.level}{' '}
                    <span className="font-normal text-[#65a85c]">{tier.name}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-[#708079]">{tier.hint}</p>
                </div>
                <span className="text-sm font-semibold text-[#0b4537]">{tier.rateLabel}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-xl bg-[#f4f8f3] px-3 py-2 text-[11px] leading-4 text-[#60716b]">
            You earn when someone you invited qualifies under programme rules. Rates and eligibility are controlled
            from admin — not fixed in this screen.
          </p>
        </section>

        <section id="leaderboard" className="mt-6 mb-10 scroll-mt-24 rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#65a85c]">Community</p>
              <h2 className="mt-1 text-lg font-semibold text-[#0b4537]">Referral leaderboard</h2>
            </div>
            {data?.available && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Live</span>
            )}
          </div>
          <div className="mt-4" aria-live="polite">
            {hasSession === null || isLoading ? (
              <p className="py-8 text-center text-sm text-[#60716b]">Loading leaderboard…</p>
            ) : !hasSession ? (
              <div className="rounded-2xl bg-[#f4f8f3] px-5 py-8 text-center">
                <p className="text-sm text-[#60716b]">Sign in to view rankings.</p>
                <Link
                  href="/login?next=%2Faffiliate%23leaderboard"
                  className="mt-4 inline-flex rounded-xl bg-[#0b4537] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Log in
                </Link>
              </div>
            ) : data?.available && data.rows.length > 0 ? (
              <ol className="divide-y divide-[#e7eee8]">
                {data.rows.map((row, index) => {
                  const rank = Number(row.rank ?? index + 1)
                  const alias = row.display_name ?? row.displayName ?? row.alias ?? row.public_name
                  const displayName =
                    typeof alias === 'string' && alias.trim() ? alias.trim() : `Member ${rank}`
                  const referrals = Number(row.referrals ?? row.referral_count ?? row.total_referrals ?? 0)
                  const earned = row.referral_earned ?? row.commission_earned ?? row.total_earned ?? 0
                  return (
                    <li key={`${rank}-${index}`} className="flex items-center gap-4 py-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef7eb] text-sm font-bold text-[#0b4537]">
                        {rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[#173c30]">{displayName}</p>
                        <p className="mt-1 text-xs text-[#708079]">
                          {Number.isFinite(referrals) ? referrals : 0} qualified referrals
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-sm font-semibold text-[#0b4537]">{money(earned)}</p>
                    </li>
                  )
                })}
              </ol>
            ) : data?.available ? (
              <p className="rounded-2xl bg-[#f4f8f3] px-5 py-8 text-center text-sm text-[#60716b]">
                No qualified referrals ranked yet.
              </p>
            ) : (
              <p role="status" className="rounded-2xl bg-[#f4f8f3] px-5 py-8 text-center text-sm text-[#60716b]">
                Leaderboard temporarily unavailable.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
