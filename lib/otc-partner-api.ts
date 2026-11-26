import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'

/**
 * Both collection channels write to the same Xano deposit/withdrawal rows.
 * The channel only tells operations where the money came from; the ledger is
 * still credited or debited by the existing approval/settlement functions.
 */
export type MoneyChannel = 'bank_transfer' | 'otc_partner' | 'cash' | 'other'

export type RecordMovementInput = {
  userId: number
  amount: number
  channel: MoneyChannel
  partnerName?: string
  partnerReference?: string
  proofUrl?: string
  note?: string
}

export type RecordMovementResult = {
  success?: boolean
  id?: number
  reference?: string
  status?: string
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

const optionalString = (value: unknown): string | undefined =>
  value == null || value === '' ? undefined : String(value)

const optionalNumber = (value: unknown): number | undefined => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

const optionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return undefined
}

const payloadFor = (input: RecordMovementInput) => ({
  p_user_id: input.userId,
  p_amount: input.amount,
  p_channel: input.channel,
  ...(input.partnerName ? { p_partner_name: input.partnerName } : {}),
  ...(input.partnerReference ? { p_partner_reference: input.partnerReference } : {}),
  ...(input.proofUrl ? { p_proof_url: input.proofUrl } : {}),
  ...(input.note ? { p_note: input.note } : {}),
})

async function record(path: string, input: RecordMovementInput): Promise<RecordMovementResult | null> {
  try {
    const response = await xanoRequest(
      path,
      { method: 'POST', body: JSON.stringify(payloadFor(input)) },
      { auth: true },
    )
    const body = unwrap(response)
    return {
      success: optionalBoolean(body.success),
      id: optionalNumber(body.deposit_id ?? body.withdrawal_id ?? body.id),
      reference: optionalString(body.reference),
      status: optionalString(body.status),
      message: optionalString(body.message),
    }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** Creates a pending deposit row in Xano. Approval still goes through fn_approval_decision. */
export const recordOtcDeposit = (input: RecordMovementInput) =>
  record('/api:yYNRHo4K/fn_admin_record_deposit', input)

/** Creates a pending withdrawal row after a partner has paid the member. */
export const recordOtcWithdrawal = (input: RecordMovementInput) =>
  record('/api:yYNRHo4K/fn_admin_record_withdrawal', input)
