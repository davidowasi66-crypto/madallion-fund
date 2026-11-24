'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { CheckCircle2, ChevronRight, LockKeyhole, PencilLine } from 'lucide-react'
import { getPayoutDestination, savePayoutDestination, type PayoutDestinationInput } from '@/lib/investment-api'
import { memberSafeError } from '@/lib/member-routes'

type Destination = {
  bank_name?: string
  bank_code?: string
  account_name?: string
  account_number_last4?: string
  account_number_masked?: string
}

function unwrapDestination(response: Record<string, any>): Destination | null {
  const value = response?.data?.payout_destination ?? response?.data ?? response?.payout_destination ?? response
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const last4 = value.account_number_last4 ?? value.account_last4
  if (!value.bank_name && !value.account_name && !value.account_number_masked && !last4) return null
  return { ...value, account_number_last4: last4 } as Destination
}

async function loadDestination() {
  try {
    return unwrapDestination(await getPayoutDestination())
  } catch (error) {
    if (error instanceof Error && /^404\b/.test(error.message)) return null
    throw error
  }
}

export function PayoutDestinationCard({ onReady }: { onReady: (ready: boolean) => void }) {
  const { data, error, isLoading, mutate } = useSWR('member-payout-destination', loadDestination, {
    revalidateOnFocus: false,
  })
  const [editing, setEditing] = useState(false)
  const [bankName, setBankName] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const destination = data ?? null

  useEffect(() => {
    onReady(Boolean(destination))
  }, [destination, onReady])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveError('')
    setSavedMessage('')
    const digits = accountNumber.replace(/\D/g, '')
    if (!bankName.trim() || !accountName.trim() || !/^\d{10}$/.test(digits)) {
      setSaveError('Enter the bank name, account holder name, and a valid 10-digit account number.')
      return
    }
    const payload: PayoutDestinationInput = {
      bank_name: bankName.trim(),
      ...(bankCode.trim() ? { bank_code: bankCode.trim() } : {}),
      account_name: accountName.trim(),
      account_number: digits,
    }
    setSaving(true)
    try {
      const response = await savePayoutDestination(payload)
      const result = unwrapDestination(response) ?? {
        bank_name: payload.bank_name,
        account_name: payload.account_name,
        account_number_last4: digits.slice(-4),
      }
      setAccountNumber('')
      setEditing(false)
      setSavedMessage('Bank payout details saved securely.')
      await mutate(result, { revalidate: false })
    } catch (cause) {
      setSaveError(memberSafeError(cause, 'Unable to save bank details. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const maskedAccount = destination?.account_number_masked ?? (destination?.account_number_last4 ? `•••• ${destination.account_number_last4}` : '')

  return (
    <section className="mt-4 rounded-3xl border border-[#dfe8e2] bg-white p-4 shadow-sm" aria-labelledby="payout-destination-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#65a85c]">Destination</p>
          <h2 id="payout-destination-title" className="mt-1 text-sm font-semibold text-[#173b30]">Bank payout details</h2>
        </div>
        {!editing && destination && (
          <button type="button" onClick={() => { setBankName(destination.bank_name ?? ''); setBankCode(destination.bank_code ?? ''); setAccountName(destination.account_name ?? ''); setEditing(true) }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#286548] hover:bg-[#f1f7f1]">
            <PencilLine size={14} aria-hidden="true" /> Edit
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-[#60716b]" role="status">Checking saved payout details…</p>
      ) : error ? (
        <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800" role="alert">{memberSafeError(error, 'Unable to load payout details. Please try again.')}</p>
      ) : destination && !editing ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={17} className="mt-0.5 text-emerald-700" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-950">{destination.bank_name ?? 'Linked bank account'}</p>
              {destination.account_name && <p className="mt-0.5 text-xs text-emerald-900/80">{destination.account_name}</p>}
              {maskedAccount && <p className="mt-0.5 text-xs text-emerald-900/80">Account ending {maskedAccount.replace(/\D/g, '').slice(-4)}</p>}
            </div>
          </div>
        </div>
      ) : (
        <form className="mt-3 flex flex-col gap-3" onSubmit={submit}>
          <p className="text-xs leading-5 text-[#60716b]">Add the bank account that should receive your withdrawals. The full account number is never shown after saving.</p>
          <label className="flex flex-col gap-1 text-xs font-medium text-[#40544d]" htmlFor="payout-bank-name">
            Bank name
            <input id="payout-bank-name" required autoComplete="organization" value={bankName} onChange={(event) => setBankName(event.target.value)} className="rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-sm text-[#172d25] outline-none focus:border-[#65a85c] focus:ring-2 focus:ring-[#65a85c]/20" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[#40544d]" htmlFor="payout-bank-code">
            Bank code <span className="font-normal text-[#708079]">(optional)</span>
            <input id="payout-bank-code" autoComplete="off" value={bankCode} onChange={(event) => setBankCode(event.target.value)} className="rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-sm text-[#172d25] outline-none focus:border-[#65a85c] focus:ring-2 focus:ring-[#65a85c]/20" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[#40544d]" htmlFor="payout-account-name">
            Account name
            <input id="payout-account-name" required autoComplete="name" value={accountName} onChange={(event) => setAccountName(event.target.value)} className="rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-sm text-[#172d25] outline-none focus:border-[#65a85c] focus:ring-2 focus:ring-[#65a85c]/20" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[#40544d]" htmlFor="payout-account-number">
            Account number
            <input id="payout-account-number" required type="password" inputMode="numeric" autoComplete="off" maxLength={10} value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 10))} className="rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-sm tracking-widest text-[#172d25] outline-none focus:border-[#65a85c] focus:ring-2 focus:ring-[#65a85c]/20" aria-describedby="payout-security-note" />
          </label>
          <p id="payout-security-note" className="flex items-center gap-1.5 text-[11px] leading-4 text-[#60716b]"><LockKeyhole size={13} aria-hidden="true" /> Sent securely to the authenticated payout service; it is not stored in browser storage.</p>
          {saveError && <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800" role="alert">{saveError}</p>}
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#1c674a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#15563d] disabled:opacity-60">
            {saving ? 'Saving…' : destination ? 'Update bank details' : 'Save bank details'}
            {!saving && <ChevronRight size={15} aria-hidden="true" />}
          </button>
        </form>
      )}
      {savedMessage && <p className="mt-3 text-xs font-medium text-emerald-800" role="status">{savedMessage}</p>}
    </section>
  )
}
