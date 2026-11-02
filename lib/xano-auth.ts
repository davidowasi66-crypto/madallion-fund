const XANO_BASE_URL = process.env.NEXT_PUBLIC_XANO_BASE_URL ?? process.env.XANO_BASE_URL ?? ""

const endpoints = {
  login: "/api:r2YmAApr/auth/login",
  signup: "/api:r2YmAApr/auth/signup",
  me: "/api:r2YmAApr/auth/me",
  requestReset: "/api:r2YmAApr/reset/request-reset-link",
} as const

const storageKeys = {
  authToken: "madallion_auth_token",
  userId: "madallion_user_id",
} as const

function endpoint(path: string) {
  if (!XANO_BASE_URL) throw new Error("Xano is not configured")
  return `${XANO_BASE_URL.replace(/\/$/, "")}${path}`
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function getXanoSession() {
  if (typeof window === "undefined") return null

  const authToken = window.localStorage.getItem(storageKeys.authToken)
  const userId = window.localStorage.getItem(storageKeys.userId)

  if (!authToken) return null

  return { authToken, user_id: userId ?? "" }
}

export function saveXanoSession(data: { authToken: string; user_id: string }) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(storageKeys.authToken, data.authToken)
  window.localStorage.setItem(storageKeys.userId, data.user_id)
}

export function clearXanoSession() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(storageKeys.authToken)
  window.localStorage.removeItem(storageKeys.userId)
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.message || "Request failed")
  return body
}

export async function xanoLogin(email: string, password: string) {
  const cleanedEmail = normalizeEmail(email)
  const cleanedPassword = password.trim()

  if (!cleanedEmail || !cleanedPassword) {
    throw new Error("Email and password are required")
  }

  const response = await fetch(endpoint(endpoints.login), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanedEmail, password: cleanedPassword }),
  })

  return parseResponse(response) as Promise<{ authToken: string; user_id: string }>
}

export async function xanoSignup(name: string, email: string, password: string) {
  const cleanedName = name.trim()
  const cleanedEmail = normalizeEmail(email)
  const cleanedPassword = password.trim()

  if (!cleanedName || !cleanedEmail || !cleanedPassword) {
    throw new Error("Name, email, and password are required")
  }

  const response = await fetch(endpoint(endpoints.signup), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: cleanedName, email: cleanedEmail, password: cleanedPassword }),
  })

  return parseResponse(response) as Promise<{ authToken: string; user_id: string }>
}

export async function xanoRequestReset(email: string) {
  const cleanedEmail = normalizeEmail(email)

  if (!cleanedEmail) {
    throw new Error("Email is required")
  }

  const response = await fetch(`${endpoint(endpoints.requestReset)}?email=${encodeURIComponent(cleanedEmail)}`, {
    method: "GET",
  })

  return parseResponse(response) as Promise<{ message: string }>
}
