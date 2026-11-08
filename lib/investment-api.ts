import { xanoAdminFunctionRequest, xanoPaymentRequest, xanoRequest } from '@/lib/xano-auth'

export type Plan = { id?: number; name: string; description?: string; daily_rate_bps?: number; roi_percent?: number; duration_days: number; min_amount?: number; max_amount?: number; status?: string; currency?: string }
export type Investment = { id?: number; plan?: Plan; plan_id?: number; principal: number; accrued_total?: number; daily_rate_bps?: number; status?: string; created_at?: number | string; ends_at?: number | string; maturity_at?: number | string; progress?: number }

const list = (value: any): any[] => Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : Array.isArray(value?.data) ? value.data : []

export const unwrapList = list
export const getPlans = async () => list(await xanoAdminFunctionRequest('/fn_admin_plans')) as Plan[]
export const createPlan = (payload: Partial<Plan>) => xanoAdminFunctionRequest('/fn_admin_plan_create', { method: 'POST', body: JSON.stringify(payload) })
export const updatePlan = (id: number, payload: Partial<Plan>) => xanoAdminFunctionRequest(`/fn_admin_plan/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
export const getMyInvestments = async () => list(await xanoRequest('/api:ledger-api/investments', {}, { auth: true })) as Investment[]
export const getMyWallet = async () => list(await xanoRequest('/api:ledger-api/accounts', {}, { auth: true }))
export const getMyCashflow = async () => list(await xanoRequest('/api:ledger-api/transactions', {}, { auth: true }))
export const initializeDeposit = (payload: { amount: number; currency?: string }) => xanoPaymentRequest('/deposit/initialize', { method: 'POST', body: JSON.stringify(payload) }, true)
export const requestWithdrawal = (payload: { amount: number; currency?: string; account_id?: number }) => xanoPaymentRequest('/withdrawal/request', { method: 'POST', body: JSON.stringify(payload) }, true)
export const getDepositStatus = (reference: string) => xanoPaymentRequest(`/status/${encodeURIComponent(reference)}`, {}, true)
