'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { ArrowLeftRight, BookOpen, Check, Landmark, LayoutGrid, LineChart, ListChecks, RefreshCw, Rocket, Scale, ScrollText, UserCheck } from 'lucide-react'
import { AdminShell, Metric, SectionCard } from '@/components/admin-shell'
import { ReportTable } from '@/components/admin-report-table'
import { getLaunchSettings, updateLaunchSettings } from '@/lib/admin-settings-api'
import { getAdminAuditLogs, reportRows } from '@/lib/admin-reports-api'
import { syncBankTransaction } from '@/lib/admin-ops-api'
import type { WaitlistSettings } from '@/lib/product-feature-contracts'

export default function SettingsPage() {
  const launch = useSWR<WaitlistSettings | null>('launch-settings', getLaunchSettings, { revalidateOnFocus: false })
  const audit = useSWR('admin-audit-logs', () => getAdminAuditLogs(1, 25), { revalidateOnFocus: false })

  const [mode, setMode] = useState<WaitlistSettings['mode']>('open')
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [waitlistEnabled, setWaitlistEnabled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')
  const [bank, setBank] = useState({
    ledger_id: '1',
    reference: '',
    operation_type: 'deposit',
    bank_account_id: '',
    user_account_id: '',
    amount: '',
    fee_amount: '',
    fee_account_id: '',
    currency: 'NGN',
    description: '',
  })
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [syncError, setSyncError] = useState('')

  useEffect(() => {
    if (!launch.data) return
    setMode(launch.data.mode)
    setRegistrationEnabled(launch.data.registration_enabled)
    setWaitlistEnabled(launch.data.waitlist_enabled)
  }, [launch.data])

  async function save() {
    setSaving(true)
    setMessage('')
    setFailure('')
    try {
      const updated = await updateLaunchSettings({
        mode,
        registration_enabled: registrationEnabled,
        waitlist_enabled: waitlistEnabled,
        expected_updated_at: launch.data?.updated_at,
      })
      if (!updated) {
        setFailure('This needs the GET|PATCH /api:ledger-api/admin/launch-settings route in Xano. Nothing was saved.')
        return
      }
      await launch.mutate()
      setMessage('Launch settings saved. New signups follow this mode.')
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : 'Unable to save launch settings.')
    } finally {
      setSaving(false)
    }
  }

  async function syncBank(event: React.FormEvent) {
    event.preventDefault()
    setSyncing(true)
    setSyncMessage('')
    setSyncError('')
    try {
      const result = await syncBankTransaction({
        ledger_id: Number(bank.ledger_id),
        reference: bank.reference,
        operation_type: bank.operation_type,
        bank_account_id: Number(bank.bank_account_id),
        user_account_id: Number(bank.user_account_id),
        amount: Math.round(Number(bank.amount) * 100),
        ...(bank.fee_amount ? { fee_amount: Math.round(Number(bank.fee_amount) * 100) } : {}),
        ...(bank.fee_account_id ? { fee_account_id: Number(bank.fee_account_id) } : {}),
        currency: bank.currency,
        ...(bank.description ? { description: bank.description } : {}),
      })
      if (!result) {
        setSyncError('The bank sync route is not available in Xano.')
        return
      }
      setSyncMessage('Bank transaction synced into the ledger.')
      setBank({ ...bank, reference: '', amount: '', fee_amount: '', description: '' })
      await audit.mutate()
    } catch (cause) {
      setSyncError(cause instanceof Error ? cause.message : 'Unable to sync the bank transaction.')
    } finally {
      setSyncing(false)
    }
  }

  const auditRows = reportRows(audit.data, ['items', 'rows', 'logs', 'entries'])
  const launchPending = launch.data === null

  return (
    <AdminShell eyebrow="Platform configuration" title="Settings">
      <p className="max-w-2xl text-sm leading-6 text-slate-400">
        Registration release and the admin audit trail are live from Xano. The reporting links below cover the rest of the
        operational controls.
      </p>

      {message && <div role="status" className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-200">{message}</div>}
      {failure && <div role="alert" className="mt-5 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{failure}</div>}
      {launch.error && <div role="alert" className="mt-5 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">Unable to load launch settings: {launch.error.message}</div>}

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Metric label="Launch mode" value={launch.isLoading ? '…' : launchPending ? '—' : mode === 'invite_only' ? 'Invite only' : 'Open'} detail="Current signup policy" tone="good" icon={Rocket} />
        <Metric label="Registration" value={launch.isLoading ? '…' : registrationEnabled ? 'Enabled' : 'Disabled'} detail="New account creation" icon={UserCheck} />
        <Metric label="Waitlist" value={launch.isLoading ? '…' : waitlistEnabled ? 'On' : 'Off'} detail="Queue new applicants" icon={ListChecks} />
        <Metric label="Audit entries" value={audit.isLoading ? '…' : String(auditRows.length)} detail="Latest 25 actions" icon={ScrollText} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Registration release" action={launch.isLoading ? 'Loading' : launchPending ? 'Route pending' : 'Live Xano data'} icon={Rocket}>
          {launchPending ? (
            <p className="py-6 text-sm text-slate-400">
              The launch-settings route is not available yet. Create <code className="text-emerald-300">GET|PATCH /api:ledger-api/admin/launch-settings</code> in Xano.
            </p>
          ) : (
            <div className="space-y-4">
              <label className="block text-xs font-medium text-slate-400">
                Mode
                <select value={mode} onChange={(event) => setMode(event.target.value as WaitlistSettings['mode'])} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200">
                  <option value="open">Open registration</option>
                  <option value="invite_only">Invite only</option>
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                <input type="checkbox" checked={registrationEnabled} onChange={(event) => setRegistrationEnabled(event.target.checked)} className="h-4 w-4 accent-emerald-400" />
                <span className="text-sm text-slate-200">Registration enabled</span>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                <input type="checkbox" checked={waitlistEnabled} onChange={(event) => setWaitlistEnabled(event.target.checked)} className="h-4 w-4 accent-emerald-400" />
                <span className="text-sm text-slate-200">Waitlist enabled</span>
              </label>
              <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">
                <Check size={16} />{saving ? 'Saving…' : 'Save launch settings'}
              </button>
              {launch.data?.updated_at && <p className="text-xs text-slate-500">Last updated {new Date(launch.data.updated_at).toLocaleString('en-NG')}</p>}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Operational reports" action="Open a report" icon={LayoutGrid}>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ['P&L and trial balance', '/admin/treasury', 'Revenue, expenses, reconciliation', LineChart],
              ['Liability & settlement', '/admin/liabilities', 'Total liability and channel mix', Scale],
              ['Ledger', '/admin/ledger', 'Accounts and ledger position', BookOpen],
              ['Transactions', '/admin/transactions', 'Posted ledger entries', ArrowLeftRight],
            ] as const).map(([label, href, detail, Icon]) => (
              <Link key={href} href={href} className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 hover:border-emerald-400/40">
                <Icon size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                <span>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="mt-1 text-xs text-slate-400">{detail}</p>
                </span>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Admin audit log" action={audit.isLoading ? 'Loading' : audit.data ? `${auditRows.length} rows` : 'Route pending'} icon={ScrollText}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">Every approval, channel change, and money movement should appear here.</p>
            <button onClick={() => void audit.mutate()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-emerald-400/50"><RefreshCw size={16} /> Refresh</button>
          </div>
          {audit.data === null ? (
            <p className="py-6 text-sm text-slate-400">
              The audit route is not available yet. Create <code className="text-emerald-300">fn_admin_audit_logs</code> in Xano.
            </p>
          ) : (
            <ReportTable rows={auditRows} empty="No audit entries returned." maxColumns={7} />
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Bank sync" action="POST /api:ledger-api/bank/sync" icon={Landmark}>
          <p className="max-w-3xl text-xs leading-5 text-slate-400">
            Map an external bank deposit or payout into balanced double-entry postings. Amounts are entered in naira and sent
            to Xano in minor units.
          </p>
          <form onSubmit={syncBank} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="block"><span className="text-xs text-slate-400">Ledger ID</span><input required type="number" min="1" value={bank.ledger_id} onChange={(e) => setBank({ ...bank, ledger_id: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <label className="block"><span className="text-xs text-slate-400">Reference</span><input required value={bank.reference} onChange={(e) => setBank({ ...bank, reference: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <label className="block"><span className="text-xs text-slate-400">Operation</span><select value={bank.operation_type} onChange={(e) => setBank({ ...bank, operation_type: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"><option value="deposit">Deposit</option><option value="payout">Payout</option></select></label>
            <label className="block"><span className="text-xs text-slate-400">Currency</span><input required value={bank.currency} onChange={(e) => setBank({ ...bank, currency: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <label className="block"><span className="text-xs text-slate-400">Bank account ID</span><input required type="number" min="1" value={bank.bank_account_id} onChange={(e) => setBank({ ...bank, bank_account_id: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <label className="block"><span className="text-xs text-slate-400">User account ID</span><input required type="number" min="1" value={bank.user_account_id} onChange={(e) => setBank({ ...bank, user_account_id: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <label className="block"><span className="text-xs text-slate-400">Amount (NGN)</span><input required type="number" min="0.01" step="0.01" value={bank.amount} onChange={(e) => setBank({ ...bank, amount: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <label className="block"><span className="text-xs text-slate-400">Fee (NGN, optional)</span><input type="number" min="0" step="0.01" value={bank.fee_amount} onChange={(e) => setBank({ ...bank, fee_amount: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <label className="block"><span className="text-xs text-slate-400">Fee account ID (optional)</span><input type="number" min="1" value={bank.fee_account_id} onChange={(e) => setBank({ ...bank, fee_account_id: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <label className="block md:col-span-2"><span className="text-xs text-slate-400">Description</span><input value={bank.description} onChange={(e) => setBank({ ...bank, description: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <div className="flex items-end"><button disabled={syncing} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60"><ArrowLeftRight size={16} />{syncing ? 'Syncing…' : 'Sync bank transaction'}</button></div>
          </form>
          {syncMessage && <p role="status" className="mt-3 text-xs text-emerald-300">{syncMessage}</p>}
          {syncError && <p role="alert" className="mt-3 text-xs text-red-300">{syncError}</p>}
        </SectionCard>
      </div>
    </AdminShell>
  )
}
