const XANO_BASE_URL = process.env.NEXT_PUBLIC_XANO_BASE_URL ?? process.env.XANO_BASE_URL ?? ""

const endpoints = {
  login: "/api:r2YmAApr/auth/login",
  signup: "/api:r2YmAApr/auth/signup",
  me: "/api:r2YmAApr/auth/me",
  requestReset: "/api:r2YmAApr/reset/request-reset-link",
} as const

function endpoint(path: string) {
  if (!XANO_BASE_URL) throw new Error("Xano is not configured")
  return `${XANO_BASE_URL.replace(/\/$/, "")}${path}`
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.message || "Request failed")
  return body
}

export async function xanoLogin(email: string, password: string) {
  const response = await fetch(endpoint(endpoints.login), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  return parseResponse(response) as Promise<{ authToken: string; user_id: string }>
}

export async function xanoSignup(name: string, email: string, password: string) {
  const response = await fetch(endpoint(endpoints.signup), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  })
  return parseResponse(response) as Promise<{ authToken: string; user_id: string }>
}

export async function xanoRequestReset(email: string) {
  const response = await fetch(`${endpoint(endpoints.requestReset)}?email=${encodeURIComponent(email)}`, {
    method: "GET",
  })
  return parseResponse(response) as Promise<{ message: string }>
}

export function saveXanoSession(data: { authToken: string; user_id: string }) {
  sessionStorage.setItem("madallion_auth_token", data.authToken)
  sessionStorage.setItem("madallion_user_id", data.user_id)
}
