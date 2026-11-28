'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowLeftRight, BookOpen, GitCompare, Landmark, PiggyBank, Receipt, Scale, TrendingDown, TrendingUp } from 'lucide-react'
import { AdminShell, Metric, SectionCard } from '@/components/admin-shell'
import { ReportTable } from '@/components/admin-report-table'
import { getAdminDashboard, type AdminDashboardResponse } from '@/lib/xano-admin'
import {
  getAdminPnl,
  getAdminPosition,
  getAdminReconciliation,
  getAdminTrialBalance,
  reportBoolean,
  reportNumber,
  reportRows,
  reportString,
  type ReportPayload,
} from '@/lib/admin-reports-api'

const naira = (value: number | undefined) => (value == null ? '—' : `₦${Math.round(value).toLocaleString('en-NG')}`)
const percent = (value: number | undefined) => (value == null ? '—' : `${value.toFixed(2)}%`)

function BalanceBadge({ value }: { value: boolean | undefined }) {
  if (value == null) {
    return <span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs text-slate-300">Unavailable</span>
  }
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs ${value ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300'}`}>
      {value ? 'Balanced' : 'Out of balance'}
    </span>
  )
}

export default function TreasuryPage() {
  const dashboard = useSWR<AdminDashboardResponse>('admin-dashboard', getAdminDashboard, { revalidateOnFocus: false })
  const pnl = useSWR<ReportPayload | null>('admin-pnl', getAdminPnl, { revalidateOnFocus: false })
  const reconciliation = useSWR<ReportPayload | null>('admin-reconciliation', () => getAdminReconciliation(), { revalidateOnFocus: false })
  const trialBalance = useSWR<ReportPayload | null>('admin-trial-balance', () => getAdminTrialBalance(), { revalidateOnFocus: false })
  const position = useSWR<ReportPayload | null>('admin-position', getAdminPosition, { revalidateOnFocus: false })

  const revenue = reportNumber(pnl.data, ['revenue', 'total_revenue', 'gross_revenue', 'total_credited'])
  const expenses = reportNumber(pnl.data, ['expenses', 'total_expenses', 'costs', 'costs_to_date'])
  const netProfit = reportNumber(pnl.data, ['net_profit', 'profit', 'net_income', 'net'])
  const costs = reportNumber(pnl.data, ['costs_to_date', 'costs']) ?? dashboard.data?.costs_to_date
  const margin = revenue && netProfit != null ? (netProfit / revenue) * 100 : undefined

  const balanced = reportBoolean(trialBalance.data, ['is_balanced', 'balanced'])
  const debits = reportNumber(trialBalance.data, ['sum_debits', 'sum_debits_cents', 'debits', 'total_debits'])
  const credits = reportNumber(trialBalance.data, ['sum_credits', 'sum_credits_cents', 'credits', 'total_credits'])
  const delta = reportNumber(trialBalance.data, ['delta', 'delta_cents', 'difference'])
  const trialRows = reportRows(trialBalance.data, ['accounts', 'items', 'rows', 'entries'])

  const matched = reportNumber(reconciliation.data, ['matched', 'matched_count', 'matched_items'])
  const unmatched = reportNumber(reconciliation.data, ['unmatched', 'unmatched_count', 'unmatched_items'])
  const variance = reportNumber(reconciliation.data, ['difference', 'variance', 'delta'])
  const reconciliationRows = reportRows(reconciliation.data, ['items', 'rows', 'unmatched', 'transactions', 'entries'])
  const pnlRows = reportRows(pnl.data, ['lines', 'items', 'rows', 'entries', 'breakdown'])
  const totalAssets = reportNumber(position.data, ['total_assets', 'assets', 'asset_total'])
  const totalLiabilities = reportNumber(position.data, ['total_liabilities', 'liabilities', 'liability_total'])
  const totalEquity = reportNumber(position.data, ['total_equity', 'equity'])
  const positionRows = reportRows(position.data, ['lines', 'items', 'rows', 'accounts', 'entries'])

  const pending = [pnl.data, reconciliation.data, trialBalance.data, position.data].every((value) => value === null)
  const errors = [pnl.error, reconciliation.error, trialBalance.error, position.error].filter(Boolean)

  return (
    <AdminShell eyebrow="Treasury controls" title="Treasury">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <p className="max-w-3xl text-sm leading-6 text-slate-400">
          Live P&amp;L, trial balance, and reconciliation from the Xano reporting functions. Use this alongside Liability &amp;
          Settlement for the full position.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link href="/admin/liabilities" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:border-emerald-400/50"><Scale size={16} /> Liability &amp; Settlement</Link>
          <Link href="/admin/ledger" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:border-emerald-400/50"><BookOpen size={16} /> Ledger</Link>
          <Link href="/admin/transactions" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:border-emerald-400/50"><ArrowLeftRight size={16} /> Transactions</Link>
        </div>
      </div>

      {pending && (
        <p className="mt-5 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200">
          The reporting routes are not available yet. Create fn_admin_pnl, fn_admin_reconciliation, and fn_admin_trial_balance in Xano.
        </p>
      )}
      {errors.length > 0 && (
        <p role="alert" className="mt-5 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">
          {errors[0] instanceof Error ? errors[0].message : 'Unable to load one of the reporting endpoints.'}
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Metric label="Revenue" value={pnl.isLoading ? '…' : naira(revenue)} detail="Reported by fn_admin_pnl" tone="good" icon={TrendingUp} />
        <Metric label="Expenses" value={pnl.isLoading ? '…' : naira(expenses)} detail="Reported by fn_admin_pnl" icon={TrendingDown} />
        <Metric
          label="Net profit"
          value={pnl.isLoading ? '…' : naira(netProfit)}
          detail={margin == null ? 'Margin unavailable' : `${percent(margin)} margin`}
          tone={netProfit != null && netProfit < 0 ? 'warn' : 'good'}
          icon={PiggyBank}
        />
        <Metric label="Costs to date" value={dashboard.isLoading ? '…' : naira(costs)} detail="Dashboard and P&amp;L" icon={Receipt} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Trial balance" action={trialBalance.isLoading ? 'Loading' : trialBalance.data ? 'Live Xano data' : 'Route pending'} icon={Scale}>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <BalanceBadge value={balanced} />
            <span>Debits {naira(debits)}</span>
            <span>Credits {naira(credits)}</span>
            <span className={delta && delta !== 0 ? 'text-red-300' : 'text-emerald-300'}>Delta {naira(delta)}</span>
          </div>
          <ReportTable rows={trialRows} empty="No trial-balance rows returned." maxColumns={6} />
        </SectionCard>

        <SectionCard title="Reconciliation" action={reconciliation.isLoading ? 'Loading' : reconciliation.data ? 'Live Xano data' : 'Route pending'} icon={GitCompare}>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span>Matched {matched == null ? '—' : matched.toLocaleString('en-NG')}</span>
            <span className={unmatched ? 'text-amber-300' : 'text-emerald-300'}>Unmatched {unmatched == null ? '—' : unmatched.toLocaleString('en-NG')}</span>
            <span>Variance {naira(variance)}</span>
          </div>
          <ReportTable rows={reconciliationRows} empty="No reconciliation rows returned." maxColumns={6} />
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Profit &amp; loss" action={pnl.isLoading ? 'Loading' : pnl.data ? 'Live Xano data' : 'Route pending'} icon={TrendingUp}>
          <ReportTable rows={pnlRows} empty="No P&amp;L lines returned." maxColumns={7} />
          {!pnlRows.length && pnl.data && (
            <p className="mt-3 text-xs text-slate-500">
              The endpoint returned a summary without line items.
              {reportString(pnl.data, ['period', 'range', 'as_of']) ? ` Period: ${reportString(pnl.data, ['period', 'range', 'as_of'])}.` : ''}
            </p>
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Balance sheet position" action={position.isLoading ? 'Loading' : position.data ? 'Live Xano data' : 'Route pending'} icon={Landmark}>
          <div className="mb-4 flex flex-wrap gap-3 text-sm text-slate-300">
            <span>Assets {totalAssets == null ? '—' : naira(totalAssets)}</span>
            <span>Liabilities {totalLiabilities == null ? '—' : naira(totalLiabilities)}</span>
            <span>Equity {totalEquity == null ? '—' : naira(totalEquity)}</span>
          </div>
          <ReportTable rows={positionRows} empty="No position rows returned." maxColumns={7} />
        </SectionCard>
      </div>
    </AdminShell>
  )
}
