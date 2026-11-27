'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { createInvestment, type Plan } from '@/lib/investment-api'
import { getXanoSession } from '@/lib/xano-auth'

const money = (value: number) => `₦${value.toLocaleString('en-NG')}`

export function PlanSubscribe({ plan }: { plan: Plan }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [rollover, setRollover] = useState(true)
  const [mode, setMode] = useState<'both' | 'principal_only'>('both')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setAuthenticated(Boolean(getXanoSession()?.authenticated))
  }, [])

  if (authenticated === null) return null

  if (!authenticated) {
    return (
      <Link
        href="/register"
        className={`mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b95c] focus-visible:ring-offset-2 ${
          plan.featured ? 'bg-[#b9f47f] text-[#071a18] hover:bg-[#a9e86d]' : 'bg-[#0b4537] text-white hover:bg-[#123f34]'
        }`}
      >
        Start with {plan.name} <ArrowRight size={15} aria-hidden="true" />
      </Link>
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const principal = Math.round(Number(amount) * 100)
    if (!principal || principal <= 0) {
      setError('Enter a valid principal amount.')
      return
    }
    if (plan.min_amount && Number(amount) < Number(plan.min_amount)) {
      setError(`The minimum for this plan is ${money(Number(plan.min_amount))}.`)
      return
    }
    if (plan.max_amount && Number(amount) > Number(plan.max_amount)) {
      setError(`The maximum for this plan is ${money(Number(plan.max_amount))}.`)
      return
    }
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const result = await createInvestment({
        plan_id: Number(plan.id),
        principal,
        currency: 'NGN',
        rollover_enabled: rollover,
        rollover_mode: mode,
      })
      if (!result) {
        setError('The investment route is not available yet.')
        return
      }
      setMessage('Investment created. It will appear in your portfolio.')
      setAmount('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create the investment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b95c] focus-visible:ring-offset-2 ${
          plan.featured ? 'bg-[#b9f47f] text-[#071a18] hover:bg-[#a9e86d]' : 'bg-[#0b4537] text-white hover:bg-[#123f34]'
        }`}
      >
        Invest in {plan.name} <ArrowRight size={15} aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
          <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-[#dfe8e2] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#65a85c]">New investment</p>
                <h2 className="mt-2 text-xl font-semibold text-[#0b4537]">{plan.name}</h2>
                <p className="mt-1 text-xs text-[#708079]">{plan.duration_days} days · {plan.daily_rate_bps ? `${(plan.daily_rate_bps / 100).toFixed(2)}% daily` : 'Live plan terms'}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-[#dfe8e2] px-3 py-2 text-xs text-[#0b4537]">Close</button>
            </div>

            <label className="mt-5 block">
              <span className="text-xs text-[#60716b]">Principal (NGN)</span>
              <input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-[#dfe8e2] bg-[#fbfcfa] px-3 py-2.5 text-sm text-[#0b4537]" />
            </label>

            <label className="mt-4 flex items-center gap-3 rounded-xl border border-[#dfe8e2] bg-[#fbfcfa] p-3">
              <input type="checkbox" checked={rollover} onChange={(e) => setRollover(e.target.checked)} className="h-4 w-4 accent-[#2f7a4a]" />
              <span className="text-sm text-[#0b4537]">Auto-rollover at maturity</span>
            </label>

            <label className="mt-3 block">
              <span className="text-xs text-[#60716b]">Rollover mode</span>
              <select value={mode} onChange={(e) => setMode(e.target.value as 'both' | 'principal_only')} className="mt-1 w-full rounded-xl border border-[#dfe8e2] bg-[#fbfcfa] px-3 py-2.5 text-sm text-[#0b4537]">
                <option value="both">Principal + interest</option>
                <option value="principal_only">Principal only (interest to wallet)</option>
              </select>
            </label>

            <button disabled={submitting} className="mt-5 w-full rounded-xl bg-[#0b4537] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {submitting ? 'Creating investment…' : 'Confirm investment'}
            </button>

            {message && (
              <p className="mt-3 text-xs text-[#2f7a4a]">
                {message}{' '}
                <Link href="/dashboard/investments" className="font-semibold underline">View portfolio</Link>
              </p>
            )}
            {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
          </form>
        </div>
      )}
    </>
  )
}
