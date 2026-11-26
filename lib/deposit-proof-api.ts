import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'

export type DepositProofInput = {
  proof_url: string
  reference?: string
  amount?: number
  sender_name?: string
  sender_bank?: string
  narration?: string
}

export type DepositProofResult = {
  success?: boolean
  transaction_id?: string
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

const optionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return undefined
}

/** Accept only plain http(s) links; embedded credentials are rejected. */
export function normalizeReceiptUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 2048) return ''
  try {
    const url = new URL(trimmed)
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password) return ''
    return url.toString()
  } catch {
    return ''
  }
}

export function depositProofError(receiptUrl: string): string {
  if (!receiptUrl.trim()) return 'Paste a link to your payment receipt.'
  if (!normalizeReceiptUrl(receiptUrl)) return 'Enter a valid http(s) receipt link without a username or password.'
  return ''
}

/**
 * POST /api:ledger-api/deposit/proof
 * The ledger stores a public receipt URL rather than the file itself, so the
 * member shares a link from their bank or cloud storage.
 */
export async function submitDepositProof(input: DepositProofInput): Promise<DepositProofResult | null> {
  try {
    const body = unwrap(
      await xanoRequest(
        '/api:ledger-api/deposit/proof',
        {
          method: 'POST',
          body: JSON.stringify({
            proof_url: input.proof_url,
            ...(input.reference ? { reference: input.reference } : {}),
            ...(input.amount != null ? { amount: input.amount } : {}),
            ...(input.sender_name ? { sender_name: input.sender_name } : {}),
            ...(input.sender_bank ? { sender_bank: input.sender_bank } : {}),
            ...(input.narration ? { narration: input.narration } : {}),
          }),
        },
        { auth: true },
      ),
    )
    return {
      success: optionalBoolean(body.success),
      transaction_id: optionalString(body.transaction_id),
      reference: optionalString(body.reference),
      status: optionalString(body.status),
      message: optionalString(body.message),
    }
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}
