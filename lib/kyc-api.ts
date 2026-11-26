import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'

export type KycStatus = 'not_started' | 'pending' | 'approved' | 'rejected'

export type KycState = {
  status: KycStatus
  submitted_at?: string
  reviewed_at?: string
  reason?: string
}

export type KycIdType = 'nin' | 'bvn' | 'passport' | 'drivers_license'

export type KycSubmission = {
  full_name: string
  date_of_birth: string
  id_type: KycIdType
  id_number: string
  address: string
}

export const KYC_ID_TYPES: Array<{ value: KycIdType; label: string }> = [
  { value: 'nin', label: 'National Identification Number (NIN)' },
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

function normalizeKycState(payload: unknown): KycState {
  const body = unwrap(payload)
  const status = String(body.status ?? '').toLowerCase().replace(/[\s-]+/g, '_')
  return {
    status: STATUSES.find((candidate) => candidate === status) ?? 'not_started',
    submitted_at: optionalString(body.submitted_at),
    reviewed_at: optionalString(body.reviewed_at),
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
      { method: 'POST', body: JSON.stringify(submission) },
      { auth: true },
    )
    return normalizeKycState(payload)
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}
