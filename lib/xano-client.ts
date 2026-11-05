const XANO_BASE_URL = process.env.NEXT_PUBLIC_XANO_BASE_URL ?? process.env.XANO_BASE_URL ?? ""

export function normalizeBaseUrl() {
  return XANO_BASE_URL.trim().replace(/\/api:[^/]+\/?$/, "").replace(/\/$/, "")
}

export function getStoredXanoToken() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem("madallion_auth_token")
}

export function buildXanoHeaders(token?: string | null, init?: RequestInit) {
  const headers = new Headers(init?.headers ?? {})

  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  const resolvedToken = token ?? getStoredXanoToken()
  if (resolvedToken) headers.set("Authorization", `Bearer ${resolvedToken}`)

  return headers
}

export function buildQuery(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return endpoint

  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    query.append(key, String(value))
  })

  const qs = query.toString()
  return qs ? `${endpoint}?${qs}` : endpoint
}

export async function xanoRequest<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const baseUrl = normalizeBaseUrl()
  if (!baseUrl) {
    throw new Error("Xano base URL is not configured. Set NEXT_PUBLIC_XANO_BASE_URL or XANO_BASE_URL.")
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: buildXanoHeaders(token, options),
    credentials: 'include',
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(text || `Xano request failed with status ${response.status}`)
  }

  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    return (await response.text()) as unknown as T
  }

  return (await response.json()) as T
}

export function getFirstValue(data: any, paths: string[]) {
  const queue = [...paths]

  while (queue.length) {
    const path = queue.shift()!
    const value = path.split(".").reduce<any>((acc, key) => {
      if (acc == null) return undefined
      return acc[key]
    }, data)

    if (value !== undefined && value !== null) return value
  }

  return undefined
}

export function toMoney(value: unknown, fallback = "₦0") {
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return `₦${Math.abs(numeric).toLocaleString()}`
  }
  return fallback
}

export async function xanoAuthLogin(email: string, password: string) {
  return xanoRequest<any>("/api:r2YmAApr/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export async function xanoAuthSignup(name: string, email: string, password: string) {
  return xanoRequest<any>("/api:r2YmAApr/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  })
}

export async function xanoAuthMe(token?: string | null) {
  return xanoRequest<any>("/api:r2YmAApr/auth/me", { method: "GET" }, token)
}

export async function xanoResetRequest(email: string) {
  return xanoRequest<any>(buildQuery("/api:r2YmAApr/reset/request-reset-link", { email }), {
    method: "GET",
  })
}

export async function xanoAdminDashboard(token?: string | null) {
  return xanoRequest<any>("/api:yYNRHo4K/fn_admin_dashboard", { method: "GET" }, token)
}

export async function xanoAdminUsers(token?: string | null, query?: Record<string, string | number | undefined>) {
  return xanoRequest<any>(buildQuery("/api:yYNRHo4K/fn_admin_user_list", query), { method: "GET" }, token)
}

export async function xanoAdminPending(token?: string | null, p_kind = "deposits", page = 1, perPage = 25) {
  return xanoRequest<any>(
    buildQuery("/api:yYNRHo4K/fn_admin_pending", { p_kind, page, per_page: perPage }),
    { method: "GET" },
    token,
  )
}

export async function xanoAdminInvestments(token?: string | null, page = 1, perPage = 25) {
  return xanoRequest<any>(
    buildQuery("/api:yYNRHo4K/fn_admin_investments", { page, per_page: perPage }),
    { method: "GET" },
    token,
  )
}

export async function xanoAdminTrialBalance(token?: string | null, ledgerId = 1) {
  return xanoRequest<any>(
    buildQuery("/api:yYNRHo4K/fn_admin_trial_balance", { ledger_id: ledgerId }),
    { method: "GET" },
    token,
  )
}

export async function xanoAdminReconciliation(token?: string | null, ledgerId = 1) {
  return xanoRequest<any>(
    buildQuery("/api:yYNRHo4K/fn_admin_reconciliation", { ledger_id: ledgerId }),
    { method: "GET" },
    token,
  )
}

export async function xanoAdminAuditLogs(token?: string | null, page = 1, perPage = 25) {
  return xanoRequest<any>(
    buildQuery("/api:yYNRHo4K/fn_admin_audit_logs", { page, per_page: perPage }),
    { method: "GET" },
    token,
  )
}

export async function xanoLedgerDashboard(token?: string | null) {
  return xanoRequest<any>("/api:ledger-api/admin/dashboard", { method: "GET" }, token)
}

export async function xanoLedgerAccounts(token?: string | null, query?: Record<string, string | number | undefined>) {
  return xanoRequest<any>(buildQuery("/api:ledger-api/accounts", query), { method: "GET" }, token)
}

export async function xanoLedgerTransactions(token?: string | null, query?: Record<string, string | number | undefined>) {
  return xanoRequest<any>(buildQuery("/api:ledger-api/transactions", query), { method: "GET" }, token)
}

export async function xanoLedgerTrialBalance(token?: string | null, ledgerId = 1) {
  return xanoRequest<any>(buildQuery("/api:ledger-api/reports/trial-balance", { ledger_id: ledgerId }), { method: "GET" }, token)
}

export function toTitleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

export function toNumeric(value: unknown, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

export function chooseArray<T>(candidate: unknown, fallback: T[]): T[] {
  if (Array.isArray(candidate)) return candidate as T[]
  return fallback
}
