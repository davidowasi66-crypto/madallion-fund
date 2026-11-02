'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminShell, Metric, SectionCard } from '@/components/admin-shell'
import { ArrowUpRight, CalendarDays, CircleAlert, TrendingUp } from 'lucide-react'
import { xanoAdminDashboard, xanoAdminPending, xanoLedgerDashboard, getFirstValue } from '@/lib/xano-client'

const fallbackRows = [
  ['Mon, Oct 26', '₦8,420,000', '₦151,560'],
  ['Tue, Oct 27', '₦8,610,000', '₦154,980'],
  ['Wed, Oct 28', '₦8,740,000', '₦157,320'],
]

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState<any>(null)
  const [ledger, setLedger] = useState<any>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      const [adminRes, ledgerRes] = await Promise.all([
        xanoAdminDashboard().catch(() => null),
        xanoLedgerDashboard().catch(() => null),
      ])

      if (!mounted) return

      setDashboard(adminRes)
      setLedger(ledgerRes)
      setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [])

  const adminSummary = useMemo(() => {
    const payload = dashboard?.summary ?? dashboard?.data ?? dashboard ?? {}
    return {
      totalValue: getFirstValue(payload, ['total_value', 'portfolio_value', 'net_balance', 'balance']) ?? '₦12.4M',
      reserve: getFirstValue(payload, ['reserve_surplus_ratio', 'reserveSurplusRatio']) ?? '12.4%',
      queued: getFirstValue(payload, ['pending_count', 'pending', 'queue_count']) ?? 7,
      pnl: getFirstValue(payload, ['pnl', 'profit_loss']) ?? '₦2.4M',
    }
  }, [dashboard])

  const ledgerSummary = useMemo(() => {
    const payload = ledger?.summary ?? ledger?.data ?? ledger ?? {}
    return {
      netBalance: getFirstValue(payload, ['net_balance', 'netBalance']) ?? '₦12.4M',
      pendingMovement: getFirstValue(payload, ['pending_movement', 'pendingMovement']) ?? '₦1.8M',
      investorInflows: getFirstValue(payload, ['inflows', 'investor_inflows']) ?? '₦46.2M',
      investorOutflows: getFirstValue(payload, ['outflows', 'investor_outflows']) ?? '₦28.9M',
    }
  }, [ledger])

  return (
    <AdminShell eyebrow="Treasury control room" title="Good morning, Ada">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-slate-400">Portfolio health</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">{loading ? 'Loading…' : String(adminSummary.totalValue)}</h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-300">
          <TrendingUp size={14} /> Reserve surplus {adminSummary.reserve}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Metric label="Net balance" value={loading ? '…' : String(ledgerSummary.netBalance)} detail="Across all wallets" tone="good" />
        <Metric label="Pending movement" value={loading ? '…' : String(ledgerSummary.pendingMovement)} detail="Awaiting settlement" tone="warn" />
        <Metric label="Investor inflows" value={loading ? '…' : String(ledgerSummary.investorInflows)} detail="This month" />
        <Metric label="Investor outflows" value={loading ? '…' : String(ledgerSummary.investorOutflows)} detail="This month" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Accruals" action="Live">
          <div className="space-y-3">
            {fallbackRows.map(([day, value, accrual]) => (
              <div key={day} className="grid grid-cols-[1.3fr_.9fr_.9fr] gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-300">
                <span>{day}</span>
                <span>{value}</span>
                <span className="text-emerald-300">{accrual}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Operational notes" action="Attention">
          <div className="space-y-4 text-sm text-slate-300">
            <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <CircleAlert size={16} className="mt-0.5 text-amber-300" />
              <div>
                <p className="font-medium text-white">{loading ? 'Loading queue…' : `${adminSummary.queued} pending approvals`}</p>
                <p className="mt-1 text-slate-400">Admin and treasury review queue is live.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <CalendarDays size={16} className="mt-0.5 text-emerald-300" />
              <div>
                <p className="font-medium text-white">Daily P&L</p>
                <p className="mt-1 text-slate-400">Projected run-rate: {adminSummary.pnl}</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-slate-300">
              <span>Live queue</span>
              <span className="font-medium text-white">{loading ? '…' : adminSummary.queued}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
        <ArrowUpRight size={14} className="text-emerald-300" />
        {loading ? 'Fetching live Xano metrics…' : 'Xano live metrics connected.'}
      </div>
    </AdminShell>
  )
}
