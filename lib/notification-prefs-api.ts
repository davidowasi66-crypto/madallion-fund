import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'
import type { NotificationPreferences } from '@/lib/product-feature-contracts'

export const NOTIFICATION_PREFERENCE_FIELDS = [
  'email_alerts',
  'sms_alerts',
  'push_notifications',
  'deposit_confirmation',
  'withdrawal_updates',
  'maturity_reminders',
  'daily_accrual_digest',
  'security_alerts',
  'marketing_emails',
] as const

export type NotificationPreferenceField = (typeof NOTIFICATION_PREFERENCE_FIELDS)[number]

export type NotificationPreferencesInput = Partial<Pick<NotificationPreferences, NotificationPreferenceField>>

const DEFAULTS: NotificationPreferences = {
  email_alerts: true,
  sms_alerts: false,
  push_notifications: true,
  deposit_confirmation: true,
  withdrawal_updates: true,
  maturity_reminders: true,
  daily_accrual_digest: true,
  security_alerts: true,
  marketing_emails: false,
}

const asRecord = (value: unknown): Record<string, unknown> => {
  const body = value as Record<string, unknown> | null
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
}

const optionalString = (value: unknown): string | undefined =>
  value == null || value === '' ? undefined : String(value)

const optionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return undefined
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string' && value.trim()) {
    try {
      return asRecord(JSON.parse(value))
    } catch {
      return {}
    }
  }
  return asRecord(value)
}

export function normalizeNotificationPreferences(payload: unknown): NotificationPreferences | null {
  const body = asRecord(payload)
  if (!Object.keys(body).length) return null
  const nested = parseRecord(body.preferences ?? body.data)
  const source = Object.keys(nested).length ? nested : body
  const hasKnownField = NOTIFICATION_PREFERENCE_FIELDS.some((field) => field in source)
  if (!hasKnownField) return null

  const result: NotificationPreferences = { ...DEFAULTS }
  for (const field of NOTIFICATION_PREFERENCE_FIELDS) {
    const value = optionalBoolean(source[field])
    if (value !== undefined) result[field] = value
  }
  result.updated_at = optionalString(source.updated_at) ?? optionalString(body.updated_at)
  return result
}

/** GET /api:ledger-api/notification-preferences */
export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
  try {
    const payload = await xanoRequest('/api:ledger-api/notification-preferences', { method: 'GET' }, { auth: true })
    // The route answered (no 404): an empty body just means this member has no
    // saved preferences yet, so start from defaults instead of hiding the form.
    return normalizeNotificationPreferences(payload) ?? { ...DEFAULTS }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** PUT /api:ledger-api/notification-preferences */
export async function saveNotificationPreferences(
  input: NotificationPreferencesInput,
): Promise<NotificationPreferences | null> {
  try {
    const payload = await xanoRequest(
      '/api:ledger-api/notification-preferences',
      { method: 'PUT', body: JSON.stringify(input) },
      { auth: true },
    )
    return normalizeNotificationPreferences(payload) ?? { ...DEFAULTS, ...input }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}
