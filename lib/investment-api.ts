import { xanoAdminFunctionRequest, xanoPaymentRequest, xanoRequest } from '@/lib/xano-auth'
import { DEFAULT_PLANS } from '@/lib/default-plans'
import { mockCreatePlan, mockDeletePlan, mockGetPlans, mockUpdatePlan, SANDBOX_MOCK } from '@/lib/mock-mode'

export type Plan = {
  id?: number
  name: string
  description?: string
  daily_rate_bps?: number
  roi_percent?: number
  duration_days: number
  min_amount?: number
  max_amount?: number
  principal_returned?: boolean
  status?: 'active' | 'paused' | 'archived' | string
  is_paused?: boolean
  plan_url?: string
  url?: string
  currency?: string
  active_investments?: number
  total_aum?: number
  total_aum_cents?: number
}

export type Investment = {
  id?: number | string
  plan?: Plan
  plan_id?: number
  plan_name?: string
  principal: number
  accrued_total?: number
  daily_rate_bps?: number
  status?: string
  currency?: string
  created_at?: number | string
  ends_at?: number | string
  maturity_at?: number | string
  progress?: number
}

export const PLANS_KEY = 'madallion-plans'
export type PlanCatalogue = { plans: Plan[]; source: 'live' | 'fallback' }

const list = (value: any, keys: string[] = []): any[] => {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  for (const key of keys) {
    const candidate = key.split('.').reduce((acc: any, part) => acc?.[part], value)
    if (Array.isArray(candidate)) return candidate
  }
  for (const key of ['items', 'data', 'plans', 'rows', 'users', 'transactions', 'investments', 'leaders']) {
    if (Array.isArray(value[key])) return value[key]
  }
  return []
}

export const unwrapList = list

export const planDailyRate = (plan: Partial<Plan> | undefined | null): number => {
  if (!plan) return 0
  const bps = Number(plan.daily_rate_bps ?? 0)
  if (bps > 0) return bps / 100
  const roi = Number(plan.roi_percent ?? 0)
  return Number.isFinite(roi) ? roi : 0
}

export const planIsPaused = (plan: Partial<Plan> | undefined | null): boolean => {
  if (!plan) return false
  if (plan.is_paused === true) return true
  const status = String(plan.status ?? '').toLowerCase()
  return status === 'paused' || status === 'archived'
}

const normalizePlan = (row: any): Plan | null => {
  if (!row || typeof row !== 'object') return null
  const name = String(row.name ?? '').trim()
  const duration = Number(row.duration_days ?? 0)
  if (!name || duration <= 0) return null
  return {
    id: typeof row.id === 'number' ? row.id : undefined,
    name,
    description: row.description ? String(row.description) : undefined,
    daily_rate_bps: row.daily_rate_bps == null ? undefined : Number(row.daily_rate_bps),
    roi_percent: row.roi_percent == null ? undefined : Number(row.roi_percent),
    duration_days: duration,
    min_amount: row.min_amount ?? row.minimum_amount ?? undefined,
    max_amount: row.max_amount ?? row.maximum_amount ?? undefined,
    principal_returned: row.principal_returned == null ? undefined : Boolean(row.principal_returned),
    status: row.status == null ? undefined : String(row.status),
    is_paused: row.is_paused == null ? undefined : Boolean(row.is_paused),
    plan_url: row.plan_url ?? row.url ?? undefined,
    url: row.url ?? row.plan_url ?? undefined,
    currency: row.currency == null ? undefined : String(row.currency),
    active_investments: row.active_investments == null ? undefined : Number(row.active_investments),
    total_aum: row.total_aum == null ? undefined : Number(row.total_aum),
    total_aum_cents: row.total_aum_cents == null ? undefined : Number(row.total_aum_cents),
  }
}

