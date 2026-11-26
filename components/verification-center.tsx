'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { BadgeCheck, Clock3, ShieldAlert } from 'lucide-react'
import { clearXanoSession, getXanoSession } from '@/lib/xano-auth'
import { KYC_ID_TYPES, getKycState, submitKyc, type KycIdType, type KycState } from '@/lib/kyc-api'
import { memberSafeError } from '@/lib/member-routes'
import { antiThrottleSwrConfig } from '@/lib/swr'
import { formatTimestamp } from '@/lib/pending-route'
import { MemberTabBar } from '@/components/member-tab-bar'

const STATUS_COPY: Record<KycState['status'], { label: string; tone: string; hint: string }> = {
  not_started: { label: 'Not started', tone: 'bg-[#f2f4f1] text-[#60716b]', hint: 'Verify your identity to unlock deposits and withdrawals.' },
  pending: { label: 'In review', tone: 'bg-amber-50 text-amber-800', hint: 'Operations are reviewing your details. No action needed.' },
  approved: { label: 'Verified', tone: 'bg-emerald-50 text-emerald-800', hint: 'Your identity is verified.' },
  rejected: { label: 'Needs attention', tone: 'bg-red-50 text-red-700', hint: 'Update your details and resubmit.' },
}

const emptyForm = () => ({
  full_name: '',
  date_of_birth: '',
  id_type: 'nin' as KycIdType,
  id_number: '',
  address: '',
})

export function VerificationCenter() {
  const router = useRouter()
  const [sessionReady, setSessionReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const session = getXanoSession()
    setAuthenticated(Boolean(session?.authenticated))
    setSessionReady(true)
    if (!session?.authenticated) router.replace('/login?next=/dashboard/verification')
  }, [router])

  const { data, error: loadError, isLoading, mutate } = useSWR(
    sessionReady && authenticated ? 'kyc-state' : null,
    getKycState,
    antiThrottleSwrConfig,
  )

  const unavailable = !isLoading && !loadError && data === null
  const status = data?.status ?? 'not_started'
  const copy = STATUS_COPY[status]
  const showForm = !isLoading && !loadError && !unavailable && (status === 'not_started' || status === 'rejected')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!form.full_name.trim() || !form.date_of_birth || !form.id_number.trim() || !form.address.trim()) {
      setError('Complete every field before submitting.')
      return
    }
    setBusy(true)
    try {
      const result = await submitKyc({
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth,
        id_type: form.id_type,
        id_number: form.id_number.trim(),
        address: form.address.trim(),
      })
      if (!result) {
        setError('Submitting verification needs the KYC routes in Xano. Nothing was sent.')
        return
      }
      setForm(emptyForm())
      setMessage('Details submitted. Operations will review them shortly.')
      await mutate(result, { revalidate: false })
    } catch (cause) {
      setError(memberSafeError(cause, 'Unable to submit your verification details.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="member-tab-page min-h-screen bg-[#f4f8f3] text-[#101d1a]">
      <header className="bg-gradient-to-b from-[#0b4537] via-[#0d3d32] to-[#123f34] px-5 py-6 text-white sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white">Dashboard</Link>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#8fbfa8]">Member workspace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Identity verification</h1>
            </div>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#b9f47f]" aria-hidden="true"><BadgeCheck size={18} /></span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 px-5 py-6 sm:px-8">
        <section className="rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm" aria-labelledby="kyc-status-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="kyc-status-title" className="text-lg font-semibold text-[#0b4537]">Verification status</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${copy.tone}`}>
              {isLoading ? 'Checking…' : loadError ? 'Unavailable' : unavailable ? 'Not connected' : copy.label}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#708079]">{loadError ? 'We could not read your verification state. Try again shortly.' : copy.hint}</p>
          {data?.submitted_at && <p className="mt-1 text-xs text-[#829088]">Submitted {formatTimestamp(data.submitted_at)}</p>}
          {data?.reviewed_at && <p className="text-xs text-[#829088]">Reviewed {formatTimestamp(data.reviewed_at)}</p>}
          {status === 'rejected' && data?.reason && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">Reviewer note: {data.reason}</p>
          )}
          {unavailable && (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-dashed border-[#dfe8e2] bg-[#f8fbf7] px-3 py-2 text-xs leading-5 text-[#708079]">
              <Clock3 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              Verification storage is not connected yet, so submissions cannot be recorded.
            </p>
          )}
        </section>

        {showForm && (
          <section className="rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm" aria-labelledby="kyc-form-title">
            <h2 id="kyc-form-title" className="text-lg font-semibold text-[#0b4537]">
              {status === 'rejected' ? 'Resubmit your details' : 'Submit your details'}
            </h2>
            <p className="mt-2 text-xs leading-5 text-[#708079]">
              These details are sent straight to your authenticated backend. Nothing is stored in this browser.
            </p>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-[#60716b]">
                Full legal name
                <input
                  value={form.full_name}
                  onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                  autoComplete="name"
                  className="mt-1 w-full rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-sm font-normal text-[#101d1a]"
                />
              </label>
              <label className="block text-xs font-semibold text-[#60716b]">
                Date of birth
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(event) => setForm((current) => ({ ...current, date_of_birth: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-sm font-normal text-[#101d1a]"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-[#60716b]">
                  Document type
                  <select
                    value={form.id_type}
                    onChange={(event) => setForm((current) => ({ ...current, id_type: event.target.value as KycIdType }))}
                    className="mt-1 w-full rounded-xl border border-[#dfe8e2] bg-white px-3 py-2.5 text-sm font-normal text-[#101d1a]"
                  >
                    {KYC_ID_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-[#60716b]">
                  Document number
                  <input
                    value={form.id_number}
                    onChange={(event) => setForm((current) => ({ ...current, id_number: event.target.value }))}
                    inputMode="numeric"
                    className="mt-1 w-full rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-sm font-normal text-[#101d1a]"
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-[#60716b]">
                Residential address
                <textarea
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-sm font-normal text-[#101d1a]"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-[#0b4537] py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? 'Submitting…' : 'Submit for review'}
              </button>
            </form>
            {message && <p role="status" className="mt-3 text-xs text-[#2f7a4a]">{message}</p>}
            {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
          </section>
        )}

        <p className="flex items-start gap-2 rounded-2xl bg-[#eef7eb] px-4 py-3 text-xs leading-5 text-[#4a6b5a]">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          We never ask for your card PIN, OTP or banking password on this page.
        </p>
      </div>

      {authenticated && <MemberTabBar />}
    </main>
  )
}
