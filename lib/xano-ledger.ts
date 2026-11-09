import { xanoRequest } from '@/lib/xano-auth'

export type XanoRecord = Record<string, any>

const authenticatedGet = <T = XanoRecord>(path: string) =>
  xanoRequest<T>(path, { method: 'GET' }, { auth: true })

/** Resolve the signed-in ledger profile before requesting member or admin data. */
export const getLedgerProfile = () => authenticatedGet<XanoRecord>('/api:ledger-api/auth/me')
export const getMemberLedgers = () => authenticatedGet<XanoRecord>('/api:ledger-api/ledgers')
export const getMemberAccounts = () => authenticatedGet<XanoRecord>('/api:ledger-api/accounts')
export const getMemberTransactions = () => authenticatedGet<XanoRecord>('/api:ledger-api/transactions')

export const getMemberAccount = (accountId: string | number) =>
  authenticatedGet<XanoRecord>(`/api:ledger-api/accounts/${encodeURIComponent(String(accountId))}`)

export const getMemberAccountEntries = (accountId: string | number) =>
  authenticatedGet<XanoRecord>(`/api:ledger-api/accounts/${encodeURIComponent(String(accountId))}/entries`)

export const getMemberAccountStatement = (accountId: string | number) =>
  authenticatedGet<XanoRecord>(`/api:ledger-api/accounts/${encodeURIComponent(String(accountId))}/statement`)

export const getMemberTransaction = (transactionId: string | number) =>
  authenticatedGet<XanoRecord>(`/api:ledger-api/transactions/${encodeURIComponent(String(transactionId))}`)

/** Admin-only ledger routes; Xano remains responsible for authorization and 403 responses. */
export const getLedgerAdminDashboard = () =>
  authenticatedGet<XanoRecord>('/api:ledger-api/admin/dashboard')

export const getLedgerTrialBalance = (ledgerId?: string | number) => {
  const query = ledgerId == null ? '' : `?ledger_id=${encodeURIComponent(String(ledgerId))}`
  return authenticatedGet<XanoRecord>(`/api:ledger-api/reports/trial-balance${query}`)
}

/** Payment API-group route used to check an owned payment reference. */
export const getPaymentStatus = (reference: string) =>
  authenticatedGet<XanoRecord>(`/api:dKuEO75q/status/${encodeURIComponent(reference)}`)
