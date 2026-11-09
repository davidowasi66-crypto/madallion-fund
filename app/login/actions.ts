import { xanoLogin } from '@/lib/xano-auth'

export type LoginState = { ok: true; session: { authToken: string; user_id: string } } | { ok: false; error: string }

export async function loginAction(_previous: LoginState | null, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { ok: false, error: 'Enter your email and password.' }

  try {
    // xanoLogin normalizes the Swagger response (including authToken/auth_token,
    // authentication_token, authenticationToken, token, or access_token).
    const session = await xanoLogin(email, password)
    return { ok: true, session }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to reach the authentication service.' }
  }
}
