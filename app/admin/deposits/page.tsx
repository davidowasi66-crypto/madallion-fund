import { OperationsPage } from '../operations'
export default function DepositsPage() { return <OperationsPage kind="deposits" eyebrow="Reconciliation queue" title="Deposits" description="Match incoming deposits to investor accounts and resolve exceptions before they enter the book." columns={['Deposit ID','Investor','Amount','Received','Status']} /> }
