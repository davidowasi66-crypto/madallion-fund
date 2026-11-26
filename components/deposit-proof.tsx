'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { depositProofError, uploadDepositProof } from '@/lib/deposit-proof-api'
import { memberSafeError } from '@/lib/member-routes'

export function DepositProof({ amount }: { amount: number }) {
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [reference, setReference] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    setMessage('')
    const validation = depositProofError(file, amount)
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    try {
      const result = await uploadDepositProof({ amount, file: file!, note, reference })
      if (!result) {
        setError('Receipt upload needs the deposit proof route in Xano. Nothing was sent.')
        return
      }
      setMessage(
        result.reference
          ? `Receipt received (${result.reference}). Operations will match it to your transfer.`
          : 'Receipt received. Operations will match it to your transfer.',
      )
      setFile(null)
      setNote('')
      setReference('')
      setResetKey((value) => value + 1)
    } catch (cause) {
      setError(memberSafeError(cause, 'Unable to upload your receipt.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-4 rounded-3xl border border-[#dfe8e2] bg-white p-4 shadow-sm" aria-labelledby="deposit-proof-title">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#65a85c]">Already transferred?</p>
      <h2 id="deposit-proof-title" className="mt-1 text-sm font-semibold text-[#0b4537]">Attach your payment receipt</h2>
      <p className="mt-2 text-xs leading-5 text-[#60716b]">
        Upload the receipt for a transfer you have already made so operations can credit it faster. Receipts are stored
        privately — no public URL — and only you and operations can open them.
      </p>

      <div className="mt-3 space-y-3">
        <label className="block text-xs font-semibold text-[#60716b]">
          Receipt (PNG, JPEG, WebP or PDF, max 5 MB)
          <input
            key={resetKey}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null)
              setError('')
            }}
            className="mt-1 block w-full rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-xs font-normal text-[#101d1a] file:mr-3 file:rounded-lg file:border-0 file:bg-[#eef7eb] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#0b4537]"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-[#60716b]">
            Transfer reference (optional)
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Bank narration or session ID"
              className="mt-1 w-full rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-sm font-normal text-[#101d1a]"
            />
          </label>
          <label className="block text-xs font-semibold text-[#60716b]">
            Note (optional)
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Anything operations should know"
              className="mt-1 w-full rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-sm font-normal text-[#101d1a]"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#0b4537] py-3 text-xs font-semibold text-[#0b4537] disabled:opacity-50"
        >
          <Upload size={14} aria-hidden="true" /> {busy ? 'Uploading…' : `Upload receipt for ₦${amount.toLocaleString('en-NG')}`}
        </button>
      </div>

      {message && <p role="status" className="mt-3 text-xs text-[#2f7a4a]">{message}</p>}
      {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
    </section>
  )
}
