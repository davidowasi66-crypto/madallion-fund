'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { normalizeReceiptUrl } from '@/lib/deposit-proof-api'
import { listMoneyChannels } from '@/lib/money-channel-api'
import { recordOtcDeposit, recordOtcWithdrawal, type MoneyChannel } from '@/lib/otc-partner-api'

const DEFAULT_CHANNELS: { value: MoneyChannel; label: string }[] = [
  { value: 'otc_partner', label: 'OTC / agency partner' },
  { value: 'bank_transfer', label: 'Manual bank transfer' },
  { value: 'cash', label: 'Cash / agent' },
  { value: 'other', label: 'Other' },
]

const fieldClass = 'mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200'

export function OtcRecordForm({ kind, onRecorded }: { kind: 'deposit' | 'withdrawal'; onRecorded: () => void }) {
  const [memberId, setMemberId] = useState('')
  const [amount, setAmount] = useState('')
  const [channel, setChannel] = useState<MoneyChannel>('otc_partner')
  const [channels, setChannels] = useState(DEFAULT_CHANNELS)
  const [partnerName, setPartnerName] = useState('')
  const [partnerReference, setPartnerReference] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    listMoneyChannels()
      .then((items) => {
        if (!active || !items) return
        const available = items
          .filter((item) => String(item.status).toLowerCase() !== 'paused')
          .map((item) => ({ value: item.code, label: item.name }))
        if (!available.length) return
        setChannels(available)
        setChannel((current) => (available.some((item) => item.value === current) ? current : available[0].value))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  async function submit() {
    setError('')
    setMessage('')
    const userId = Number(memberId)
    const value = Number(amount)
    if (!Number.isFinite(userId) || userId <= 0) {
      setError('Enter the member user ID.')
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    const normalizedProof = proofUrl.trim() ? normalizeReceiptUrl(proofUrl) : ''
    if (proofUrl.trim() && !normalizedProof) {
      setError('Enter a valid http(s) proof link without a username or password.')
      return
    }

    setBusy(true)
    try {
      const input = {
        userId,
        amount: value,
        channel,
        partnerName: partnerName.trim() || undefined,
        partnerReference: partnerReference.trim() || undefined,
        proofUrl: normalizedProof || undefined,
        note: note.trim() || undefined,
      }
      const result = kind === 'deposit' ? await recordOtcDeposit(input) : await recordOtcWithdrawal(input)
      if (!result) {
        const route = kind === 'deposit' ? 'fn_admin_record_deposit' : 'fn_admin_record_withdrawal'
        setError(`This needs the ${route} route in Xano. Nothing was recorded.`)
        return
      }
      if (result.success === false) {
        setError(result.message ?? 'Xano rejected this record.')
        return
      }
      setMessage(
        result.reference
          ? `${kind === 'deposit' ? 'Deposit' : 'Payout'} ${result.reference} recorded as ${result.status ?? 'pending'} for approval.`
          : `${kind === 'deposit' ? 'Deposit' : 'Payout'} recorded as ${result.status ?? 'pending'} for approval.`,
      )
      setMemberId('')
      setAmount('')
      setPartnerName('')
      setPartnerReference('')
      setProofUrl('')
      setNote('')
      onRecorded()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to record this movement.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <p className="text-xs leading-5 text-slate-400">
        {kind === 'deposit'
          ? 'Use this when the member did not submit a proof, for example when an OTC partner collected the cash. If a proof is already pending, approve that row instead. The ledger is credited only after approval.'
          : 'Use this when the payout did not start from a member request. If the member already requested the withdrawal, approve that request instead. The ledger is debited only after approval.'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-medium text-slate-400">
          Member user ID
          <input
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
            inputMode="numeric"
            placeholder="e.g. 42"
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-medium text-slate-400">
          Amount (NGN)
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="0"
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-medium text-slate-400">
          Channel
          <select value={channel} onChange={(event) => setChannel(event.target.value)} className={fieldClass}>
            {channels.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-400">
          Partner / agency name
          <input
            value={partnerName}
            onChange={(event) => setPartnerName(event.target.value)}
            placeholder="Optional"
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-medium text-slate-400">
          Partner reference
          <input
            value={partnerReference}
            onChange={(event) => setPartnerReference(event.target.value)}
            placeholder="Receipt or settlement ref"
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-medium text-slate-400">
          Proof link
          <input
            value={proofUrl}
            onChange={(event) => setProofUrl(event.target.value)}
            placeholder="https://…"
            className={fieldClass}
          />
        </label>
      </div>

      <p className="text-[11px] leading-4 text-slate-500">
        Channel options come from Admin → Money Channels. Add a channel there to make it available here.
      </p>

      <label className="block text-xs font-medium text-slate-400">
        Note
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note for the approver"
          className={fieldClass}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 disabled:opacity-50"
        >
          <Plus size={14} aria-hidden="true" /> {busy ? 'Recording…' : kind === 'deposit' ? 'Record deposit' : 'Record payout'}
        </button>
        {message && <p role="status" className="text-xs text-emerald-300">{message}</p>}
        {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      </div>
    </form>
  )
}
