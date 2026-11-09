const XANO_BASE_URL = process.env.NEXT_PUBLIC_XANO_BASE_URL ?? process.env.XANO_BASE_URL ?? ""
const XANO_AUTH_URL = process.env.NEXT_PUBLIC_XANO_AUTH_URL ?? process.env.XANO_AUTH_URL ?? ""
const XANO_EVENT_LOG_URL = process.env.NEXT_PUBLIC_XANO_EVENT_LOG_URL ?? process.env.XANO_EVENT_LOG_URL ?? process.env.XANO_EVENTLOG_URL ?? ""
const XANO_LEDGER_URL = process.env.NEXT_PUBLIC_XANO_LEDGER_URL ?? process.env.XANO_LEDGER_URL ?? ""
const XANO_ADMIN_URL = process.env.NEXT_PUBLIC_XANO_ADMIN_URL ?? process.env.XANO_ADMIN_URL ?? ""
const XANO_PAYMENT_URL = process.env.NEXT_PUBLIC_XANO_PAYMENT_URL ?? process.env.XANO_PAYMENT_URL ?? ""
const XANO_PAYMENTS_URL = process.env.XANO_PAYMENTS ?? ""
const XANO_ADMIN_FUNCTION_URL = process.env.xanoAdminUrl ?? ""

const endpoints = {
  login: "/api:r2YmAApr/auth/login",
  signup: "/api:r2YmAApr/auth/signup",
  me: "/api:r2YmAApr/auth/me",
  requestReset: "/api:r2YmAApr/reset/request-reset-link",
} as const

const STORAGE_KEYS = { authToken: "madallion_auth_token", userId: "madallion_user_id" } as const

const API_GROUPS: Record<string, string> = {
  "r2YmAApr": XANO_AUTH_URL,
  "IkEAMc9L": XANO_EVENT_LOG_URL,
  "ledger-api": XANO_LEDGER_URL,
  "yYNRHo4K": XANO_ADMIN_URL,
  "dKuEO75q": XANO_PAYMENT_URL,
  // Older app routes used this alias; route them to the provided admin group.
  "admin-api": XANO_ADMIN_URL,
}

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/+$/, "").replace(/\/api:[^/]+$/, "")
}

function resolveRequestUrl(path: string) {
  const match = path.match(/^\/api:([^/]+)(\/.*)?$/)
  if (!match) {
    const origin = normalizeOrigin(XANO_BASE_URL)
    if (!origin) throw new Error("Xano is not configured")
    return `${origin}${path}`
  }

  const [, requestedGroup, suffix = ""] = match
  const group = requestedGroup === "admin-api" ? "yYNRHo4K" : requestedGroup
  if (typeof window !== "undefined") return `/api/xano/${group}${suffix}`
  const configuredGroupUrl = API_GROUPS[requestedGroup] || API_GROUPS[group] || XANO_BASE_URL
  const origin = normalizeOrigin(configuredGroupUrl)
  if (!origin) throw new Error(`Xano API group ${group} is not configured`)
  return `${origin}/api:${group}${suffix}`
}

function pickFirstNonEmpty(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (candidate == null) continue
    const value = String(candidate).trim()
    if (value) return value
  }
  return undefined
}

export function authTokenFrom(payload: any): string | undefined {
  const value = pickFirstNonEmpty(
    payload?.authToken,
    payload?.auth_token,
    payload?.token,
    payload?.access_token,
    payload?.jwt,
    payload?.authenticationToken,
    payload?.authentication_token,
    payload?.data?.authToken,
    payload?.data?.auth_token,
    payload?.data?.token,
    payload?.data?.access_token,
    payload?.data?.jwt,
    payload?.data?.authenticationToken,
    payload?.data?.authentication_token,
    payload?.session?.authToken,
    payload?.session?.auth_token,
    payload?.session?.token,
    payload?.session?.access_token,
    payload?.session?.jwt,
    payload?.session?.authenticationToken,
    payload?.session?.authentication_token,
    payload?.auth?.token,
    payload?.auth?.access_token,
    payload?.auth?.authToken,
    payload?.data?.session?.authToken,
    payload?.data?.session?.token,
    payload?.data?.session?.access_token,
    payload?.user?.authToken,
    payload?.user?.token,
    payload?.user?.access_token,
    payload?.result?.authToken,
    payload?.result?.token,
    payload?.result?.access_token,
  )
  return value
}

