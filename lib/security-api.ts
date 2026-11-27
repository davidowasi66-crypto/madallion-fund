import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'

export type SecuritySession = {
  id: string
  device?: string
  ip_address?: string
  location?: string
  last_active_at?: string
  created_at?: string
  current?: boolean
}

export type SecurityState = {
  two_factor_enabled: boolean
  two_factor_method?: string
  has_backup_codes: boolean
  active_sessions_count: number
  security_level?: string
}

export type TwoFactorEnrollment = {
  secret: string
  otpauth_uri: string
  backup_codes: string[]
  message?: string
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

const optionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return undefined
}

const optionalNumber = (value: unknown): number | undefined => {
  if (value == null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function normalizeSession(row: unknown, index: number): SecuritySession {
  const entry = asRecord(row)
  return {
    id: optionalString(entry.id) ?? optionalString(entry.session_id) ?? `session-${index}`,
    device: optionalString(entry.device) ?? optionalString(entry.user_agent) ?? optionalString(entry.device_name),
    ip_address: optionalString(entry.ip_address) ?? optionalString(entry.ip),
    location: optionalString(entry.location) ?? optionalString(entry.city),
    last_active_at:
      optionalString(entry.last_active_at) ?? optionalString(entry.last_used_at) ?? optionalString(entry.updated_at),
    created_at: optionalString(entry.created_at),
    current: optionalBoolean(entry.current) ?? optionalBoolean(entry.is_current),
  }
}

export function normalizeSecurityState(payload: unknown): SecurityState | null {
  const body = unwrap(payload)
  // The route answered (no 404): a member without a security record yet is
  // simply not enrolled, so report a safe editable default instead of "offline".
  if (!Object.keys(body).length) {
    return { two_factor_enabled: false, has_backup_codes: false, active_sessions_count: 0 }
  }
  return {
    two_factor_enabled: optionalBoolean(body.two_factor_enabled) ?? false,
    two_factor_method: optionalString(body.two_factor_method),
    has_backup_codes: optionalBoolean(body.has_backup_codes) ?? false,
    active_sessions_count: optionalNumber(body.active_sessions_count) ?? 0,
    security_level: optionalString(body.security_level),
  }
}

export async function getSecurityState(): Promise<SecurityState | null> {
  try {
    return normalizeSecurityState(
      await xanoRequest('/api:ledger-api/security/state', { method: 'GET' }, { auth: true }),
    )
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** GET /api:ledger-api/security/sessions */
export async function getSecuritySessions(): Promise<SecuritySession[] | null> {
  try {
    const payload = await xanoRequest<unknown>('/api:ledger-api/security/sessions', { method: 'GET' }, { auth: true })
    const body = asRecord(payload)
    // An empty list is a valid answer (only one device, nothing to revoke).
    if (!Object.keys(body).length && !Array.isArray(payload)) return []
    const rows = Array.isArray(payload)
      ? payload
      : toArray(body.sessions ?? body.items ?? body.data ?? asRecord(body.data).sessions)
    return rows.map(normalizeSession)
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** POST /api:ledger-api/security/2fa/setup */
export async function beginTwoFactorEnrollment(): Promise<TwoFactorEnrollment | null> {
  try {
    const body = unwrap(
      await xanoRequest('/api:ledger-api/security/2fa/setup', { method: 'POST' }, { auth: true }),
    )
    const secret = optionalString(body.secret)
    const otpauth = optionalString(body.otpauth_uri) ?? optionalString(body.otpauth_url)
    if (!secret && !otpauth) return null
    return {
      secret: secret ?? '',
      otpauth_uri: otpauth ?? '',
      backup_codes: toArray(body.backup_codes).map((code) => String(code)),
      message: optionalString(body.message),
    }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** POST /api:ledger-api/security/2fa/verify */
export async function confirmTwoFactorEnrollment(code: string): Promise<boolean | null> {
  try {
    const body = unwrap(
      await xanoRequest(
        '/api:ledger-api/security/2fa/verify',
        { method: 'POST', body: JSON.stringify({ code }) },
        { auth: true },
      ),
    )
    const success = optionalBoolean(body.success)
    if (success === false) return false
    const enabled = optionalBoolean(body.two_factor_enabled)
    return enabled ?? true
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** POST /api:ledger-api/security/2fa/disable */
export async function disableTwoFactor(code?: string): Promise<boolean | null> {
  try {
    const body = unwrap(
      await xanoRequest(
        '/api:ledger-api/security/2fa/disable',
        { method: 'POST', body: JSON.stringify(code ? { code } : {}) },
        { auth: true },
      ),
    )
    if (optionalBoolean(body.success) === false) return false
    return true
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** DELETE /api:ledger-api/security/sessions/{id} */
export async function revokeSession(sessionId: string): Promise<boolean | null> {
  try {
    await xanoRequest(
      `/api:ledger-api/security/sessions/${encodeURIComponent(sessionId)}`,
      { method: 'DELETE' },
      { auth: true },
    )
    return true
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}
