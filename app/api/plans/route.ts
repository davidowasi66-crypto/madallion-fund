import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_PLANS } from '@/lib/default-plans'
import { normalizePlan, unwrapList, type Plan } from '@/lib/investment-api'

const SESSION_COOKIE = 'madallion_xano_session'

function ledgerBase(): string {
  const raw = (process.env.NEXT_PUBLIC_XANO_LEDGER_URL ?? process.env.XANO_LEDGER_URL ?? '').trim().replace(/\/+$/, '')
  if (!raw) return ''
  return raw.includes('/api:') ? raw : `${raw}/api:ledger-api`
}

function publicPlansUrl(): string {
  return (process.env.XANO_PUBLIC_PLANS_URL ?? process.env.NEXT_PUBLIC_XANO_PUBLIC_PLANS_URL ?? '').trim()
}

function normalizeCatalogue(payload: unknown): Plan[] {
  return unwrapList(payload, ['plans', 'items', 'data'])
    .map(normalizePlan)
    .filter((plan): plan is Plan => plan !== null)
}

async function fetchPlans(url: string, token?: string): Promise<Plan[]> {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) return []
  return normalizeCatalogue(await response.json())
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const publicUrl = publicPlansUrl()
  if (publicUrl) {
    try {
      const plans = await fetchPlans(publicUrl)
      if (plans.length) {
        return NextResponse.json(
          { plans, source: 'live', updated_at: new Date().toISOString() },
          { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } },
        )
      }
    } catch {}
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const base = ledgerBase()
  if (token && base) {
    try {
      const plans = await fetchPlans(`${base}/plans`, token)
      if (plans.length) {
        return NextResponse.json(
          { plans, source: 'live', updated_at: new Date().toISOString() },
          { headers: { 'Cache-Control': 'private, max-age=15' } },
        )
      }
    } catch {}
  }

  return NextResponse.json(
    {
      plans: DEFAULT_PLANS,
      source: 'fallback',
      updated_at: new Date().toISOString(),
      note: 'Public sample terms. Live plan terms load after the ledger returns a public or authenticated catalogue.',
    },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } },
  )
}
