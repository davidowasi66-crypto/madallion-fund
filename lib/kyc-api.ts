import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'

export type KycStatus = 'not_started' | 'pending' | 'approved' | 'rejected'

export type KycState = {
  status: KycStatus
  submitted_at?: string
  reviewed_at?: string
  reason?: string
}

export type KycIdType = 'national_id' | 'bvn' | 'passport' | 'drivers_license'

export type KycSubmission = {
  document_type: KycIdType
  document_number: string
  full_name: string
  address: string
}

export const KYC_ID_TYPES: Array<{ value: KycIdType; label: string }> = [
  { value: 'national_id', label: 'National Identification Number (NIN)' },
  { value: 'bvn', label: 'Bank Verification Number (BVN)' },
  { value: 'passport', label: 'International passport' },
  { value: 'drivers_license', label: "Driver's licence" },
]

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

const STATUSES: KycStatus[] = ['not_started', 'pending', 'approved', 'rejected']

function normalizeStatus(value: unknown): KycStatus {
  const status = String(value ?? '').toLowerCase().replace(/[\s-]+/g, '_')
  if (status === 'verified' || status === 'approved') return 'approved'
  return STATUSES.find((candidate) => candidate === status) ?? 'not_started'
}

function normalizeKycState(payload: unknown): KycState {
  const body = unwrap(payload)
  const isVerified = body.is_verified === true || body.is_verified === 'true'
  return {
    status: normalizeStatus(body.status ?? (isVerified ? 'verified' : '')),
    submitted_at: optionalString(body.submitted_at),
    reviewed_at: optionalString(body.reviewed_at) ?? optionalString(body.reviewed_on),
    reason: optionalString(body.reason) ?? optionalString(body.rejection_reason),
  }
}

/** GET /api:ledger-api/kyc/status */
export async function getKycState(): Promise<KycState | null> {
  try {
    const payload = await xanoRequest('/api:ledger-api/kyc/status', { method: 'GET' }, { auth: true })
    return normalizeKycState(payload)
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/**
 * POST /api:ledger-api/kyc/submissions
 * Identity details are posted straight to the authenticated backend. Nothing is
 * written to browser storage, so a submission never lingers on a shared device.
 */
export async function submitKyc(submission: KycSubmission): Promise<KycState | null> {
  try {
    const payload = await xanoRequest(
      '/api:ledger-api/kyc/submissions',
      {
        method: 'POST',
        body: JSON.stringify({
          document_type: submission.document_type,
          document_number: submission.document_number,
          full_name: submission.full_name,
          address: submission.address,
        }),
      },
      { auth: true },
    )
    const state = normalizeKycState(payload)
    // A successful POST means the submission is queued even if the response omits status.
    return state.status === 'not_started' ? { ...state, status: 'pending' } : state
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}
