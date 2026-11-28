'use client'

import Link from 'next/link'
import { useState } from 'react'
import useSWR from 'swr'
import {
  ArrowRight,
  BarChart3,
  Calculator,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  HelpCircle,
  Landmark,
  Layers,
  LayoutGrid,
  LockKeyhole,
  LogIn,
  Menu,
  Route,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react'
import { ActivityTicker } from '@/components/activity-ticker'
import { PlanCalculator } from '@/components/investment-widgets'
import { LandingPlanCard } from '@/components/landing-plan-card'
import { DEFAULT_PLANS } from '@/lib/default-plans'
import { getPlans, planDailyRate, planIsPaused, PLANS_KEY } from '@/lib/investment-api'

const BRAND = 'Madallion fund'

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)

const navItems = [
  ['#plans', 'Plans'],
  ['#how-it-works', 'How it works'],
  ['#calculator', 'Calculator'],
  ['#safety', 'Safety'],
  ['#faq', 'FAQ'],
] as const

const trustItems = [
  {
    icon: ShieldCheck,
    title: 'Ledger-backed records',
    copy: 'Deposits, accruals, and payouts are recorded against your account.',
  },
  {
    icon: BarChart3,
    title: 'Terms shown upfront',
    copy: 'See the daily rate, term, minimum, and principal treatment before you commit.',
  },
  {
    icon: Clock3,
    title: 'Maturity tracking',
    copy: 'Follow progress, payout dates, and rollover status from your dashboard.',
  },
  {
    icon: LockKeyhole,
    title: 'Account protection',
    copy: 'A saved payout destination and clear ledger activity keep withdrawals predictable.',
  },
]

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Create and fund',
    copy: 'Set up your account, choose a plan, and add a payout destination.',
  },
  {
    number: '02',
    icon: Wallet,
    title: 'Fund your wallet',
    copy: 'Deposit NGN into your wallet. Every movement is recorded in your ledger.',
  },
  {
    number: '03',
    icon: Layers,
    title: 'Choose a plan',
    copy: 'Compare rate, term, minimum, and principal treatment. Confirm the terms.',
  },
  {
    number: '04',
    icon: TrendingUp,
    title: 'Track to maturity',
    copy: 'Follow progress and payout dates, then withdraw to your verified bank account.',
  },
]

const faqs: Array<[string, string]> = [
  [
    'How does Madallion fund work?',
    'Choose an investment plan, fund your wallet, and track the plan from your dashboard. Each plan has its own daily rate, term, minimum, and maturity terms. Your ledger records the activity against your account.',
  ],
  [
    'How are returns calculated?',
    'The illustrative return is the plan daily rate multiplied by your principal and the plan term. For example, a 1.20% daily rate over 30 days is an illustrative 36% return over the term. Actual results follow the plan terms and are not guaranteed.',
  ],
  [
    'When can I withdraw?',
    'Withdrawal availability depends on the plan term and your account status. Review the plan terms before you invest, and use your dashboard to see maturity and payout dates.',
  ],
  [
    'What happens at maturity?',
    'At maturity, the plan is settled according to its terms. Principal treatment and payout cadence are shown before you confirm. You can choose rollover settings when you subscribe.',
  ],
  [
    'Are returns guaranteed?',
    'No. Projected returns are illustrative, not promises. Investments carry risk, and capital may be at risk. Read the risk disclosure and only invest what you can afford to lose.',
  ],
  [
    'What do I need to start?',
    'You need to be an eligible resident and have a valid bank account for payouts. The minimum for each plan is shown on its plan card.',
  ],
]

