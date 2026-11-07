import { NextRequest, NextResponse } from 'next/server'

const groupEnv: Record<string, string | undefined> = {
  'r2YmAApr': process.env.XANO_AUTH_URL,
  'IkEAMc9L': process.env.XANO_EVENTLOG_URL,
  'ledger-api': process.env.XANO_LEDGER_URL,
  'yYNRHo4K': process.env.xanoAdminUrl ?? process.env.XANO_ADMIN_URL,
  'dKuEO75q': process.env.XANO_PAYMENTS ?? process.env.XANO_PAYMENT_URL,
}

function xanoBase(group: string) {
  const configured = groupEnv[group]?.trim().replace(/\/+$/, '')
  if (!configured) throw new Error(`Xano API group ${group} is not configured`)
  return configured.replace(/\/api:[^/]+$/, '') + `/api:${group}`
}

async function forward(request: NextRequest, { params }: { params: Promise<{ group: string; path?: string[] }> }) {
  const { group, path = [] } = await params
  const base = xanoBase(group)
  const target = `${base}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`
  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('content-length')
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer()
  try {
    const response = await fetch(target, { method: request.method, headers, body, redirect: 'manual', cache: 'no-store' })
    return new NextResponse(response.body, { status: response.status, headers: response.headers })
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
