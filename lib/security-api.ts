import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'

export type SecuritySession = {
  id: string
  device?: string
  created_at?: string
  last_seen_at?: string
  current: boolean
}

export type SecurityState = {
  two_factor_enabled: boolean
  two_factor_method?: string
  sessions: SecuritySession[]
}

export type TotpEnrollment = {
  secret: string
  otpauth_url?: string
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

function normalizeSessions(value: unknown): SecuritySession[] {
  const rows = Array.isArray(value) ? value : []
  return rows.map((row, index) => {
    const entry = asRecord(row)
    return {
      id: optionalString(entry.id) ?? optionalString(entry.session_id) ?? `session-${index}`,
      device: optionalString(entry.device) ?? optionalString(entry.user_agent),
      created_at: optionalString(entry.created_at),
      last_seen_at: optionalString(entry.last_seen_at) ?? optionalString(entry.last_used_at),
      current: entry.current === true,
    }
  })
}

function normalizeSecurityState(payload: unknown): SecurityState | null {
  const body = unwrap(payload)
  if (!Object.keys(body).length) return null
  return {
    two_factor_enabled: body.two_factor_enabled === true || body.mfa_enabled === true,
    two_factor_method: optionalString(body.two_factor_method) ?? optionalString(body.mfa_method),
    sessions: normalizeSessions(body.sessions),
  }
}

/** GET /api:ledger-api/security/state */
export async function getSecurityState(): Promise<SecurityState | null> {
  try {
    return normalizeSecurityState(await xanoRequest('/api:ledger-api/security/state', { method: 'GET' }, { auth: true }))
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** POST /api:ledger-api/security/2fa/enroll — returns the authenticator secret to confirm. */
export async function startTwoFactorEnrollment(): Promise<TotpEnrollment | null> {
  try {
    const body = unwrap(
      await xanoRequest('/api:ledger-api/security/2fa/enroll', { method: 'POST' }, { auth: true }),
    )
    const secret = optionalString(body.secret)
    if (!secret) return null
    return { secret, otpauth_url: optionalString(body.otpauth_url) }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** POST /api:ledger-api/security/2fa/confirm */
export async function confirmTwoFactorEnrollment(code: string): Promise<SecurityState | null> {
  try {
    return normalizeSecurityState(
      await xanoRequest(
        '/api:ledger-api/security/2fa/confirm',
        { method: 'POST', body: JSON.stringify({ code: code.trim() }) },
        { auth: true },
      ),
    )
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** POST /api:ledger-api/security/2fa/disable */
export async function disableTwoFactor(code: string): Promise<SecurityState | null> {
  try {
    return normalizeSecurityState(
      await xanoRequest(
        '/api:ledger-api/security/2fa/disable',
        { method: 'POST', body: JSON.stringify({ code: code.trim() }) },
        { auth: true },
      ),
    )
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** DELETE /api:ledger-api/security/sessions/{session_id} */
export async function revokeSession(sessionId: string): Promise<boolean> {
  try {
    await xanoRequest(
      `/api:ledger-api/security/sessions/${encodeURIComponent(sessionId)}`,
      { method: 'DELETE' },
      { auth: true },
    )
    return true
  } catch (cause) {
    if (isPendingRoute(cause)) return false
    throw cause
  }
}
