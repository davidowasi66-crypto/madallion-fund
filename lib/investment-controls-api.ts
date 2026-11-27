import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'

/** GET /api:ledger-api/fee-policy — published fee schedule for the member's currency. */
export type InvestmentFeePolicy = {
  currency: string
  management_fee_bps?: number
  withdrawal_fee_bps?: number
  withdrawal_fee_pct?: number
  deposit_fee_bps?: number
  rollover_fee_bps?: number
  early_exit_fee_bps?: number
  early_exit_penalty_pct?: number
  min_withdrawal_fee?: number
  max_withdrawal_fee?: number
  effective_from?: string
}

/** GET /api:ledger-api/investments/{investment_id}/fees — settlement fee calculation. */
export type InvestmentFeeSummary = {
  investment_id?: string
  currency: string
  principal?: number
  accrued_total?: number
  is_early_exit?: boolean
  early_exit_fee?: number
  withdrawal_fee?: number
  management_fee?: number
  rollover_fee?: number
  total_fees?: number
  net_payout?: number
}

/** GET /api:ledger-api/investments/{investment_id}/schedule */
export type InvestmentSchedule = {
  investment_id?: string
  plan_name?: string
  principal?: number
  currency?: string
  start_date?: string
  maturity_date?: string
  status?: string
  rollover_enabled?: boolean
  rollover_mode?: string
}

/** GET /api:ledger-api/investments/{investment_id}/withdrawal-window */
export type WithdrawalWindow = {
  opens_at?: string
  closes_at?: string
  is_open: boolean
}

export type RolloverMode = 'both' | 'principal_only'

export type RolloverPreference = {
  success?: boolean
  investment_id?: string
  rollover_enabled?: boolean
  rollover_mode?: RolloverMode
}

export type MaturityResolutionAction = 'payout_all' | 'rollover_all' | 'rollover_principal'

export type MaturityResolution = {
  success?: boolean
  resolution: MaturityResolutionAction
  status: string
  message?: string
}

const asRecord = (value: unknown): Record<string, unknown> => {
  const body = value as Record<string, unknown> | null
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
}

const unwrap = (value: unknown) => {
  const body = asRecord(value)
  return asRecord(body.data ?? body)
}

