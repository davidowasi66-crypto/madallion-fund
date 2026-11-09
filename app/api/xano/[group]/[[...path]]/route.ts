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

async function forward(request: NextRequest, { params }: { params: Promise<{ group: string; path?: string[] }> }) {
  try {
    const { group, path = [] } = await params
    const base = xanoBase(group)
    const target = `${base}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`
    const headers = new Headers(request.headers)
    for (const header of ['connection', 'keep-alive', 'host', 'content-length', 'transfer-encoding', 'upgrade', 'te', 'trailer', 'accept-encoding']) {
      headers.delete(header)
    }
    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    let response: Response
    try {
      response = await fetch(target, { method: request.method, headers, body, redirect: 'manual', cache: 'no-store', signal: controller.signal })
    } finally {
      clearTimeout(timeout)
    }
    const responseHeaders = new Headers(response.headers)
    for (const header of ['connection', 'content-encoding', 'content-length', 'transfer-encoding']) {
      responseHeaders.delete(header)
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
