'use client'

import { xanoAdminFunctionRequest } from '@/lib/xano-auth'

export type AdminPlan = {
  id: number
  name: string
  daily_rate_bps: number
  duration_days: number
  principal_returned: boolean
  active_investments: number
  total_aum_cents: number
  description?: string
}

type PlansResponse = AdminPlan[] | { items?: AdminPlan[]; plans?: AdminPlan[]; data?: AdminPlan[] }

function unwrapPlans(payload: PlansResponse): AdminPlan[] {
  if (Array.isArray(payload)) return payload
  return payload.items ?? payload.plans ?? payload.data ?? []
}

export async function getAdminPlans() {
  return unwrapPlans(await xanoAdminFunctionRequest<PlansResponse>('/fn_admin_plans'))
}

export async function createAdminPlan(payload: Omit<AdminPlan, 'id' | 'active_investments' | 'total_aum_cents'>) {
  return xanoAdminFunctionRequest<AdminPlan>('/fn_admin_plan_create', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateAdminPlan(id: number, payload: Partial<Omit<AdminPlan, 'id' | 'active_investments' | 'total_aum_cents'>>) {
  return xanoAdminFunctionRequest<AdminPlan>(`/fn_admin_plan/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}
