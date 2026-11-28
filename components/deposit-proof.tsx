'use client'

import { useState } from 'react'
import { Link2 } from 'lucide-react'
import { depositProofError, normalizeReceiptUrl, submitDepositProof } from '@/lib/deposit-proof-api'
import { memberSafeError } from '@/lib/member-routes'

export function DepositProof({ amount }: { amount: number }) {
  const [receiptUrl, setReceiptUrl] = useState('')
  const [reference, setReference] = useState('')
  const [senderName, setSenderName] = useState('')
  const [senderBank, setSenderBank] = useState('')
  const [narration, setNarration] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    setMessage('')
    const validation = depositProofError(receiptUrl)
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    try {
      const result = await submitDepositProof({
        proof_url: normalizeReceiptUrl(receiptUrl),
        reference: reference.trim() || undefined,
        amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : undefined,
        sender_name: senderName.trim() || undefined,
        sender_bank: senderBank.trim() || undefined,
        narration: narration.trim() || undefined,
      })
      if (!result) {
        setError('Receipt links need the deposit proof route in Xano. Nothing was sent.')
        return
      }
      if (result.success === false) {
        setError(result.message ?? 'The receipt link was not accepted. Check the link and try again.')
        return
      }
      setMessage(
        result.message ??
          (result.reference
            ? `Receipt link received (${result.reference}). Operations will match it to your transfer.`
            : 'Receipt link received. Operations will match it to your transfer.'),
      )
      setReceiptUrl('')
      setReference('')
      setSenderName('')
      setSenderBank('')
      setNarration('')
    } catch (cause) {
      setError(memberSafeError(cause, 'Unable to send your receipt link.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-4 rounded-3xl border border-[#dfe8e2] soft-3d p-4" aria-labelledby="deposit-proof-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#65a85c]">Already transferred?</p>
          <h2 id="deposit-proof-title" className="mt-1 text-sm font-semibold text-[#0b4537]">Send your payment receipt</h2>
        </div>
        <Link2 size={18} className="shrink-0 text-[#65a85c]" aria-hidden="true" />
      </div>
      <p className="mt-2 text-xs leading-5 text-[#60716b]">
        Upload the receipt to your bank app or cloud storage, then paste the link here so operations can match your
        transfer faster. Only the link is sent — never your card PIN, OTP, or banking password.
      </p>

      <div className="mt-3 space-y-3">
        <label className="block text-xs font-semibold text-[#60716b]">
          Receipt link
          <input
            type="url"
            value={receiptUrl}
            onChange={(event) => setReceiptUrl(event.target.value)}
            placeholder="https://…"
            autoComplete="off"
            className="mt-1 w-full rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-sm font-normal text-[#101d1a]"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-[#60716b]">
            Transfer reference (optional)
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              autoComplete="off"
              className="mt-1 w-full rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-sm font-normal text-[#101d1a]"
            />
          </label>
          <label className="block text-xs font-semibold text-[#60716b]">
            Sender name (optional)
            <input
              value={senderName}
              onChange={(event) => setSenderName(event.target.value)}
              autoComplete="name"
              className="mt-1 w-full rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-sm font-normal text-[#101d1a]"
            />
          </label>
        </div>

        <label className="block text-xs font-semibold text-[#60716b]">
          Sender bank (optional)
          <input
            value={senderBank}
            onChange={(event) => setSenderBank(event.target.value)}
            autoComplete="off"
            className="mt-1 w-full rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-sm font-normal text-[#101d1a]"
          />
        </label>

        <label className="block text-xs font-semibold text-[#60716b]">
          Note for operations (optional)
          <textarea
            value={narration}
            onChange={(event) => setNarration(event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-sm font-normal text-[#101d1a]"
          />
        </label>

        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="w-full rounded-xl bg-[#0b4537] py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Send receipt link'}
        </button>
      </div>

      {message && <p role="status" className="mt-3 text-xs text-[#2f7a4a]">{message}</p>}
      {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
    </section>
  )
}