const optionalNumber = (value: unknown): number | undefined => {
  if (value == null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const optionalString = (value: unknown): string | undefined =>
  value == null || value === '' ? undefined : String(value)

const optionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return undefined
}

const investmentPath = (investmentId: string | number, suffix: string) =>
  `/api:ledger-api/investments/${encodeURIComponent(String(investmentId))}${suffix}`

export async function getFeePolicy(): Promise<InvestmentFeePolicy | null> {
  try {
    const body = unwrap(await xanoRequest('/api:ledger-api/fee-policy', { method: 'GET' }, { auth: true }))
    if (!Object.keys(body).length) return null
    const withdrawalPct = optionalNumber(body.withdrawal_fee_pct)
    return {
      currency: optionalString(body.currency) ?? 'NGN',
      management_fee_bps: optionalNumber(body.management_fee_bps),
      withdrawal_fee_bps: optionalNumber(body.withdrawal_fee_bps) ?? (withdrawalPct != null ? withdrawalPct * 100 : undefined),
      withdrawal_fee_pct: withdrawalPct,
      deposit_fee_bps: optionalNumber(body.deposit_fee_bps),
      rollover_fee_bps: optionalNumber(body.rollover_fee_bps),
      early_exit_fee_bps:
        optionalNumber(body.early_exit_fee_bps) ?? optionalNumber(body.early_exit_penalty_bps),
      early_exit_penalty_pct: optionalNumber(body.early_exit_penalty_pct),
      min_withdrawal_fee: optionalNumber(body.min_withdrawal_fee),
      max_withdrawal_fee: optionalNumber(body.max_withdrawal_fee),
      effective_from: optionalString(body.effective_date) ?? optionalString(body.effective_from),
    }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

export async function getInvestmentFeeSummary(
  investmentId: string | number,
): Promise<InvestmentFeeSummary | null> {
  try {
    const body = unwrap(
      await xanoRequest(investmentPath(investmentId, '/fees'), { method: 'GET' }, { auth: true }),
    )
    if (!Object.keys(body).length) return null
    return {
      investment_id: optionalString(body.investment_id),
      currency: optionalString(body.currency) ?? 'NGN',
      principal: optionalNumber(body.principal),
      accrued_total: optionalNumber(body.accrued_total),
      is_early_exit: optionalBoolean(body.is_early_exit),
      early_exit_fee: optionalNumber(body.early_exit_fee),
      withdrawal_fee: optionalNumber(body.withdrawal_fee),
      management_fee: optionalNumber(body.management_fee),
      rollover_fee: optionalNumber(body.rollover_fee),
      total_fees: optionalNumber(body.total_fees),
      net_payout: optionalNumber(body.net_payout),
    }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

function normalizeSchedule(payload: unknown): InvestmentSchedule | null {
  const body = unwrap(payload)
  if (!Object.keys(body).length) return null
  return {
    investment_id: optionalString(body.investment_id),
    plan_name: optionalString(body.plan_name),
    principal: optionalNumber(body.principal),
    currency: optionalString(body.currency),
    start_date: optionalString(body.start_date),
    maturity_date: optionalString(body.maturity_date),
    status: optionalString(body.status),
    rollover_enabled: optionalBoolean(body.rollover_enabled),
    rollover_mode: optionalString(body.rollover_mode),
  }
}

export async function getInvestmentSchedule(investmentId: string | number): Promise<InvestmentSchedule | null> {
  try {
    return normalizeSchedule(
      await xanoRequest(investmentPath(investmentId, '/schedule'), { method: 'GET' }, { auth: true }),
    )
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** PATCH /api:ledger-api/investments/{investment_id}/rollover */
export async function setAutoRollover(
  investmentId: string | number,
  enabled: boolean,
  mode?: RolloverMode,
): Promise<RolloverPreference | null> {
  try {
    const body = unwrap(
      await xanoRequest(
        investmentPath(investmentId, '/rollover'),
        {
          method: 'PATCH',
          body: JSON.stringify({ rollover_enabled: enabled, ...(mode ? { rollover_mode: mode } : {}) }),
        },
        { auth: true },
      ),
    )
    // A successful PATCH may answer with an empty body; that still means the
    // preference was saved, so never report it back as an unconnected route.
    if (!Object.keys(body).length) {
      return { success: true, investment_id: String(investmentId), rollover_enabled: enabled, rollover_mode: mode }
    }
    return {
      success: optionalBoolean(body.success),
      investment_id: optionalString(body.investment_id),
      rollover_enabled: optionalBoolean(body.rollover_enabled) ?? enabled,
      rollover_mode: optionalString(body.rollover_mode) as RolloverMode | undefined,
    }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

export async function getWithdrawalWindow(investmentId: string | number): Promise<WithdrawalWindow | null> {
  try {
    const body = unwrap(
      await xanoRequest(investmentPath(investmentId, '/withdrawal-window'), { method: 'GET' }, { auth: true }),
    )
    if (!Object.keys(body).length) return null
    return {
      opens_at: optionalString(body.opens_at),
      closes_at: optionalString(body.closes_at),
      is_open: optionalBoolean(body.is_open) ?? false,
    }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** POST /api:ledger-api/investments/{investment_id}/maturity-resolution */
export async function resolveMaturity(
  investmentId: string | number,
  resolution: MaturityResolutionAction,
): Promise<MaturityResolution | null> {
  try {
    const body = unwrap(
      await xanoRequest(
        investmentPath(investmentId, '/maturity-resolution'),
        { method: 'POST', body: JSON.stringify({ resolution }) },
        { auth: true },
      ),
    )
    // A successful POST may answer with an empty body; the instruction is
    // already recorded, so treat it as accepted rather than "not connected".
    if (!Object.keys(body).length) {
      return { success: true, resolution, status: 'recorded' }
    }
    const success = optionalBoolean(body.success)
    return {
      success,
      resolution: (optionalString(body.resolution) as MaturityResolutionAction | undefined) ?? resolution,
      status: success === false ? 'failed' : 'recorded',
      message: optionalString(body.message),
    }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}
