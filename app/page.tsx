'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, BarChart3, Check, ChevronDown, CircleDollarSign, Menu, ShieldCheck, Sparkles, X } from 'lucide-react'

const BRAND = 'Madallion fund'

const plans = [
  { name: 'Starter', eyebrow: 'Build your base', roi: '1.2%', days: '30 days', range: '₦50k – ₦499k', featured: false },
  { name: 'Gold', eyebrow: 'For steady growth', roi: '1.8%', days: '60 days', range: '₦500k – ₦4.9m', featured: true },
  { name: 'Diamond', eyebrow: 'Private wealth', roi: '2.4%', days: '90 days', range: '₦5m – ₦25m', featured: false },
]

const faqs = [
  ['How does Madallion fund work?', 'Choose a plan, fund your wallet, and our investment team puts your capital to work across vetted opportunities. You can track your progress from your dashboard and wallet view.'],
  ['When can I withdraw my returns?', 'Returns are paid at maturity according to your chosen plan. Your principal is returned alongside your earnings, subject to the plan terms.'],
  ['Is my money secure?', 'We use bank-grade security, segregated accounting, and a transparent ledger to keep every movement traceable. Investments always carry risk, which we explain clearly.'],
  ['Who can invest?', 'Madallion fund is built for Nigerian residents aged 18 and above with a valid bank account and completed identity verification.'],
]

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const [amount, setAmount] = useState('500000')
  const projected = Math.round(Number(amount || 0) * 0.018 * 60)

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfcfa] text-[#101d1a]">
      <header className="sticky top-0 z-50 border-b border-[#dfe8e2]/80 bg-[#fbfcfa]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="#top" className="flex items-center gap-2.5" aria-label={BRAND}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b4537] text-[#b9f47f]"><Sparkles size={17} /></span>
            <span className="text-[15px] font-bold tracking-[-0.03em]">{BRAND}</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#60716b] lg:flex">
            <Link href="#plans" className="transition-colors hover:text-[#0b4537]">Plans</Link>
            <Link href="#how-it-works" className="transition-colors hover:text-[#0b4537]">How it works</Link>
            <Link href="#calculator" className="transition-colors hover:text-[#0b4537]">Calculator</Link>
            <Link href="#about" className="transition-colors hover:text-[#0b4537]">About us</Link>
            <Link href="#faq" className="transition-colors hover:text-[#0b4537]">FAQ</Link>
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/login" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[#0b4537]">Log in</Link>
            <Link href="/register" className="rounded-lg bg-[#0b4537] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12634f]">Create account</Link>
          </div>
          <button className="rounded-lg p-2 lg:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={22} /></button>
        </div>
        {menuOpen && <div className="fixed inset-0 bg-[#fbfcfa] p-5 lg:hidden"><div className="flex items-center justify-between"><span className="font-bold">{BRAND}</span><button onClick={() => setMenuOpen(false)} className="rounded-lg p-2" aria-label="Close menu"><X size={18} /></button></div><nav className="mt-10 space-y-4 text-base font-medium text-[#60716b]"><Link href="#plans" onClick={() => setMenuOpen(false)}>Plans</Link><Link href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</Link><Link href="#calculator" onClick={() => setMenuOpen(false)}>Calculator</Link><Link href="#about" onClick={() => setMenuOpen(false)}>About us</Link><Link href="#faq" onClick={() => setMenuOpen(false)}>FAQ</Link><Link href="/login" onClick={() => setMenuOpen(false)} className="mt-2 block rounded-lg bg-[#0b4537] px-4 py-3 text-center font-semibold text-white">Log in</Link></nav></div>}
      </header>

      <section id="top" className="relative border-b border-[#e1e9e3]">
        <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_65%_25%,rgba(185,244,127,.34),transparent_28%),linear-gradient(135deg,#f7faf5_0%,#eef6ef_100%)]" />
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-32">
          <div><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#cfe4d1] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#267258]"><span className="h-1.5 w-1.5 rounded-full bg-[#7cc461]" /> Trusted returns, designed to last</div><h1 className="max-w-xl text-5xl font-semibold tracking-[-.065em] text-[#0b4537] sm:text-6xl">Give your capital a smarter path.</h1><p className="mt-6 max-w-lg text-lg leading-8 text-[#4e635b]">Madallion fund helps you invest with clarity, confidence, and disciplined guidance across vetted opportunities.</p><div className="mt-8 flex flex-wrap items-center gap-4"><Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-[#0b4537] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0b4537]/15 transition hover:bg-[#12634f]">Create your account <ArrowRight size={16} /></Link><Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-[#d2e4d7] bg-white/80 px-5 py-3.5 text-sm font-semibold text-[#0b4537] hover:bg-white">Member login</Link></div><div className="mt-8 flex items-center gap-4 text-sm text-[#5b7169]"><div className="flex items-center gap-2"><Check size={16} className="text-[#1f8d65]" /> Transparent plans</div><div className="flex items-center gap-2"><Check size={16} className="text-[#1f8d65]" /> Secure investing</div></div></div>
          <div className="relative mx-auto w-full max-w-[510px]"><div className="glass-panel rounded-2xl p-5 sm:p-7"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Projected growth</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.06em] text-[#0b4537]">₦{projected.toLocaleString()}</h2></div><div className="rounded-xl bg-[#ebf7df] p-2 text-[#0b4537]"><BarChart3 size={22} /></div></div><div className="mt-6 space-y-5"><div>
            <div className="mb-2 flex items-center justify-between text-sm text-[#5f7169]"><span>Investment amount</span><span className="font-semibold text-[#0b4537]">₦{Number(amount).toLocaleString()}</span></div>
            <input aria-label="Investment amount" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))} className="w-full rounded-xl border border-[#d7e7db] bg-white px-4 py-3 text-base text-[#0b4537] outline-none transition focus:border-[#7bbd7a]" />
          </div><div className="grid gap-3 sm:grid-cols-3">{['Starter','Gold','Diamond'].map((plan, index) => <button key={plan} type="button" onClick={() => setOpenFaq(index)} className={`rounded-xl border px-3 py-2 text-sm font-medium ${index === 1 ? 'border-[#0b4537] bg-[#0b4537] text-white' : 'border-[#dce7df] bg-white text-[#2b473d]'}`}>{plan}</button>)}</div><div className="rounded-2xl border border-[#dfe8e2] bg-[#f7faf6] p-4"><div className="flex items-center justify-between text-sm text-[#5f7169]"><span>Expected annual yield</span><span className="font-semibold text-[#0b4537]">1.8%</span></div><div className="mt-3 h-2.5 rounded-full bg-[#dfe8e2]"><div className="h-2.5 rounded-full bg-[#7fcf66]" style={{ width: '76%' }} /></div></div></div></div></div>
        </div>
      </section>

      <section className="border-b border-[#e1e9e3] bg-white"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 sm:grid-cols-4 lg:px-8"><Stat value="₦4.8B+" label="Assets managed" /><Stat value="2.1x" label="Average growth" /><Stat value="18.4K" label="Active investors" /><Stat value="99.2%" label="On-time payouts" /></div></section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Simple process</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.06em] text-[#0b4537]">A clearer path to investing.</h2></div><div className="mt-10 grid gap-6 md:grid-cols-3">{[{title:'Choose a plan', text:'Pick the investment path that matches your goals and timeline.'},{title:'Fund your wallet', text:'Transfer cash into your Madallion wallet for allocation.'},{title:'Track progress', text:'Monitor performance, returns, and milestones from your dashboard.'}].map((step) => <div key={step.title} className="rounded-2xl border border-[#e3ece2] bg-[#f8fbf7] p-6"><div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b4537] text-sm font-semibold text-[#b9f47f]">{step.title.split(' ')[0][0]}</div><h3 className="text-xl font-semibold text-[#0b4537]">{step.title}</h3><p className="mt-3 text-base leading-7 text-[#5f7169]">{step.text}</p></div>)}</div></section>

      <section id="plans" className="bg-[#0b4537] px-5 py-20 text-white lg:px-8 lg:py-28"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b9f47f]">Choose your path</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.06em]">Flexible plans for different goals.</h2></div><Link href="/register" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10">Create account</Link></div><div className="mt-10 grid gap-6 lg:grid-cols-3">{plans.map((plan) => <div key={plan.name} className={`rounded-3xl border p-6 ${plan.featured ? 'border-[#b9f47f]/50 bg-[#123f35] shadow-[0_20px_60px_rgba(0,0,0,.12)]' : 'border-white/10 bg-white/5'}`}><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b9f47f]">{plan.eyebrow}</p><h3 className="mt-5 text-3xl font-semibold tracking-[-.05em]">{plan.name}</h3><div className="mt-6 flex items-end gap-2"><span className="text-4xl font-semibold tracking-[-.06em]">{plan.roi}</span><span className="pb-1 text-[#c8d7d1]">monthly</span></div><ul className="mt-6 space-y-3 text-sm text-[#d5e6df]">{['Targeted diversification','Transparent tracking','Flexible maturity window'].map((item) => <li key={item} className="flex items-center gap-2"><Check size={14} className="text-[#b9f47f]" />{item}</li>)}</ul><div className="mt-8 rounded-2xl border border-white/10 bg-black/5 p-4 text-sm text-[#dfeae4]">{plan.range}</div></div>)}</div></div></section>

      <section id="calculator" className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[.9fr_1.1fr] lg:px-8 lg:py-28"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Estimate</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.06em] text-[#0b4537]">See a realistic return range.</h2><p className="mt-5 max-w-md text-lg leading-8 text-[#60716b]">Our examples use a conservative projected yield based on the Gold plan track.</p><div className="mt-8 rounded-2xl border border-[#dae7dd] bg-[#f7faf6] p-5"><div className="flex items-center justify-between"><span className="text-sm text-[#5f7169]">Investment</span><span className="text-sm font-semibold text-[#0b4537]">₦{Number(amount).toLocaleString()}</span></div><div className="mt-4 flex items-center justify-between"><span className="text-sm text-[#5f7169]">Estimated after 60 months</span><span className="text-lg font-semibold text-[#0b4537]">₦{(Number(amount) + projected).toLocaleString()}</span></div></div></div><div className="glass-panel rounded-3xl p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Projection</p><div className="mt-6 space-y-5">{[0, 1, 2, 3, 4].map((step) => <div key={step}><div className="mb-2 flex items-center justify-between text-sm text-[#5f7169]"><span>{step === 0 ? 'Initial deposit' : `${step * 12} months`}</span><span className="font-semibold text-[#0b4537]">{step === 0 ? '₦500,000' : `₦${Math.round((Number(amount) * (1 + 0.018 * (step + 1))) / 1000) * 1000}`}</span></div><div className="h-2.5 rounded-full bg-[#dfe8e2]"><div className="h-2.5 rounded-full bg-[#7fcf66]" style={{ width: `${40 + step * 15}%` }} /></div></div>)} </div></div></section>

      <section id="about" className="border-y border-[#e1e9e3] bg-[#f1f7f0] px-5 py-20 lg:px-8"><div className="mx-auto max-w-7xl"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Our approach</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.06em] text-[#0b4537]">Built for disciplined growth.</h2></div><div className="grid gap-6 sm:grid-cols-3">{[{title:'Risk-aware', text:'We focus on vetted opportunities with clear guardrails.'},{title:'Transparent', text:'Every allocation is tracked with visibility into the flow of funds.'},{title:'Long-term', text:'Our plans are designed around disciplined progress and stability.'}].map((item) => <div key={item.title} className="rounded-2xl border border-[#dfe8e2] bg-white p-5"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#dff5d5] text-[#0b4537]"><CircleDollarSign size={18} /></div><h3 className="text-lg font-semibold text-[#0b4537]">{item.title}</h3><p className="mt-3 text-sm leading-7 text-[#60716b]">{item.text}</p></div>)}</div></div></div></section>

      <section id="faq" className="mx-auto max-w-3xl px-5 py-20 lg:py-28"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Questions, answered</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.06em] text-[#0b4537]">Everything you need to know.</h2></div><div className="mt-10 space-y-3">{faqs.map(([question, answer], index) => <div key={question} className="rounded-2xl border border-[#e1e9e3] bg-[#f8fbf7] px-5 py-4"><button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} className="flex w-full items-center justify-between gap-4 text-left"><span className="font-semibold text-[#0b4537]">{question}</span><ChevronDown size={18} className={`shrink-0 transition ${openFaq === index ? 'rotate-180 text-[#0b4537]' : 'text-[#60716b]'}`} /></button>{openFaq === index && <p className="mt-4 pr-8 text-sm leading-7 text-[#5f7169]">{answer}</p>}</div>)}</div></section>

      <section id="start" className="mx-5 mb-10 rounded-2xl bg-[#b9f47f] px-6 py-14 text-center sm:px-10 lg:mx-auto lg:max-w-7xl"><h2 className="text-4xl font-semibold tracking-[-.055em] text-[#0b4537]">Give your money a better direction.</h2><p className="mx-auto mt-4 max-w-md text-[#416348]">Start with a plan that fits your goals. You can always grow from there.</p><Link href="/register" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#0b4537] px-5 py-3.5 text-sm font-semibold text-white">Create your account <ArrowRight size={16} /></Link></section>

      <footer className="border-t border-[#e1e9e3] px-5 py-10 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row"><div><Link href="#top" className="font-bold text-[#0b4537]">Madallion fund</Link><p className="mt-3 text-sm text-[#60716b]">Built for long-term investors who want clarity, confidence, and control.</p></div><div className="flex flex-wrap items-center gap-4 text-sm text-[#60716b]"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/login">Log in</Link></div></div></footer>
    </main>
  )
}

function Stat({ value, label }: { value: string; label: string }) { return <div><p className="text-2xl font-semibold tracking-[-.045em] text-[#0b4537] sm:text-3xl">{value}</p><p className="mt-1 text-sm text-[#60716b]">{label}</p></div> }
