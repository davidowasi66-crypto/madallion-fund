'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Save } from 'lucide-react'
import {
  getNotificationPreferences,
  NOTIFICATION_CATEGORIES,
  saveNotificationPreferences,
  type NotificationPreferencesInput,
} from '@/lib/notification-prefs-api'
import { memberSafeError } from '@/lib/member-routes'
import { antiThrottleSwrConfig } from '@/lib/swr'
import type { NotificationCategory } from '@/lib/product-feature-contracts'

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  investment: 'Investment updates',
  payment: 'Deposits and withdrawals',
  referral: 'Referral rewards',
  security: 'Security alerts',
  product: 'Product news',
}

const emptyForm = (): NotificationPreferencesInput => ({
  in_app_enabled: true,
  categories: { investment: true, payment: true, referral: true, security: true, product: true },
  quiet_hours: { enabled: false, start_local: '22:00', end_local: '07:00', timezone: 'Africa/Lagos' },
})

export function NotificationPreferences() {
  const { data, error, isLoading, mutate } = useSWR(
    'notification-preferences',
    getNotificationPreferences,
    antiThrottleSwrConfig,
  )
  const [form, setForm] = useState<NotificationPreferencesInput>(emptyForm)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!data) return
    setForm({
      in_app_enabled: data.in_app_enabled,
      categories: { ...data.categories },
      quiet_hours: { ...data.quiet_hours },
      expected_updated_at: data.updated_at,
    })
  }, [data])

  const unavailable = !isLoading && !error && data === null

  async function save() {
    setBusy(true)
    setMessage('')
    setSaveError('')
    try {
      const saved = await saveNotificationPreferences(form)
      if (!saved) {
        setSaveError('Saving preferences needs the notification-preferences route in Xano. Nothing was changed.')
        return
      }
      setMessage('Preferences saved.')
      await mutate(saved, { revalidate: false })
    } catch (cause) {
      setSaveError(memberSafeError(cause, 'Unable to save your notification preferences.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="mt-2 text-sm leading-6 text-[#708079]">
        Choose what reaches you in-app and when alerts should stay quiet.
      </p>

      {isLoading && <p className="mt-4 text-xs text-[#708079]">Loading your preferences…</p>}
      {error && <p role="alert" className="mt-4 text-xs text-red-700">Preferences are temporarily unavailable.</p>}
      {unavailable && (
        <p className="mt-4 rounded-2xl border border-dashed border-[#dfe8e2] bg-[#f8fbf7] p-4 text-xs leading-5 text-[#708079]">
          Preference sync is not connected yet, so these controls are read-only until the backend route is enabled.
          Nothing is stored in this browser.
        </p>
      )}

      <fieldset disabled={unavailable || busy} className="mt-4 space-y-3">
        <legend className="sr-only">Notification preferences</legend>
        <label className="flex items-center justify-between gap-3 text-sm text-[#60716b]">
          In-app notifications
          <input
            type="checkbox"
            checked={form.in_app_enabled}
            onChange={(event) => setForm((current) => ({ ...current, in_app_enabled: event.target.checked }))}
            className="size-5 accent-[#0b4537]"
          />
        </label>

        <div className="rounded-2xl bg-[#f4f8f3] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#829088]">Categories</p>
          <div className="mt-2 space-y-2">
            {NOTIFICATION_CATEGORIES.map((category) => (
              <label key={category} className="flex items-center justify-between gap-3 text-xs text-[#60716b]">
                {CATEGORY_LABELS[category]}
                <input
                  type="checkbox"
                  checked={form.categories[category] !== false}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      categories: { ...current.categories, [category]: event.target.checked },
                    }))
                  }
                  className="size-4 accent-[#0b4537]"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#f4f8f3] p-3">
          <label className="flex items-center justify-between gap-3 text-xs font-semibold text-[#60716b]">
            Quiet hours
            <input
              type="checkbox"
              checked={form.quiet_hours.enabled}
              onChange={(event) =>
                setForm((current) => ({ ...current, quiet_hours: { ...current.quiet_hours, enabled: event.target.checked } }))
              }
              className="size-4 accent-[#0b4537]"
            />
          </label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="text-[11px] text-[#829088]">
              Start
              <input
                type="time"
                value={form.quiet_hours.start_local}
                disabled={!form.quiet_hours.enabled}
                onChange={(event) =>
                  setForm((current) => ({ ...current, quiet_hours: { ...current.quiet_hours, start_local: event.target.value } }))
                }
                className="mt-1 block w-full rounded-lg border border-[#dfe8e2] px-2 py-2 text-xs disabled:opacity-50"
              />
            </label>
            <label className="text-[11px] text-[#829088]">
              End
              <input
                type="time"
                value={form.quiet_hours.end_local}
                disabled={!form.quiet_hours.enabled}
                onChange={(event) =>
                  setForm((current) => ({ ...current, quiet_hours: { ...current.quiet_hours, end_local: event.target.value } }))
                }
                className="mt-1 block w-full rounded-lg border border-[#dfe8e2] px-2 py-2 text-xs disabled:opacity-50"
              />
            </label>
          </div>
          <p className="mt-2 text-[11px] text-[#829088]">Times use {form.quiet_hours.timezone}.</p>
        </div>

        <button
          type="button"
          disabled={unavailable || busy}
          onClick={() => void save()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b4537] py-3 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Save size={14} aria-hidden="true" /> {busy ? 'Saving…' : 'Save preferences'}
        </button>
      </fieldset>

      {message && <p role="status" className="mt-3 text-xs text-[#2f7a4a]">{message}</p>}
      {saveError && <p role="alert" className="mt-3 text-xs text-red-700">{saveError}</p>}
    </div>
  )
}
