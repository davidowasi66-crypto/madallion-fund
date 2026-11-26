'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Bell, Mail, ShieldCheck } from 'lucide-react'
import {
  getNotificationPreferences,
  NOTIFICATION_PREFERENCE_FIELDS,
  saveNotificationPreferences,
  type NotificationPreferenceField,
  type NotificationPreferencesInput,
} from '@/lib/notification-prefs-api'
import { memberSafeError } from '@/lib/member-routes'
import { antiThrottleSwrConfig } from '@/lib/swr'
import { formatTimestamp } from '@/lib/pending-route'

type PreferenceRow = { key: NotificationPreferenceField; label: string; hint: string }

const GROUPS: Array<{ title: string; icon: typeof Bell; rows: PreferenceRow[] }> = [
  {
    title: 'Delivery channels',
    icon: Mail,
    rows: [
      { key: 'email_alerts', label: 'Email', hint: 'Account updates sent to your email address.' },
      { key: 'sms_alerts', label: 'SMS', hint: 'Time-sensitive alerts sent by text message.' },
      { key: 'push_notifications', label: 'Push', hint: 'Alerts on devices where you allow notifications.' },
    ],
  },
  {
    title: 'Account activity',
    icon: Bell,
    rows: [
      { key: 'deposit_confirmation', label: 'Deposit confirmations', hint: 'When a deposit is received and matched.' },
      { key: 'withdrawal_updates', label: 'Withdrawal updates', hint: 'When a payout is approved, paid, or needs attention.' },
      { key: 'maturity_reminders', label: 'Maturity reminders', hint: 'Before an investment reaches its maturity date.' },
      { key: 'daily_accrual_digest', label: 'Daily interest digest', hint: 'A short summary of interest earned each day.' },
    ],
  },
  {
    title: 'Safety and offers',
    icon: ShieldCheck,
    rows: [
      { key: 'security_alerts', label: 'Security alerts', hint: 'Sign-ins, password changes, and 2FA events.' },
      { key: 'marketing_emails', label: 'Product news', hint: 'New plans, features, and occasional offers.' },
    ],
  },
]

export function NotificationPreferences() {
  const { data, error, isLoading, mutate } = useSWR(
    'notification-preferences',
    getNotificationPreferences,
    antiThrottleSwrConfig,
  )
  const [form, setForm] = useState<NotificationPreferencesInput>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (data) setForm({ ...data })
  }, [data])

  const unavailable = !isLoading && !error && data === null

  async function save() {
    setBusy(true)
    setMessage('')
    setSaveError('')
    try {
      const payload: NotificationPreferencesInput = {}
      for (const field of NOTIFICATION_PREFERENCE_FIELDS) {
        payload[field] = Boolean(form[field] ?? data?.[field])
      }
      const saved = await saveNotificationPreferences(payload)
      if (!saved) {
        setSaveError('Saving preferences needs the notification-preferences route in Xano. Nothing was changed.')
        return
      }
      setForm({ ...saved })
      setMessage('Notification preferences saved.')
      await mutate(saved, { revalidate: false })
    } catch (cause) {
      setSaveError(memberSafeError(cause, 'Unable to save your notification preferences.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3">
      <div aria-live="polite">
        {isLoading ? (
          <p className="py-4 text-xs text-[#708079]">Loading preferences…</p>
        ) : error ? (
          <p role="alert" className="py-4 text-xs text-red-700">Notification preferences are temporarily unavailable.</p>
        ) : unavailable ? (
          <p className="py-4 text-xs leading-5 text-[#708079]">
            Notification preferences are not connected yet, so nothing can be changed here.
          </p>
        ) : data ? (
          <>
            {GROUPS.map((group) => {
              const Icon = group.icon
              return (
                <fieldset key={group.title} className="mt-4 first:mt-0">
                  <legend className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#65a85c]">
                    <Icon size={12} aria-hidden="true" /> {group.title}
                  </legend>
                  <div className="mt-1 divide-y divide-[#eef2ee]">
                    {group.rows.map((row) => {
                      const checked = Boolean(form[row.key] ?? data[row.key])
                      return (
                        <button
                          key={row.key}
                          type="button"
                          role="switch"
                          aria-checked={checked}
                          onClick={() => setForm((current) => ({ ...current, [row.key]: !checked }))}
                          className="flex w-full items-center justify-between gap-3 py-3 text-left"
                        >
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-[#0b4537]">{row.label}</span>
                            <span className="mt-0.5 block text-[11px] leading-4 text-[#829088]">{row.hint}</span>
                          </span>
                          <span
                            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-[#0b4537]' : 'bg-[#cbd5cf]'}`}
                            aria-hidden="true"
                          >
                            <span className={`absolute top-1 size-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              )
            })}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                className="rounded-xl bg-[#0b4537] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save preferences'}
              </button>
              {data.updated_at && (
                <span className="text-[11px] text-[#829088]">Last saved {formatTimestamp(data.updated_at)}</span>
              )}
            </div>
          </>
        ) : null}
      </div>

      {message && <p role="status" className="mt-3 text-xs text-[#2f7a4a]">{message}</p>}
      {saveError && <p role="alert" className="mt-3 text-xs text-red-700">{saveError}</p>}
    </div>
  )
}
