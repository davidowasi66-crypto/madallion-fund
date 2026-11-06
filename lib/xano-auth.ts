const XANO_BASE_URL = process.env.NEXT_PUBLIC_XANO_BASE_URL ?? process.env.XANO_BASE_URL ?? ""
const XANO_AUTH_URL = process.env.NEXT_PUBLIC_XANO_AUTH_URL ?? process.env.XANO_AUTH_URL ?? ""
const XANO_LEDGER_URL = process.env.NEXT_PUBLIC_XANO_LEDGER_URL ?? process.env.XANO_LEDGER_URL ?? ""

const endpoints = {
  login: "/api:r2YmAApr/auth/login",
  signup: "/api:r2YmAApr/auth/signup",
  me: "/api:r2YmAApr/auth/me",
  requestReset: "/api:r2YmAApr/reset/request-reset-link",
} as const

const STORAGE_KEYS = {
  authToken: "madallion_auth_token",
  userId: "madallion_user_id",
} as const

function stripGroupSuffix(value: string) {
  return value.trim().replace(/\/+$/, "").replace(/\/api:[^/]+$/, "")
}

function normalizeUrl(value: string) {
  return stripGroupSuffix(value)
}

function getEndpointBaseUrl(path: string) {
  if (path.startsWith("/api:r2YmAApr/")) return normalizeUrl(XANO_AUTH_URL || XANO_BASE_URL)
  if (path.startsWith("/api:ledger-api/")) return normalizeUrl(XANO_LEDGER_URL || XANO_BASE_URL)
  if (path.startsWith("/api:yYNRHo4K/") || path.startsWith("/api:admin-api/")) {
    return normalizeUrl(XANO_BASE_URL)
  }
  return normalizeUrl(XANO_BASE_URL)
}

export function getXanoBaseUrl() {
  return normalizeUrl(XANO_BASE_URL)
}

export function getXanoSession() {
  if (typeof window === "undefined") return null

  const authToken = localStorage.getItem(STORAGE_KEYS.authToken) || sessionStorage.getItem(STORAGE_KEYS.authToken)
  const userId = localStorage.getItem(STORAGE_KEYS.userId) || sessionStorage.getItem(STORAGE_KEYS.userId)

  if (!authToken) return null

  return { authToken, user_id: userId ?? "" }
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

function endpoint(path: string) {
  const base = getXanoBaseUrl()
  if (!base) throw new Error("Xano is not configured")
  return `${base}${path}`
}

export async function xanoRequest<T>(path: string, init: RequestInit = {}, options: { auth?: boolean } = {}): Promise<T> {
  const base = getEndpointBaseUrl(path)
  if (!base) throw new Error("Xano is not configured.")

  const headers = new Headers(init.headers ?? {})

  if (options.auth) {
    const session = getXanoSession()
    if (!session?.authToken) throw new Error("Not authenticated")
    headers.set("Authorization", `Bearer ${session.authToken}`)
  }

  const hasBody = typeof init.body === "string" && init.body.length > 0
  if (hasBody && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  let response: Response

  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      signal: init.signal ?? controller.signal,
      headers,
      credentials: "include",
      cache: init.cache ?? "no-store",
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Xano request timed out. Please try again.")
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }

  const text = await response.text()
  let body: any = null

  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!response.ok) {
    const message = typeof body === "string" ? body : body?.message || body?.error
    throw new Error(`${response.status}: ${message || `Request failed (${response.status})`}`)
  }

  return body as T
}

export async function xanoLogin(email: string, password: string) {
  return xanoRequest<{ authToken: string; user_id?: string }>(endpoints.login, {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  })
}

export async function xanoSignup(name: string, email: string, password: string) {
  return xanoRequest<{ authToken: string; user_id?: string }>(endpoints.signup, {
    method: "POST",
    body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
  })
}

export async function xanoRequestReset(email: string) {
  return xanoRequest<{ message: string }>(`${endpoints.requestReset}?email=${encodeURIComponent(email)}`, {
    method: "GET",
  })
}

export async function xanoMe() {
  return xanoRequest<Record<string, unknown>>(endpoints.me, {}, { auth: true })
}

export async function xanoAdminDashboard() {
  return xanoRequest<Record<string, unknown>>("/api:yYNRHo4K/fn_admin_dashboard", {}, { auth: true })
}

export async function xanoAdminPending() {
  return xanoRequest<Record<string, unknown>>("/api:admin-api/fn_admin_pending", {}, { auth: true })
}

export async function xanoAdminUsers() {
  return xanoRequest<Record<string, unknown>>("/api:admin-api/fn_admin_user_list", {}, { auth: true })
}

export async function xanoAdminInvestments() {
  return xanoRequest<Record<string, unknown>>("/api:yYNRHo4K/fn_admin_investments", {}, { auth: true })
}

export async function xanoAdminPnl() {
  return xanoRequest<Record<string, unknown>>("/api:yYNRHo4K/fn_admin_pnl", {}, { auth: true })
}

export async function xanoAdminReconciliation() {
  return xanoRequest<Record<string, unknown>>("/api:yYNRHo4K/fn_admin_reconciliation", {}, { auth: true })
}

export async function xanoAdminTrialBalance() {
  return xanoRequest<Record<string, unknown>>("/api:yYNRHo4K/fn_admin_trial_balance", {}, { auth: true })
}

export async function xanoAdminAuditLogs() {
  return xanoRequest<Record<string, unknown>>("/api:yYNRHo4K/fn_admin_audit_logs", {}, { auth: true })
}

export async function xanoLedgerSummary() {
  return xanoRequest<Record<string, unknown>>("/api:ledger-api/ledger/summary", {}, { auth: true })
}

export async function xanoAccounts() {
  return xanoRequest<Record<string, unknown>>("/api:ledger-api/accounts", {}, { auth: true })
}

export async function xanoTransactions() {
  return xanoRequest<Record<string, unknown>>("/api:ledger-api/transactions", {}, { auth: true })
}

export async function xanoBalances() {
  return xanoRequest<Record<string, unknown>>("/api:ledger-api/balances", {}, { auth: true })
}

export const XANO_AUTH_ENDPOINTS = endpoints

export { XANO_BASE_URL, endpoint }