// Live paths verified 2026-11-12 against workspace ggfZvZ3o:
//   GET /api:yYNRHo4K/fn_admin_plans, GET /api:ledger-api/plans
export const getPlans = async (): Promise<PlanCatalogue> => {
  if (SANDBOX_MOCK) return { plans: await mockGetPlans(), source: 'fallback' }
  try {
    const plans = list(await xanoAdminFunctionRequest('/fn_admin_plans'), ['plans', 'items', 'data'])
      .map(normalizePlan)
      .filter((plan): plan is Plan => plan !== null)
    if (plans.length) return { plans, source: 'live' }
  } catch {
    // try public ledger catalogue
  }
  try {
    const plans = list(await xanoRequest('/api:ledger-api/plans', { method: 'GET' }), ['plans', 'items', 'data'])
      .map(normalizePlan)
      .filter((plan): plan is Plan => plan !== null)
    if (plans.length) return { plans, source: 'live' }
  } catch {
    // fall through
  }
  return { plans: DEFAULT_PLANS, source: 'fallback' }
}

export const createPlan = (payload: Partial<Plan>) =>
  SANDBOX_MOCK ? mockCreatePlan(payload) : xanoAdminFunctionRequest('/fn_admin_plan_create', { method: 'POST', body: JSON.stringify(payload) })

export const updatePlan = (id: number, payload: Partial<Plan>) =>
  SANDBOX_MOCK ? mockUpdatePlan(id, payload) : xanoAdminFunctionRequest(`/fn_admin_plan/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })

/** Pause new subscriptions only. Existing investments keep locked terms. */
export const pausePlan = (id: number) => updatePlan(id, { is_paused: true, status: 'paused' })

export const resumePlan = (id: number) => updatePlan(id, { is_paused: false, status: 'active' })

export const deletePlan = (id: number) =>
  SANDBOX_MOCK ? mockDeletePlan(id) : xanoAdminFunctionRequest(`/fn_admin_plan/${id}`, { method: 'DELETE' })

// Live: GET /api:ledger-api/investments
export const getMyInvestments = async (): Promise<Investment[]> => {
  const payload = await xanoRequest('/api:ledger-api/investments', { method: 'GET' }, { auth: true })
  return list(payload, ['investments', 'items', 'data', 'rows']) as Investment[]
}

export const getMyWallet = async () => list(await xanoRequest('/api:ledger-api/accounts', {}, { auth: true }), ['accounts', 'items', 'data'])
export const getMyCashflow = async () => list(await xanoRequest('/api:ledger-api/transactions', {}, { auth: true }), ['transactions', 'items', 'data'])
export const initializeDeposit = (payload: { amount: number; currency?: string }) => xanoPaymentRequest('/deposit/initialize', { method: 'POST', body: JSON.stringify(payload) }, true)
export const requestWithdrawal = (payload: { amount: number; currency?: string; account_id?: number }) => xanoPaymentRequest('/withdrawal/request', { method: 'POST', body: JSON.stringify(payload) }, true)
export const getDepositStatus = (reference: string) => xanoPaymentRequest(`/status/${encodeURIComponent(reference)}`, {}, true)

// Live: GET /api:yYNRHo4K/fn_referral_leaderboard and /api:ledger-api/fn_referral_leaderboard
export const getReferralLeaderboard = async (): Promise<{ rows: Record<string, any>[]; available: boolean }> => {
  if (SANDBOX_MOCK) {
    return {
      available: true,
      rows: [
        { rank: 1, name: 'Demo member A', referrals: 14, referral_earned: 420_000 },
        { rank: 2, name: 'Demo member B', referrals: 9, referral_earned: 265_000 },
        { rank: 3, name: 'Demo member C', referrals: 6, referral_earned: 158_000 },
      ],
    }
  }
  for (const path of ['/api:yYNRHo4K/fn_referral_leaderboard', '/api:ledger-api/fn_referral_leaderboard']) {
    try {
      const rows = list(await xanoRequest(path, { method: 'GET' }, { auth: true }), ['leaders', 'items', 'data', 'rows'])
      if (rows.length) return { rows, available: true }
    } catch {
      // try next
    }
  }
  return { rows: [], available: false }
}
