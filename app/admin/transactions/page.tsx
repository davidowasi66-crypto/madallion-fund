'use client'

import { useEffect, useState } from 'react'
import { ArrowLeftRight, Eye, RefreshCw, X } from 'lucide-react'
import { AdminShell, SectionCard } from '@/components/admin-shell'
import { ReportTable, formatReportCell, labelize } from '@/components/admin-report-table'
import { reportRows } from '@/lib/admin-reports-api'
import { reverseLedgerTransaction } from '@/lib/admin-ops-api'
import { getMemberTransaction } from '@/lib/xano-ledger'
import { isPendingRoute } from '@/lib/pending-route'
import { xanoRequest } from '@/lib/xano-auth'

const naira = (v: unknown) => `₦${Number(v || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

function unwrap(payload: any): Record<string, any>[] {
  if (Array.isArray(payload)) return payload
  for (const key of ['items', 'transactions', 'data', 'entries', 'rows']) {
    if (Array.isArray(payload?.[key])) return payload[key]
  }
  if (Array.isArray(payload?.data?.items)) return payload.data.items
  return []
}

export default function AdminTransactionsPage() {
  const [rows, setRows] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [reverseReason, setReverseReason] = useState('')
  const [reversing, setReversing] = useState(false)
  const [reverseMessage, setReverseMessage] = useState('')

  useEffect(() => {
    let mounted = true
    // Live: GET /api:ledger-api/transactions
    xanoRequest<any>('/api:ledger-api/transactions', { method: 'GET' }, { auth: true })
      .then((payload) => {
        if (!mounted) return
        setRows(unwrap(payload))
      })
      .catch((cause) => {
        if (!mounted) return
        setError(cause instanceof Error ? cause.message : 'Unable to load transactions')
      })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  async function refreshRows() {
    const payload = await xanoRequest<any>('/api:ledger-api/transactions', { method: 'GET' }, { auth: true })
    setRows(unwrap(payload))
  }

  async function openDetail(row: Record<string, any>) {
    const id = row.id ?? row.transaction_id
    if (id == null) return
    setDetailLoading(true)
    setDetailError('')
    setDetail(null)
    setReverseReason('')
    setReverseMessage('')
    try {
      const payload = await getMemberTransaction(id)
      setDetail((payload ?? null) as Record<string, unknown> | null)
    } catch (cause) {
      setDetailError(
        isPendingRoute(cause)
          ? 'The transaction detail route is not available in Xano.'
          : cause instanceof Error ? cause.message : 'Unable to load this transaction.',
      )
    } finally {
      setDetailLoading(false)
    }
  }

  async function submitReverse() {
    if (!detail) return
    const id = detail.id ?? detail.transaction_id
    if (id == null) return
    setReversing(true)
    setReverseMessage('')
    setDetailError('')
    try {
      const result = await reverseLedgerTransaction(Number(id), reverseReason)
      if (!result) {
        setDetailError('The transaction reversal route is not available in Xano.')
        return
      }
      setReverseMessage('Reversal posted. The original transaction is now void.')
      await refreshRows()
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : 'Unable to reverse this transaction.')
    } finally {
      setReversing(false)
    }
  }

  const detailScalars = Object.entries(detail ?? {}).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
  const detailRows = reportRows(detail, ['entries', 'postings', 'items', 'rows'])

  return (
    <AdminShell eyebrow="Admin" title="Transactions">
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <SectionCard title="Ledger entries" action={loading ? 'Loading' : `${rows.length} entries`} icon={ArrowLeftRight}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Reference</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id ?? i} className="border-t border-slate-800 text-slate-200">
                  <td className="py-3 pr-4 text-slate-400">
                    {row.created_at
                      ? new Date(Number(row.created_at) < 1e12 ? Number(row.created_at) * 1000 : row.created_at).toLocaleString('en-NG')
                      : '—'}
                  </td>
                  <td className="py-3 pr-4">{row.type ?? row.kind ?? '—'}</td>
                  <td className="py-3 pr-4">{row.reference ?? row.id ?? '—'}</td>
                  <td className="py-3 pr-4 font-medium">{naira(row.amount ?? row.value)}</td>
                  <td className="py-3 pr-4">{row.status ?? '—'}</td>
                  <td className="py-3">
                    <button onClick={() => void openDetail(row)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-emerald-400/50">
                      <Eye size={16} /> View
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <ArrowLeftRight size={20} className="mx-auto mb-2 text-slate-600" />
                    No transactions returned from ledger-api.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {detailLoading && <p className="mt-4 text-sm text-slate-400">Loading transaction detail…</p>}
      {detailError && !detail && (
        <p role="alert" className="mt-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{detailError}</p>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#101a29] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[.18em] text-emerald-300">Transaction detail</p>
                <h2 className="mt-2 text-xl font-semibold text-white">#{String(detail.id ?? detail.transaction_id ?? '')}</h2>
              </div>
              <button onClick={() => setDetail(null)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300"><X size={16} /> Close</button>
            </div>

            {detailScalars.length > 0 && (
              <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                {detailScalars.map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs">
                    <dt className="text-slate-500">{labelize(key)}</dt>
                    <dd className="text-slate-200">{formatReportCell(key, value)}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-white">Postings</h3>
              <div className="mt-2">
                <ReportTable rows={detailRows} empty="No postings returned." maxColumns={7} />
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
              <h3 className="text-sm font-semibold text-amber-200">Reverse transaction</h3>
              <p className="mt-1 text-xs leading-5 text-amber-100/70">
                Creates an exact inverted double-entry transaction and marks the original void. A reason is recorded.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} placeholder="Reason for reversal" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                <button onClick={() => void submitReverse()} disabled={reversing || !reverseReason.trim()} className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60">
                  <RefreshCw size={16} />{reversing ? 'Reversing…' : 'Reverse'}
                </button>
              </div>
              {reverseMessage && <p role="status" className="mt-3 text-xs text-emerald-300">{reverseMessage}</p>}
              {detailError && <p role="alert" className="mt-3 text-xs text-red-300">{detailError}</p>}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
