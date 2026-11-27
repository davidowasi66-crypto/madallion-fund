'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { AdminShell, SectionCard } from '@/components/admin-shell'
import { ReportTable } from '@/components/admin-report-table'
import { ApprovalDecisionForm } from '@/components/approval-decision'
import { backfillDepositLedgers } from '@/lib/admin-ops-api'
import { reportRows } from '@/lib/admin-reports-api'
import { getAdminPending } from '@/lib/xano-admin'

const ngn = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const lagosDate = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' })

export default function ApprovalsPage() {
  const [tab, setTab] = useState<'deposits' | 'withdrawals'>('deposits')
  const { data, error, isLoading, mutate } = useSWR(['admin-pending', tab], () => getAdminPending({ p_kind: tab }), { revalidateOnFocus: false })
  const [repairBusy, setRepairBusy] = useState<'dry' | 'apply' | null>(null)
  const [repairResult, setRepairResult] = useState<Record<string, unknown> | null>(null)
  const [repairError, setRepairError] = useState('')
  const [repairMessage, setRepairMessage] = useState('')

  async function runRepair(dryRun: boolean) {
    setRepairBusy(dryRun ? 'dry' : 'apply')
    setRepairError('')
    setRepairMessage('')
    setRepairResult(null)
    try {
      const result = await backfillDepositLedgers(dryRun)
      if (!result) {
        setRepairError('The fn_admin_backfill_deposit_ledgers route is not available in Xano.')
        return
      }
      setRepairResult(result)
      setRepairMessage(dryRun ? 'Dry run complete. No records were changed.' : 'Safe deposit ledger repairs applied.')
      await mutate()
    } catch (cause) {
      setRepairError(cause instanceof Error ? cause.message : 'Unable to run the ledger repair.')
    } finally {
      setRepairBusy(null)
    }
  }

  return <AdminShell eyebrow="Risk and controls" title="Approvals">
    <SectionCard title="Pending approvals" action={isLoading ? 'Loading Xano data' : error ? 'Xano unavailable' : 'Live Xano data'}>
      <p className="mb-4 max-w-2xl text-xs leading-5 text-slate-400">Every decision records who decided, the reason, and the note in the Xano audit log before money moves.</p>
      <p className="mb-4 max-w-2xl text-xs leading-5 text-amber-200/80">
        If Xano says “different ledger”, the deposit account and the ledger posting account do not match. If it says
        “idempotency key is currently processing”, the previous attempt is still running; wait a few seconds and refresh
        before retrying.
      </p>
      <div className="mb-5 flex flex-wrap items-center gap-2" role="tablist" aria-label="Approval type">
        {(['deposits', 'withdrawals'] as const).map((value) => <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`rounded-lg px-3 py-2 text-sm ${tab === value ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800'}`}>{value[0].toUpperCase() + value.slice(1)}</button>)}
        <button type="button" onClick={() => void mutate()} className="ml-auto rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-emerald-400/50">
          Refresh queue
        </button>
      </div>
      {error ? (
        <p className="text-sm text-red-300">Unable to load approvals from Xano: {error.message}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="pb-3 pr-4">Reference</th>
                <th className="pb-3 pr-4">Investor</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Channel</th>
                <th className="pb-3 pr-4">Partner</th>
                <th className="pb-3 pr-4">Proof</th>
                <th className="pb-3 pr-4">Received</th>
                <th className="pb-3">Decision</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((item) => (
                <tr key={item.id} className="border-t border-slate-800 align-top text-slate-200">
                  <td className="py-3 pr-4">{item.reference}</td>
                  <td className="py-3 pr-4">{item.user?.name ?? 'Unknown'}</td>
                  <td className="py-3 pr-4 font-medium">{ngn.format(item.amount)}</td>
                  <td className="py-3 pr-4">{item.channel ?? item.method ?? '—'}</td>
                  <td className="py-3 pr-4">{item.partner_name ?? '—'}</td>
                  <td className="py-3 pr-4">
                    {item.proof_url ? (
                      <a href={item.proof_url} target="_blank" rel="noreferrer" className="text-emerald-300 underline">
                        View
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 pr-4 text-slate-400">{lagosDate.format(new Date(item.created_at * 1000))}</td>
                  <td className="py-3"><ApprovalDecisionForm kind={tab} item={item} onRecorded={() => mutate()} /></td>
                </tr>
              ))}
              {!isLoading && !data?.items?.length && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">No pending {tab}.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>

    <div className="mt-6">
      <SectionCard title="Ledger repair" action="Deposit ↔ account alignment">
        <p className="max-w-2xl text-xs leading-5 text-slate-400">
          The “different ledger” error means a deposit points at an account in another ledger. Run a dry run first. The
          apply step only updates deposits whose account ledger is authoritative.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void runRepair(true)} disabled={repairBusy != null} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-emerald-400/50 disabled:opacity-50">
            {repairBusy === 'dry' ? 'Checking…' : 'Dry run'}
          </button>
          <button type="button" onClick={() => void runRepair(false)} disabled={repairBusy != null} className="rounded-lg bg-emerald-400/15 px-3 py-2 text-xs font-medium text-emerald-300 disabled:opacity-50">
            {repairBusy === 'apply' ? 'Applying…' : 'Apply safe fixes'}
          </button>
        </div>
        {repairMessage && <p role="status" className="mt-3 text-xs text-emerald-300">{repairMessage}</p>}
        {repairError && <p role="alert" className="mt-3 text-xs text-red-300">{repairError}</p>}
        {repairResult && (
          <div className="mt-4">
            <ReportTable rows={reportRows(repairResult, ['items', 'rows', 'mismatches', 'deposits'])} empty="No mismatches reported." maxColumns={7} />
          </div>
        )}
      </SectionCard>
    </div>
  </AdminShell>
}
