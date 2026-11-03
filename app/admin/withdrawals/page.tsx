import { OperationsPage } from '../operations-page'

export default function WithdrawalsPage() {
  return <OperationsPage kind="withdrawals" eyebrow="Approval queue" title="Withdrawals" description="Review payout requests, confirm beneficiary names, and keep every release controlled." columns={['Request ID', 'Investor', 'Amount', 'Requested', 'Status']} />
}
