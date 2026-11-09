import { xanoAdminFunctionRequest, xanoPaymentRequest, xanoRequest } from '@/lib/xano-auth'

export type Plan = { id?: number; name: string; description?: string; daily_rate_bps?: number; roi_percent?: number; duration_days: number; min_amount?: number; max_amount?: number; status?: string; currency?: string }
export type Investment = { id?: number | string; plan?: Plan; plan_id?: number; plan_name?: string; principal: number; accrued_total?: number; daily_rate_bps?: number; status?: string; currency?: string; created_at?: number | string; ends_at?: number | string; maturity_at?: number | string; progress?: number }

const list = (value: any, keys: string[] = []): any[] => {
  if (Array.isArray(value)) return value
  for (const key of keys) {
    const candidate = key.split('.').reduce<any>((current, part) => current?.[part], value)
    if (Array.isArray(candidate)) return candidate
  }
  for (const candidate of [value?.items, value?.investments, value?.data?.items, value?.data?.investments, value?.data]) {
    if (Array.isArray(candidate)) return candidate
  }
  return []
}

export const unwrapList = list
export const getPlans = async () => list(await xanoAdminFunctionRequest('/fn_admin_plans'), ['plans', 'items', 'data']) as Plan[]
export const createPlan = (payload: Partial<Plan>) => xanoAdminFunctionRequest('/fn_admin_plan_create', { method: 'POST', body: JSON.stringify(payload) })
export const updatePlan = (id: number, payload: Partial<Plan>) => xanoAdminFunctionRequest(`/fn_admin_plan/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })

// Member-owned investments. Do not substitute /accounts here; accounts are wallet ledger records.
export const getMyInvestments = async () => list(
  await xanoRequest('/api:ledger-api/investments', { method: 'GET' }, { auth: true }),
  ['investments', 'items', 'data.investments', 'data.items', 'data'],
) as Investment[]

export const getMyWallet = async () => list(await xanoRequest('/api:ledger-api/accounts', {}, { auth: true }), ['accounts', 'items', 'data'])
export const getMyCashflow = async () => list(await xanoRequest('/api:ledger-api/transactions', {}, { auth: true }), ['transactions', 'items', 'data'])
export const initializeDeposit = (payload: { amount: number; currency?: string }) => xanoPaymentRequest('/deposit/initialize', { method: 'POST', body: JSON.stringify(payload) }, true)
export const requestWithdrawal = (payload: { amount: number; currency?: string; account_id?: number }) => xanoPaymentRequest('/withdrawal/request', { method: 'POST', body: JSON.stringify(payload) }, true)
export const getDepositStatus = (reference: string) => xanoPaymentRequest(`/status/${encodeURIComponent(reference)}`, {}, true)
