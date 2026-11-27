import { xanoAdminFunctionRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'

export type ReportPayload = Record<string, unknown>
export type ReportRow = Record<string, unknown>

const asRecord = (value: unknown): Record<string, unknown> => {
  const body = value as Record<string, unknown> | null
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
}

const asRows = (value: unknown): ReportRow[] =>
  Array.isArray(value)
    ? value.filter((item): item is ReportRow => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : []

export function reportRows(
  payload: ReportPayload | null | undefined,
  keys: string[] = ['items', 'rows', 'accounts', 'entries', 'logs', 'lines', 'transactions', 'plans', 'channels'],
): ReportRow[] {
  if (!payload) return []
  for (const key of keys) {
    const rows = asRows(payload[key])
    if (rows.length) return rows
  }
  const data = asRecord(payload.data)
  for (const key of keys) {
    const rows = asRows(data[key])
    if (rows.length) return rows
  }
  return []
}

export function reportNumber(payload: ReportPayload | null | undefined, keys: string[]): number | undefined {
  if (!payload) return undefined
  const data = asRecord(payload.data)
  const sources = [payload, data, asRecord(payload.totals), asRecord(data.totals)]
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key]
      if (value == null || value === '') continue
      const numeric = Number(value)
      if (Number.isFinite(numeric)) return numeric
    }
  }
  return undefined
}

export function reportBoolean(payload: ReportPayload | null | undefined, keys: string[]): boolean | undefined {
  if (!payload) return undefined
  const data = asRecord(payload.data)
  for (const source of [payload, data, asRecord(payload.totals), asRecord(data.totals)]) {
    for (const key of keys) {
      const value = source[key]
      if (typeof value === 'boolean') return value
      if (value === 1 || value === '1' || value === 'true') return true
      if (value === 0 || value === '0' || value === 'false') return false
    }
  }
  return undefined
}

export function reportString(payload: ReportPayload | null | undefined, keys: string[]): string | undefined {
  if (!payload) return undefined
  const data = asRecord(payload.data)
  for (const source of [payload, data, asRecord(payload.totals), asRecord(data.totals)]) {
    for (const key of keys) {
      const value = source[key]
      if (typeof value === 'string' && value.trim()) return value
    }
  }
  return undefined
}

async function fetchReport(path: string): Promise<ReportPayload | null> {
  try {
    return await xanoAdminFunctionRequest<ReportPayload>(path, { method: 'GET' })
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** GET /api:yYNRHo4K/fn_admin_pnl */
export const getAdminPnl = () => fetchReport('/fn_admin_pnl')

/** GET /api:yYNRHo4K/fn_admin_reconciliation */
export const getAdminReconciliation = (ledgerId = 1) => fetchReport(`/fn_admin_reconciliation?ledger_id=${ledgerId}`)

/** GET /api:yYNRHo4K/fn_admin_trial_balance */
export const getAdminTrialBalance = (ledgerId = 1) => fetchReport(`/fn_admin_trial_balance?ledger_id=${ledgerId}`)

/** GET /api:yYNRHo4K/fn_admin_audit_logs */
export const getAdminAuditLogs = (page = 1, perPage = 25) => fetchReport(`/fn_admin_audit_logs?page=${page}&per_page=${perPage}`)

/** GET /api:yYNRHo4K/fn_admin_plan_accruals */
export const getAdminPlanAccruals = () => fetchReport('/fn_admin_plan_accruals')

/** GET /api:yYNRHo4K/fn_admin_liability_report */
export const getAdminLiabilityReport = (limit = 100) => fetchReport(`/fn_admin_liability_report?p_limit=${limit}`)

/** GET /api:yYNRHo4K/fn_admin_position */
export const getAdminPosition = (ledgerId?: number) =>
  fetchReport(`/fn_admin_position${ledgerId == null ? '' : `?ledger_id=${ledgerId}`}`)

/** GET /api:yYNRHo4K/fn_admin_plan_performance */
export const getAdminPlanPerformance = () => fetchReport('/fn_admin_plan_performance')

/** GET /api:yYNRHo4K/fn_admin_list_partners */
export const getAdminPartners = (params: { status?: string; type?: string; page?: number; per_page?: number } = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  const qs = query.toString()
  return fetchReport(`/fn_admin_list_partners${qs ? `?${qs}` : ''}`)
}

/** GET /api:yYNRHo4K/fn_referral_leaderboard */
export const getAdminReferralLeaderboard = () => fetchReport('/fn_referral_leaderboard')
