'use client'

import { useEffect, useState } from 'react'
import { AdminShell, SectionCard } from '@/components/admin-shell'
import { xanoRequest } from '@/lib/xano-auth'

const naira = (v: unknown) => `₦${Number(v || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

function unwrap(payload: any): Record<string, any>[] {
  if (Array.isArray(payload)) return payload
  for (const key of ['items', 'data', 'deposits', 'pending', 'rows']) {
    if (Array.isArray(payload?.[key])) return payload[key]
  }
  if (Array.isArray(payload?.data?.items)) return payload.data.items
  return []
}

export default function AdminDepositsPage() {
  const [rows, setRows] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    xanoRequest<any>('/api:yYNRHo4K/fn_admin_pending?p_kind=deposits', { method: 'GET' }, { auth: true })
      .then((payload) => {
        if (!mounted) return
        setRows(unwrap(payload))
      })
      .catch((cause) => {
        if (!mounted) return
        setError(cause instanceof Error ? cause.message : 'Unable to load deposits')
      })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

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
              {rows.map((row, i) => (
                <tr key={row.id ?? row.reference ?? i} className="border-t border-slate-800 text-slate-200">
                  <td className="py-3 pr-4">{row.reference ?? row.id ?? '—'}</td>
                  <td className="py-3 pr-4">{row.user?.name ?? row.member_name ?? row.email ?? '—'}</td>
                  <td className="py-3 pr-4 font-medium">{naira(row.amount ?? row.value)}</td>
                  <td className="py-3 pr-4">{row.status ?? '—'}</td>
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
