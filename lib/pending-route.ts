/**
 * The repo's "pending-xano-routes" state (see PRODUCT_FEATURE_BACKEND_STATUS in
 * lib/product-feature-contracts.ts): the member/admin contract is documented and
 * the UI is ready, but the Xano route does not exist yet. Those calls answer 404,
 * which is an expected "not connected" state rather than an application error.
 */
export function isPendingRoute(cause: unknown): boolean {
  const message = cause instanceof Error ? cause.message : String(cause ?? '')
  return /(?:^|\D)404(?:\D|$)|not found|unable to locate|does not exist/i.test(message)
}

/** Date parsing shared by the member control panels (Xano sends ms or ISO strings). */
export function toTimestamp(value: unknown): number | null {
  if (value == null || value === '') return null
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) return numeric < 1e12 ? numeric * 1000 : numeric
  const parsed = new Date(String(value)).getTime()
  return Number.isNaN(parsed) ? null : parsed
}

export function formatTimestamp(value: unknown): string {
  const timestamp = toTimestamp(value)
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
}
