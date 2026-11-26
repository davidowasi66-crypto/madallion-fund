import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'

/** Signed, expiring public share of an investment certificate. */
export type PublicShare = {
  share_id: string
  url: string
  expires_at?: string
}

const asRecord = (value: unknown): Record<string, unknown> => {
  const body = value as Record<string, unknown> | null
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
}

const unwrap = (value: unknown) => {
  const body = asRecord(value)
  return asRecord(body.data ?? body)
}

const optionalString = (value: unknown): string | undefined =>
  value == null || value === '' ? undefined : String(value)

/** Only https links without embedded credentials are ever rendered as a public share. */
export function safeShareUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : ''
  } catch {
    return ''
  }
}

function normalizeShare(payload: unknown): PublicShare | null {
  const body = unwrap(payload)
  const shareId = optionalString(body.share_id) ?? optionalString(body.id)
  const url = safeShareUrl(body.signed_share_url ?? body.share_url ?? body.url)
  if (!shareId || !url) return null
  return { share_id: shareId, url, expires_at: optionalString(body.expires_at) }
}

/** POST /api:ledger-api/public-shares */
export async function createPublicShare(
  investmentId: string | number,
  durationDays?: number,
): Promise<PublicShare | null> {
  try {
    return normalizeShare(
      await xanoRequest(
        '/api:ledger-api/public-shares',
        {
          method: 'POST',
          body: JSON.stringify({
            investment_id: investmentId,
            ...(durationDays != null ? { duration_days: durationDays } : {}),
          }),
        },
        { auth: true },
      ),
    )
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** DELETE /api:ledger-api/public-shares/{share_id} */
export async function revokePublicShare(shareId: string): Promise<boolean> {
  try {
    await xanoRequest(`/api:ledger-api/public-shares/${encodeURIComponent(shareId)}`, { method: 'DELETE' }, { auth: true })
    return true
  } catch (cause) {
    if (isPendingRoute(cause)) return false
    throw cause
  }
}

/** ISO expiry used by the share dialog: whole days from now. */
export function shareExpiry(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}
