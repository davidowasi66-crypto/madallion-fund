import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'
import type { ReferralCredit, ReferralCreditStatus } from '@/lib/product-feature-contracts'

const asRecord = (value: unknown): Record<string, unknown> => {
  const body = value as Record<string, unknown> | null
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
}

const optionalString = (value: unknown): string | undefined =>
  value == null || value === '' ? undefined : String(value)

const optionalNumber = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const STATUSES: ReferralCreditStatus[] = ['pending_hold', 'available', 'redeemed', 'reversed']

function normalizeStatus(value: unknown): ReferralCreditStatus {
  const status = String(value ?? '').toLowerCase().replace(/[\s-]+/g, '_')
  return STATUSES.find((candidate) => candidate === status) ?? 'pending_hold'
}

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

/** GET /api:ledger-api/referrals/credits — individual credits with hold windows. */
export async function getReferralCreditHistory(): Promise<ReferralCredit[] | null> {
  try {
    const payload = await xanoRequest<unknown>('/api:ledger-api/referrals/credits', { method: 'GET' }, { auth: true })
    const body = asRecord(payload)
    const rows = Array.isArray(payload)
      ? payload
      : [body.credits, body.items, body.data, asRecord(body.data).credits].find(Array.isArray) ?? []
    return (rows as unknown[]).map((row, index) => {
      const entry = asRecord(row)
      return {
        id: optionalString(entry.id) ?? `credit-${index}`,
        referral_id: optionalString(entry.referral_id) ?? '',
        amount: optionalNumber(entry.amount),
        currency: optionalString(entry.currency) ?? 'NGN',
        status: normalizeStatus(entry.status),
        hold_until: optionalString(entry.hold_until) ?? '',
        created_at: optionalString(entry.created_at) ?? '',
        ledger_entry_id: optionalString(entry.ledger_entry_id),
      }
    })
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}
