'use server'

import { headers } from 'next/headers'

function stripGroupSuffix(value: string) {
  return value.trim().replace(/\/+$/, '').replace(/\/api:[^/]+$/, '')
}

const BASE_URL = stripGroupSuffix(
  process.env.NEXT_PUBLIC_XANO_AUTH_URL ??
    process.env.XANO_AUTH_URL ??
    process.env.NEXT_PUBLIC_XANO_BASE_URL ??
    process.env.XANO_BASE_URL ??
    '',
)

export type LoginState = { ok: true; session: { authToken: string; user_id: string } } | { ok: false; error: string }

export async function loginAction(_previous: LoginState | null, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { ok: false, error: 'Enter your email and password.' }
  if (!BASE_URL) return { ok: false, error: 'Authentication is not configured.' }

  try {
    const response = await fetch(`${BASE_URL}/api:r2YmAApr/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-host': (await headers()).get('host') ?? '' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
      cache: 'no-store',
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) return { ok: false, error: body?.message || body?.error || 'Invalid email or password.' }

    const authToken = body?.authToken ?? body?.auth_token ?? body?.token ?? body?.data?.authToken ?? body?.data?.auth_token ?? body?.data?.token ?? body?.session?.authToken ?? body?.session?.auth_token ?? body?.session?.token
    if (!authToken) return { ok: false, error: body?.message || body?.error || 'The login response did not include an auth token.' }

    const userId = body?.user_id ?? body?.userId ?? body?.id ?? body?.user?.id ?? body?.data?.user_id ?? body?.data?.userId ?? body?.data?.id ?? body?.data?.user?.id ?? body?.session?.user_id ?? body?.session?.user?.id
    return { ok: true, session: { authToken: String(authToken), user_id: userId == null ? '' : String(userId) } }
  } catch {
    return { ok: false, error: 'Unable to reach the authentication service. Try again.' }
  }
}
