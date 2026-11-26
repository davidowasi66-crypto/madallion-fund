'use client'

import { useState } from 'react'
import { CalendarClock, RotateCw, Wallet } from 'lucide-react'
import type { Investment } from '@/lib/investment-api'
import { resolveMaturity, setAutoRollover, type MaturityAction } from '@/lib/investment-controls-api'
import { memberSafeError } from '@/lib/member-routes'
import { formatTimestamp, toTimestamp } from '@/lib/pending-route'

const money = (value: unknown) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(
    Number.isFinite(Number(value)) ? Number(value) : 0,
  )

export function MaturityActions({ investment }: { investment: Investment }) {
  const investmentId = investment.id
  const maturity = toTimestamp(
    investment.maturity_at ?? investment.ends_at ?? investment.matures_at ?? investment.maturity_date ?? investment.end_date,
  )
  const matured = maturity != null && maturity <= Date.now()
  const [rollover, setRollover] = useState<boolean | null>(
    typeof investment.rollover_enabled === 'boolean' ? investment.rollover_enabled : null,
  )
  const [choice, setChoice] = useState<MaturityAction | null>(null)
  const [busy, setBusy] = useState<'rollover' | MaturityAction | null>(null)
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
      setRollover(saved.rollover_enabled ?? next)
      setMessage(
        saved.rollover_enabled
          ? 'Auto-rollover is on. Matured funds renew into the same plan.'
          : 'Auto-rollover is off. Matured funds return to your wallet.',
      )
    } catch (cause) {
      setError(memberSafeError(cause, 'Unable to save the rollover preference.'))
    } finally {
      setBusy(null)
    }
  }

  async function resolve(action: MaturityAction) {
    setBusy(action)
    setError('')
    setMessage('')
    try {
      const result = await resolveMaturity(investmentId!, action)
      if (!result) {
        setError('Maturity instructions need the maturity-resolution route in Xano. Nothing was changed.')
        return
      }
      setChoice(null)
      setMessage(
        action === 'rollover'
          ? 'Rollover instruction recorded. Operations will confirm the renewal.'
          : 'Withdrawal instruction recorded. Payout follows the withdrawal window.',
      )
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
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setChoice('withdraw')}
              aria-pressed={choice === 'withdraw'}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${choice === 'withdraw' ? 'border-[#0b4537] bg-[#eef7eb] text-[#0b4537]' : 'border-[#dfe8e2] text-[#60716b]'}`}
            >
              <Wallet size={14} aria-hidden="true" /> Withdraw to wallet
            </button>
            <button
              type="button"
              onClick={() => setChoice('rollover')}
              aria-pressed={choice === 'rollover'}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${choice === 'rollover' ? 'border-[#0b4537] bg-[#eef7eb] text-[#0b4537]' : 'border-[#dfe8e2] text-[#60716b]'}`}
            >
              <RotateCw size={14} aria-hidden="true" /> Roll over
            </button>
          </div>
          {choice && (
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void resolve(choice)}
              className="mt-3 w-full rounded-xl bg-[#0b4537] py-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Recording…' : `Confirm ${choice === 'withdraw' ? 'withdrawal' : 'rollover'}`}
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
    </section>
  )
}
