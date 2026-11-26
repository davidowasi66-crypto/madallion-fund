'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Pause, Pencil, Play, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { AdminShell, Metric, SectionCard } from '@/components/admin-shell'
import {
  deleteMoneyChannel,
  listMoneyChannels,
  saveMoneyChannel,
  toggleMoneyChannel,
  type MoneyChannelRecord,
} from '@/lib/money-channel-api'

const emptyChannel: Partial<MoneyChannelRecord> = {
  name: '',
  code: '',
  type: 'bank',
  status: 'active',
  instructions: '',
  bank_name: '',
  bank_account_name: '',
  bank_account_number: '',
}

const TYPES = ['bank', 'otc', 'cash', 'other']
const CODE_PATTERN = /^[a-z][a-z0-9_]{2,30}$/
const isPaused = (channel: MoneyChannelRecord) => String(channel.status ?? '').toLowerCase() === 'paused'

export default function MoneyChannelsPage() {
  const { data, error, isLoading, mutate } = useSWR<MoneyChannelRecord[] | null>('admin-money-channels', listMoneyChannels)
  const [draft, setDraft] = useState<Partial<MoneyChannelRecord> | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<MoneyChannelRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')

  const channels = data ?? []
  const activeCount = channels.filter((channel) => !isPaused(channel)).length
  const pending = data === null

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!draft?.name?.trim() || !draft.code?.trim()) return
    if (!CODE_PATTERN.test(draft.code.trim())) {
      setFailure('Use a lowercase code with letters, numbers, or underscores, e.g. palmpay or partner_abc.')
      return
    }
    setSaving(true)
    setMessage('')
    setFailure('')
    try {
      const result = await saveMoneyChannel({
        ...(draft.id ? { id: draft.id } : {}),
        name: draft.name.trim(),
        code: draft.code.trim(),
        type: draft.type || 'bank',
        status: draft.status || 'active',
        instructions: draft.instructions?.trim() || undefined,
        bank_name: draft.bank_name?.trim() || undefined,
        bank_account_name: draft.bank_account_name?.trim() || undefined,
        bank_account_number: draft.bank_account_number?.trim() || undefined,
      })
      if (!result) {
        setFailure('This needs the fn_admin_save_channel route in Xano. Nothing was saved.')
        return
      }
      await mutate()
      setMessage(draft.id ? 'Channel updated.' : 'Channel created. It now appears in the deposit and disbursement forms.')
      setDraft(null)
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : 'Unable to save the channel.')
    } finally {
      setSaving(false)
    }
  }

  async function toggle(channel: MoneyChannelRecord) {
    setTogglingId(channel.id)
    setMessage('')
    setFailure('')
    try {
      const result = await toggleMoneyChannel(channel.id, isPaused(channel) ? 'active' : 'paused')
      if (!result) {
        setFailure('This needs the fn_admin_toggle_channel route in Xano.')
        return
      }
      await mutate()
      setMessage(isPaused(channel) ? `"${channel.name}" is active again.` : `"${channel.name}" is paused. New records cannot use it.`)
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : 'Unable to change the channel status.')
    } finally {
      setTogglingId(null)
    }
  }

  async function remove() {
    if (!confirmDelete) return
    setRemoving(true)
    setMessage('')
    setFailure('')
    try {
      const result = await deleteMoneyChannel(confirmDelete.id)
      if (!result) {
        setFailure('This needs the DELETE /fn_admin_channel/{id} route in Xano.')
        return
      }
      await mutate()
      setMessage(`"${confirmDelete.name}" was removed. Existing deposits and withdrawals keep their channel code.`)
      setConfirmDelete(null)
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : 'Unable to remove the channel.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <AdminShell eyebrow="Money controls" title="Money Channels">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <p className="max-w-2xl text-sm leading-6 text-slate-400">
          Add the bank, OTC, cash, or partner channels your operations team uses. Every deposit and disbursement records the
          channel code, so adding a channel here makes it selectable in the money forms.
        </p>
        <button
          onClick={() => setDraft(emptyChannel)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950"
        >
          <Plus size={16} /> Add channel
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Metric label="Channels" value={String(channels.length)} detail="Configured money routes" tone="good" />
        <Metric label="Active" value={String(activeCount)} detail="Available in forms" />
        <Metric label="Paused" value={String(channels.length - activeCount)} detail="Hidden from new records" tone="warn" />
      </div>

      {message && <div role="status" className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-200">{message}</div>}
      {failure && <div role="alert" className="mt-5 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{failure}</div>}
      {error && <div role="alert" className="mt-5 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">Unable to load channels: {error.message}</div>}

      <div className="mt-6">
        <SectionCard title="Channel catalogue" action={isLoading ? 'Loading' : pending ? 'Xano route pending' : `${channels.length} channels`}>
          {pending ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Money channels need the <code className="text-emerald-300">fn_admin_list_channels</code> route in Xano. Until then the forms use the built-in channels.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-400">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Code</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Instructions</th>
                    <th className="pb-3 pr-4">Bank details</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((channel) => (
                    <tr key={channel.id} className="border-t border-slate-800 text-slate-200">
                      <td className="py-3 pr-4 font-medium text-white">{channel.name}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-emerald-300">{channel.code}</td>
                      <td className="py-3 pr-4">{channel.type}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs ${isPaused(channel) ? 'bg-amber-400/10 text-amber-300' : 'bg-emerald-400/10 text-emerald-300'}`}>
                          {isPaused(channel) ? 'Paused' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">{channel.instructions || '—'}</td>
                      <td className="py-3 pr-4 text-slate-400">
                        {channel.bank_name || channel.bank_account_number
                          ? `${channel.bank_name ?? ''}${channel.bank_account_number ? ` · ${channel.bank_account_number}` : ''}`.trim()
                          : '—'}
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <button onClick={() => setDraft(channel)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-emerald-400/50">
                            <Pencil size={13} /> Edit
                          </button>
                          <button
                            disabled={togglingId === channel.id}
                            onClick={() => void toggle(channel)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 px-3 py-2 text-xs text-amber-200 hover:border-amber-400/60 disabled:opacity-60"
                          >
                            {togglingId === channel.id ? <RefreshCw className="animate-spin" size={13} /> : isPaused(channel) ? <Play size={13} /> : <Pause size={13} />}
                            {isPaused(channel) ? 'Resume' : 'Pause'}
                          </button>
                          <button onClick={() => { setFailure(''); setConfirmDelete(channel) }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-300 hover:border-red-400/60">
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && channels.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">No channels yet. Add the first one.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-4 backdrop-blur-sm sm:items-center">
          <form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#101a29] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[.18em] text-emerald-300">{draft.id ? 'Edit channel' : 'New channel'}</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Money Channel</h2>
              </div>
              <button type="button" onClick={() => setDraft(null)} aria-label="Close modal" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"><X size={18} /></button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-xs text-slate-400">Display name</span>
                <input required value={draft.name ?? ''} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white" />
              </label>
              <label>
                <span className="text-xs text-slate-400">Code</span>
                <input required value={draft.code ?? ''} onChange={(event) => setDraft({ ...draft, code: event.target.value })} placeholder="palmpay" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-white" />
              </label>
              <label>
                <span className="text-xs text-slate-400">Type</span>
                <select value={draft.type ?? 'bank'} onChange={(event) => setDraft({ ...draft, type: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white">
                  {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label>
                <span className="text-xs text-slate-400">Status</span>
                <select value={draft.status ?? 'active'} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white">
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs text-slate-400">Instructions</span>
                <textarea value={draft.instructions ?? ''} onChange={(event) => setDraft({ ...draft, instructions: event.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white" />
              </label>
              <label>
                <span className="text-xs text-slate-400">Bank name</span>
                <input value={draft.bank_name ?? ''} onChange={(event) => setDraft({ ...draft, bank_name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white" />
              </label>
              <label>
                <span className="text-xs text-slate-400">Account name</span>
                <input value={draft.bank_account_name ?? ''} onChange={(event) => setDraft({ ...draft, bank_account_name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white" />
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs text-slate-400">Account number</span>
                <input value={draft.bank_account_number ?? ''} onChange={(event) => setDraft({ ...draft, bank_account_number: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white" />
              </label>
            </div>
            <p className="mt-4 text-xs leading-5 text-amber-200/80">
              The code is stored on every deposit and disbursement. Changing it later will split reporting, so choose a stable code.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300">Cancel</button>
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950">
                {saving && <RefreshCw className="animate-spin" size={15} />}
                {saving ? 'Saving…' : draft.id ? 'Save changes' : 'Create channel'}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-4 backdrop-blur-sm sm:items-center">
          <div role="alertdialog" aria-label="Confirm channel removal" className="w-full max-w-md rounded-2xl border border-red-400/30 bg-[#101a29] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-400/10 text-red-300"><Trash2 size={18} /></span>
              <div>
                <h2 className="text-lg font-semibold text-white">Remove “{confirmDelete.name}”?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">New deposits and disbursements will no longer offer this channel. Existing records keep the code.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300">Cancel</button>
              <button onClick={() => void remove()} disabled={removing} className="inline-flex items-center gap-2 rounded-lg bg-red-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-70">
                {removing && <RefreshCw className="animate-spin" size={15} />}
                {removing ? 'Removing…' : 'Remove channel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
