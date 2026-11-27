import { xanoAdminFunctionRequest, xanoRequest } from '@/lib/xano-auth'
import { isPendingRoute } from '@/lib/pending-route'

async function postAdmin(path: string, body: unknown): Promise<Record<string, unknown> | null> {
  try {
    return await xanoAdminFunctionRequest<Record<string, unknown>>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

async function postLedger(path: string, body: unknown): Promise<Record<string, unknown> | null> {
  try {
    return await xanoRequest<Record<string, unknown>>(
      `/api:ledger-api${path}`,
      { method: 'POST', body: JSON.stringify(body) },
      { auth: true },
    )
  } catch (cause) {
    if (isPendingRoute(cause)) return null
    throw cause
  }
}

/** POST /api:yYNRHo4K/fn_admin_backfill_deposit_ledgers */
export const backfillDepositLedgers = (dryRun: boolean) =>
  postAdmin('/fn_admin_backfill_deposit_ledgers', { p_dry_run: dryRun })

/** POST /api:yYNRHo4K/fn_admin_adjust_balance — amount is in cents. */
export const adjustUserBalance = (input: {
  userId: number
  direction: 'credit' | 'debit'
  amountCents: number
  currency: string
  reason: string
}) =>
  postAdmin('/fn_admin_adjust_balance', {
    p_user_id: input.userId,
    p_direction: input.direction,
    p_amount: input.amountCents,
    p_currency: input.currency,
    p_reason: input.reason,
  })

/** POST /api:yYNRHo4K/fn_admin_save_partner */
export const saveAdminPartner = (input: Record<string, unknown>) => postAdmin('/fn_admin_save_partner', input)

/** POST /api:yYNRHo4K/fn_admin_record_partner_settlement */
export const recordPartnerSettlement = (input: Record<string, unknown>) =>
  postAdmin('/fn_admin_record_partner_settlement', input)

/** POST /api:ledger-api/accrual/run */
export const runAccrual = (ledgerId = 1) => postLedger('/accrual/run', { ledger_id: ledgerId })

/** POST /api:ledger-api/bank/sync */
export const syncBankTransaction = (input: Record<string, unknown>) => postLedger('/bank/sync', input)

/** POST /api:ledger-api/transactions/{transaction_id}/reverse */
export const reverseLedgerTransaction = (transactionId: string | number, reason: string) =>
  postLedger(`/transactions/${encodeURIComponent(String(transactionId))}/reverse`, { reason })

/** POST /api:ledger-api/accounts */
export const createLedgerAccount = (input: Record<string, unknown>) => postLedger('/accounts', input)

/** POST /api:ledger-api/ledgers */
export const createLedger = (input: Record<string, unknown>) => postLedger('/ledgers', input)

/** POST /api:ledger-api/transactions — entries carry account_id, type, amount, and narration. */
export const postLedgerTransaction = (input: Record<string, unknown>) => postLedger('/transactions', input)

/** POST /api:ledger-api/admin/seed — destructive demo seed; the UI requires typed confirmation. */
export const seedLedger = () => postLedger('/admin/seed', {})
