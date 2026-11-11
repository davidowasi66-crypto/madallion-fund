'use client'

import useSWR from 'swr'
import { useMemo, useState } from 'react'
import { Pause, Pencil, Play, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { AdminShell, Metric, SectionCard } from '@/components/admin-shell'
import { createAdminPlan, deleteAdminPlan, getAdminPlans, pauseAdminPlan, resumeAdminPlan, updateAdminPlan, type AdminPlan } from '@/lib/admin-plans-api'

const emptyPlan: Partial<AdminPlan> = { name: '', daily_rate_bps: 120, duration_days: 30, principal_returned: true, description: '' }
const naira = (cents: number) => `₦${Math.round((cents || 0) / 100).toLocaleString('en-NG')}`
const rate = (bps: number) => `${((bps || 0) / 100).toFixed(2)}%`
const pausedOf = (plan: AdminPlan) => plan.is_paused === true || String(plan.status ?? '').toLowerCase() === 'paused'

export default function PlansAdminPage() {
  const { data: plans = [], error, isLoading, mutate } = useSWR('admin-plans-function', getAdminPlans)
  const [draft, setDraft] = useState<Partial<AdminPlan> | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdminPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')
  const totals = useMemo(() => ({
    aum: plans.reduce((sum, plan) => sum + (plan.total_aum_cents || 0), 0),
    investors: plans.reduce((sum, plan) => sum + (plan.active_investments || 0), 0),
  }), [plans])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft?.name || !draft.duration_days || draft.daily_rate_bps === undefined) return
    setSaving(true); setMessage(''); setFailure('')
    try {
      const payload = { name: draft.name, daily_rate_bps: Number(draft.daily_rate_bps), duration_days: Number(draft.duration_days), principal_returned: Boolean(draft.principal_returned), description: draft.description || '' }
      if (draft.id) await updateAdminPlan(draft.id, payload)
      else await createAdminPlan(payload)
      setDraft(null); await mutate()
      setMessage(draft.id ? 'Plan updated. Existing contracts keep their locked rate.' : 'Plan created.')
    } catch (saveError) {
      setFailure(saveError instanceof Error ? saveError.message : 'Unable to save plan.')
    } finally { setSaving(false) }
  }

  const togglePause = async (plan: AdminPlan) => {
    setTogglingId(plan.id); setMessage(''); setFailure('')
    try {
      const paused = pausedOf(plan)
      if (paused) await resumeAdminPlan(plan.id)
      else await pauseAdminPlan(plan.id)
      await mutate()
      setMessage(paused
        ? `"${plan.name}" is active again — new members can subscribe.`
        : `"${plan.name}" is paused. New subscriptions are blocked. Existing investments keep their locked terms until maturity.`)
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : 'Unable to update pause state.')
    } finally { setTogglingId(null) }
  }

  const remove = async () => {
    if (!confirmDelete) return
    setRemoving(true); setMessage(''); setFailure('')
    try {
      await deleteAdminPlan(confirmDelete.id)
      await mutate()
      setMessage(`"${confirmDelete.name}" was removed from the catalogue.`)
      setConfirmDelete(null)
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : 'Unable to delete plan.')
    } finally { setRemoving(false) }
  }

  return <AdminShell eyebrow="Product controls" title="Investment Plans & Yield Tiers">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="max-w-2xl text-sm leading-6 text-slate-400">Create, edit, pause, or remove yield tiers. Pause blocks new subscriptions only — existing member contracts keep their locked rate until maturity.</p></div><button onClick={() => setDraft(emptyPlan)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950"><Plus size={16} /> Create New Plan</button></div>
    <div className="mt-6 grid gap-4 md:grid-cols-3"><Metric label="Total active plans" value={String(plans.length)} detail="Live yield tiers" tone="good" /><Metric label="Total AUM across plans" value={naira(totals.aum)} detail="Locked principal" /><Metric label="Active subscriptions" value={String(totals.investors)} detail="Currently earning" /></div>
    {message && <div role="status" className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-200">{message}</div>}
    {failure && <div role="alert" className="mt-5 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{failure}</div>}
    {error && <div role="alert" className="mt-5 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">Unable to load plans. Check administrator access or the Xano admin API.</div>}
    <SectionCard title="Live plan catalogue" action={isLoading ? 'Loading' : `${plans.length} plans`}>
      <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="border-b border-slate-800 text-[10px] uppercase tracking-[.16em] text-slate-500"><tr><th className="pb-3">Plan</th><th className="pb-3">Daily rate</th><th className="pb-3">Duration</th><th className="pb-3">Status</th><th className="pb-3">Settlement</th><th className="pb-3">Investors</th><th className="pb-3">Locked AUM</th><th className="pb-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-800/70">{isLoading ? Array.from({ length: 4 }).map((_, index) => <tr key={index}><td colSpan={8} className="py-5"><div className="h-5 animate-pulse rounded bg-slate-800" /></td></tr>) : plans.map(plan => {
        const paused = pausedOf(plan)
        return <tr key={plan.id}><td className="py-4 font-medium text-white">{plan.name}<span className="block text-xs text-slate-500">{plan.description}</span></td><td className="py-4 text-emerald-300">{rate(plan.daily_rate_bps)} / day<span className="block text-xs text-slate-500">{plan.daily_rate_bps} bps</span></td><td className="py-4 text-slate-300">{plan.duration_days} days</td><td className="py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${paused ? 'bg-amber-400/10 text-amber-300' : 'bg-emerald-400/10 text-emerald-300'}`}>{paused ? 'Paused' : 'Active'}</span></td><td className="py-4"><span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">{plan.principal_returned ? 'Principal returned' : 'Yield only'}</span></td><td className="py-4 text-slate-300">{plan.active_investments}</td><td className="py-4 text-slate-300">{naira(plan.total_aum_cents)}</td><td className="py-4 text-right"><div className="inline-flex flex-wrap justify-end gap-2"><button onClick={() => setDraft(plan)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-emerald-400/50"><Pencil size={13} /> Edit</button><button disabled={togglingId === plan.id} onClick={() => togglePause(plan)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 px-3 py-2 text-xs text-amber-200 hover:border-amber-400/60 disabled:opacity-60">{togglingId === plan.id ? <RefreshCw className="animate-spin" size={13} /> : paused ? <Play size={13} /> : <Pause size={13} />}{paused ? 'Resume' : 'Pause'}</button><button onClick={() => { setFailure(''); setConfirmDelete(plan) }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-300 hover:border-red-400/60"><Trash2 size={13} /> Remove</button></div></td></tr>
      })}</tbody></table>{!isLoading && plans.length === 0 && <div className="py-12 text-center text-sm text-slate-500">No plans returned from Xano yet.</div>}</div>
    </SectionCard>
    {draft && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-4 backdrop-blur-sm sm:items-center"><form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#101a29] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.18em] text-emerald-300">{draft.id ? 'Edit plan' : 'New plan'}</p><h2 className="mt-2 text-xl font-semibold text-white">Investment Plan</h2></div><button type="button" onClick={() => setDraft(null)} aria-label="Close modal" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"><X size={18} /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="text-xs text-slate-400">Plan name</span><input required value={draft.name ?? ''} onChange={e => setDraft({ ...draft, name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white" /></label><label><span className="text-xs text-slate-400">Daily rate (basis points)</span><input required min="1" type="number" value={draft.daily_rate_bps ?? ''} onChange={e => setDraft({ ...draft, daily_rate_bps: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white" /><span className="mt-1 block text-xs text-emerald-300">{rate(Number(draft.daily_rate_bps) || 0)} per day</span></label><label><span className="text-xs text-slate-400">Duration in days</span><input required min="1" type="number" value={draft.duration_days ?? ''} onChange={e => setDraft({ ...draft, duration_days: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white" /></label><label className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3"><input type="checkbox" checked={draft.principal_returned !== false} onChange={e => setDraft({ ...draft, principal_returned: e.target.checked })} className="h-4 w-4 accent-emerald-400" /><span className="text-sm text-slate-200">Principal returned at maturity</span></label></div>{draft.id && <p className="mt-4 text-xs leading-5 text-amber-200/80">Existing active user contracts retain their original locked rate; new rates apply to subsequent subscriptions.</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950">{saving && <RefreshCw className="animate-spin" size={15} />}{saving ? 'Saving…' : draft.id ? 'Save changes' : 'Create plan'}</button></div></form></div>}
    {confirmDelete && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-4 backdrop-blur-sm sm:items-center"><div role="alertdialog" aria-label="Confirm plan removal" className="w-full max-w-md rounded-2xl border border-red-400/30 bg-[#101a29] p-6 shadow-2xl"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-400/10 text-red-300"><Trash2 size={18} /></span><div><h2 className="text-lg font-semibold text-white">Remove “{confirmDelete.name}”?</h2><p className="mt-2 text-sm leading-6 text-slate-400">This calls DELETE /fn_admin_plan/{'{id}'}. The catalogue stops offering the plan. Existing investments keep their locked terms until maturity.</p></div></div><div className="mt-6 flex justify-end gap-3"><button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300">Cancel</button><button onClick={remove} disabled={removing} className="inline-flex items-center gap-2 rounded-lg bg-red-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-70">{removing && <RefreshCw className="animate-spin" size={15} />}{removing ? 'Removing…' : 'Remove plan'}</button></div></div></div>}
  </AdminShell>
}
