import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'
import type { NotificationCategory, NotificationPreferences, QuietHours } from '@/lib/product-feature-contracts'

const CATEGORIES: NotificationCategory[] = ['investment', 'payment', 'referral', 'security', 'product']

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

function normalizeQuietHours(value: unknown): QuietHours {
  const body = asRecord(value)
  return {
    enabled: body.enabled === true,
    start_local: optionalString(body.start_local) ?? '22:00',
    end_local: optionalString(body.end_local) ?? '07:00',
    timezone: optionalString(body.timezone) ?? 'Africa/Lagos',
  }
}

export function normalizeNotificationPreferences(payload: unknown): NotificationPreferences | null {
  const body = unwrap(payload)
  if (!Object.keys(body).length) return null
  const incoming = asRecord(body.categories)
  const categories = CATEGORIES.reduce(
    (acc, category) => ({ ...acc, [category]: incoming[category] !== false }),
    {} as Record<NotificationCategory, boolean>,
  )
  return {
    in_app_enabled: body.in_app_enabled !== false,
    categories,
    quiet_hours: normalizeQuietHours(body.quiet_hours),
    updated_at: optionalString(body.updated_at) ?? new Date().toISOString(),
  }
}

export const NOTIFICATION_CATEGORIES = CATEGORIES

/** GET /api:ledger-api/notification-preferences */
export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
  try {
    return normalizeNotificationPreferences(
      await xanoRequest('/api:ledger-api/notification-preferences', { method: 'GET' }, { auth: true }),
    )
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

export type NotificationPreferencesInput = {
  in_app_enabled: boolean
  categories: Record<NotificationCategory, boolean>
  quiet_hours: QuietHours
  expected_updated_at?: string
}

/** PATCH /api:ledger-api/notification-preferences */
export async function saveNotificationPreferences(
  input: NotificationPreferencesInput,
): Promise<NotificationPreferences | null> {
  try {
    return normalizeNotificationPreferences(
      await xanoRequest(
        '/api:ledger-api/notification-preferences',
        { method: 'PATCH', body: JSON.stringify(input) },
        { auth: true },
      ),
    )
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}