export function userIdFrom(payload: any): string {
  const value = pickFirstNonEmpty(
    payload?.user_id,
    payload?.userId,
    payload?.id,
    payload?.user?.id,
    payload?.data?.user_id,
    payload?.data?.userId,
    payload?.data?.id,
    payload?.data?.user?.id,
    payload?.session?.user_id,
    payload?.session?.user?.id,
    payload?.auth?.user_id,
    payload?.auth?.userId,
    payload?.auth?.id,
    payload?.data?.session?.user_id,
    payload?.data?.session?.user?.id,
  )
  return value ?? ""
}

export function normalizeAuthSession(payload: any) {
  const authToken = authTokenFrom(payload)
  if (!authToken) throw new Error(String(payload?.message || payload?.error || "Xano did not return an authentication token."))
  return { authToken, user_id: userIdFrom(payload) }
}

export function getXanoBaseUrl() { return normalizeOrigin(XANO_BASE_URL) }

export function getStoredXanoToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem(STORAGE_KEYS.authToken) ?? sessionStorage.getItem(STORAGE_KEYS.authToken)
}

export function getXanoSession() {
  if (typeof window === "undefined") return null
  const authToken = getStoredXanoToken()
  const userId = localStorage.getItem(STORAGE_KEYS.userId) || sessionStorage.getItem(STORAGE_KEYS.userId)
  return authToken ? { authToken, user_id: userId ?? "" } : null
}

export function saveXanoSession(data: { authToken: string; user_id?: string }) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.authToken, data.authToken)
  sessionStorage.setItem(STORAGE_KEYS.authToken, data.authToken)
  if (data.user_id) {
    localStorage.setItem(STORAGE_KEYS.userId, data.user_id)
    sessionStorage.setItem(STORAGE_KEYS.userId, data.user_id)
  }
}

export function clearXanoSession() {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEYS.authToken)
  localStorage.removeItem(STORAGE_KEYS.userId)
  sessionStorage.removeItem(STORAGE_KEYS.authToken)
  sessionStorage.removeItem(STORAGE_KEYS.userId)
}

function endpoint(path: string) { return resolveRequestUrl(path) }

