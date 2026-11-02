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
  ['How does Madallion fund work?', 'Choose a plan, fund your wallet, and our investment team puts your capital to work across vetted opportunities. You can track your progress from your dashboard.'],
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

          <button className="rounded-lg p-2 lg:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu size={22} />
          </button>
        </div>

        {menuOpen && (
          <div className="fixed inset-0 z-50 bg-[#fbfcfa] p-5 lg:hidden">
            <div className="flex items-center justify-between">
              <span className="font-bold">{BRAND}</span>
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></button>
            </div>
            <div className="mt-8 space-y-3 text-base font-medium text-[#3f5550]">
              <Link href="#plans" onClick={() => setMenuOpen(false)}>Plans</Link>
              <Link href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</Link>
              <Link href="#calculator" onClick={() => setMenuOpen(false)}>Calculator</Link>
              <Link href="#about" onClick={() => setMenuOpen(false)}>About us</Link>
              <Link href="#faq" onClick={() => setMenuOpen(false)}>FAQ</Link>
              <div className="pt-4">
                <Link href="/login" className="block rounded-lg border border-[#dfe8e2] px-4 py-3 text-center font-semibold text-[#0b4537]" onClick={() => setMenuOpen(false)}>Log in</Link>
                <Link href="/register" className="mt-3 block rounded-lg bg-[#0b4537] px-4 py-3 text-center font-semibold text-white" onClick={() => setMenuOpen(false)}>Create account</Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <section id="top" className="relative border-b border-[#e1e9e3]">
        <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_65%_25%,rgba(185,244,127,.34),transparent_28%),linear-gradient(135deg,#f7faf5_0%,#eef6ef_100%)]" />
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-32">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#cfe4d1] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#267258]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b9f47f]" />
              Thoughtful investing for Nigeria
            </div>
            <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.06em] text-[#0e1d18] sm:text-5xl lg:text-6xl">Invest with clarity, not noise.</h1>
            <p className="mt-5 max-w-xl text-lg text-[#51645e]">Madallion fund helps you grow wealth through transparent, structured plans designed for long-term consistency.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-[#0b4537] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12634f]">Get started <ArrowRight size={16} /></Link>
              <Link href="#how-it-works" className="inline-flex items-center gap-2 rounded-xl border border-[#d2e2d7] bg-white px-5 py-3.5 text-sm font-semibold text-[#0b4537]">How it works</Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-[#5f716b]">
              <span className="flex items-center gap-2"><Check size={16} className="text-[#1f7a51]" /> Verified investors</span>
              <span className="flex items-center gap-2"><Check size={16} className="text-[#1f7a51]" /> Secure wallet</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[510px]">
            <div className="rounded-2xl border border-[#dfe8e2] bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,31,25,0.08)] backdrop-blur-xl sm:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7d8f88]">Projected return</p>
                  <p className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#0b4537]">₦{projected.toLocaleString()}</p>
                </div>
                <div className="rounded-full border border-[#d8e8dc] bg-[#f3faf4] px-3 py-1 text-xs font-semibold text-[#1d7a58]">Gold plan</div>
              </div>

              <div className="mt-6 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#536a62]">Amount to invest</span>
                  <div className="flex items-center rounded-xl border border-[#dfe8e2] bg-[#f8fbf8] px-3 py-3">
                    <CircleDollarSign size={18} className="mr-2 text-[#0b4537]" />
                    <input value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full bg-transparent text-base outline-none placeholder:text-[#8aa097]" placeholder="500000" />
                  </div>
                </label>

                <div className="rounded-xl border border-[#dfe8e2] bg-[#f8fbf8] p-4">
                  <div className="flex items-center justify-between text-sm text-[#5e7069]">
                    <span>Plan</span>
                    <span className="font-semibold text-[#0b4537]">Gold · 60 days</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-[#5e7069]">
                    <span>Estimated ROI</span>
                    <span className="font-semibold text-[#0b4537]">1.8% / 60 days</span>
                  </div>
                </div>

                <Link href="/register" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b4537] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12634f]">
                  Start investing <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e1e9e3] bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 sm:grid-cols-4 lg:px-8">
          <Stat value="₦4.8B+" label="Assets managed" />
          <Stat value="14.2k" label="Active investors" />
          <Stat value="97.8%" label="On-time payouts" />
          <Stat value="24/7" label="Support coverage" />
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Simple process</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#0d1d1a] sm:text-4xl">Built to make investing feel calm and deliberate.</h2>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {[
            { icon: BarChart3, title: 'Choose a plan', text: 'Select the investment structure that matches your goals and timeline.' },
            { icon: CircleDollarSign, title: 'Fund your wallet', text: 'Move capital into your secure wallet and track your allocations clearly.' },
            { icon: ShieldCheck, title: 'Track returns', text: 'Monitor performance, payouts, and maturity in one place.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-[#dfe8e2] bg-white p-6">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf6ea] text-[#0b4537]">
                <Icon size={20} />
              </div>
              <h3 className="text-xl font-semibold text-[#10211b]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#5a6e67]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="plans" className="bg-[#0b4537] px-5 py-20 text-white lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b9f47f]">Plans</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Choose the right fit for your goals.</h2>
            </div>
            <Link href="/plans" className="inline-flex items-center gap-2 text-sm font-semibold text-[#dffec3]">Explore all plans <ArrowRight size={16} /></Link>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.name} className={`rounded-3xl border p-6 ${plan.featured ? 'border-[#b9f47f] bg-[#123d31]' : 'border-white/10 bg-white/5'}`}>
                <p className="text-sm uppercase tracking-[0.18em] text-[#c4d7ce]">{plan.eyebrow}</p>
                <h3 className="mt-4 text-3xl font-semibold">{plan.name}</h3>
                <div className="mt-6 flex items-end gap-2">
                  <span className="text-4xl font-semibold tracking-[-0.05em]">{plan.roi}</span>
                  <span className="pb-1 text-sm text-[#d8ebdf]">return</span>
                </div>
                <p className="mt-4 text-sm text-[#d9efe0]">{plan.days}</p>
                <p className="mt-2 text-sm text-[#d9efe0]">{plan.range}</p>
                <button className={`mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold ${plan.featured ? 'bg-[#b9f47f] text-[#0b4537]' : 'bg-white/10 text-white'}`}>Choose plan</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="calculator" className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[.9fr_1.1fr] lg:px-8 lg:py-28">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Calculator</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#0d1d1a] sm:text-4xl">See how your capital can compound over time.</h2>
          <p className="mt-4 text-base leading-7 text-[#536b63]">A simple plan, transparent projections, and a disciplined structure to help you grow without second-guessing your strategy.</p>
        </div>

        <div className="rounded-3xl border border-[#dfe8e2] bg-white p-6 shadow-sm">
          <div className="flex justify-between border-b border-[#e6efe8] pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#7a8d87]">Projection</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#0b4537]">₦{projected.toLocaleString()}</p>
            </div>
            <div className="rounded-full bg-[#edf9ee] px-3 py-1 text-sm font-semibold text-[#197d59]">+1.8% ROI</div>
          </div>

          <div className="mt-6">
            <input value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full rounded-xl border border-[#dfe8e2] bg-[#f8fbf8] px-4 py-3 text-base outline-none" type="number" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#e7efe8] bg-[#f8fbf8] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7b8d87]">Capital</p>
              <p className="mt-2 text-xl font-semibold text-[#0d1d1a]">₦{Number(amount || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-[#e7efe8] bg-[#f8fbf8] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7b8d87]">Term</p>
              <p className="mt-2 text-xl font-semibold text-[#0d1d1a]">60 days</p>
            </div>
            <div className="rounded-xl border border-[#e7efe8] bg-[#f8fbf8] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7b8d87]">Yield</p>
              <p className="mt-2 text-xl font-semibold text-[#0d1d1a]">₦{Math.round(Number(amount || 0) * 0.018).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="border-y border-[#e1e9e3] bg-[#f1f7f0] px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#65a85c]">About us</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#0d1d1a] sm:text-4xl">A disciplined investment culture built for real outcomes.</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                ['Risk-aware', 'Every investment decision is reviewed with a measured, steady perspective.'],
                ['Transparent', 'You can track capital movement, plan maturity, and expected performance.'],
                ['Focused', 'No hype — just deliberate capital allocation and clear reporting.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-[#dfe8e2] bg-white p-5">
                  <p className="text-lg font-semibold text-[#0b4537]">{title}</p>
                  <p className="mt-3 text-sm leading-6 text-[#536b63]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-5 py-20 lg:py-28">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#65a85c]">Questions, answered</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#0d1d1a] sm:text-4xl">FAQs</h2>
        </div>

        <div className="mt-10 space-y-4">
          {faqs.map(([question, answer], index) => (
            <div key={question} className="rounded-2xl border border-[#dfe8e2] bg-white">
              <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                <span className="font-medium text-[#10211b]">{question}</span>
                <ChevronDown className={`transition-transform ${openFaq === index ? 'rotate-180' : ''}`} size={18} />
              </button>
              {openFaq === index && <p className="border-t border-[#edf1ee] px-5 py-4 text-sm leading-7 text-[#51645e]">{answer}</p>}
            </div>
          ))}
        </div>
      </section>

      <section id="start" className="mx-5 mb-10 rounded-2xl bg-[#b9f47f] px-6 py-14 text-center sm:px-10 lg:mx-auto lg:max-w-7xl">
        <h2 className="text-4xl font-semibold tracking-[-.055em] text-[#0b4537]">Build your next move with confidence.</h2>
        <Link href="/register" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b4537] px-5 py-3.5 text-sm font-semibold text-white">Create account <ArrowRight size={16} /></Link>
      </section>

      <footer className="border-t border-[#e1e9e3] px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row">
          <div>
            <Link href="#top" className="font-bold text-[#0b4537]">{BRAND}</Link>
            <p className="mt-2 text-sm text-[#5e7069]">Thoughtful investing for Nigeria.</p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-[#536b63]">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/login">Login</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold tracking-[-.045em] text-[#0b4537] sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm text-[#60716b]">{label}</p>
    </div>
  )
}
