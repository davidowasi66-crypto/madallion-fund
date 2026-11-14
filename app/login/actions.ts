'use server'

import { cookies } from 'next/headers'
import { authTokenFrom, normalizeAuthSession, xanoRequest, XANO_AUTH_ENDPOINTS } from '@/lib/xano-auth'

export type LoginState = { ok: true; session: { authenticated: true; user_id: string } } | { ok: false; error: string }

export async function loginAction(_previous: LoginState | null, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { ok: false, error: 'Enter your email and password.' }

  try {
    const payload = await xanoRequest<any>(XANO_AUTH_ENDPOINTS.login, { method: 'POST', body: JSON.stringify({ email, username: email, password }) })
    const token = authTokenFrom(payload)
    if (!token) throw new Error(String(payload?.message || payload?.error || 'Xano did not return an authentication token.'))
    const session = normalizeAuthSession({ ...payload, authenticated: true })
    const cookieStore = await cookies()
    cookieStore.set('madallion_xano_session', token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/xano', maxAge: 60 * 60 * 24 * 30 })
    return { ok: true, session }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to reach the authentication service.' }
  }
}
