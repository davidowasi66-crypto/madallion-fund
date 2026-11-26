'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { AdminShell, SectionCard } from '@/components/admin-shell'
import { OtcRecordForm } from '@/components/otc-record-form'
import { getAdminPending, type AdminPendingResponse } from '@/lib/xano-admin'

const naira = (value: unknown) => `₦${Number(value || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

export default function DisbursementsPage() {
  const { data, error, isLoading, mutate } = useSWR<AdminPendingResponse>(
    'admin-disbursements',
    () => getAdminPending({ p_kind: 'withdrawals', per_page: 50 }),
    { revalidateOnFocus: false },
  )
  const rows = data?.items ?? []

  return (
    <AdminShell eyebrow="Money controls" title="Disbursements">
      <div className="mb-6">
        <SectionCard title="New disbursement" action="Creates a pending payout">
          <OtcRecordForm kind="withdrawal" onRecorded={() => void mutate()} />
        </SectionCard>
      </div>

      <SectionCard
        title="Payout queue"
        action={isLoading ? 'Loading' : error ? 'Xano unavailable' : `${rows.length} rows`}
      >
        <div className="mb-4 flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Disbursements stay pending until an admin approves them in Approvals. Approval calls the ledger settlement function.</p>
          <Link href="/admin/approvals" className="font-medium text-emerald-300 underline">
            Open approvals
          </Link>
        </div>
        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">
            Unable to load payouts: {error.message}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="pb-3 pr-4">Reference</th>
                <th className="pb-3 pr-4">Member</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Channel</th>
                <th className="pb-3 pr-4">Partner</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Proof</th>
                <th className="pb-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-800 text-slate-200">
                  <td className="py-3 pr-4">{row.reference || row.id}</td>
                  <td className="py-3 pr-4">{row.user?.name ?? row.user?.email ?? '—'}</td>
                  <td className="py-3 pr-4 font-medium">{naira(row.amount)}</td>
                  <td className="py-3 pr-4">{row.channel ?? row.method ?? '—'}</td>
                  <td className="py-3 pr-4">{row.partner_name ?? '—'}</td>
                  <td className="py-3 pr-4">{row.status}{row.is_overdue ? ' · overdue' : ''}</td>
                  <td className="py-3 pr-4">
                    {row.proof_url ? (
                      <a href={row.proof_url} target="_blank" rel="noreferrer" className="text-emerald-300 underline">
                        View
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 text-slate-400">
                    {row.created_at
                      ? new Date(Number(row.created_at) < 1e12 ? Number(row.created_at) * 1000 : row.created_at).toLocaleString('en-NG')
                      : '—'}
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">No payouts in the queue.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AdminShell>
  )
}
