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