function TrustItem({ icon: Icon, title, copy }: { icon: typeof ShieldCheck; title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-[#dfe8e2] bg-white p-5 shadow-[0_8px_28px_rgba(25,78,53,.045)]">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef7eb] text-[#2f7a4a]">
        <Icon size={19} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-[#0b4537]">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-[#708079]">{copy}</p>
    </div>
  )
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const { data: catalogue } = useSWR(PLANS_KEY, getPlans, { revalidateOnFocus: false })

  const plans = catalogue?.plans?.length ? catalogue.plans : DEFAULT_PLANS
  const availablePlans = plans.filter((plan) => !planIsPaused(plan) && plan.sold_out !== true)
  const displayPlans = (availablePlans.length ? availablePlans : plans).slice(0, 3)
  const spotlight = displayPlans[0] ?? DEFAULT_PLANS[0]
  const minimums = plans.map((plan) => Number(plan.min_amount ?? 0)).filter((value) => value > 0)
  const startingMinimum = minimums.length ? Math.min(...minimums) : 50_000
  const spotlightRate = planDailyRate(spotlight)
  const spotlightDays = Math.max(0, Number(spotlight.duration_days ?? 0))
  const spotlightMinimum = Math.max(0, Number(spotlight.min_amount ?? 0))
  const spotlightEarnings =
    spotlightMinimum > 0 && spotlightRate > 0
      ? Math.round(spotlightMinimum * (spotlightRate / 100) * spotlightDays)
      : null
  const liveTerms = catalogue?.source === 'live'
  const closeMenu = () => setMenuOpen(false)

  return (
    <main className="min-h-screen overflow-x-clip bg-[#fbfcfa] pb-24 text-[#101d1a] lg:pb-0">
      <div className="bg-[#0b4537] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-5 py-2 text-center text-[10px] font-semibold tracking-[.08em] text-white/80 sm:text-[11px] lg:px-8">
          <ShieldCheck size={13} className="shrink-0 text-[#b9f47f]" aria-hidden="true" />
          Ledger-backed records · Clear plan terms · Verified payouts
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-[#dfe8e2]/80 bg-[#fbfcfa]/95 shadow-[0_4px_20px_rgba(16,45,33,.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="#top" onClick={closeMenu} className="flex items-center gap-2.5" aria-label={`${BRAND} home`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b4537] text-[#b9f47f]">
              <Sparkles size={18} aria-hidden="true" />
            </span>
            <span className="text-[15px] font-bold tracking-[-.03em]">
              Madallion <span className="text-[#0b4537]">fund</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#60716b] lg:flex" aria-label="Main navigation">
            {navItems.map(([href, label]) => (
              <Link key={href} href={href} className="transition hover:text-[#0b4537]">
                {label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#0b4537]">
              <LogIn size={16} aria-hidden="true" />
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0b4537] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123f34]"
            >
              <UserPlus size={16} aria-hidden="true" />
              Create account
            </Link>
          </div>

          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dfe8e2] text-[#0b4537] lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <ActivityTicker variant="header" />

        {menuOpen && (
          <>
            <button
              className="fixed inset-0 z-40 bg-[#10251d]/25 backdrop-blur-[2px] lg:hidden"
              aria-label="Close navigation overlay"
              onClick={closeMenu}
            />
            <nav
              className="absolute left-0 right-0 top-full z-50 border-t border-[#e3ebe4] bg-[#fbfcfa] px-5 pb-6 pt-3 shadow-xl lg:hidden"
              aria-label="Mobile navigation"
            >
              <div className="mx-auto max-w-7xl divide-y divide-[#e8eee8]">
                {navItems.map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMenu}
                    className="flex items-center justify-between py-3.5 text-sm font-semibold text-[#314c40]"
                  >
                    {label}
                    <ArrowRight size={15} />
                  </Link>
                ))}
                <div className="grid grid-cols-2 gap-3 pt-5">
                  <Link
                    href="/login"
                    onClick={closeMenu}
                    className="rounded-xl border border-[#cbdacf] px-4 py-3 text-center text-sm font-semibold text-[#0b4537]"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMenu}
                    className="rounded-xl bg-[#0b4537] px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            </nav>
          </>
        )}
      </header>

      <section id="top" className="relative border-b border-[#e1e9e3]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(185,244,127,.42),transparent_30%),radial-gradient(circle_at_18%_82%,rgba(139,215,208,.18),transparent_32%),linear-gradient(135deg,#f7faf5_0%,#eef6ef_100%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:py-20 lg:grid-cols-[1.04fr_.96fr] lg:px-8 lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#cfe4d1] bg-white/75 px-3 py-1.5 text-xs font-semibold text-[#267258]">
              <TrendingUp size={14} aria-hidden="true" />
              Structured NGN investment plans
            </div>
            <h1 className="max-w-2xl text-5xl font-semibold leading-[1.02] tracking-[-.065em] text-[#10251d] sm:text-6xl lg:text-[4.65rem]">
              Put your naira to work with terms you can read.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#60716b] sm:text-lg">
              Compare daily rates, terms, minimums, and maturity dates before you commit. Track every deposit, accrual, and payout in a ledger-backed account.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="#plans"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0b4537] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#123f34]"
              >
                See live plans <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#cbdacf] bg-white/70 px-5 py-3.5 text-sm font-semibold text-[#0b4537] transition hover:bg-white"
              >
                <UserPlus size={16} aria-hidden="true" />
                Create free account
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-[#60716b]">
              <span className="inline-flex items-center gap-1.5">
                <Check size={15} className="text-[#2f7a4a]" aria-hidden="true" /> Plan terms before commitment
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={15} className="text-[#2f7a4a]" aria-hidden="true" /> Ledger-tracked activity
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={15} className="text-[#2f7a4a]" aria-hidden="true" /> Maturity visibility
              </span>
            </div>
            <p className="mt-5 text-xs text-[#829088]">
              Plans start from {money(startingMinimum)}. Investments carry risk; returns are not guaranteed.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[520px]">
            <div className="absolute -inset-5 rounded-[2.4rem] bg-[#b9f47f]/25 blur-2xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 p-5 shadow-[0_30px_90px_rgba(21,77,52,.15)] backdrop-blur sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-[#eef7eb] px-3 py-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#2f7a4a]">
                  Plan spotlight
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    liveTerms ? 'bg-emerald-50 text-emerald-800' : 'bg-[#f1f5f1] text-[#708079]'
                  }`}
                >
                  <span className={`size-1.5 rounded-full ${liveTerms ? 'bg-emerald-500' : 'bg-[#a7b3ab]'}`} aria-hidden="true" />
                  {liveTerms ? 'Live terms' : 'Sample terms'}
                </span>
              </div>

              <div className="mt-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#65a85c]">{spotlight.name}</p>
                  <p className="mt-2 text-5xl font-semibold tracking-[-.06em] text-[#0b4537]">
                    {spotlightRate.toFixed(2)}
                    <span className="text-2xl">%</span>
                  </p>
                  <p className="mt-1 text-xs text-[#708079]">illustrative daily rate · {spotlightDays} days</p>
                </div>
                <div className="rounded-2xl bg-[#f4f8f3] px-3 py-3 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#829088]">Minimum</p>
                  <p className="mt-1 text-sm font-semibold text-[#0b4537]">{spotlightMinimum ? money(spotlightMinimum) : '—'}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#e7eee8] bg-[#fbfcfa] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#829088]">Term</p>
                  <p className="mt-1 text-sm font-semibold text-[#0b4537]">{spotlightDays} days</p>
                </div>
                <div className="rounded-2xl border border-[#e7eee8] bg-[#fbfcfa] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#829088]">Principal</p>
                  <p className="mt-1 text-sm font-semibold text-[#0b4537]">
                    {spotlight.principal_returned == null
                      ? 'Per plan terms'
                      : spotlight.principal_returned
                        ? 'Returned'
                        : 'Not returned'}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-[#0b4537] p-4 text-white">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#b9f47f]">At the minimum</p>
                <p className="mt-2 text-sm leading-6 text-white/85">
                  {spotlightMinimum && spotlightEarnings != null ? (
                    <>
                      {money(spotlightMinimum)} principal →{' '}
                      <span className="font-semibold text-[#b9f47f]">{money(spotlightEarnings)}</span> illustrative income over{' '}
                      {spotlightDays} days
                    </>
                  ) : (
                    'Choose a plan to see illustrative numbers.'
                  )}
                </p>
              </div>

              <Link
                href="#plans"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#b9f47f] px-4 py-3 text-sm font-semibold text-[#071a18] transition hover:bg-[#a9e86d]"
              >
                See this plan <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <p className="mt-3 text-[11px] leading-5 text-[#829088]">
                Illustrative only. Returns are not guaranteed. Review plan terms and the risk disclosure before investing.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e1e9e3] bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {trustItems.map((item) => (
            <TrustItem key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section id="plans" className="bg-[#0b4537] px-5 py-20 text-white lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#b9f47f]">
                <Layers size={14} aria-hidden="true" />
                Plans
              </p>
              <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-.04em] sm:text-5xl">
                Choose a term you can plan around.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">
                Compare the rate, term, minimum, and principal treatment before you commit. Availability follows the live plan catalogue.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                  liveTerms ? 'bg-[#b9f47f]/15 text-[#b9f47f]' : 'bg-white/10 text-white/65'
                }`}
              >
                <span className={`size-1.5 rounded-full ${liveTerms ? 'animate-pulse bg-[#b9f47f]' : 'bg-white/40'}`} aria-hidden="true" />
                {liveTerms ? 'Live plan catalogue' : 'Sample terms until live catalogue loads'}
              </span>
              <Link href="/plans" className="inline-flex items-center gap-2 text-sm font-semibold text-[#b9f47f]">
                Full plan table <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-3">
            {displayPlans.map((plan, index) => (
              <LandingPlanCard key={plan.id ?? index} plan={plan} featured={plan.featured === true} />
            ))}
          </div>

          <p className="mt-6 max-w-4xl text-xs leading-5 text-white/55">
            Rates and availability follow the current plan catalogue. Illustrative figures are not guarantees. Investments carry risk, and capital may be at risk. Read the{' '}
            <Link href="/risk" className="font-semibold text-white/80 underline underline-offset-2">
              risk disclosure
            </Link>{' '}
            before investing.
          </p>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">
            <Route size={14} aria-hidden="true" />
            How it works
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-.04em] text-[#10251d] sm:text-5xl">
            A clear path from account to payout.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#687870]">
            No mystery steps. You see the plan terms before you commit, and your account records what happens next.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <article
              key={step.number}
              className="rounded-2xl border border-[#e1e9e3] bg-white p-6 shadow-[0_8px_28px_rgba(25,78,53,.045)]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef7eb] text-[#2f7a4a]">
                  <step.icon size={19} aria-hidden="true" />
                </span>
                <span className="text-sm font-bold text-[#30794e]">{step.number}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-[#173c30]">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#708079]">{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="calculator" className="border-y border-[#e1e9e3] bg-[#f1f7f0] px-5 py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">
              <Calculator size={14} aria-hidden="true" />
              Plan calculator
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-.04em] text-[#10251d] sm:text-5xl">
              See the numbers before you commit.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#687870]">
              Adjust the amount and compare plan terms. The calculator uses the current catalogue and labels every figure as illustrative.
            </p>
          </div>
          <div className="mt-8">
            <PlanCalculator
              plans={plans}
              sourceNote={liveTerms ? 'Live plan catalogue.' : 'Sample plan terms until the live catalogue loads.'}
            />
          </div>
        </div>
      </section>

      <section id="safety" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">
              <ShieldCheck size={14} aria-hidden="true" />
              Built for clarity
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-.04em] text-[#10251d] sm:text-5xl">
              Trust comes from what you can verify.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#687870]">
              We keep the important details visible: plan terms, principal treatment, maturity dates, and account activity. Only real, masked ledger activity appears in the public feed.
            </p>
            <div className="mt-6 space-y-3 text-sm text-[#314c40]">
              {[
                'Plan terms shown before you confirm',
                'Ledger entries for deposits, accruals, and payouts',
                'Maturity and rollover status in your dashboard',
                'A saved bank destination for withdrawals',
              ].map((item) => (
                <p key={item} className="flex items-start gap-2.5">
                  <Check size={16} className="mt-0.5 shrink-0 text-[#2f7a4a]" aria-hidden="true" />
                  {item}
                </p>
              ))}
            </div>
            <Link href="/risk" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0b4537]">
              Read the risk disclosure <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Landmark, title: 'Payout destination', copy: 'Add and verify the bank account where withdrawals should land.' },
              { icon: Wallet, title: 'Wallet visibility', copy: 'See available balance, deposits, and withdrawals from your account.' },
              { icon: CircleDollarSign, title: 'Maturity clarity', copy: 'Know the term, payout cadence, and principal treatment before you invest.' },
              { icon: ShieldCheck, title: 'Payout controls', copy: 'Manage the bank account where withdrawals land.' },
            ].map(({ icon: Icon, title, copy }) => (
              <article
                key={title}
                className="rounded-2xl border border-[#dfe8e2] bg-white p-5 shadow-[0_8px_28px_rgba(25,78,53,.045)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef7eb] text-[#2f7a4a]">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-[#0b4537]">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-[#708079]">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        <div className="rounded-[2rem] border border-[#dfe8e2] bg-white p-6 shadow-[0_18px_55px_rgba(16,45,33,.06)] sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">
                <LayoutGrid size={14} aria-hidden="true" />
                Member tools
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-.04em] text-[#10251d] sm:text-4xl">
                Keep your plan moving after you invest.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#687870]">
                Stay on top of maturity, choose what happens next, and share the platform when you are ready.
              </p>
            </div>
            <Link href="/dashboard/investments" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b4537]">
              Open dashboard <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: TrendingUp,
                title: 'Auto-rollover',
                copy: 'Choose whether principal and interest renew at maturity, or return to your wallet.',
                href: '/dashboard/investments',
              },
              {
                icon: Clock3,
                title: 'Maturity tracking',
                copy: 'See progress, payout dates, and rollover status without guessing.',
                href: '/dashboard/investments',
              },
              {
                icon: CircleDollarSign,
                title: 'Referral program',
                copy: 'Share your referral link and track rewards from your account.',
                href: '/affiliate',
              },
            ].map(({ icon: Icon, title, copy, href }) => (
              <Link
                key={title}
                href={href}
                className="group rounded-2xl border border-[#e1e9e3] bg-[#fbfcfa] p-5 transition hover:border-[#b9f47f] hover:bg-white"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef7eb] text-[#2f7a4a]">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <h3 className="mt-4 flex items-center justify-between gap-3 text-sm font-semibold text-[#0b4537]">
                  {title}
                  <ArrowRight size={14} className="text-[#829088] transition group-hover:translate-x-0.5 group-hover:text-[#0b4537]" aria-hidden="true" />
                </h3>
                <p className="mt-2 text-xs leading-5 text-[#708079]">{copy}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 pb-4 lg:px-8">
        <ActivityTicker variant="landing" />
        <div className="mt-3 flex justify-end">
          <Link href="/proof" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0b4537] underline underline-offset-2">
            See payment proof <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <section id="faq" className="mx-auto max-w-3xl px-5 py-20">
        <p className="flex items-center justify-center gap-2 text-center text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">
          <HelpCircle size={14} aria-hidden="true" />
          Investor questions
        </p>
        <h2 className="mt-3 text-center text-4xl font-semibold tracking-[-.04em] text-[#10251d] sm:text-5xl">
          The details that matter.
        </h2>
        <div className="mt-8 divide-y divide-[#e1e9e3]">
          {faqs.map(([question, answer], index) => (
            <div key={question} className="py-5">
              <button
                className="flex w-full items-center justify-between gap-4 text-left font-semibold text-[#173c30]"
                onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                aria-expanded={openFaq === index}
              >
                {question}
                <ChevronDown size={18} className={`shrink-0 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === index && <p className="mt-3 text-sm leading-7 text-[#708079]">{answer}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0b4537] px-6 py-14 text-center text-white sm:px-12">
          <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[#b9f47f]/15 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-[#8bd7d0]/10 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#b9f47f]">
              <Sparkles size={14} aria-hidden="true" />
              Start with clarity
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl text-4xl font-semibold tracking-[-.04em] sm:text-5xl">
              Your next plan should make sense on paper.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/65">
              Compare live plan terms, see illustrative outcomes, and track every movement from one account.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#b9f47f] px-5 py-3.5 text-sm font-semibold text-[#071a18] transition hover:bg-[#a9e86d]"
              >
                Create free account <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                href="#plans"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <BarChart3 size={16} aria-hidden="true" />
                Compare plans
              </Link>
            </div>
            <p className="mt-6 text-xs leading-5 text-white/55">
              Investments carry risk. Returns are illustrative and not guaranteed. Read the risk disclosure before investing.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e1e9e3] px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <Link href="#top" className="font-bold text-[#0b4537]">
              {BRAND}
            </Link>
            <p className="mt-2 max-w-sm text-xs leading-5 text-[#829088]">
              Structured NGN investment plans with transparent terms and ledger-backed account activity.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#60716b]" aria-label="Footer navigation">
            <Link href="/affiliate#leaderboard">Referrals</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/risk">Risk disclosure</Link>
            <Link href="/faq">Help</Link>
          </nav>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dfe8e2] bg-[#fbfcfa]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <Link
            href="#plans"
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#cbdacf] px-4 py-2.5 text-sm font-semibold text-[#0b4537]"
          >
            <Layers size={16} aria-hidden="true" />
            View plans
          </Link>
          <Link
            href="/register"
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0b4537] px-4 py-2.5 text-sm font-semibold text-white"
          >
            <UserPlus size={16} aria-hidden="true" />
            Create account
          </Link>
        </div>
      </div>
    </main>
  )
}
