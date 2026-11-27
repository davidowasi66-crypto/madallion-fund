import type { Plan } from '@/lib/investment-api'

function positiveAmount(value: unknown): number | null {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null
}

/** Prefilled wallet deposit. Unauthenticated visitors are routed through login with this as the next path. */
export function planDepositHref(plan: Partial<Plan>, amount?: number): string {
  const params = new URLSearchParams({ mode: 'deposit' })
  const planId = Number(plan.id)
  if (Number.isFinite(planId) && planId > 0) params.set('plan', String(planId))
  const value = positiveAmount(amount ?? plan.min_amount)
  if (value) params.set('amount', String(value))
  return `/dashboard/wallet?${params.toString()}`
}

/** Registration path that returns the new member directly to the prefilled deposit. */
export function registerForPlanHref(plan: Partial<Plan>, amount?: number): string {
  const next = planDepositHref(plan, amount)
  const params = new URLSearchParams()
  const planId = Number(plan.id)
  if (Number.isFinite(planId) && planId > 0) params.set('plan', String(planId))
  const value = positiveAmount(amount ?? plan.min_amount)
  if (value) params.set('amount', String(value))
  params.set('next', next)
  return `/register?${params.toString()}`
}

const PENDING_PLAN_KEY = 'madallion_pending_plan'
const PENDING_PLAN_TTL_MS = 14 * 86_400_000

export type PendingPlan = {
  plan_id: number
  plan_name: string
  principal: number
  currency: string
  created_at: number
}

export function rememberPendingPlan(plan: Partial<Plan>, amount?: number) {
  if (typeof window === 'undefined') return
  const planId = Number(plan.id)
  const principal = positiveAmount(amount ?? plan.min_amount)
  if (!Number.isFinite(planId) || planId <= 0 || !principal) return
  const pending: PendingPlan = {
    plan_id: planId,
    plan_name: plan.name || `Plan #${planId}`,
    principal,
    currency: plan.currency || 'NGN',
    created_at: Date.now(),
  }
  window.localStorage.setItem(PENDING_PLAN_KEY, JSON.stringify(pending))
}

export function getPendingPlan(): PendingPlan | null {
  if (typeof window === 'undefined') return null
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PENDING_PLAN_KEY) ?? 'null')
    if (!parsed || typeof parsed !== 'object') return null
    const planId = Number(parsed.plan_id)
    const principal = Number(parsed.principal)
    const createdAt = Number(parsed.created_at)
    if (!Number.isFinite(planId) || planId <= 0 || !Number.isFinite(principal) || principal <= 0) return null
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > PENDING_PLAN_TTL_MS) {
      window.localStorage.removeItem(PENDING_PLAN_KEY)
      return null
    }
    return {
      plan_id: planId,
      plan_name: String(parsed.plan_name ?? `Plan #${planId}`),
      principal,
      currency: String(parsed.currency ?? 'NGN'),
      created_at: createdAt,
    }
  } catch {
    return null
  }
}

export function clearPendingPlan() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(PENDING_PLAN_KEY)
}
