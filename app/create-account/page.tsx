'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { saveXanoSession, xanoSignup } from '@/lib/xano-auth'

export default function CreateAccountPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('loading')
    const form = new FormData(event.currentTarget)
    const firstName = String(form.get('firstName') ?? '').trim()
    const lastName = String(form.get('lastName') ?? '').trim()
    const email = String(form.get('email') ?? '').trim().toLowerCase()
    const password = String(form.get('password') ?? '')

    try {
      const session = await xanoSignup(`${firstName} ${lastName}`.trim(), email, password)
      if (!session?.authToken) throw new Error('Xano did not return an authentication token.')
      saveXanoSession(session)
      setStatus('success')
    } catch (cause) {
      setStatus('idle')
      setError(cause instanceof Error ? cause.message : 'Unable to create your account. Please try again.')
    }
  }

  return (
    <main className="min-h-screen bg-[#edf7ef] px-5 py-6 text-[#101d1a] sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-bold text-[#0b4537]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b4537] text-[#b9f47f]"><Sparkles size={17} /></span>Madallion fund</Link>
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#527067] hover:text-[#0b4537]"><ArrowLeft size={15} /> Back home</Link>
      </div>
      <section className="relative mx-auto mt-10 grid max-w-6xl gap-8 overflow-hidden rounded-[2rem] border border-white/70 bg-white/35 p-5 shadow-[0_30px_100px_rgba(25,78,53,.14)] backdrop-blur-2xl sm:p-8 lg:grid-cols-[.9fr_1.1fr] lg:p-12">
        <div className="relative flex flex-col justify-between rounded-3xl bg-[#0b4537] p-7 text-white sm:p-9"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b9f47f]">Start with clarity</p><h1 className="mt-4 text-4xl font-semibold leading-tight tracking-[-.06em] sm:text-5xl">Build your next chapter.</h1><p className="mt-5 max-w-sm leading-7 text-[#c0d4c8]">Create your account and get a clear view of plans designed to help your money move with intention.</p></div><div className="mt-12 space-y-4 text-sm text-[#d9e9df]"><p className="flex items-center gap-3"><Check size={17} className="text-[#b9f47f]" /> Transparent plan terms</p><p className="flex items-center gap-3"><Check size={17} className="text-[#b9f47f]" /> Real-time account visibility</p><p className="flex items-center gap-3"><ShieldCheck size={17} className="text-[#b9f47f]" /> Secure by design</p></div></div>
        <div className="relative rounded-3xl border border-white/80 bg-white/65 p-6 backdrop-blur-xl sm:p-9">
          {status === 'success' ? <div className="flex min-h-[420px] flex-col items-center justify-center text-center"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#dff5d5] text-[#32865a]"><Check /></div><h2 className="mt-6 text-3xl font-semibold tracking-[-.05em] text-[#0b4537]">Account created.</h2><p className="mt-3 max-w-sm leading-6 text-[#708079]">Your secure Xano session is saved. Continue to your dashboard.</p><Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0b4537] px-5 py-3 text-sm font-semibold text-white">Open dashboard <ArrowRight size={16} /></Link></div> : <><p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Create account</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.055em] text-[#0b4537]">Let&apos;s get started.</h2><p className="mt-2 text-sm leading-6 text-[#708079]">Set up your details to explore your investment options.</p><form className="mt-8 space-y-5" onSubmit={handleSubmit}><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-[#31574b]">First name<input name="firstName" required autoComplete="given-name" className="mt-2 w-full rounded-xl border border-[#d1e0d5] bg-white/75 px-4 py-3 font-normal outline-none transition focus:border-[#75b95c]" placeholder="Ada" /></label><label className="text-sm font-semibold text-[#31574b]">Last name<input name="lastName" required autoComplete="family-name" className="mt-2 w-full rounded-xl border border-[#d1e0d5] bg-white/75 px-4 py-3 font-normal outline-none transition focus:border-[#75b95c]" placeholder="Okafor" /></label></div><label className="block text-sm font-semibold text-[#31574b]">Email address<input name="email" required type="email" autoComplete="email" className="mt-2 w-full rounded-xl border border-[#d1e0d5] bg-white/75 px-4 py-3 font-normal outline-none transition focus:border-[#75b95c]" placeholder="you@example.com" /></label><label className="block text-sm font-semibold text-[#31574b]">Password<input name="password" required minLength={8} type="password" autoComplete="new-password" className="mt-2 w-full rounded-xl border border-[#d1e0d5] bg-white/75 px-4 py-3 font-normal outline-none transition focus:border-[#75b95c]" placeholder="At least 8 characters" /></label>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<button type="submit" disabled={status === 'loading'} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b4537] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#12624e] disabled:cursor-not-allowed disabled:opacity-70">{status === 'loading' && <Loader2 size={17} className="animate-spin" />}{status === 'loading' ? 'Creating account…' : 'Create account'} <ArrowRight size={16} /></button></form><p className="mt-6 text-center text-sm text-[#708079]">Already have an account? <Link href="/login" className="font-semibold text-[#0b4537] underline-offset-4 hover:underline">Sign in</Link></p></>}
        </div>
      </section>
    </main>
  )
}