async function xanoRequestFromBase<T>(baseUrl: string, path: string, init: RequestInit = {}, options: { auth?: boolean } = {}): Promise<T> {
  const base = baseUrl.trim().replace(/\/$/, '')
  if (!base) throw new Error('Xano payments API is not configured')
  const headers = new Headers(init.headers ?? {})
  if (options.auth) {
    const session = getXanoSession()
    if (!session?.authToken) throw new Error('Not authenticated')
    headers.set('Authorization', `Bearer ${session.authToken}`)
  }
  if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${base}${path}`, { ...init, headers, credentials: 'include', cache: 'no-store' })
  const text = await response.text()
  let body: any = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!response.ok) throw new Error(`${response.status}: ${body?.message || body?.error || 'Request failed'}`)
  return body as T
}

export function xanoPaymentsRequest<T = any>(path: string, init: RequestInit = {}, auth = false) {
  return xanoRequest<T>(`/api:dKuEO75q${path}`, init, { auth })
}

export function xanoAdminFunctionRequest<T = any>(path: string, init: RequestInit = {}) {
  return xanoRequest<T>(`/api:yYNRHo4K${path}`, init, { auth: true })
}

export async function xanoRequest<T>(path: string, init: RequestInit = {}, options: { auth?: boolean } = {}): Promise<T> {
  const url = resolveRequestUrl(path)
  const headers = new Headers(init.headers ?? {})
  const session = getXanoSession()
  const token = session?.authToken ?? getStoredXanoToken()

  if (options.auth || token) {
    if (!token) throw new Error('Not authenticated')
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (typeof init.body === "string" && init.body.length && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  let response: Response
  try {
    response = await fetch(url, { ...init, signal: init.signal ?? controller.signal, headers, credentials: "include", cache: init.cache ?? "no-store" })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("Xano request timed out. Please try again.")
    throw error
  } finally { clearTimeout(timeout) }

  const text = await response.text()
  let body: any = null
  if (text) { try { body = JSON.parse(text) } catch { body = text } }
  if (!response.ok) {
    const message = typeof body === "string" ? body : body?.message || body?.error
    throw new Error(`${response.status}: ${message || `Request failed (${response.status})`}`)
  }
  return body as T
}

export async function xanoLogin(email: string, password: string) {
  const payload = await xanoRequest<any>(endpoints.login, { method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase(), username: email.trim().toLowerCase(), password }) })
  const session = normalizeAuthSession(payload)
  saveXanoSession(session)
  return session
}

export async function xanoSignup(name: string, email: string, password: string) {
  const payload = await xanoRequest<any>(endpoints.signup, { method: "POST", body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }) })
  const session = normalizeAuthSession(payload)
  saveXanoSession(session)
  return session
}

export async function xanoRequestReset(email: string) {
  return xanoRequest<{ message: string }>(`${endpoints.requestReset}?email=${encodeURIComponent(email)}`, { method: "GET" })
}

export async function xanoMe() { return xanoRequest<Record<string, unknown>>(endpoints.me, {}, { auth: true }) }
export async function xanoAdminDashboard() { return xanoRequest<Record<string, unknown>>("/api:yYNRHo4K/fn_admin_dashboard", {}, { auth: true }) }
export async function xanoAdminPending() { return xanoRequest<Record<string, unknown>>("/api:yYNRHo4K/fn_admin_pending", {}, { auth: true }) }
export async function xanoAdminUsers() { return xanoRequest<Record<string, unknown>>("/api:yYNRHo4K/fn_admin_user_list", {}, { auth: true }) }
export async function xanoAdminInvestments() { return xanoRequest<Record<string, unknown>>("/api:yYNRHo4K/fn_admin_investments", {}, { auth: true }) }
export async function xanoAdminPnl() { return xanoRequest<Record<string, unknown>>("/api:yYNRHo4K/fn_admin_pnl", {}, { auth: true }) }
export async function xanoAdminReconciliation() { return xanoRequest<Record<string, unknown>>("/api:yYNRHo4K/fn_admin_reconciliation", {}, { auth: true }) }
export async function xanoAdminTrialBalance() { return xanoRequest<Record<string, unknown>>("/api:yYNRHo4K/fn_admin_trial_balance", {}, { auth: true }) }
export async function xanoAdminAuditLogs() { return xanoRequest<Record<string, unknown>>("/api:yYNRHo4K/fn_admin_audit_logs", {}, { auth: true }) }
export async function xanoLedgerSummary() { return xanoRequest<Record<string, unknown>>("/api:ledger-api/admin/dashboard", {}, { auth: true }) }
export async function xanoAccounts() { return xanoRequest<Record<string, unknown>>("/api:ledger-api/accounts", {}, { auth: true }) }
export async function xanoTransactions() { return xanoRequest<Record<string, unknown>>("/api:ledger-api/transactions", {}, { auth: true }) }
export async function xanoBalances() { return xanoRequest<Record<string, unknown>>("/api:ledger-api/accounts", {}, { auth: true }) }

// Generic wrappers for endpoints in the event-log and payment API groups.
export async function xanoEventLogRequest<T>(route: string, init: RequestInit = {}, auth = true) {
  return xanoRequest<T>(`/api:IkEAMc9L/${route.replace(/^\/+/, "")}`, init, { auth })
}
export async function xanoPaymentRequest<T>(route: string, init: RequestInit = {}, auth = true) {
  return xanoRequest<T>(`/api:dKuEO75q/${route.replace(/^\/+/, "")}`, init, { auth })
}

export const XANO_AUTH_ENDPOINTS = endpoints
export { XANO_BASE_URL, endpoint }
