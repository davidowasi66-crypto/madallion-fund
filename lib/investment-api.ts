import { xanoPaymentsRequest } from '@/lib/xano-auth'

export type Plan = { id?: number; name: string; description?: string; daily_rate_bps?: number; roi_percent?: number; duration_days: number; min_amount?: number; max_amount?: number; status?: string; currency?: string }
export type Investment = { id?: number; plan?: Plan; plan_id?: number; principal: number; accrued_total?: number; daily_rate_bps?: number; status?: string; created_at?: number | string; ends_at?: number | string; maturity_at?: number | string; progress?: number }

const list = (value: any): any[] => Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : Array.isArray(value?.data) ? value.data : []

export const unwrapList = list
export const getPlans = async () => list(await xanoPaymentsRequest('/plans')) as Plan[]
export const createPlan = (payload: Partial<Plan>) => xanoPaymentsRequest('/plans', { method: 'POST', body: JSON.stringify(payload) }, true)
export const updatePlan = (id: number, payload: Partial<Plan>) => xanoPaymentsRequest(`/plans/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, true)
export const getMyInvestments = async () => list(await xanoPaymentsRequest('/investments', {}, true)) as Investment[]
export const getMyWallet = async () => xanoPaymentsRequest('/wallet', {}, true)
export const getMyCashflow = async () => list(await xanoPaymentsRequest('/transactions', {}, true))
