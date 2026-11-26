import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'

export type ApprovalKind = 'deposits' | 'withdrawals' | 'kyc'
export type ApprovalDecision = 'approve' | 'reject'

export const APPROVAL_REASONS = [
  { value: 'verified-proof', label: 'Proof verified against the bank credit' },
  { value: 'amount-mismatch', label: 'Amount does not match the transfer' },
  { value: 'duplicate-request', label: 'Duplicate of an existing request' },
  { value: 'suspected-fraud', label: 'Suspected fraud or third-party account' },
  { value: 'policy-limit', label: 'Outside programme limits' },
  { value: 'other', label: 'Other (explain in the note)' },
] as const

export type ApprovalReviewInput = {
  kind: ApprovalKind
  id: string | number
  reference?: string
  decision: ApprovalDecision
  reason: string
  note?: string
}

export type ApprovalReviewResult = {
  status: string
  requiresSecondApprover: boolean
  message?: string
}

/** The RPC accepts singular kinds; the admin tables use plural tab names. */
const BACKEND_KIND: Record<ApprovalKind, string> = {
  deposits: 'deposit',
  withdrawals: 'withdrawal',
  kyc: 'kyc',
}

const asRecord = (value: unknown): Record<string, unknown> => {
  const body = value as Record<string, unknown> | null
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
}

const optionalString = (value: unknown): string | undefined =>
  value == null || value === '' ? undefined : String(value)

const optionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return undefined
}

/**
 * POST /api:yYNRHo4K/fn_approval_decision
 * Maker-checker: every decision carries a reason code plus an optional note, and
 * the backend records who decided what before any money moves.
 */
export async function submitApprovalDecision(input: ApprovalReviewInput): Promise<ApprovalReviewResult | null> {
  const itemId = Number(input.id)
  if (!Number.isFinite(itemId)) {
    throw new Error('This request has no numeric id, so it cannot be sent to the approval service.')
  }
  const reasonLabel = APPROVAL_REASONS.find((option) => option.value === input.reason)?.label ?? input.reason
  const reason = [reasonLabel, input.note?.trim()].filter(Boolean).join(' — ')

  try {
    const payload = await xanoRequest(
      '/api:yYNRHo4K/fn_approval_decision',
      {
        method: 'POST',
        body: JSON.stringify({
          p_item_id: itemId,
          p_kind: BACKEND_KIND[input.kind],
          p_decision: input.decision,
          p_reason: reason,
          ...(input.reference ? { p_ref: input.reference } : {}),
        }),
      },
      { auth: true },
    )
    const outer = asRecord(payload)
    const body = asRecord(outer.data ?? outer)
    if (optionalBoolean(body.success) === false) {
      return {
        status: 'failed',
        requiresSecondApprover: false,
        message: optionalString(body.message),
      }
    }
    return {
      status: optionalString(body.decision) ?? (input.decision === 'approve' ? 'approved' : 'rejected'),
      requiresSecondApprover: optionalBoolean(body.requires_second_approver) ?? false,
      message: optionalString(body.message),
    }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}
