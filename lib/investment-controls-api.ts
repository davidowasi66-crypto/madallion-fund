import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'

/** GET /api:ledger-api/fee-policy — published fee schedule for the member's currency. */
export type InvestmentFeePolicy = {
  currency: string
  management_fee_bps?: number
  performance_fee_bps?: number
  performance_hurdle_bps?: number
  withdrawal_fee_bps?: number
  early_exit_fee_bps?: number
  referral_commission_bps?: number
  effective_from?: string
}

/** GET /api:ledger-api/investments/{investment_id}/fees — fees already posted to this investment. */
export type InvestmentFeeEntry = {
  id: string
  fee_type: string
  amount: number
  currency: string
  debit_source?: string
  created_at?: string
}

/** GET /api:ledger-api/investments/{investment_id}/schedule */
export type InvestmentSchedule = {
  investment_id?: string
  cohort_start_at?: string
  accrual_start_at?: string
  maturity_at?: string
  withdrawal_window_ends_at?: string
  rollover_enabled?: boolean
  next_rollover_at?: string
  currency?: string
}

/** GET /api:ledger-api/investments/{investment_id}/withdrawal-window */
export type WithdrawalWindow = {
  opens_at?: string
  closes_at?: string
  is_open: boolean
}

export type MaturityAction = 'withdraw' | 'rollover'

export type MaturityResolution = { action: MaturityAction; status: string }

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

const investmentPath = (investmentId: string | number, suffix: string) =>
  `/api:ledger-api/investments/${encodeURIComponent(String(investmentId))}${suffix}`

export async function getFeePolicy(): Promise<InvestmentFeePolicy | null> {
  try {
    const body = unwrap(await xanoRequest('/api:ledger-api/fee-policy', { method: 'GET' }, { auth: true }))
    if (!Object.keys(body).length) return null
    return {
      currency: optionalString(body.currency) ?? 'NGN',
      management_fee_bps: optionalNumber(body.management_fee_bps),
      performance_fee_bps: optionalNumber(body.performance_fee_bps),
      performance_hurdle_bps: optionalNumber(body.performance_hurdle_bps),
      withdrawal_fee_bps: optionalNumber(body.withdrawal_fee_bps),
      early_exit_fee_bps: optionalNumber(body.early_exit_fee_bps),
      referral_commission_bps: optionalNumber(body.referral_commission_bps),
      effective_from: optionalString(body.effective_from),
    }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

export async function getInvestmentFees(investmentId: string | number): Promise<InvestmentFeeEntry[] | null> {
  try {
    const payload = await xanoRequest<unknown>(investmentPath(investmentId, '/fees'), { method: 'GET' }, { auth: true })
    const body = asRecord(payload)
    const rows = Array.isArray(payload)
      ? payload
      : [body.items, body.fees, body.data, asRecord(body.data).items].find(Array.isArray) ?? []
    return (rows as unknown[]).map((row, index) => {
      const entry = asRecord(row)
      return {
        id: optionalString(entry.id) ?? `fee-${index}`,
        fee_type: optionalString(entry.fee_type) ?? optionalString(entry.type) ?? 'fee',
        amount: optionalNumber(entry.amount) ?? 0,
        currency: optionalString(entry.currency) ?? 'NGN',
        debit_source: optionalString(entry.debit_source),
        created_at: optionalString(entry.created_at),
      }
    })
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
    cohort_start_at: optionalString(body.cohort_start_at),
    accrual_start_at: optionalString(body.accrual_start_at),
    maturity_at: optionalString(body.maturity_at),
    withdrawal_window_ends_at: optionalString(body.withdrawal_window_ends_at),
    rollover_enabled: typeof body.rollover_enabled === 'boolean' ? body.rollover_enabled : undefined,
    next_rollover_at: optionalString(body.next_rollover_at),
    currency: optionalString(body.currency),
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
): Promise<InvestmentSchedule | null> {
  try {
    return normalizeSchedule(
      await xanoRequest(
        investmentPath(investmentId, '/rollover'),
        { method: 'PATCH', body: JSON.stringify({ enabled }) },
        { auth: true },
      ),
    )
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
      is_open: body.is_open === true,
    }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** POST /api:ledger-api/investments/{investment_id}/maturity-resolution */
export async function resolveMaturity(
  investmentId: string | number,
  action: MaturityAction,
): Promise<MaturityResolution | null> {
  try {
    const body = unwrap(
      await xanoRequest(
        investmentPath(investmentId, '/maturity-resolution'),
        {
          method: 'POST',
          body: JSON.stringify({ action, idempotency_key: crypto.randomUUID() }),
        },
        { auth: true },
      ),
    )
    return { action, status: optionalString(body.status) ?? 'recorded' }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}
