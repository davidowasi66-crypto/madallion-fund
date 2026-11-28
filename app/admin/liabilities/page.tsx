'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import useSWR from 'swr'
import { AdminShell, Metric, SectionCard } from '@/components/admin-shell'
import { ReportTable } from '@/components/admin-report-table'
import {
  getAdminDashboard,
  getAdminPending,
  type AdminDashboardResponse,
  type AdminPendingResponse,
} from '@/lib/xano-admin'
import { getAdminLiabilityReport, reportRows, type ReportPayload } from '@/lib/admin-reports-api'
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Banknote,
  CalendarClock,
  ClipboardCheck,
  Coins,
  FileText,
  Hourglass,
  Inbox,
  Landmark,
  Network,
  Package,
  Receipt,
  Scale,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react'

const naira = (value: unknown) => `₦${Math.round(Number(value || 0)).toLocaleString('en-NG')}`
const count = (value: unknown) => Number(value || 0).toLocaleString('en-NG')

type ChannelRow = {
  channel: string
  deposits: number
  depositAmount: number
  withdrawals: number
  withdrawalAmount: number
}

const CAPABILITIES = [
  {
    capability: 'Collect NGN from members',
    monnify: 'Checkout, payment links, virtual accounts',
    here: 'Manual bank proof + OTC/partner recorder',
    status: 'Covered',
    href: '/admin/deposits',
  },
  {
    capability: 'Dedicated virtual accounts',
    monnify: 'One virtual account per customer',
    here: 'One bank account per channel; member reference is manual',
    status: 'Manual',
    href: '/admin/channels',
  },
  {
    capability: 'Payouts and transfers',
    monnify: 'Single and bulk transfers to banks',
    here: 'Disbursement recorder + maker-checker approval',
    status: 'Covered',
    href: '/admin/disbursements',
  },
  {
    capability: 'Settlement reports',
    monnify: 'Daily settlement and transaction reports',
    here: 'Liability, accrual, and maturity reporting',
    status: 'Covered',
    href: '/admin/accruals',
  },
  {
    capability: 'Reconciliation',
    monnify: 'Automatic matching of collections and payouts',
    here: 'fn_admin_reconciliation route exists; UI is still partial',
    status: 'Partial',
    href: '/admin/ledger',
  },
  {
    capability: 'Fees and charges',
    monnify: 'Per-transaction gateway fees',
    here: 'Costs to date and fee fields; no per-channel fee ledger yet',
    status: 'Partial',
    href: '/admin/treasury',
  },
  {
    capability: 'Webhooks and instant alerts',
    monnify: 'Payment and transfer webhooks',
    here: 'Approval queue is the trigger; no provider webhook yet',
    status: 'Manual',
    href: '/admin/approvals',
  },
  {
    capability: 'Refunds and disputes',
    monnify: 'Refund and dispute management',
    here: 'Reject in Approvals and record a new movement',
    status: 'Manual',
    href: '/admin/approvals',
  },
  {
    capability: 'KYC and customer records',
    monnify: 'Customer profiles and KYC checks',
    here: 'Member KYC and user records',
    status: 'Covered',
    href: '/admin/users',
  },
  {
    capability: 'Multi-channel operations',
    monnify: 'Card, transfer, USSD, and bank channels',
    here: 'Admin-managed money channels',
    status: 'Covered',
    href: '/admin/channels',
  },
  {
    capability: 'Dashboard and exports',
    monnify: 'Gateway dashboard and CSV exports',
    here: 'Admin dashboards; export is not built yet',
    status: 'Partial',
    href: '/admin',
  },
] as const

const badgeClass = (status: string) => {
  if (status === 'Covered') return 'bg-emerald-400/10 text-emerald-300'
  if (status === 'Partial') return 'bg-amber-400/10 text-amber-300'
  if (status === 'Manual') return 'bg-slate-700 text-slate-300'
  return 'bg-red-400/10 text-red-300'
}

const barWidth = (value: number, max: number) => `${max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0}%`

