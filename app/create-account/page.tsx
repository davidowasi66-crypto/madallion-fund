'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Sparkles } from 'lucide-react'

export default function CreateAccountPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#edf7ee] px-5 py-10 text-[#101d1a]">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#b9f47f]/50 blur-3xl" />
      <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-[#8bd7c1]/40 blur-3xl" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/35 shadow-[0_28px_90px_rgba(25,78,53,.16)] backdrop-blur-2xl lg:grid-cols-[.9fr_1.1fr]">
        <section className="hidden flex-col justify-between bg-[#0b4537] p-10 text-white lg:flex">
          <div><Link href="/" className="flex items-center gap-2 font-semibold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b9f47f] text-[#0b4537]"><Sparkles size={17} /></span>Madallion fund</Link><p className="mt-24 max-w-sm text-4xl font-semibold leading-tight tracking-[-.06em]">A clearer direction for your money starts here.</p><p className="mt-5 max-w-sm text-sm leading-6 text-white/65">Create your account and explore thoughtful investment plans built for your next chapter.</p></div>
          <div className="flex items-center gap-2 text-sm text-[#b9f47f]"><Check size={16} /> Secure by design</div>
        </section>
        <section className="p-6 sm:p-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#527068] transition hover:text-[#0b4537]"><ArrowLeft size={16} /> Back home</Link>
          {submitted ? <div className="flex min-h-[430px] flex-col justify-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dff5d5] text-[#24724d]"><Check /></div><h1 className="mt-6 text-4xl font-semibold tracking-[-.06em] text-[#0b4537]">You&apos;re on your way.</h1><p className="mt-4 max-w-sm leading-7 text-[#708079]">Your account details are ready. Connect your identity verification and funding details from your dashboard next.</p><Link href="/" className="mt-8 inline-flex w-fit items-center gap-2 rounded-xl bg-[#0b4537] px-5 py-3.5 text-sm font-semibold text-white">Return home <ArrowRight size={16} /></Link></div> : <><div className="mt-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Start investing</p><h1 className="mt-3 text-4xl font-semibold tracking-[-.06em] text-[#0b4537]">Create your account</h1><p className="mt-3 text-sm leading-6 text-[#708079]">Join thousands building a more intentional financial future.</p></div><form onSubmit={handleSubmit} className="mt-8 space-y-5"><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-[#0b4537]">First name<input required name="firstName" className="mt-2 w-full rounded-xl border border-white/80 bg-white/65 px-4 py-3.5 font-normal outline-none ring-[#8ccf73] transition focus:ring-2" /></label><label className="text-sm font-semibold text-[#0b4537]">Last name<input required name="lastName" className="mt-2 w-full rounded-xl border border-white/80 bg-white/65 px-4 py-3.5 font-normal outline-none ring-[#8ccf73] transition focus:ring-2" /></label></div><label className="block text-sm font-semibold text-[#0b4537]">Email address<input required type="email" name="email" className="mt-2 w-full rounded-xl border border-white/80 bg-white/65 px-4 py-3.5 font-normal outline-none ring-[#8ccf73] transition focus:ring-2" /></label><label className="block text-sm font-semibold text-[#0b4537]">Password<div className="relative mt-2"><input required minLength={8} type={showPassword ? 'text' : 'password'} name="password" className="w-full rounded-xl border border-white/80 bg-white/65 px-4 py-3.5 pr-12 font-normal outline-none ring-[#8ccf73] transition focus:ring-2" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#708079]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><span className="mt-2 block text-xs font-normal text-[#829088]">Use at least 8 characters.</span></label><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b4537] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0b4537]/15 transition hover:bg-[#12634f]">Create account <ArrowRight size={16} /></button><p className="text-center text-xs leading-5 text-[#829088]">By continuing, you agree to our terms and privacy policy.</p></form></>}
        </section>
      </div>
    </main>
  )
}
