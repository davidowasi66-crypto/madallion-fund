'use client'

import { useEffect, useState } from 'react'
import { AdminShell, SectionCard } from '@/components/admin-shell'
import { OtcRecordForm } from '@/components/otc-record-form'
import { getAdminPending, type AdminPendingResponse } from '@/lib/xano-admin'

const naira = (v: unknown) => `₦${Number(v || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

export default function AdminWithdrawalsPage() {
  const [data, setData] = useState<AdminPendingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    getAdminPending({ p_kind: 'withdrawals', per_page: 50 })
      .then((payload) => {
        if (!mounted) return
        setData(payload)
      })
      .catch((cause) => {
        if (!mounted) return
        setError(cause instanceof Error ? cause.message : 'Unable to load withdrawals')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [refreshKey])

  const rows = data?.items ?? []

  return (
    <AdminShell eyebrow="Admin" title="Withdrawals">
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <div className="mb-6">
        <SectionCard title="Record OTC or manual payout" action="Creates a pending row">
          <OtcRecordForm kind="withdrawal" onRecorded={() => setRefreshKey((value) => value + 1)} />
        </SectionCard>
      </div>
      <SectionCard title="Pending & recent withdrawals" action={loading ? 'Loading' : `${rows.length} rows`}>
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
                <th className="pb-3">Date</th>
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
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No withdrawals in the pending queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AdminShell>
  )
}
