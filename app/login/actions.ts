import { xanoRequest } from '@/lib/xano-auth'

function tokenFrom(payload: any): string | undefined {
  const candidates = [
    payload?.authToken,
    payload?.auth_token,
    payload?.token,
    payload?.access_token,
    payload?.authenticationToken,
    payload?.authentication_token,
    payload?.data?.authToken,
    payload?.data?.auth_token,
    payload?.data?.token,
    payload?.data?.access_token,
    payload?.data?.authenticationToken,
    payload?.data?.authentication_token,
    payload?.session?.authToken,
    payload?.session?.auth_token,
    payload?.session?.token,
    payload?.session?.access_token,
    payload?.session?.authenticationToken,
    payload?.session?.authentication_token,
  ]

  const value = candidates.find((candidate) => candidate != null && String(candidate).trim() !== '')
  return value == null ? undefined : String(value)
}

function userIdFrom(payload: any): string {
  const value = payload?.user_id ?? payload?.userId ?? payload?.id ?? payload?.user?.id ??
    payload?.data?.user_id ?? payload?.data?.userId ?? payload?.data?.id ?? payload?.data?.user?.id ??
    payload?.session?.user_id ?? payload?.session?.user?.id
  return value == null ? '' : String(value)
}

export type LoginState = { ok: true; session: { authToken: string; user_id: string } } | { ok: false; error: string }

export async function loginAction(_previous: LoginState | null, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { ok: false, error: 'Enter your email and password.' }
  try {
    const body = await xanoRequest<any>('/api:r2YmAApr/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username: email, password }),
    })
    const authToken = tokenFrom(body)
    if (!authToken) return { ok: false, error: body?.message || body?.error || 'Login succeeded but Xano did not return an auth token. Check the login response schema in Swagger.' }
    return { ok: true, session: { authToken, user_id: userIdFrom(body) } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to reach the authentication service.' }
  }
}
