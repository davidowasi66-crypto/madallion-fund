'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { Handshake, Link2, Pencil, Plus, Users, X } from 'lucide-react'
import { AdminShell, SectionCard } from '@/components/admin-shell'
import { getAdminPartners, reportRows } from '@/lib/admin-reports-api'
import { recordPartnerSettlement, saveAdminPartner } from '@/lib/admin-ops-api'

const emptyPartner = {
  name: '',
  type: 'agency',
  status: 'active',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  bank_name: '',
  bank_account_name: '',
  bank_account_number: '',
  notes: '',
}

const emptySettlement = {
  partner_id: '',
  period_start: '',
  period_end: '',
  gross_collected: '',
  fees: '',
  net_settled: '',
  settlement_reference: '',
  proof_url: '',
  status: 'pending',
}

const asText = (value: unknown) => (value == null ? '' : String(value))
const partnerId = (row: Record<string, unknown>) => Number(row.id ?? row.partner_id ?? 0)

export default function PartnersPage() {
  const { data, error, isLoading, mutate } = useSWR('admin-partners', () => getAdminPartners({ page: 1, per_page: 50 }), {
    revalidateOnFocus: false,
  })
  const partners = reportRows(data, ['partners', 'items', 'rows'])
  const [form, setForm] = useState(emptyPartner)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')
  const [settlement, setSettlement] = useState(emptySettlement)
  const [settling, setSettling] = useState(false)

  const startEdit = (row: Record<string, unknown>) => {
    setEditingId(partnerId(row))
    setForm({
      name: asText(row.name),
      type: asText(row.type) || 'agency',
      status: asText(row.status) || 'active',
      contact_name: asText(row.contact_name),
      contact_phone: asText(row.contact_phone),
      contact_email: asText(row.contact_email),
      bank_name: asText(row.bank_name),
      bank_account_name: asText(row.bank_account_name),
      bank_account_number: asText(row.bank_account_number),
      notes: asText(row.notes),
    })
  }

  const submitPartner = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setMessage('')
    setFailure('')
    try {
      const result = await saveAdminPartner({ ...form, ...(editingId ? { id: editingId } : {}) })
      if (!result) {
        setFailure('The fn_admin_save_partner route is not available in Xano.')
        return
      }
      setMessage(editingId ? 'Partner updated.' : 'Partner created.')
      setForm(emptyPartner)
      setEditingId(null)
      await mutate()
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : 'Unable to save the partner.')
    } finally {
      setSaving(false)
    }
  }

  const submitSettlement = async (event: React.FormEvent) => {
    event.preventDefault()
    setSettling(true)
    setMessage('')
    setFailure('')
    try {
      const result = await recordPartnerSettlement({
        partner_id: Number(settlement.partner_id),
        period_start: new Date(settlement.period_start).getTime(),
        period_end: new Date(settlement.period_end).getTime(),
        gross_collected: Number(settlement.gross_collected),
        fees: Number(settlement.fees),
        net_settled: Number(settlement.net_settled),
        settlement_reference: settlement.settlement_reference,
        ...(settlement.proof_url ? { proof_url: settlement.proof_url } : {}),
        status: settlement.status,
      })
      if (!result) {
        setFailure('The fn_admin_record_partner_settlement route is not available in Xano.')
        return
      }
      setMessage('Partner settlement recorded.')
      setSettlement(emptySettlement)
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : 'Unable to record the settlement.')
    } finally {
      setSettling(false)
    }
  }

  return (
    <AdminShell eyebrow="Money operations" title="Partners">
      <p className="max-w-3xl text-sm leading-6 text-slate-400">
        OTC desks, agencies, and banking partners. Save a partner, then record each settlement period so collections and
        remittances can be reconciled against the ledger.
      </p>

      {message && <div role="status" className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-200">{message}</div>}
      {failure && <div role="alert" className="mt-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{failure}</div>}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <SectionCard title="Partner list" action={isLoading ? 'Loading' : error ? 'Xano unavailable' : `${partners.length} partners`} icon={Handshake}>
          {error ? (
            <p className="text-sm text-red-300">Unable to load partners: {error.message}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-400">
                    <th className="pb-3 pr-4">Partner</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Contact</th>
                    <th className="pb-3 pr-4">Bank</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((row) => (
                    <tr key={partnerId(row) || asText(row.name)} className="border-t border-slate-800 align-top text-slate-200">
                      <td className="py-3 pr-4 font-medium text-white">{asText(row.name)}</td>
                      <td className="py-3 pr-4">{asText(row.type)}</td>
                      <td className="py-3 pr-4">{asText(row.status)}</td>
                      <td className="py-3 pr-4 text-slate-300">
                        {asText(row.contact_name) || '—'}
                        {row.contact_phone ? <span className="block text-xs text-slate-500">{asText(row.contact_phone)}</span> : null}
                      </td>
                      <td className="py-3 pr-4 text-slate-300">{asText(row.bank_name) || '—'}</td>
                      <td className="py-3">
                        <button type="button" onClick={() => startEdit(row)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-emerald-400/50">
                          <Pencil size={16} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && partners.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500"><Handshake size={20} className="mx-auto mb-2 text-slate-600" />No partners returned from Xano yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title={editingId ? 'Edit partner' : 'Add partner'} action="fn_admin_save_partner" icon={Users}>
          <form onSubmit={submitPartner} className="space-y-3">
            <label className="block"><span className="text-xs text-slate-400">Name</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-xs text-slate-400">Type</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"><option value="agency">Agency</option><option value="otc">OTC</option><option value="bank">Bank</option></select></label>
              <label className="block"><span className="text-xs text-slate-400">Status</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"><option value="active">Active</option><option value="paused">Paused</option></select></label>
            </div>
            <label className="block"><span className="text-xs text-slate-400">Contact name</span><input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-xs text-slate-400">Contact phone</span><input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
              <label className="block"><span className="text-xs text-slate-400">Contact email</span><input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            </div>
            <label className="block"><span className="text-xs text-slate-400">Bank name</span><input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-xs text-slate-400">Account name</span><input value={form.bank_account_name} onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
              <label className="block"><span className="text-xs text-slate-400">Account number</span><input value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            </div>
            <label className="block"><span className="text-xs text-slate-400">Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <div className="flex justify-end gap-2">
              {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyPartner) }} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300"><X size={16} /> Cancel</button>}
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60"><Plus size={16} />{saving ? 'Saving…' : editingId ? 'Save partner' : 'Create partner'}</button>
            </div>
          </form>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Record partner settlement" action="fn_admin_record_partner_settlement" icon={Link2}>
          <form onSubmit={submitSettlement} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="block"><span className="text-xs text-slate-400">Partner</span><select required value={settlement.partner_id} onChange={(e) => setSettlement({ ...settlement, partner_id: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"><option value="">Select partner</option>{partners.map((row) => <option key={partnerId(row)} value={partnerId(row)}>{asText(row.name)}</option>)}</select></label>
            <label className="block"><span className="text-xs text-slate-400">Period start</span><input required type="datetime-local" value={settlement.period_start} onChange={(e) => setSettlement({ ...settlement, period_start: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <label className="block"><span className="text-xs text-slate-400">Period end</span><input required type="datetime-local" value={settlement.period_end} onChange={(e) => setSettlement({ ...settlement, period_end: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <label className="block"><span className="text-xs text-slate-400">Settlement reference</span><input required value={settlement.settlement_reference} onChange={(e) => setSettlement({ ...settlement, settlement_reference: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <label className="block"><span className="text-xs text-slate-400">Gross collected</span><input required type="number" min="0" step="0.01" value={settlement.gross_collected} onChange={(e) => setSettlement({ ...settlement, gross_collected: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <label className="block"><span className="text-xs text-slate-400">Fees</span><input required type="number" min="0" step="0.01" value={settlement.fees} onChange={(e) => setSettlement({ ...settlement, fees: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <label className="block"><span className="text-xs text-slate-400">Net settled</span><input required type="number" min="0" step="0.01" value={settlement.net_settled} onChange={(e) => setSettlement({ ...settlement, net_settled: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <label className="block"><span className="text-xs text-slate-400">Status</span><select value={settlement.status} onChange={(e) => setSettlement({ ...settlement, status: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"><option value="pending">Pending</option><option value="matched">Matched</option><option value="discrepancy">Discrepancy</option></select></label>
            <label className="block md:col-span-2 xl:col-span-3"><span className="text-xs text-slate-400">Proof URL (optional)</span><input value={settlement.proof_url} onChange={(e) => setSettlement({ ...settlement, proof_url: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
            <div className="flex items-end"><button disabled={settling} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60"><Plus size={16} />{settling ? 'Recording…' : 'Record settlement'}</button></div>
          </form>
        </SectionCard>
      </div>
    </AdminShell>
  )
}
