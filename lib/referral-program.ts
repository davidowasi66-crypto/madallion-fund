/**
 * Programme tiers. Thresholds are the programme structure; the actual commission
 * rates stay in admin settings and are never hard-coded in the member UI.
 */
export const REFERRAL_TIERS = [
  { level: 1, name: 'Builder', minQualified: 0, perk: 'Base commission on qualified invites' },
  { level: 2, name: 'Connector', minQualified: 3, perk: 'Higher commission tier' },
  { level: 3, name: 'Ambassador', minQualified: 10, perk: 'Top commission tier and leaderboard badge' },
  { level: 4, name: 'Partner', minQualified: 25, perk: 'Priority support and launch invitations' },
] as const

export function referralTier(qualified: unknown) {
  const parsed = Number(qualified)
  const count = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0
  const current = REFERRAL_TIERS.reduce((acc, tier) => (count >= tier.minQualified ? tier : acc), REFERRAL_TIERS[0])
  const next = REFERRAL_TIERS.find((tier) => tier.minQualified > count) ?? null
  const span = next ? next.minQualified - current.minQualified : 0
  const progress = next && span > 0 ? Math.min(100, Math.round(((count - current.minQualified) / span) * 100)) : 100
  return { count, current, next, toNext: next ? next.minQualified - count : 0, progress }
}

