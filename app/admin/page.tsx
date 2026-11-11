'use client'

import { useEffect, useState } from 'react'
import { AdminShell, Metric, SectionCard } from '@/components/admin-shell'
import { getAdminDashboard, getLedgerAdminDashboard } from '@/lib/xano-admin'

const naira = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}` : '—'
}

export default function AdminCommandCentrePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [admin, setAdmin] = useState<any>(null)
  const [ledger, setLedger] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    Promise.allSettled([getAdminDashboard(), getLedgerAdminDashboard()]).then(([a, l]) => {
      if (!mounted) return
      if (a.status === 'fulfilled') setAdmin(a.value)
      else setError(a.reason instanceof Error ? a.reason.message : 'Admin API unavailable')
      if (l.status === 'fulfilled') setLedger(l.value)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  const counts = admin?.counts ?? {}
  const aum = admin?.aum ?? {}
  const position = admin?.position ?? ledger?.position ?? {}

  return (
    <AdminShell eyebrow="Admin" title="Command Centre">
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-sm text-amber-200">
          {error}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Active principal" value={loading ? '…' : naira(aum.active_principal)} detail="Portfolio" tone="good" />
        <Metric label="Assets" value={loading ? '…' : naira(position?.assets?.total)} detail="Position" />
        <Metric label="Pending" value={loading ? '…' : String(counts.total_pending_approvals ?? '—')} detail="Approvals queue" tone="warn" />
        <Metric label="Active investors" value={loading ? '…' : String(counts.active_investors ?? '—')} detail="Accounts" />
      </div>
      <div className="mt-6">
        <SectionCard title="Operational snapshot" action={loading ? 'Loading' : 'Live'}>
          <p className="text-sm text-slate-400">
            Plans support pause (new subscriptions only) and delete via live Xano. Users list uses fn_admin_user_list.
            Deposits and withdrawals use fn_admin_pending. Transactions use ledger-api/transactions.
          </p>
        </SectionCard>
      </div>
    </AdminShell>
  )
}
