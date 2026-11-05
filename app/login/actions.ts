'use server'

import { headers } from 'next/headers'

const BASE_URL = (process.env.NEXT_PUBLIC_XANO_BASE_URL ?? process.env.XANO_BASE_URL ?? '').trim().replace(/\/api:[^/]+\/?$/, '').replace(/\/$/, '')

export type LoginState = { ok: true; session: { authToken: string; user_id: string } } | { ok: false; error: string }

export async function loginAction(_previous: LoginState | null, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
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
    const authToken = body?.authToken ?? body?.auth_token ?? body?.token
    if (!authToken) return { ok: false, error: 'The login response did not include an auth token.' }
    return { ok: true, session: { authToken: String(authToken), user_id: String(body.user_id ?? body.userId ?? body.id ?? '') } }
  } catch {
    return { ok: false, error: 'Unable to reach the authentication service. Try again.' }
  }
}
