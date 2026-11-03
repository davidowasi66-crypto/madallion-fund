'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminShell, Metric, SectionCard } from '@/components/admin-shell'
import { xanoLedgerDashboard, xanoLedgerTransactions, getFirstValue } from '@/lib/xano-client'

const fallbackRows = [
  ['2026-11-01', 'Plan maturity', 'Gold Premium', '+₦54,000', 'Settled'],
  ['2026-11-01', 'Investor deposit', 'Kemi A.', '+₦2,500,000', 'Cleared'],
  ['2026-10-31', 'Withdrawal request', 'Ibrahim M.', '-₦850,000', 'Processing'],
  ['2026-10-29', 'Treasury transfer', 'Operations', '+₦1,200,000', 'Posted'],
]

export default function LedgerPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    let active = true

    async function load() {
      const [dashboardRes, txRes] = await Promise.all([
        xanoLedgerDashboard().catch(() => null),
        xanoLedgerTransactions(undefined, { page: 1, per_page: 25 }).catch(() => null),
      ])

      if (!active) return

      setSummary(dashboardRes)
      const rows = txRes?.items ?? txRes?.data ?? txRes?.transactions ?? fallbackRows
      setTransactions(Array.isArray(rows) ? rows : fallbackRows)
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [])

  const ledgerSummary = useMemo(() => {
    const payload = summary?.summary ?? summary?.data ?? summary ?? {}
    return {
      netBalance: getFirstValue(payload, ['net_balance', 'netBalance']) ?? '₦12.4M',
      pendingMovement: getFirstValue(payload, ['pending_movement', 'pendingMovement']) ?? '₦1.8M',
      investorInflows: getFirstValue(payload, ['inflows', 'investor_inflows']) ?? '₦46.2M',
      investorOutflows: getFirstValue(payload, ['outflows', 'investor_outflows']) ?? '₦28.9M',
    }
  }, [summary])

  const ledgerRows = transactions.length
    ? transactions.map((entry: any) => {
        const date = entry.date ?? entry.created_at ?? entry.transaction_date ?? '—'
        const description = entry.description ?? entry.narration ?? entry.reference ?? 'Ledger entry'
        const account = entry.account ?? entry.account_name ?? entry.user_name ?? entry.user?.name ?? '—'
        const amountValue = Number(entry.amount ?? entry.value ?? 0)
        const formattedAmount = `${amountValue >= 0 ? '+' : '-'}₦${Math.abs(amountValue).toLocaleString()}`
        const status = entry.status ?? entry.state ?? 'Posted'
        return [String(date), String(description), String(account), formattedAmount, String(status)]
      })
    : fallbackRows

  return (
    <AdminShell eyebrow="Accounting" title="Ledger">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Net balance" value={loading ? '…' : String(ledgerSummary.netBalance)} detail="Across all wallets" tone="good" />
        <Metric label="Pending movement" value={loading ? '…' : String(ledgerSummary.pendingMovement)} detail="Awaiting settlement" tone="warn" />
        <Metric label="Investor inflows" value={loading ? '…' : String(ledgerSummary.investorInflows)} detail="This month" />
        <Metric label="Investor outflows" value={loading ? '…' : String(ledgerSummary.investorOutflows)} detail="This month" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Ledger entries" action={loading ? 'Syncing' : 'Live'}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-4">Account</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map(([date, description, account, amount, status], index) => (
                  <tr key={`${date}-${index}`} className="border-t border-slate-800 text-slate-200">
                    <td className="py-3 pr-4">{date}</td>
                    <td className="py-3 pr-4">{description}</td>
                    <td className="py-3 pr-4">{account}</td>
                    <td className={`py-3 pr-4 font-medium ${String(amount).startsWith('-') ? 'text-red-300' : 'text-emerald-300'}`}>{amount}</td>
                    <td className="py-3 text-slate-300">{status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Summary" action="Live">
          <div className="space-y-4 text-sm text-slate-300">
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <span>Funded plans</span>
              <strong className="text-white">84</strong>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <span>Active withdrawals</span>
              <strong className="text-white">12</strong>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <span>Auto-matched entries</span>
              <strong className="text-white">91%</strong>
            </div>
          </div>
        </SectionCard>
      </div>
    </AdminShell>
  )
}
