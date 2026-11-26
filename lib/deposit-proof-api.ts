import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'

export const DEPOSIT_PROOF_MAX_BYTES = 5 * 1024 * 1024
export const DEPOSIT_PROOF_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']

export type DepositProofInput = {
  amount: number
  file: File
  note?: string
  reference?: string
}

export type DepositProofResult = {
  reference?: string
  status: string
}

const asRecord = (value: unknown): Record<string, unknown> => {
  const body = value as Record<string, unknown> | null
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
}

/** Client-side guard so an oversized or unsupported receipt never leaves the device. */
export function depositProofError(file: File | null, amount: number): string {
  if (!file) return 'Attach the receipt for your transfer.'
  if (!DEPOSIT_PROOF_TYPES.includes(file.type)) return 'Upload a PNG, JPEG, WebP image or a PDF receipt.'
  if (file.size > DEPOSIT_PROOF_MAX_BYTES) return 'Receipts must be 5 MB or smaller.'
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter the amount you transferred.'
  return ''
}

/**
 * POST /api:dKuEO75q/deposit/proof — multipart upload to the authenticated payment
 * group. The file is sent to the private backend endpoint and is never given a
 * public URL; only the member and operations staff can retrieve it.
 */
export async function uploadDepositProof(input: DepositProofInput): Promise<DepositProofResult | null> {
  const form = new FormData()
  form.set('amount', String(input.amount))
  form.set('proof', input.file)
  if (input.note?.trim()) form.set('note', input.note.trim())
  if (input.reference?.trim()) form.set('reference', input.reference.trim())
  try {
    const body = asRecord(
      await xanoRequest('/api:dKuEO75q/deposit/proof', { method: 'POST', body: form }, { auth: true }),
    )
    return {
      reference: body.reference == null ? undefined : String(body.reference),
      status: body.status == null ? 'received' : String(body.status),
    }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}
