'use client'

import useSWR from 'swr'
import { AdminShell, Metric, SectionCard } from '@/components/admin-shell'
import { getAdminDashboard } from '@/lib/xano-admin'

const ngn = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function CommandCentrePage() {
  const { data, error, isLoading } = useSWR('admin-dashboard', getAdminDashboard, { revalidateOnFocus: false })
  const value = (amount: unknown) => typeof amount === 'number' ? ngn.format(amount) : '—'
  return <AdminShell eyebrow="Admin operations" title="Command Centre"><div className="grid gap-4 md:grid-cols-4"><Metric label="Active principal" value={isLoading ? '…' : value(data?.aum.active_principal)} detail="Returned by Xano" tone="good" /><Metric label="Assets" value={isLoading ? '…' : value(data?.position.assets.total)} detail="Current position" /><Metric label="Pending approvals" value={isLoading ? '…' : String(data?.counts.total_pending_approvals ?? '—')} detail="Deposits and withdrawals" tone="warn" /><Metric label="Active investors" value={isLoading ? '…' : String(data?.counts.active_investors ?? '—')} detail="Current accounts" /></div><div className="mt-6 grid gap-6 lg:grid-cols-2"><SectionCard title="Position" action={error ? 'Xano unavailable' : 'Live Xano data'}><dl className="space-y-3 text-sm">{[['Liabilities', data?.position.liabilities.total], ['Equity', data?.position.equity.net], ['Interest accrued today', data?.today.interest_accrued]].map(([label, amount]) => <div key={String(label)} className="flex items-center justify-between border-b border-slate-800 pb-3"><dt className="text-slate-400">{label}</dt><dd className="font-medium text-white">{value(amount)}</dd></div>)}</dl></SectionCard><SectionCard title="Alerts" action="Returned by Xano"><div className="space-y-3">{(data?.alerts ?? []).map((alert, index) => <div key={`${alert.message}-${index}`} className={`rounded-lg border p-3 text-sm ${alert.severity === 'critical' ? 'border-red-500/20 bg-red-500/5 text-red-200' : 'border-amber-500/20 bg-amber-500/5 text-amber-200'}`}>{alert.message}: {value(alert.value)}</div>)}{!data?.alerts?.length && <p className="text-sm text-slate-500">No active alerts.</p>}</div></SectionCard></div></AdminShell>
}
