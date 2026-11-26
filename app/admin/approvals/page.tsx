'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { AdminShell, SectionCard } from '@/components/admin-shell'
import { ApprovalDecisionForm } from '@/components/approval-decision'
import { getAdminPending } from '@/lib/xano-admin'

const ngn = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const lagosDate = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' })

export default function ApprovalsPage() {
  const [tab, setTab] = useState<'deposits' | 'withdrawals'>('deposits')
  const { data, error, isLoading, mutate } = useSWR(['admin-pending', tab], () => getAdminPending({ p_kind: tab }), { revalidateOnFocus: false })

  return <AdminShell eyebrow="Risk and controls" title="Approvals">
    <SectionCard title="Pending approvals" action={isLoading ? 'Loading Xano data' : error ? 'Xano unavailable' : 'Live Xano data'}>
      <p className="mb-4 max-w-2xl text-xs leading-5 text-slate-400">Every decision records who decided, the reason, and the note in the Xano audit log before money moves.</p>
      <div className="mb-5 flex gap-2" role="tablist" aria-label="Approval type">
        {(['deposits', 'withdrawals'] as const).map((value) => <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`rounded-lg px-3 py-2 text-sm ${tab === value ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800'}`}>{value[0].toUpperCase() + value.slice(1)}</button>)}
      </div>
      {error ? <p className="text-sm text-red-300">Unable to load approvals from Xano: {error.message}</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="text-slate-400"><th className="pb-3 pr-4">Reference</th><th className="pb-3 pr-4">Investor</th><th className="pb-3 pr-4">Amount</th><th className="pb-3 pr-4">Received</th><th className="pb-3">Decision</th></tr></thead><tbody>{(data?.items ?? []).map((item) => <tr key={item.id} className="border-t border-slate-800 align-top text-slate-200"><td className="py-3 pr-4">{item.reference}</td><td className="py-3 pr-4">{item.user?.name ?? 'Unknown'}</td><td className="py-3 pr-4 font-medium">{ngn.format(item.amount)}</td><td className="py-3 pr-4 text-slate-400">{lagosDate.format(new Date(item.created_at * 1000))}</td><td className="py-3"><ApprovalDecisionForm kind={tab} item={item} onRecorded={() => mutate()} /></td></tr>)}{!isLoading && !data?.items?.length && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No pending {tab}.</td></tr>}</tbody></table></div>}
    </SectionCard>
  </AdminShell>
}
