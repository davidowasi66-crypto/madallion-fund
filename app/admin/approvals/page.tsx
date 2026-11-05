'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Check, X } from 'lucide-react'
import { AdminShell, SectionCard } from '@/components/admin-shell'
import { approveDeposit, getAdminPending, settleWithdrawal } from '@/lib/xano-admin'

const ngn = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const lagosDate = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' })

type Tab = 'deposits' | 'withdrawals'

export default function ApprovalsPage() {
  const [tab, setTab] = useState<Tab>('deposits')
  const [busy, setBusy] = useState<number | null>(null)
  const { data, error, isLoading, mutate } = useSWR(['admin-pending', tab], () => getAdminPending({ p_kind: tab }), { revalidateOnFocus: false })

  async function settle(item: Record<string, any>) {
    setBusy(item.id)
    try {
      const payload = { p_id: item.id, p_reference: item.reference }
      if (tab === 'deposits') await approveDeposit(payload)
      else await settleWithdrawal(payload)
      await mutate()
    } finally {
      setBusy(null)
    }
  }

  return <AdminShell eyebrow="Risk and controls" title="Approvals">
    <SectionCard title="Pending approvals" action={isLoading ? 'Loading Xano data' : error ? 'Xano unavailable' : 'Live Xano data'}>
      <div className="mb-5 flex gap-2" role="tablist" aria-label="Approval type">
        {(['deposits', 'withdrawals'] as Tab[]).map((value) => <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`rounded-lg px-3 py-2 text-sm ${tab === value ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800'}`}>{value[0].toUpperCase() + value.slice(1)}</button>)}
      </div>
      {error ? <p className="text-sm text-red-300">Unable to load approvals from Xano: {error.message}</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="text-slate-400"><th className="pb-3 pr-4">Reference</th><th className="pb-3 pr-4">Investor</th><th className="pb-3 pr-4">Amount</th><th className="pb-3 pr-4">Received</th><th className="pb-3">Action</th></tr></thead><tbody>{(data?.items ?? []).map((item) => <tr key={item.id} className="border-t border-slate-800 text-slate-200"><td className="py-3 pr-4">{item.reference}</td><td className="py-3 pr-4">{item.user?.name ?? 'Unknown'}</td><td className="py-3 pr-4 font-medium">{ngn.format(item.amount)}</td><td className="py-3 pr-4 text-slate-400">{lagosDate.format(new Date(item.created_at * 1000))}</td><td className="py-3"><button disabled={busy === item.id} onClick={() => settle(item)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-xs text-emerald-300 disabled:opacity-50"><Check size={13} />{busy === item.id ? 'Saving…' : 'Approve'}</button></td></tr>)}{!isLoading && !data?.items?.length && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No pending {tab}.</td></tr>}</tbody></table></div>}
    </SectionCard>
  </AdminShell>
}
