'use client'

import { useEffect, useState } from 'react'
import { AdminShell, SectionCard } from '@/components/admin-shell'
import { getAdminPending, type AdminPendingResponse } from '@/lib/xano-admin'

const naira = (v: unknown) => `₦${Number(v || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

export default function AdminDepositsPage() {
  const [data, setData] = useState<AdminPendingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    getAdminPending({ p_kind: 'deposits', per_page: 50 })
      .then((payload) => {
        if (!mounted) return
        setData(payload)
      })
      .catch((cause) => {
        if (!mounted) return
        setError(cause instanceof Error ? cause.message : 'Unable to load deposits')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const rows = data?.items ?? []

  return (
    <AdminShell eyebrow="Admin" title="Deposits">
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <SectionCard title="Pending & recent deposits" action={loading ? 'Loading' : `${rows.length} rows`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="pb-3 pr-4">Reference</th>
                <th className="pb-3 pr-4">Member</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-800 text-slate-200">
                  <td className="py-3 pr-4">{row.reference || row.id}</td>
                  <td className="py-3 pr-4">{row.user?.name ?? row.user?.email ?? '—'}</td>
                  <td className="py-3 pr-4 font-medium">{naira(row.amount)}</td>
                  <td className="py-3 pr-4">{row.status}{row.is_overdue ? ' · overdue' : ''}</td>
                  <td className="py-3 text-slate-400">
                    {row.created_at
                      ? new Date(Number(row.created_at) < 1e12 ? Number(row.created_at) * 1000 : row.created_at).toLocaleString('en-NG')
                      : '—'}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No deposits in the pending queue.
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
