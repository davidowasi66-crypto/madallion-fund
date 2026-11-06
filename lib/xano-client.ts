const XANO_BASE_URL = process.env.NEXT_PUBLIC_XANO_BASE_URL ?? process.env.XANO_BASE_URL ?? ""
const XANO_AUTH_URL = process.env.NEXT_PUBLIC_XANO_AUTH_URL ?? process.env.XANO_AUTH_URL ?? ""
const XANO_EVENT_LOG_URL = process.env.NEXT_PUBLIC_XANO_EVENT_LOG_URL ?? process.env.XANO_EVENT_LOG_URL ?? ""
const XANO_LEDGER_URL = process.env.NEXT_PUBLIC_XANO_LEDGER_URL ?? process.env.XANO_LEDGER_URL ?? ""
const XANO_ADMIN_URL = process.env.NEXT_PUBLIC_XANO_ADMIN_URL ?? process.env.XANO_ADMIN_URL ?? ""
const XANO_PAYMENT_URL = process.env.NEXT_PUBLIC_XANO_PAYMENT_URL ?? process.env.XANO_PAYMENT_URL ?? ""

const API_GROUPS: Record<string, string> = {
  r2YmAApr: XANO_AUTH_URL,
  IkEAMc9L: XANO_EVENT_LOG_URL,
  "ledger-api": XANO_LEDGER_URL,
  yYNRHo4K: XANO_ADMIN_URL,
  dKuEO75q: XANO_PAYMENT_URL,
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
  const origin = normalizeOrigin(API_GROUPS[requestedGroup] || API_GROUPS[group] || XANO_BASE_URL)
  if (!origin) throw new Error(`Xano API group ${group} is not configured`)
  return `${origin}/api:${group}${suffix}`
}

export function normalizeBaseUrl() { return normalizeOrigin(XANO_BASE_URL) }

export function getStoredXanoToken() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem("madallion_auth_token") ?? window.sessionStorage.getItem("madallion_auth_token")
}

export function buildXanoHeaders(token?: string | null, init?: RequestInit) {
  const headers = new Headers(init?.headers ?? {})
  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) headers.set("Content-Type", "application/json")
  const resolvedToken = token ?? getStoredXanoToken()
  if (resolvedToken) headers.set("Authorization", `Bearer ${resolvedToken}`)
  return headers
}

export function buildQuery(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return endpoint
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== "") query.append(key, String(value)) })
  const qs = query.toString()
  return qs ? `${endpoint}?${qs}` : endpoint
}

export async function xanoRequest<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const url = resolveRequestUrl(path)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  let response: Response
  try {
    response = await fetch(url, { ...options, signal: options.signal ?? controller.signal, headers: buildXanoHeaders(token, options), credentials: "include", cache: options.cache ?? "no-store" })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("Xano request timed out. Please try again.")
    throw error
  } finally { clearTimeout(timeout) }
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    let message = text
    try { const parsed = JSON.parse(text); message = parsed?.message || parsed?.error || text } catch { /* Keep plain response text. */ }
    throw new Error(`${response.status}: ${message || "Xano request failed"}`)
  }
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) return (await response.text()) as unknown as T
  return (await response.json()) as T
}

export function getFirstValue(data: any, paths: string[]) {
  for (const path of paths) {
    const value = path.split(".").reduce<any>((acc, key) => acc == null ? undefined : acc[key], data)
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

export function toMoney(value: unknown, fallback = "₦0") {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? `₦${Math.abs(numeric).toLocaleString()}` : fallback
}

export async function xanoAuthLogin(email: string, password: string) { return xanoRequest<any>("/api:r2YmAApr/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }) }
export async function xanoAuthSignup(name: string, email: string, password: string) { return xanoRequest<any>("/api:r2YmAApr/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) }) }
export async function xanoAuthMe(token?: string | null) { return xanoRequest<any>("/api:r2YmAApr/auth/me", { method: "GET" }, token) }
export async function xanoResetRequest(email: string) { return xanoRequest<any>(buildQuery("/api:r2YmAApr/reset/request-reset-link", { email }), { method: "GET" }) }
export async function xanoAdminDashboard(token?: string | null) { return xanoRequest<any>("/api:yYNRHo4K/fn_admin_dashboard", { method: "GET" }, token) }
export async function xanoAdminUsers(token?: string | null, query?: Record<string, string | number | undefined>) { return xanoRequest<any>(buildQuery("/api:yYNRHo4K/fn_admin_user_list", query), { method: "GET" }, token) }
export async function xanoAdminPending(token?: string | null, p_kind = "deposits", page = 1, perPage = 25) { return xanoRequest<any>(buildQuery("/api:yYNRHo4K/fn_admin_pending", { p_kind, page, per_page: perPage }), { method: "GET" }, token) }
export async function xanoAdminInvestments(token?: string | null, page = 1, perPage = 25) { return xanoRequest<any>(buildQuery("/api:yYNRHo4K/fn_admin_investments", { page, per_page: perPage }), { method: "GET" }, token) }
export async function xanoAdminTrialBalance(token?: string | null, ledgerId = 1) { return xanoRequest<any>(buildQuery("/api:yYNRHo4K/fn_admin_trial_balance", { ledger_id: ledgerId }), { method: "GET" }, token) }
export async function xanoAdminReconciliation(token?: string | null, ledgerId = 1) { return xanoRequest<any>(buildQuery("/api:yYNRHo4K/fn_admin_reconciliation", { ledger_id: ledgerId }), { method: "GET" }, token) }
export async function xanoAdminAuditLogs(token?: string | null, page = 1, perPage = 25) { return xanoRequest<any>(buildQuery("/api:yYNRHo4K/fn_admin_audit_logs", { page, per_page: perPage }), { method: "GET" }, token) }
export async function xanoLedgerDashboard(token?: string | null) { return xanoRequest<any>("/api:ledger-api/admin/dashboard", { method: "GET" }, token) }
export async function xanoLedgerAccounts(token?: string | null, query?: Record<string, string | number | undefined>) { return xanoRequest<any>(buildQuery("/api:ledger-api/accounts", query), { method: "GET" }, token) }
export async function xanoLedgerAccount(token: string | null | undefined, accountId: string | number) { return xanoRequest<any>(`/api:ledger-api/accounts/${encodeURIComponent(accountId)}`, { method: "GET" }, token) }
export async function xanoLedgerTransactions(token?: string | null, query?: Record<string, string | number | undefined>) { return xanoRequest<any>(buildQuery("/api:ledger-api/transactions", query), { method: "GET" }, token) }
export async function xanoLedgerTrialBalance(token?: string | null, ledgerId = 1) { return xanoRequest<any>(buildQuery("/api:ledger-api/reports/trial-balance", { ledger_id: ledgerId }), { method: "GET" }, token) }
export async function xanoEventLogRequest<T>(route: string, options: RequestInit = {}, token?: string | null) { return xanoRequest<T>(`/api:IkEAMc9L/${route.replace(/^\/+/, "")}`, options, token) }
export async function xanoPaymentRequest<T>(route: string, options: RequestInit = {}, token?: string | null) { return xanoRequest<T>(`/api:dKuEO75q/${route.replace(/^\/+/, "")}`, options, token) }

export function toTitleCase(value: string) { return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").split(" ").filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(" ") }
export function toNumeric(value: unknown, fallback = 0) { const num = Number(value); return Number.isFinite(num) ? num : fallback }
export function chooseArray<T>(candidate: unknown, fallback: T[]): T[] { return Array.isArray(candidate) ? candidate as T[] : fallback }
