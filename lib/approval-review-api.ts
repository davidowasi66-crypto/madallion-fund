import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'

export type ApprovalKind = 'deposits' | 'withdrawals'
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
}

const asRecord = (value: unknown): Record<string, unknown> => {
  const body = value as Record<string, unknown> | null
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
}

/**
 * POST /api:yYNRHo4K/fn_approval_decision
 * Maker-checker: the deciding admin records a reason, and the backend decides
 * whether a second approver is still required before money moves.
 */
export async function submitApprovalDecision(input: ApprovalReviewInput): Promise<ApprovalReviewResult | null> {
  try {
    const payload = await xanoRequest(
      '/api:yYNRHo4K/fn_approval_decision',
      {
        method: 'POST',
        body: JSON.stringify({
          p_kind: input.kind,
          p_id: input.id,
          p_reference: input.reference,
          p_decision: input.decision,
          p_reason: input.reason,
          p_note: input.note?.trim() || undefined,
        }),
      },
      { auth: true },
    )
    const body = asRecord(asRecord(payload).data ?? payload)
    const status = String(body.status ?? (input.decision === 'approve' ? 'approved' : 'rejected'))
    return {
      status,
      requiresSecondApprover: status === 'pending_second_approval' || body.requires_second_approver === true,
    }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}