export default function LiabilitiesPage() {
  const { data, error, isLoading } = useSWR<AdminDashboardResponse>('admin-dashboard', getAdminDashboard, {
    revalidateOnFocus: false,
  })
  const deposits = useSWR<AdminPendingResponse>(
    'liability-deposits',
    () => getAdminPending({ p_kind: 'deposits', per_page: 100 }),
    { revalidateOnFocus: false },
  )
  const withdrawals = useSWR<AdminPendingResponse>(
    'liability-withdrawals',
    () => getAdminPending({ p_kind: 'withdrawals', per_page: 100 }),
    { revalidateOnFocus: false },
  )
  const liabilityReport = useSWR<ReportPayload | null>('admin-liability-report', () => getAdminLiabilityReport(100), {
    revalidateOnFocus: false,
  })

  const channels = useMemo<ChannelRow[]>(() => {
    const map = new Map<string, ChannelRow>()
    const add = (kind: 'deposit' | 'withdrawal', items: AdminPendingResponse['items'] | undefined) => {
      for (const item of items ?? []) {
        const key = String(item.channel ?? item.method ?? 'unknown')
        const row = map.get(key) ?? {
          channel: key,
          deposits: 0,
          depositAmount: 0,
          withdrawals: 0,
          withdrawalAmount: 0,
        }
        if (kind === 'deposit') {
          row.deposits += 1
          row.depositAmount += Number(item.amount ?? 0)
        } else {
          row.withdrawals += 1
          row.withdrawalAmount += Number(item.amount ?? 0)
        }
        map.set(key, row)
      }
    }
    add('deposit', deposits.data?.items)
    add('withdrawal', withdrawals.data?.items)
    return [...map.values()].sort(
      (a, b) => b.depositAmount + b.withdrawalAmount - (a.depositAmount + a.withdrawalAmount),
    )
  }, [deposits.data, withdrawals.data])

  const serverChannels = useMemo<ChannelRow[]>(() => {
    return reportRows(liabilityReport.data, ['channels', 'by_channel', 'items', 'rows']).map((row) => ({
      channel: String(row.channel ?? row.name ?? 'unknown'),
      deposits: Number(row.deposit_count ?? row.deposits ?? 0),
      depositAmount: Number(row.deposit_amount ?? row.deposits_amount ?? 0),
      withdrawals: Number(row.withdrawal_count ?? row.withdrawals ?? 0),
      withdrawalAmount: Number(row.withdrawal_amount ?? row.withdrawals_amount ?? 0),
    }))
  }, [liabilityReport.data])

  const effectiveChannels = serverChannels.length ? serverChannels : channels

  const liabilityMix = data?.charts.liability_vs_asset ?? []
  const liabilityMax = Math.max(...liabilityMix.map((item) => Number(item.value ?? 0)), 1)
  const cashflow = data?.charts.cashflow ?? []
  const cashflowMax = Math.max(
    ...cashflow.map((item) => Number((item as Record<string, unknown>)?.value ?? (item as Record<string, unknown>)?.amount ?? 0)),
    1,
  )

  return (
    <AdminShell eyebrow="Treasury controls" title="Liability & Settlement">
      <p className="max-w-3xl text-sm leading-6 text-slate-400">
        This is the admin view that replaces the gateway dashboard: what the platform owes members, what it holds, what is
        pending, and how each money channel is performing. Monnify would show similar numbers; here they come from the ledger
        and the approval queue.
      </p>

      {error && (
        <p role="alert" className="mt-5 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">
          Unable to load the liability dashboard: {error.message}
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Metric label="Total liabilities" value={isLoading ? '…' : naira(data?.position.liabilities.total)} detail="What the platform owes members" tone="warn" icon={Scale} />
        <Metric label="Assets" value={isLoading ? '…' : naira(data?.position.assets.total)} detail="Current position" tone="good" icon={Landmark} />
        <Metric label="Equity" value={isLoading ? '…' : naira(data?.position.equity.net)} detail={data ? `Surplus ${data.position.equity.surplus_ratio}% · ${data.position.equity.surplus_status}` : 'Net position'} icon={TrendingUp} />
        <Metric label="Active principal" value={isLoading ? '…' : naira(data?.aum.active_principal)} detail="Locked member principal" icon={Wallet} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Metric label="Accrued today" value={isLoading ? '…' : naira(data?.today.interest_accrued)} detail="Interest posted today" icon={Coins} />
        <Metric label="Daily interest due" value={isLoading ? '…' : naira(data?.interest_forecast.daily_interest_due)} detail="Forecast run-rate" tone="warn" icon={CalendarClock} />
        <Metric label="Coverage" value={isLoading ? '…' : `${data?.interest_forecast.coverage_days ?? 0} days`} detail="At the current payout pace" icon={ShieldCheck} />
        <Metric label="Maturities in 30 days" value={isLoading ? '…' : naira(data?.interest_forecast.maturities_30d)} detail="Principal and yield due" tone="warn" icon={Hourglass} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Metric label="Pending deposits" value={isLoading ? '…' : count(data?.counts.pending_deposits)} detail="Awaiting approval" icon={ArrowDownToLine} />
        <Metric label="Pending withdrawals" value={isLoading ? '…' : count(data?.counts.pending_withdrawals)} detail="Awaiting approval" tone="warn" icon={ArrowUpFromLine} />
        <Metric label="Lifetime net inflow" value={isLoading ? '…' : naira(data?.lifetime.net_inflow)} detail={`Credited ${naira(data?.lifetime.total_credited)} · Debited ${naira(data?.lifetime.total_debited)}`} tone="good" icon={TrendingUp} />
        <Metric label="Costs to date" value={isLoading ? '…' : naira(data?.costs_to_date)} detail="Recorded operating costs" icon={Receipt} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Liability vs assets" action={isLoading ? 'Loading' : 'Ledger position'} icon={Scale}>
          <div className="space-y-4">
            {liabilityMix.map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>{item.name}</span>
                  <span className="font-medium text-white">{naira(item.value)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: barWidth(Number(item.value ?? 0), liabilityMax) }} />
                </div>
              </div>
            ))}
            {!isLoading && liabilityMix.length === 0 && <p className="text-sm text-slate-500"><Inbox size={16} className="mr-2 inline text-slate-600" />No liability chart returned by Xano.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Plan mix" action={isLoading ? 'Loading' : `${data?.charts.plan_mix.length ?? 0} plans`} icon={Package}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="pb-3 pr-4">Plan</th>
                  <th className="pb-3 pr-4">Principal</th>
                  <th className="pb-3">Investors</th>
                </tr>
              </thead>
              <tbody>
                {(data?.charts.plan_mix ?? []).map((plan) => (
                  <tr key={plan.plan_id} className="border-t border-slate-800 text-slate-200">
                    <td className="py-3 pr-4">{plan.name}</td>
                    <td className="py-3 pr-4">{naira(plan.principal)}</td>
                    <td className="py-3">{count(plan.investors_count)}</td>
                  </tr>
                ))}
                {!isLoading && (data?.charts.plan_mix.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-500"><Inbox size={20} className="mx-auto mb-2 text-slate-600" />No plan mix returned.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Cashflow" action={isLoading ? 'Loading' : 'Recent movement'} icon={ArrowLeftRight}>
          <div className="space-y-3">
            {cashflow.map((item, index) => {
              const row = item as Record<string, unknown>
              const label = String(row.label ?? row.name ?? row.date ?? `Period ${index + 1}`)
              const value = Number(row.value ?? row.amount ?? 0)
              return (
                <div key={`${label}-${index}`}>
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>{label}</span>
                    <span className="font-medium text-white">{naira(value)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: barWidth(value, cashflowMax) }} />
                  </div>
                </div>
              )
            })}
            {!isLoading && cashflow.length === 0 && <p className="text-sm text-slate-500"><Inbox size={16} className="mr-2 inline text-slate-600" />No cashflow series returned.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Channel performance" action={liabilityReport.data ? 'Xano lifetime totals' : deposits.isLoading || withdrawals.isLoading ? 'Loading' : `${effectiveChannels.length} channels`} icon={Network}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="pb-3 pr-4">Channel</th>
                  <th className="pb-3 pr-4">Deposits</th>
                  <th className="pb-3 pr-4">Withdrawals</th>
                  <th className="pb-3">Net</th>
                </tr>
              </thead>
              <tbody>
                {effectiveChannels.map((channel) => (
                  <tr key={channel.channel} className="border-t border-slate-800 text-slate-200">
                    <td className="py-3 pr-4 font-medium text-white">{channel.channel}</td>
                    <td className="py-3 pr-4">{channel.deposits} · {naira(channel.depositAmount)}</td>
                    <td className="py-3 pr-4">{channel.withdrawals} · {naira(channel.withdrawalAmount)}</td>
                    <td className="py-3">{naira(channel.depositAmount - channel.withdrawalAmount)}</td>
                  </tr>
                ))}
                {!deposits.isLoading && !withdrawals.isLoading && effectiveChannels.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500"><Inbox size={20} className="mx-auto mb-2 text-slate-600" />No channel movements in the current queue.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {serverChannels.length
              ? 'Lifetime totals from fn_admin_liability_report.'
              : 'Based on the pending and recent deposit and withdrawal queue, not lifetime totals.'}
          </p>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Liability report" action={liabilityReport.isLoading ? 'Loading' : liabilityReport.data ? 'Live Xano data' : 'Unavailable'} icon={FileText}>
          <ReportTable
            rows={reportRows(liabilityReport.data, ['items', 'rows', 'liabilities', 'by_channel', 'channels'])}
            empty="No liability rows returned."
            maxColumns={7}
          />
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Monnify-equivalent capabilities" action="What you get without a gateway" icon={ClipboardCheck}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="pb-3 pr-4">Capability</th>
                  <th className="pb-3 pr-4">Monnify would give you</th>
                  <th className="pb-3 pr-4">This admin area gives you</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Open</th>
                </tr>
              </thead>
              <tbody>
                {CAPABILITIES.map((item) => (
                  <tr key={item.capability} className="border-t border-slate-800 align-top text-slate-200">
                    <td className="py-3 pr-4 font-medium text-white">{item.capability}</td>
                    <td className="py-3 pr-4 text-slate-400">{item.monnify}</td>
                    <td className="py-3 pr-4 text-slate-300">{item.here}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs ${badgeClass(item.status)}`}>{item.status}</span>
                    </td>
                    <td className="py-3">
                      <Link href={item.href} className="text-emerald-300 underline">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Covered means the workflow exists in this admin area. Partial means the backend route or report exists but the UI is
            incomplete. Manual means operations must do it by hand. The main gap versus a gateway is automated collection and
            webhook reconciliation.
          </p>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/deposits" className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300 hover:border-emerald-400/40">
          <p className="flex items-center gap-2 font-medium text-white"><ArrowDownToLine size={16} />Deposits</p>
          <p className="mt-1 text-xs text-slate-400">Record and review collections.</p>
        </Link>
        <Link href="/admin/disbursements" className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300 hover:border-emerald-400/40">
          <p className="flex items-center gap-2 font-medium text-white"><Banknote size={16} />Disbursements</p>
          <p className="mt-1 text-xs text-slate-400">Record payouts and track settlement.</p>
        </Link>
        <Link href="/admin/channels" className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300 hover:border-emerald-400/40">
          <p className="flex items-center gap-2 font-medium text-white"><Network size={16} />Money Channels</p>
          <p className="mt-1 text-xs text-slate-400">Add or pause bank, OTC, and cash routes.</p>
        </Link>
        <Link href="/admin/accruals" className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300 hover:border-emerald-400/40">
          <p className="flex items-center gap-2 font-medium text-white"><CalendarClock size={16} />Accruals & Maturity</p>
          <p className="mt-1 text-xs text-slate-400">See per-plan accruals and maturities.</p>
        </Link>
      </div>
    </AdminShell>
  )
}
