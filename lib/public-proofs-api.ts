import { xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'
import { unwrapList } from '@/lib/investment-api'

export type PublicProof = {
  id: string
  kind: string
  amount: number
  currency: string
  status: string
  created_at?: string | number
  member: string
  reference?: string
  share_url?: string
  is_sample: boolean
}

const PROOF_PATHS = [
  '/api:ledger-api/public-proofs',
  '/api:ledger-api/proofs/public',
  '/api:ledger-api/public-shares',
]

function httpsUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function maskName(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return 'Verified member'
  const parts = raw.split(/\s+/).filter(Boolean)
  const first = parts[0] ?? 'Member'
  const last = parts.length > 1 ? parts[parts.length - 1] : ''
  return `${first.slice(0, 2)}***${last ? ` ${last.slice(0, 1)}.` : ''}`
}

function optionalString(value: unknown): string | undefined {
  if (value == null || value === '') return undefined
  return String(value)
}

function normalizeProof(row: Record<string, any>): PublicProof | null {
  const url = httpsUrl(row.share_url ?? row.signed_share_url ?? row.proof_url)
  const privateProof =
    row.is_public === false ||
    row.permissioned === false ||
    row.consent === false ||
    String(row.visibility ?? '').toLowerCase() === 'private'
  const publicProof =
    row.is_public === true ||
    row.permissioned === true ||
    row.consent === true ||
    String(row.visibility ?? '').toLowerCase() === 'public' ||
    Boolean(url)
  if (privateProof || !publicProof) return null

  const id = row.id ?? row.proof_id ?? row.share_id
  if (id == null) return null
  const amount = Number(row.amount ?? row.principal ?? row.value ?? 0)
  return {
    id: String(id),
    kind: optionalString(row.kind ?? row.type ?? row.proof_type) ?? 'Payment proof',
    amount: Number.isFinite(amount) ? Math.abs(amount) : 0,
    currency: optionalString(row.currency) ?? 'NGN',
    status: optionalString(row.status) ?? 'Recorded',
    created_at: row.created_at ?? row.createdAt ?? row.posted_at,
    member: maskName(row.display_name ?? row.member_name ?? row.name),
    reference: optionalString(row.reference ?? row.txn_ref ?? row.payment_reference),
    share_url: url,
    is_sample: false,
  }
}

/** Public proof cards only render rows explicitly marked public/permissioned by the ledger. */
export async function getPublicProofs(): Promise<{ rows: PublicProof[]; available: boolean }> {
  for (const path of PROOF_PATHS) {
    try {
      const payload = await xanoRequest(path, { method: 'GET' })
      const rows = unwrapList(payload, ['proofs', 'items', 'shares', 'data'])
        .map((row) => normalizeProof(row))
        .filter((row): row is PublicProof => row !== null)
      if (rows.length) return { rows, available: true }
    } catch (cause) {
      if (isPendingRoute(cause)) continue
    }
  }
  return { rows: [], available: false }
}

const SAMPLE_ANCHOR = Date.now()

export function sampleProofs(): PublicProof[] {
  const rows = [
    ['Withdrawal paid', 850_000, 'Completed', 1000 * 60 * 38, 'Ad*** O.'],
    ['Deposit confirmed', 500_000, 'Credited', 1000 * 60 * 96, 'Ch*** E.'],
    ['Maturity payout', 1_240_000, 'Paid', 1000 * 60 * 60 * 5, 'Fu*** A.'],
    ['Withdrawal paid', 325_000, 'Completed', 1000 * 60 * 60 * 11, 'Bl*** K.'],
    ['Deposit confirmed', 2_400_000, 'Credited', 1000 * 60 * 60 * 19, 'Ol*** M.'],
    ['Referral reward', 75_000, 'Credited', 1000 * 60 * 60 * 27, 'Ai*** D.'],
  ] as const

  return rows.map(([kind, amount, status, offset, member], index) => ({
    id: `sample-${index}`,
    kind,
    amount,
    currency: 'NGN',
    status,
    created_at: SAMPLE_ANCHOR - offset,
    member,
    reference: `MDL-${String(4820 + index).padStart(4, '0')}`,
    is_sample: true,
  }))
}
