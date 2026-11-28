'use client'

import { useMemo, useState } from 'react'
import { AdminShell, SectionCard } from '@/components/admin-shell'
import {
  createLedger,
  createLedgerAccount,
  postLedgerTransaction,
  seedLedger,
} from '@/lib/admin-ops-api'
import { ArrowLeftRight, Database, Play, Plus, Sprout, Trash2, Wallet } from 'lucide-react'

type Entry = {
  account_id: string
  type: 'debit' | 'credit'
  amount: string
  narration: string
}

type Result = { ok: boolean; text: string }

const naira = (value: number) => `₦${(value || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`

function parseMetadata(value: string): Record<string, unknown> | undefined {
  if (!value.trim()) return undefined
  const parsed = JSON.parse(value)
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Metadata must be a JSON object.')
  }
  return parsed as Record<string, unknown>
}

const newEntry = (type: 'debit' | 'credit'): Entry => ({ account_id: '', type, amount: '', narration: '' })

export default function LedgerToolsPage() {
  const [ledgerForm, setLedgerForm] = useState({ name: '', description: '', metadata: '' })
  const [accountForm, setAccountForm] = useState({
    ledger_id: '1',
    account_number: '',
    name: '',
    type: 'asset',
    currency: 'NGN',
    metadata: '',
  })
  const [txForm, setTxForm] = useState({
    ledger_id: '1',
    reference: '',
    description: '',
    currency: 'NGN',
    idempotency_key: '',
  })
  const [entries, setEntries] = useState<Entry[]>([newEntry('debit'), newEntry('credit')])
  const [seedConfirm, setSeedConfirm] = useState('')
  const [busy, setBusy] = useState<'ledger' | 'account' | 'tx' | 'seed' | null>(null)
  const [result, setResult] = useState<Record<string, Result | undefined>>({})

  const debitTotal = useMemo(
    () => entries.filter((entry) => entry.type === 'debit').reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    [entries],
  )
  const creditTotal = useMemo(
    () => entries.filter((entry) => entry.type === 'credit').reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    [entries],
  )
  const balanced = debitTotal > 0 && Math.abs(debitTotal - creditTotal) < 0.005

  const record = (key: string, ok: boolean, text: string) => setResult((prev) => ({ ...prev, [key]: { ok, text } }))
  const errorText = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback)

  async function submitLedger(event: React.FormEvent) {
    event.preventDefault()
    setBusy('ledger')
    record('ledger', true, '')
    try {
      const payload: Record<string, unknown> = { name: ledgerForm.name.trim() }
      if (ledgerForm.description.trim()) payload.description = ledgerForm.description.trim()
      const metadata = parseMetadata(ledgerForm.metadata)
      if (metadata) payload.metadata = metadata
      const response = await createLedger(payload)
      if (!response) {
        record('ledger', false, 'POST /api:ledger-api/ledgers is not available in Xano.')
        return
      }
      record('ledger', true, 'Ledger created.')
      setLedgerForm({ name: '', description: '', metadata: '' })
    } catch (cause) {
      record('ledger', false, errorText(cause, 'Unable to create the ledger.'))
    } finally {
      setBusy(null)
    }
  }

  async function submitAccount(event: React.FormEvent) {
    event.preventDefault()
    setBusy('account')
    record('account', true, '')
    try {
      const payload: Record<string, unknown> = {
        ledger_id: Number(accountForm.ledger_id),
        name: accountForm.name.trim(),
        type: accountForm.type,
        currency: accountForm.currency,
      }
      if (accountForm.account_number.trim()) payload.account_number = accountForm.account_number.trim()
      const metadata = parseMetadata(accountForm.metadata)
      if (metadata) payload.metadata = metadata
      const response = await createLedgerAccount(payload)
      if (!response) {
        record('account', false, 'POST /api:ledger-api/accounts is not available in Xano.')
        return
      }
      record('account', true, 'Account created.')
      setAccountForm({ ...accountForm, account_number: '', name: '', metadata: '' })
    } catch (cause) {
      record('account', false, errorText(cause, 'Unable to create the account.'))
    } finally {
      setBusy(null)
    }
  }

  async function submitTransaction(event: React.FormEvent) {
    event.preventDefault()
    setBusy('tx')
    record('tx', true, '')
    try {
      if (!balanced) {
        record('tx', false, 'Debits and credits must balance before posting.')
        return
      }
      const response = await postLedgerTransaction({
        ledger_id: Number(txForm.ledger_id),
        reference: txForm.reference.trim(),
        description: txForm.description.trim(),
        currency: txForm.currency,
        ...(txForm.idempotency_key.trim() ? { idempotency_key: txForm.idempotency_key.trim() } : {}),
        entries: entries.map((entry) => ({
          account_id: Number(entry.account_id),
          type: entry.type,
          amount: Math.round(Number(entry.amount) * 100),
          ...(entry.narration.trim() ? { narration: entry.narration.trim() } : {}),
        })),
      })
      if (!response) {
        record('tx', false, 'POST /api:ledger-api/transactions is not available in Xano.')
        return
      }
      record('tx', true, 'Double-entry transaction posted.')
      setTxForm({ ...txForm, reference: '', description: '', idempotency_key: '' })
      setEntries([newEntry('debit'), newEntry('credit')])
    } catch (cause) {
      record('tx', false, errorText(cause, 'Unable to post the transaction.'))
    } finally {
      setBusy(null)
    }
  }

  async function submitSeed() {
    if (seedConfirm !== 'SEED') return
    setBusy('seed')
    record('seed', true, '')
    try {
      const response = await seedLedger()
      if (!response) {
        record('seed', false, 'POST /api:ledger-api/admin/seed is not available in Xano.')
        return
      }
      record('seed', true, 'Demo seed completed.')
      setSeedConfirm('')
    } catch (cause) {
      record('seed', false, errorText(cause, 'Unable to run the demo seed.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <AdminShell eyebrow="Treasury controls" title="Ledger tools">
      <p className="max-w-3xl text-sm leading-6 text-slate-400">
        Low-level ledger primitives: create a ledger namespace, add chart-of-accounts entries, and post balanced
        double-entry transactions. Use the admin flows for member money movement.
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionCard title="Create ledger" action="POST /api:ledger-api/ledgers" icon={Database}>
          <form onSubmit={submitLedger} className="space-y-3">
            <label className="block"><span className="text-xs text-slate-400">Name</span><input required value={ledgerForm.name} onChange={(e) => setLedgerForm({ ...ledgerForm, name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <label className="block"><span className="text-xs text-slate-400">Description</span><input value={ledgerForm.description} onChange={(e) => setLedgerForm({ ...ledgerForm, description: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <label className="block"><span className="text-xs text-slate-400">Metadata JSON</span><textarea value={ledgerForm.metadata} onChange={(e) => setLedgerForm({ ...ledgerForm, metadata: e.target.value })} rows={2} placeholder='{"owner":"treasury"}' className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white" /></label>
            <button disabled={busy === 'ledger'} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60"><Plus size={16} />{busy === 'ledger' ? 'Creating…' : 'Create ledger'}</button>
            {result.ledger?.text && <p className={result.ledger.ok ? 'text-xs text-emerald-300' : 'text-xs text-red-300'}>{result.ledger.text}</p>}
          </form>
        </SectionCard>

        <SectionCard title="Create account" action="POST /api:ledger-api/accounts" icon={Wallet}>
          <form onSubmit={submitAccount} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-xs text-slate-400">Ledger ID</span><input required type="number" min="1" value={accountForm.ledger_id} onChange={(e) => setAccountForm({ ...accountForm, ledger_id: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
              <label className="block"><span className="text-xs text-slate-400">Account number</span><input value={accountForm.account_number} onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })} placeholder="Auto-generated if blank" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            </div>
            <label className="block"><span className="text-xs text-slate-400">Name</span><input required value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-xs text-slate-400">Type</span><select value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">{['asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
              <label className="block"><span className="text-xs text-slate-400">Currency</span><input required value={accountForm.currency} onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            </div>
            <label className="block"><span className="text-xs text-slate-400">Metadata JSON</span><textarea value={accountForm.metadata} onChange={(e) => setAccountForm({ ...accountForm, metadata: e.target.value })} rows={2} placeholder='{"user_id":123}' className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white" /></label>
            <button disabled={busy === 'account'} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60"><Plus size={16} />{busy === 'account' ? 'Creating…' : 'Create account'}</button>
            {result.account?.text && <p className={result.account.ok ? 'text-xs text-emerald-300' : 'text-xs text-red-300'}>{result.account.text}</p>}
          </form>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Post double-entry transaction" action="POST /api:ledger-api/transactions" icon={ArrowLeftRight}>
          <form onSubmit={submitTransaction} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="block"><span className="text-xs text-slate-400">Ledger ID</span><input required type="number" min="1" value={txForm.ledger_id} onChange={(e) => setTxForm({ ...txForm, ledger_id: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
              <label className="block"><span className="text-xs text-slate-400">Reference</span><input required value={txForm.reference} onChange={(e) => setTxForm({ ...txForm, reference: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
              <label className="block"><span className="text-xs text-slate-400">Description</span><input required value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
              <label className="block"><span className="text-xs text-slate-400">Currency</span><input required value={txForm.currency} onChange={(e) => setTxForm({ ...txForm, currency: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
              <label className="block md:col-span-2"><span className="text-xs text-slate-400">Idempotency key (optional)</span><input value={txForm.idempotency_key} onChange={(e) => setTxForm({ ...txForm, idempotency_key: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[.14em] text-slate-500">Entries</p>
                <div className="flex gap-3 text-xs">
                  <span className="text-emerald-300">Debits {naira(debitTotal)}</span>
                  <span className="text-sky-300">Credits {naira(creditTotal)}</span>
                  <span className={balanced ? 'text-emerald-300' : 'text-amber-300'}>{balanced ? 'Balanced' : 'Out of balance'}</span>
                </div>
              </div>
              {entries.map((entry, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_110px_1fr_1.2fr_auto]">
                  <input required type="number" min="1" placeholder="Account ID" value={entry.account_id} onChange={(e) => setEntries(entries.map((item, i) => i === index ? { ...item, account_id: e.target.value } : item))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                  <select value={entry.type} onChange={(e) => setEntries(entries.map((item, i) => i === index ? { ...item, type: e.target.value as 'debit' | 'credit' } : item))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"><option value="debit">Debit</option><option value="credit">Credit</option></select>
                  <input required type="number" min="0.01" step="0.01" placeholder="Amount (NGN)" value={entry.amount} onChange={(e) => setEntries(entries.map((item, i) => i === index ? { ...item, amount: e.target.value } : item))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                  <input placeholder="Narration" value={entry.narration} onChange={(e) => setEntries(entries.map((item, i) => i === index ? { ...item, narration: e.target.value } : item))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                  <button type="button" disabled={entries.length <= 2} onClick={() => setEntries(entries.filter((_, i) => i !== index))} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 disabled:opacity-40"><Trash2 size={16} />Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => setEntries([...entries, newEntry('debit')])} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300"><Plus size={16} />Add line</button>
            </div>

            <button disabled={busy === 'tx' || !balanced} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60"><Play size={16} />{busy === 'tx' ? 'Posting…' : 'Post transaction'}</button>
            {result.tx?.text && <p className={result.tx.ok ? 'text-xs text-emerald-300' : 'text-xs text-red-300'}>{result.tx.text}</p>}
          </form>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Demo seed" action="POST /api:ledger-api/admin/seed" icon={Sprout}>
          <p className="max-w-3xl text-xs leading-5 text-amber-200/80">
            Populates sample ledgers, accounts, plans, investments, and transactions. This is for a fresh demo
            environment only; running it against production data can duplicate records.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input value={seedConfirm} onChange={(e) => setSeedConfirm(e.target.value)} placeholder="Type SEED to confirm" className="w-full max-w-xs rounded-lg border border-amber-400/30 bg-slate-900 px-3 py-2 text-sm text-white" />
            <button disabled={seedConfirm !== 'SEED' || busy === 'seed'} onClick={() => void submitSeed()} className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50"><Play size={16} />{busy === 'seed' ? 'Seeding…' : 'Run demo seed'}</button>
          </div>
          {result.seed?.text && <p className={result.seed.ok ? 'mt-3 text-xs text-emerald-300' : 'mt-3 text-xs text-red-300'}>{result.seed.text}</p>}
        </SectionCard>
      </div>
    </AdminShell>
  )
}
