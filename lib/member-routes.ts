import { xanoRequest } from '@/lib/xano-auth'

/** GET /api:ledger-api/referral/credits */
export type ReferralCredits = {
  available: number
  pending_hold: number
  lifetime: number
  cap: number
  currency: string
  qualified?: number | boolean | string
  referrals?: number
}

/** GET /api:ledger-api/referral/me */
export type ReferralMe = {
  referral_code?: string
  invite_url?: string
  qualified?: number | boolean | string
  available?: number
  pending_hold?: number
  lifetime?: number
  cap?: number
  credits?: number
  referrals?: number
}

/** GET /api:ledger-api/investments/{investment_id}/certificate */
export type InvestmentCertificatePayload = {
  certificate_id?: string | number
  investment_id?: string | number
  plan_name?: string
  principal?: number | string
  display_principal?: string
  currency?: string
  share_url?: string
  signed_share_url?: string
  is_verified?: boolean | string
  cta?: string
  og_metadata?: Record<string, unknown> | string
  [key: string]: unknown
}

function numField(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function unwrapObject(response: unknown): Record<string, any> {
  if (!response || typeof response !== 'object') return {}
  const r = response as Record<string, any>
  return (r.data && typeof r.data === 'object' && !Array.isArray(r.data) ? r.data : r) as Record<string, any>
}

/** Member-facing friendly error — never surface backend/provider names or raw stack. */
export function memberSafeError(cause: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const raw = cause instanceof Error ? cause.message : String(cause ?? '')
  if (!raw) return fallback
  if (/(?:^|\D)401(?:\D|$)|unauthenticated|not authenticated|invalid token|token expired/i.test(raw)) {
    return 'Your session expired. Please sign in again.'
  }
  if (/(?:^|\D)403(?:\D|$)|forbidden|access denied/i.test(raw)) {
    return 'You do not have permission for this action.'
  }
  if (/(?:^|\D)404(?:\D|$)|not found/i.test(raw)) {
    return 'That record was not found.'
  }
  if (/(?:^|\D)429(?:\D|$)|rate limit|too many/i.test(raw)) {
    return 'Too many requests. Please wait a moment and try again.'
  }
  if (/xano|sample|stack|traceback|exception|sqlstate|postgres|unable to locate var/i.test(raw)) {
    return fallback
  }
  const cleaned = raw.replace(/\s+/g, ' ').trim()
  return cleaned.length > 140 ? fallback : cleaned
}

export async function getReferralCredits(): Promise<ReferralCredits | null> {
  try {
    const body = unwrapObject(await xanoRequest('/api:ledger-api/referral/credits', { method: 'GET' }, { auth: true }))
    // The route answered (no 404): no credit record yet means zero earned.
    if (!body || (body.available == null && body.lifetime == null && body.cap == null)) {
      return { available: 0, pending_hold: 0, lifetime: 0, cap: 0, currency: 'NGN' }
    }
    return {
      available: numField(body.available),
      pending_hold: numField(body.pending_hold ?? body.pendingHold),
      lifetime: numField(body.lifetime),
      cap: numField(body.cap),
      currency: String(body.currency ?? 'NGN'),
      qualified: body.qualified,
      referrals: body.referrals != null ? numField(body.referrals) : undefined,
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    if (/(?:^|\D)404(?:\D|$)|not found/i.test(message)) return null
    throw cause
  }
}

export async function getReferralMe(): Promise<ReferralMe | null> {
  try {
    const body = unwrapObject(await xanoRequest('/api:ledger-api/referral/me', { method: 'GET' }, { auth: true }))
    if (!body || typeof body !== 'object') return null
    return {
      referral_code: body.referral_code != null ? String(body.referral_code) : undefined,
      invite_url: body.invite_url != null ? String(body.invite_url) : undefined,
      qualified: body.qualified,
      available: body.available != null ? numField(body.available) : undefined,
      pending_hold: body.pending_hold != null ? numField(body.pending_hold) : undefined,
      lifetime: body.lifetime != null ? numField(body.lifetime) : undefined,
      cap: body.cap != null ? numField(body.cap) : undefined,
      credits: body.credits != null ? numField(body.credits) : undefined,
      referrals:
        body.referrals != null || body.referrals_count != null
          ? numField(body.referrals ?? body.referrals_count)
          : undefined,
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    if (/(?:^|\D)404(?:\D|$)|not found/i.test(message)) return null
    throw cause
  }
}

export async function getInvestmentCertificate(
  investmentId: string | number,
): Promise<InvestmentCertificatePayload | null> {
  const id = encodeURIComponent(String(investmentId))
  try {
    const body = unwrapObject(
      await xanoRequest(`/api:ledger-api/investments/${id}/certificate`, { method: 'GET' }, { auth: true }),
    )
    if (!body || (body.share_url == null && body.signed_share_url == null && body.certificate_id == null)) {
      return null
    }
    return body as InvestmentCertificatePayload
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    if (/(?:^|\D)404(?:\D|$)|not found/i.test(message)) return null
    throw cause
  }
}
