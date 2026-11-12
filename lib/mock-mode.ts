// Sandbox-only demo data. Enable with NEXT_PUBLIC_SANDBOX_MOCK=1 in .env.local
// (never in production). Pages should show an amber banner when this is on.
import { DEFAULT_PLANS } from './default-plans'
import type { Plan } from './investment-api'

export const SANDBOX_MOCK =
  process.env.NEXT_PUBLIC_SANDBOX_MOCK === '1' && process.env.NODE_ENV !== 'production'

let nextMockId = 1000
let mockPlans: Plan[] = DEFAULT_PLANS.map((plan) => ({
  ...plan,
  description: 'Sandbox demo plan (not live data).',
}))

const clone = () => mockPlans.map((plan) => ({ ...plan }))

export const mockGetPlans = async () => clone()

export const mockCreatePlan = async (payload: Partial<Plan>) => {
  const plan = {
    id: nextMockId++,
    name: payload.name ?? 'Demo plan',
    duration_days: payload.duration_days ?? 30,
    ...payload,
  } as Plan
  mockPlans = [...mockPlans, plan]
  return plan
}

export const mockUpdatePlan = async (id: number, payload: Partial<Plan>) => {
  mockPlans = mockPlans.map((plan) => (plan.id === id ? ({ ...plan, ...payload } as Plan) : plan))
  return mockPlans.find((plan) => plan.id === id) ?? null
}

export const mockDeletePlan = async (id: number) => {
  mockPlans = mockPlans.filter((plan) => plan.id !== id)
  return { ok: true }
}
