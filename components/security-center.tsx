'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { KeyRound, Laptop, ShieldCheck } from 'lucide-react'
import { clearXanoSession, getXanoSession } from '@/lib/xano-auth'
import {
  beginTwoFactorEnrollment,
  confirmTwoFactorEnrollment,
  disableTwoFactor,
  getSecuritySessions,
  getSecurityState,
  revokeSession,
  type TwoFactorEnrollment,
} from '@/lib/security-api'
import { memberSafeError } from '@/lib/member-routes'
import { antiThrottleSwrConfig } from '@/lib/swr'
import { formatTimestamp } from '@/lib/pending-route'
import { MemberTabBar } from '@/components/member-tab-bar'

export function SecurityCenter() {
  const router = useRouter()
  const [sessionReady, setSessionReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [enrollment, setEnrollment] = useState<TwoFactorEnrollment | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const session = getXanoSession()
    setAuthenticated(Boolean(session?.authenticated))
    setSessionReady(true)
    if (!session?.authenticated) router.replace('/login?next=/dashboard/security')
  }, [router])

  const {
    data,
    error: loadError,
    isLoading,
    mutate,
  } = useSWR(sessionReady && authenticated ? 'security-state' : null, getSecurityState, antiThrottleSwrConfig)

  const {
    data: sessions,
    error: sessionsError,
    isLoading: sessionsLoading,
    mutate: mutateSessions,
  } = useSWR(
    sessionReady && authenticated ? 'security-sessions' : null,
    getSecuritySessions,
    antiThrottleSwrConfig,
  )

  const enabled = data?.two_factor_enabled === true
  const unavailable = !isLoading && !loadError && data === null
  const sessionsUnavailable = !sessionsLoading && !sessionsError && sessions === null

  async function beginEnrollment() {
    setBusy('enroll')
    setError('')
    setMessage('')
    try {
      const result = await beginTwoFactorEnrollment()
      if (!result) {
        setError('Two-factor setup needs the security routes in Xano. Nothing was enabled.')
        return
      }
      setEnrollment(result)
    } catch (cause) {
      setError(memberSafeError(cause, 'Unable to start two-factor setup.'))
    } finally {
      setBusy(null)
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('confirm')
    setError('')
    setMessage('')
    try {
      const result = await confirmTwoFactorEnrollment(code)
      if (result === null) {
        setError('Confirmation needs the security routes in Xano. Two-factor stays off.')
        return
      }
      if (!result) {
        setError('That code was not accepted. Check the authenticator app and try again.')
        return
      }
      setEnrollment(null)
      setCode('')
      setMessage('Two-factor authentication is on.')
      await mutate()
    } catch (cause) {
      setError(memberSafeError(cause, 'Unable to confirm the code.'))
    } finally {
      setBusy(null)
    }
  }

  async function disable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('disable')
    setError('')
    setMessage('')
    try {
      const result = await disableTwoFactor(code)
      if (result === null) {
        setError('Turning two-factor off needs the security routes in Xano. It stays on.')
        return
      }
      if (!result) {
        setError('That code was not accepted. Two-factor stays on.')
        return
      }
      setCode('')
      setMessage('Two-factor authentication is off.')
      await mutate()
    } catch (cause) {
      setError(memberSafeError(cause, 'Unable to turn off two-factor authentication.'))
    } finally {
      setBusy(null)
    }
  }

  async function removeSession(sessionId: string) {
    setBusy(sessionId)
    setError('')
    setMessage('')
    try {
      const revoked = await revokeSession(sessionId)
      if (!revoked) {
        setError('Revoking sessions needs the security routes in Xano. Nothing was changed.')
        return
      }
      setMessage('Session signed out.')
      await Promise.all([mutate(), mutateSessions()])
    } catch (cause) {
      setError(memberSafeError(cause, 'Unable to sign out that session.'))
    } finally {
      setBusy(null)
    }
  }

  function signOutEverywhere() {
    clearXanoSession()
    router.replace('/login?next=/dashboard/security')
  }

  return (
    <main className="member-tab-page min-h-screen bg-[#f4f8f3] text-[#101d1a]">
      <header className="bg-gradient-to-b from-[#0b4537] via-[#0d3d32] to-[#123f34] px-5 py-6 text-white sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white">Dashboard</Link>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#8fbfa8]">Member workspace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Security</h1>
            </div>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#b9f47f]" aria-hidden="true"><ShieldCheck size={18} /></span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 px-5 py-6 sm:px-8">
        <section className="rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm" aria-labelledby="two-factor-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="two-factor-title" className="text-lg font-semibold text-[#0b4537]">Two-factor authentication</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${enabled ? 'bg-emerald-50 text-emerald-800' : 'bg-[#f2f4f1] text-[#60716b]'}`}>
              {isLoading ? 'Checking…' : loadError ? 'Unavailable' : enabled ? 'On' : 'Off'}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#708079]">
            Protect money movement with a 6-digit code from your authenticator app.
          </p>

          {unavailable && (
            <p className="mt-3 rounded-xl border border-dashed border-[#dfe8e2] bg-[#f8fbf7] px-3 py-2 text-xs leading-5 text-[#708079]">
              Security settings are not connected yet, so nothing can be changed here.
            </p>
          )}

          {!isLoading && !loadError && data && (
            <>
              {enrollment ? (
                <form onSubmit={confirm} className="mt-4 rounded-2xl bg-[#f4f8f3] p-4">
                  <p className="text-xs font-semibold text-[#0b4537]">Add this key to your authenticator app</p>
                  <p className="mt-2 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-[#0b4537]">{enrollment.secret}</p>
                  {enrollment.otpauth_uri && (
                    <a href={enrollment.otpauth_uri} className="mt-2 inline-block text-[11px] font-semibold text-[#2f7a4a] underline">
                      Open in authenticator app
                    </a>
                  )}
                  {enrollment.backup_codes.length > 0 && (
                    <div className="mt-3 rounded-lg border border-[#dfe8e2] bg-white p-3">
                      <p className="text-[11px] font-semibold text-[#0b4537]">Recovery codes — save these now</p>
                      <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-[11px] text-[#60716b]">
                        {enrollment.backup_codes.map((backup) => (
                          <span key={backup}>{backup}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <label className="mt-3 block text-xs font-semibold text-[#60716b]">
                    6-digit code
                    <input
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className="mt-1 w-full rounded-xl border border-[#dfe8e2] px-3 py-2.5 font-mono text-sm tracking-[.3em]"
                    />
                  </label>
                  <div className="mt-3 flex gap-2">
                    <button type="submit" disabled={busy != null || code.length !== 6} className="flex-1 rounded-xl bg-[#0b4537] py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                      {busy === 'confirm' ? 'Confirming…' : 'Confirm and enable'}
                    </button>
                    <button type="button" onClick={() => { setEnrollment(null); setCode('') }} className="rounded-xl border border-[#dfe8e2] px-3 py-2.5 text-xs font-semibold text-[#60716b]">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : enabled ? (
                <form onSubmit={disable} className="mt-4 flex flex-wrap items-end gap-3">
                  <label className="text-xs font-semibold text-[#60716b]">
                    Code to turn off
                    <input
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      inputMode="numeric"
                      className="mt-1 block w-40 rounded-xl border border-[#dfe8e2] px-3 py-2.5 font-mono text-sm tracking-[.25em]"
                    />
                  </label>
                  <button type="submit" disabled={busy != null || code.length !== 6} className="rounded-xl border border-[#f0d7d0] px-4 py-2.5 text-xs font-semibold text-[#a3402a] disabled:opacity-50">
                    {busy === 'disable' ? 'Turning off…' : 'Turn off'}
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  disabled={busy != null}
                  onClick={() => void beginEnrollment()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0b4537] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <KeyRound size={14} aria-hidden="true" /> {busy === 'enroll' ? 'Preparing…' : 'Set up authenticator'}
                </button>
              )}
            </>
          )}
        </section>

        <section className="rounded-3xl border border-[#dfe8e2] bg-white p-5 shadow-sm" aria-labelledby="sessions-title">
          <h2 id="sessions-title" className="text-lg font-semibold text-[#0b4537]">Signed-in devices</h2>
          <p className="mt-2 text-sm leading-6 text-[#708079]">Sign out any device you do not recognise.</p>
          <div className="mt-4 divide-y divide-[#eef2ee]">
            {sessionsLoading && <p className="py-4 text-xs text-[#708079]">Loading sessions…</p>}
            {sessionsError && (
              <p role="alert" className="py-4 text-xs text-red-700">Signed-in devices are temporarily unavailable.</p>
            )}
            {sessionsUnavailable && (
              <p className="py-4 text-xs leading-5 text-[#708079]">
                Signed-in devices are not connected yet, so no device list is available.
              </p>
            )}
            {!sessionsLoading && !sessionsError && sessions?.length === 0 && (
              <p className="py-4 text-xs text-[#708079]">No other sessions are recorded.</p>
            )}
            {(sessions ?? []).map((session) => (
              <div key={session.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="rounded-full bg-[#eef7eb] p-2 text-[#2f7a4a]" aria-hidden="true"><Laptop size={14} /></span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[#0b4537]">{session.device ?? 'Unknown device'}</p>
                    <p className="mt-0.5 text-[11px] text-[#829088]">
                      {session.location ? `${session.location} · ` : ''}Last active {formatTimestamp(session.last_active_at ?? session.created_at)}
                    </p>
                  </div>
                </div>
                {session.current ? (
                  <span className="rounded-full bg-[#f2f4f1] px-2.5 py-1 text-[11px] font-semibold text-[#60716b]">This device</span>
                ) : (
                  <button
                    type="button"
                    disabled={busy != null}
                    onClick={() => void removeSession(session.id)}
                    className="rounded-lg border border-[#dfe8e2] px-2.5 py-1.5 text-[11px] font-semibold text-[#a3402a] disabled:opacity-50"
                  >
                    {busy === session.id ? 'Signing out…' : 'Sign out'}
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={signOutEverywhere}
            className="mt-4 w-full rounded-xl border border-[#f0d7d0] px-4 py-2.5 text-xs font-semibold text-[#a3402a]"
          >
            Sign out of this browser
          </button>
        </section>

        {message && <p role="status" className="text-xs text-[#2f7a4a]">{message}</p>}
        {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      </div>

      {authenticated && <MemberTabBar />}
    </main>
  )
}
