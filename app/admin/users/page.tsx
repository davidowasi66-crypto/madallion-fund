import { OperationsPage } from '../operations-page'

export default function UsersPage() {
  return <OperationsPage kind="users" eyebrow="Account management" title="Users" description="Review investor accounts, exposure caps, and account-level flags across the book." columns={['User ID', 'Investor', 'Email', 'Balance', 'Status']} />
}
