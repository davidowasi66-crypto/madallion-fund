import { xanoAdminFunctionRequest, xanoPaymentRequest, xanoRequest } from '@/lib/xano-auth'

export type Plan = { id?: number; name: string; description?: string; daily_rate_bps?: number; roi_percent?: number; duration_days: number; min_amount?: number; max_amount?: number; status?: string; is_paused?: boolean; principal_returned?: boolean; currency?: string }
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
export const deletePlan = (id: number) => xanoAdminFunctionRequest(`/fn_admin_plan/${id}`, { method: 'DELETE' })
export const pausePlan = (id: number) => updatePlan(id, { is_paused: true, status: 'paused' })
export const resumePlan = (id: number) => updatePlan(id, { is_paused: false, status: 'active' })

export const getReferralLeaderboard = async (): Promise<{ rows: Record<string, any>[]; available: boolean }> => {
  for (const path of ['/api:yYNRHo4K/fn_referral_leaderboard', '/api:ledger-api/fn_referral_leaderboard']) {
    try {
      const rows = list(await xanoRequest(path, { method: 'GET' }, { auth: true }), ['leaders', 'items', 'data', 'rows'])
      if (rows.length) return { rows, available: true }
    } catch { /* try next */ }
  }
  return { rows: [], available: false }
}

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
