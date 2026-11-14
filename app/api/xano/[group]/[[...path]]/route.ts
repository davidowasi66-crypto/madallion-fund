import { NextRequest, NextResponse } from 'next/server'

const groupEnv: Record<string, string | undefined> = {
  r2YmAApr: process.env.NEXT_PUBLIC_XANO_AUTH_URL ?? process.env.XANO_AUTH_URL,
  IkEAMc9L: process.env.NEXT_PUBLIC_XANO_EVENT_LOG_URL ?? process.env.XANO_EVENT_LOG_URL ?? process.env.XANO_EVENTLOG_URL,
  'ledger-api': process.env.NEXT_PUBLIC_XANO_LEDGER_URL ?? process.env.XANO_LEDGER_URL,
  yYNRHo4K: process.env.NEXT_PUBLIC_XANO_ADMIN_URL ?? process.env.XANO_ADMIN_URL ?? process.env.xanoAdminUrl,
  dKuEO75q: process.env.NEXT_PUBLIC_XANO_PAYMENT_URL ?? process.env.XANO_PAYMENT_URL ?? process.env.XANO_PAYMENTS,
}

function xanoBase(group: string) {
  const configured = groupEnv[group]?.trim().replace(/\/+$/, '')
  if (!configured) throw new Error(`Xano API group ${group} is not configured. Add its XANO URL environment variable in Vercel.`)
  return configured.replace(/\/api:[^/]+$/, '') + `/api:${group}`
}

const SESSION_COOKIE = 'madallion_xano_session'
const TOKEN_KEYS = new Set(['authtoken', 'auth_token', 'authentication_token', 'authenticationtoken', 'token', 'access_token'])

function findToken(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  for (const [key, nested] of Object.entries(value)) {
    if (TOKEN_KEYS.has(key.toLowerCase()) && (typeof nested === 'string' || typeof nested === 'number') && String(nested).trim()) return String(nested).trim()
    const found = findToken(nested)
    if (found) return found
  }
  return undefined
}

function withoutTokens(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutTokens)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).filter(([key]) => !TOKEN_KEYS.has(key.toLowerCase())).map(([key, nested]) => [key, withoutTokens(nested)]))
}

async function forward(request: NextRequest, { params }: { params: Promise<{ group: string; path?: string[] }> }) {
  try {
    const { group, path = [] } = await params
    const origin = request.headers.get('origin')
    const fetchSite = request.headers.get('sec-fetch-site')
    if ((origin && origin !== request.nextUrl.origin) || fetchSite === 'cross-site') {
      return NextResponse.json({ message: 'Cross-origin request blocked' }, { status: 403 })
    }

    const base = xanoBase(group)
    const target = `${base}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`
    const headers = new Headers(request.headers)
    for (const header of ['connection', 'keep-alive', 'host', 'content-length', 'transfer-encoding', 'upgrade', 'te', 'trailer', 'accept-encoding', 'cookie', 'set-cookie', 'authorization']) {
      headers.delete(header)
    }
    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value
    if (sessionToken) headers.set('Authorization', `Bearer ${sessionToken}`)

    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)
    let response: Response
    try {
      response = await fetch(target, { method: request.method, headers, body, redirect: 'manual', cache: 'no-store', signal: controller.signal })
    } finally {
      clearTimeout(timeout)
    }

    const isAuthResponse = group === 'r2YmAApr' && path[0] === 'auth' && ['login', 'signup'].includes(path[1] ?? '')
    const responseHeaders = new Headers(response.headers)
    for (const header of ['connection', 'content-encoding', 'content-length', 'transfer-encoding', 'set-cookie']) responseHeaders.delete(header)

    if (isAuthResponse && response.ok) {
      const text = await response.text()
      let payload: unknown
      try { payload = text ? JSON.parse(text) : null } catch { payload = null }
      const token = findToken(payload)
      if (token) {
        const safePayload = payload && typeof payload === 'object' ? { ...(withoutTokens(payload) as Record<string, unknown>), authenticated: true } : { authenticated: true }
        const result = NextResponse.json(safePayload, { status: response.status, headers: responseHeaders })
        result.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/xano', maxAge: 60 * 60 * 24 * 30 })
        return result
      }
      return NextResponse.json({ message: 'Authentication service did not return a session.' }, { status: 502 })
    }

    return new NextResponse(response.body, { status: response.status, headers: responseHeaders })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to reach Xano' }, { status: 502 })
  }
}

export const GET = forward
export const POST = forward
export const PUT = forward
export const PATCH = forward
export const DELETE = forward
export const HEAD = forward
