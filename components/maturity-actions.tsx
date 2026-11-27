'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Bell, CalendarClock, RotateCw, Wallet } from 'lucide-react'
import type { Investment } from '@/lib/investment-api'
import { resolveMaturity, setAutoRollover, type MaturityResolutionAction } from '@/lib/investment-controls-api'
import { memberSafeError } from '@/lib/member-routes'
import { formatTimestamp, toTimestamp } from '@/lib/pending-route'

const money = (value: unknown) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(
    Number.isFinite(Number(value)) ? Number(value) : 0,
  )

const RESOLUTION_OPTIONS: Array<{
  value: MaturityResolutionAction
  label: string
  icon: typeof Wallet
}> = [
  { value: 'payout_all', label: 'Withdraw all to wallet', icon: Wallet },
  { value: 'rollover_all', label: 'Roll over principal and interest', icon: RotateCw },
  { value: 'rollover_principal', label: 'Roll over principal only', icon: RotateCw },
]

const RESOLUTION_MESSAGES: Record<MaturityResolutionAction, string> = {
  payout_all: 'Payout instruction recorded. Funds will be released to your payout destination.',
  rollover_all: 'Rollover instruction recorded. Principal and interest will renew into the same plan.',
  rollover_principal: 'Rollover instruction recorded. Principal renews and interest becomes withdrawable.',
}

export function MaturityActions({ investment }: { investment: Investment }) {
  const investmentId = investment.id
  const maturity = toTimestamp(
    investment.maturity_at ?? investment.ends_at ?? investment.matures_at ?? investment.maturity_date ?? investment.end_date,
  )
  const matured = maturity != null && maturity <= Date.now()
  const [rollover, setRollover] = useState<boolean | null>(
    typeof investment.rollover_enabled === 'boolean' ? investment.rollover_enabled : null,
  )
  const [choice, setChoice] = useState<MaturityResolutionAction | null>(null)
  const [busy, setBusy] = useState<'rollover' | MaturityResolutionAction | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  if (investmentId == null) return null

  async function toggleRollover() {
    const next = !(rollover ?? false)
    setBusy('rollover')
    setError('')
    setMessage('')
    try {
      const saved = await setAutoRollover(investmentId!, next)
      if (!saved) {
        setError('Saving the rollover preference needs the rollover route in Xano. Nothing was changed.')
        return
      }
      if (saved.success === false) {
        setError('The ledger did not accept the rollover preference.')
        return
      }
      const enabled = saved.rollover_enabled ?? next
      setRollover(enabled)
      setMessage(
        enabled
          ? 'Auto-rollover is on. Matured funds renew into the same plan.'
          : 'Auto-rollover is off. Matured funds return to your wallet.',
      )
    } catch (cause) {
      setError(memberSafeError(cause, 'Unable to save the rollover preference.'))
    } finally {
      setBusy(null)
    }
  }

  async function resolve(action: MaturityResolutionAction) {
    setBusy(action)
    setError('')
    setMessage('')
    try {
      const result = await resolveMaturity(investmentId!, action)
      if (!result) {
        setError('Maturity instructions need the maturity-resolution route in Xano. Nothing was changed.')
        return
      }
      if (result.status === 'failed') {
        setError(result.message ?? 'The ledger did not accept that maturity instruction.')
        return
      }
      setChoice(null)
      setMessage(result.message ?? RESOLUTION_MESSAGES[result.resolution] ?? RESOLUTION_MESSAGES[action])
    } catch (cause) {
      setError(memberSafeError(cause, 'Unable to record your maturity instruction.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-2xl border border-[#dfe8e2] bg-white p-4" aria-label="Maturity instructions">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#65a85c]">At maturity</p>
          <h3 className="mt-1 text-sm font-semibold text-[#0b4537]">
            {matured ? 'This investment has matured' : 'Choose what happens when it matures'}
          </h3>
          <p className="mt-1 text-xs text-[#708079]">
            {maturity ? `Matures ${formatTimestamp(maturity)} · principal ${money(investment.principal)}` : 'Maturity date not reported by the ledger yet.'}
          </p>
        </div>
        <CalendarClock size={18} className="shrink-0 text-[#65a85c]" aria-hidden="true" />
      </div>

      {matured ? (
        <div className="mt-3">
          <div className="grid gap-2">
            {RESOLUTION_OPTIONS.map((option) => {
              const Icon = option.icon
              const selected = choice === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setChoice(option.value)}
                  aria-pressed={selected}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${selected ? 'border-[#0b4537] bg-[#eef7eb] text-[#0b4537]' : 'border-[#dfe8e2] text-[#60716b]'}`}
                >
                  <Icon size={14} aria-hidden="true" /> {option.label}
                </button>
              )
            })}
          </div>
          {choice && (
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void resolve(choice)}
              className="mt-3 w-full rounded-xl bg-[#0b4537] py-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Recording…' : 'Confirm maturity instruction'}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#f4f8f3] px-3 py-3">
          <div>
            <p className="text-xs font-semibold text-[#0b4537]">Auto-rollover</p>
            <p className="mt-0.5 text-[11px] text-[#708079]">
              {rollover == null ? 'Preference not reported yet.' : rollover ? 'On — funds renew at maturity.' : 'Off — funds return to your wallet.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(rollover)}
            disabled={busy != null}
            onClick={() => void toggleRollover()}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${rollover ? 'bg-[#0b4537]' : 'bg-[#cbd5cf]'}`}
          >
            <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${rollover ? 'translate-x-6' : 'translate-x-1'}`} />
            <span className="sr-only">{rollover ? 'Turn off' : 'Turn on'} auto-rollover</span>
          </button>
        </div>
      )}

      {message && <p role="status" className="mt-3 text-xs text-[#2f7a4a]">{message}</p>}
      {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
      <Link href="/dashboard/notifications" className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#2f7a4a] underline">
        <Bell size={11} aria-hidden="true" /> Maturity reminders
      </Link>
    </section>
  )
}
