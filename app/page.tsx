'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, Check, ChevronDown, CircleDollarSign, Menu, ShieldCheck, Sparkles, X } from 'lucide-react'
import { xanoRequest } from '@/lib/xano-auth'

type FeedItem = { id: string; name: string; country: string; type: 'Deposit' | 'Withdrawal'; amount: number; currency: string; createdAt: number }
type RawActivity = Record<string, any>

function rowsFrom(payload: any): RawActivity[] {
  if (Array.isArray(payload)) return payload
  for (const candidate of [payload?.items, payload?.activities, payload?.feed, payload?.data?.items, payload?.data?.activities, payload?.data]) {
    if (Array.isArray(candidate)) return candidate
  }
  return []
}

function toFeedItem(row: RawActivity, index: number): FeedItem | null {
  const kind = String(row.type ?? row.kind ?? row.event_type ?? row.transaction_type ?? '').toLowerCase()
  if (!kind.includes('deposit') && !kind.includes('withdraw')) return null

  // Use only server-sanitized display aliases (never raw name, email, user id, or hash client-side).
  const displayName = row.display_name ?? row.displayName ?? row.alias ?? row.public_name
  const name = typeof displayName === 'string' && displayName.trim() ? displayName.trim() : 'Madallion member'
  const rawTime = Number(row.created_at ?? row.createdAt ?? row.timestamp ?? row.date ?? Date.now())
  const createdAt = Number.isFinite(rawTime) ? (rawTime < 1e12 ? rawTime * 1000 : rawTime) : Date.now()
  const amount = Math.abs(Number(row.amount ?? row.value ?? row.total_amount ?? 0))
  if (!Number.isFinite(amount)) return null

  return {
    id: String(row.id ?? row.event_id ?? `activity-${index}-${createdAt}`),
    name,
    country: String(row.country ?? row.country_name ?? row.region ?? 'West Africa'),
    type: kind.includes('deposit') ? 'Deposit' : 'Withdrawal',
    amount,
    currency: String(row.currency ?? row.currency_code ?? 'NGN').toUpperCase(),
    createdAt,
  }
}

function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(currency === 'GHS' ? 'en-GH' : 'en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

function LiveActivity() {
  const [activity, setActivity] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    let mounted = true
    const loadFeed = async () => {
      try {
        // This is the explicitly public, privacy-sanitized activity feed endpoint.
        const response = await xanoRequest<any>('/api:ledger-api/activity/feed', { method: 'GET' })
        if (!mounted) return
        const feed = rowsFrom(response).map(toFeedItem).filter((item): item is FeedItem => item !== null)
        setActivity(feed)
        setAvailable(true)
      } catch {
        if (!mounted) return
        setActivity([])
        setAvailable(false)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadFeed()
    const interval = window.setInterval(loadFeed, 60_000)
    return () => { mounted = false; window.clearInterval(interval) }
  }, [])

  const totals = useMemo(() => activity.reduce((sum, item) => {
    if (item.currency === 'GHS') sum.ghs[item.type] += item.amount
    else sum.ngn[item.type] += item.amount
    return sum
  }, { ngn: { Deposit: 0, Withdrawal: 0 }, ghs: { Deposit: 0, Withdrawal: 0 } }), [activity])

  const repeated = activity.length > 1 ? [...activity, ...activity] : activity

  return <section aria-label="Public deposit and withdrawal activity" className="border-y border-[#e1e9e3] bg-white py-8">
    <div className="mx-auto max-w-7xl px-5 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Money movement</p><h2 className="mt-1 text-xl font-semibold text-[#0b4537]">Recent deposits & withdrawals</h2></div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${available ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{available ? 'Live public activity feed' : loading ? 'Connecting to activity feed…' : 'Activity feed temporarily unavailable'}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActivityTotal label="Deposits · Nigeria" value={formatAmount(totals.ngn.Deposit, 'NGN')} />
        <ActivityTotal label="Withdrawals · Nigeria" value={formatAmount(totals.ngn.Withdrawal, 'NGN')} />
        <ActivityTotal label="Deposits · Ghana" value={formatAmount(totals.ghs.Deposit, 'GHS')} />
        <ActivityTotal label="Withdrawals · Ghana" value={formatAmount(totals.ghs.Withdrawal, 'GHS')} />
      </div>
      {activity.length > 0 ? <div className="activity-window mt-5 overflow-hidden rounded-2xl border border-[#e6ede7] bg-[#f7faf6] py-3" aria-label="Recent anonymized public activity">
        <div className={`activity-track flex w-max gap-3 px-3 ${activity.length === 1 ? 'activity-static' : ''}`}>{repeated.map((item, index) => <div key={`${item.id}-${index}`} aria-hidden={index >= activity.length} className="flex min-w-[255px] items-center gap-3 rounded-xl border border-[#e6ede7] bg-white px-4 py-3 shadow-sm">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.type === 'Deposit' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>{item.type === 'Deposit' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#173c30]">{item.name} · {item.country}</span><span className="text-xs text-[#708079]">{item.type} · {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span>
          <span className="whitespace-nowrap text-sm font-bold text-[#0b4537]">{formatAmount(item.amount, item.currency)}</span>
        </div>)}</div>
      </div> : <div className="mt-5 rounded-2xl border border-dashed border-[#dce7de] bg-[#f7faf6] px-5 py-7 text-center text-sm text-[#708079]">{loading ? 'Loading recent activity…' : 'Recent activity will appear here when available.'}</div>}
      <p className="mt-2 text-xs text-[#77857e]">Names shown are public aliases supplied by the feed. No raw customer names or account identifiers are displayed.</p>
    </div>
  </section>
}

function ActivityTotal({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#e6ede7] bg-[#f7faf6] px-4 py-3"><p className="text-xs font-medium text-[#718078]">{label}</p><p className="mt-1 text-lg font-bold tracking-tight text-[#0b4537]">{value}</p></div>
}

const BRAND = 'Madallion fund'
const plans = [
  { name: 'Starter', eyebrow: 'Build your base', roi: '1.2%', days: '30 days', range: '₦50k – ₦499k', featured: false },
  { name: 'Gold', eyebrow: 'For steady growth', roi: '1.8%', days: '60 days', range: '₦500k – ₦4.9m', featured: true },
  { name: 'Diamond', eyebrow: 'Private wealth', roi: '2.4%', days: '90 days', range: '₦5m – ₦25m', featured: false },
]
const faqs = [
  ['How does Madallion fund work?', 'Choose a plan, fund your wallet, and our investment team puts your capital to work across vetted opportunities. You can track your progress from your dashboard.'],
  ['When can I withdraw my returns?', 'Returns are paid at maturity according to your chosen plan. Review the plan terms before investing.'],
  ['Is my money secure?', 'We use secure access and transparent accounting to make activity traceable. Investments carry risk, which we explain clearly.'],
  ['Who can invest?', 'Madallion fund is built for eligible residents with a valid bank account and completed identity verification.'],
]

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const [amount, setAmount] = useState('500000')
  const projected = Math.round(Number(amount || 0) * 0.018 * 60)
  const closeMenu = () => setMenuOpen(false)

  return <main className="min-h-screen overflow-hidden bg-[#fbfcfa] text-[#101d1a]">
    <header className="sticky top-0 z-50 border-b border-[#dfe8e2]/80 bg-[#fbfcfa]/95 shadow-[0_4px_20px_rgba(16,45,33,.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="#top" onClick={closeMenu} className="flex items-center gap-2.5" aria-label="Madallion fund home"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b4537] text-[#b9f47f]"><Sparkles size={18} /></span><span className="text-[15px] font-bold tracking-[-.03em]">Madallion <span className="text-[#0b4537]">fund</span></span></Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-[#60716b] lg:flex" aria-label="Main navigation"><Link href="#plans" className="transition hover:text-[#0b4537]">Plans</Link><Link href="#how-it-works" className="transition hover:text-[#0b4537]">How it works</Link><Link href="#calculator" className="transition hover:text-[#0b4537]">Calculator</Link><Link href="#about" className="transition hover:text-[#0b4537]">About</Link><Link href="#faq" className="transition hover:text-[#0b4537]">FAQ</Link></nav>
        <div className="hidden items-center gap-3 lg:flex"><Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#0b4537] transition hover:bg-[#edf5ed]">Log in</Link><Link href="/register" className="rounded-xl bg-[#0b4537] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12634f]">Create account</Link></div>
        <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dfe8e2] text-[#0b4537] transition hover:bg-[#edf5ed] lg:hidden" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
      {menuOpen && <><button className="fixed inset-0 top-[72px] z-40 bg-[#10251d]/25 backdrop-blur-[2px] lg:hidden" aria-label="Close navigation overlay" onClick={closeMenu} /><nav className="absolute left-0 right-0 top-full z-50 border-t border-[#e3ebe4] bg-[#fbfcfa] px-5 pb-6 pt-3 shadow-xl lg:hidden" aria-label="Mobile navigation"><div className="mx-auto max-w-7xl divide-y divide-[#e8eee8]">{[['#plans', 'Plans'], ['#how-it-works', 'How it works'], ['#calculator', 'Calculator'], ['#about', 'About us'], ['#faq', 'FAQ']].map(([href, label]) => <Link key={href} href={href} onClick={closeMenu} className="flex items-center justify-between py-3.5 text-sm font-semibold text-[#314c40]">{label}<ArrowRight size={15} /></Link>)}<div className="grid grid-cols-2 gap-3 pt-5"><Link href="/login" onClick={closeMenu} className="rounded-xl border border-[#cbdacf] px-4 py-3 text-center text-sm font-semibold text-[#0b4537]">Log in</Link><Link href="/register" onClick={closeMenu} className="rounded-xl bg-[#0b4537] px-4 py-3 text-center text-sm font-semibold text-white">Create account</Link></div></div></nav></>}
    </header>

    <section id="top" className="relative border-b border-[#e1e9e3]"><div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(185,244,127,.38),transparent_30%),linear-gradient(135deg,#f7faf5_0%,#eef6ef_100%)]" /><div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:py-24 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-28">
      <div><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#cfe4d1] bg-white/75 px-3 py-1.5 text-xs font-semibold text-[#267258]"><span className="h-1.5 w-1.5 rounded-full bg-[#65a85c]" />Thoughtful investing, made clear</div><h1 className="max-w-2xl text-5xl font-semibold leading-[1.04] tracking-[-.065em] text-[#10251d] sm:text-6xl lg:text-[4.5rem]">Make your money work with <span className="text-[#2e7c56]">purpose.</span></h1><p className="mt-6 max-w-xl text-base leading-7 text-[#60716b] sm:text-lg">Explore carefully structured investment plans, transparent terms, and a clear view of your money’s journey.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-[#0b4537] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0b4537]/15 transition hover:-translate-y-0.5">Get started <ArrowRight size={16} /></Link><Link href="#plans" className="rounded-xl border border-[#cbdacf] bg-white/70 px-5 py-3.5 text-sm font-semibold text-[#0b4537] transition hover:bg-white">Explore plans</Link></div><div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-[#60716b]"><span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-[#39805b]" /> Secure account access</span><span className="inline-flex items-center gap-1.5"><Check size={15} className="text-[#39805b]" /> Clear investment terms</span></div></div>
      <div className="relative mx-auto w-full max-w-[510px]"><div className="absolute -inset-4 rounded-[2rem] bg-[#b9f47f]/25 blur-2xl" /><div className="relative rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_30px_90px_rgba(21,77,52,.13)] backdrop-blur-xl sm:p-7"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-[#65a85c]">Growth preview</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#10251d]">Plan calculator</h2></div><span className="rounded-xl bg-[#edf6e9] p-3 text-[#30794e]"><BarChart3 size={20} /></span></div><p className="mt-2 text-sm text-[#708079]">Estimate a plan outcome. Actual returns depend on plan terms and investment performance.</p><div className="mt-7 flex items-center justify-between text-sm text-[#5f7169]"><label htmlFor="investment-amount">Investment amount</label><span className="font-semibold text-[#0b4537]">{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(amount || 0))}</span></div><input id="investment-amount" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))} className="mt-3 w-full accent-[#0b4537]" type="range" min="50000" max="25000000" step="50000" /><div className="mt-1 flex justify-between text-xs text-[#819087]"><span>₦50,000</span><span>₦25,000,000</span></div><div className="mt-6 rounded-2xl bg-[#0b4537] p-5 text-white"><div className="flex items-center justify-between"><div><p className="text-xs text-white/65">Illustrative projected return</p><p className="mt-2 text-3xl font-semibold tracking-tight">{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(projected)}</p></div><CircleDollarSign className="text-[#b9f47f]" size={27} /></div><p className="mt-3 text-xs text-white/65">Based on sample Gold plan assumptions (1.8% × 60 days). Not guaranteed.</p></div><Link href="/plans" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0b4537]">Compare available plans <ArrowRight size={15} /></Link></div></div>
    </div></section>

    <LiveActivity />

    <section className="border-b border-[#e1e9e3] bg-white"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 sm:grid-cols-4 lg:px-8"><Stat value="₦4.8B+" label="Assets managed" /><Stat value="12,000+" label="Active investors" /><Stat value="98.7%" label="Payout reliability" /><Stat value="24/7" label="Account visibility" /></div></section>
    <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Simple by design</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.055em] text-[#10251d]">A clear path from start to finish.</h2></div><div className="mt-10 grid gap-4 md:grid-cols-3">{[['01', 'Create your account', 'Set up your profile and review your account details.'], ['02', 'Choose a plan', 'Compare duration, minimums, and terms before you commit.'], ['03', 'Track your activity', 'Follow deposits, withdrawals, and account activity from your dashboard.']].map(([number, title, copy]) => <article key={number} className="rounded-2xl border border-[#e1e9e3] bg-white p-6"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf6e9] text-sm font-bold text-[#30794e]">{number}</span><h3 className="mt-5 text-lg font-semibold text-[#173c30]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#708079]">{copy}</p></article>)}</div></section>
    <section id="plans" className="bg-[#0b4537] px-5 py-20 text-white lg:px-8 lg:py-28"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b9f47f]">Choose your pace</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.055em]">Plans built around your goals.</h2></div><Link href="/plans" className="inline-flex items-center gap-2 text-sm font-semibold text-[#d3f8bb]">View all plans <ArrowRight size={15} /></Link></div><div className="mt-10 grid gap-4 lg:grid-cols-3">{plans.map((plan) => <article key={plan.name} className={`rounded-2xl p-6 ${plan.featured ? 'bg-[#b9f47f] text-[#0b3328] shadow-xl' : 'border border-white/15 bg-white/5 text-white'}`}><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.16em] opacity-70">{plan.eyebrow}</p>{plan.featured && <span className="rounded-full bg-[#0b4537] px-3 py-1 text-[10px] font-bold uppercase text-white">Popular</span>}</div><h3 className="mt-4 text-2xl font-semibold">{plan.name}</h3><p className="mt-6 text-4xl font-semibold">{plan.roi}<span className="text-base font-medium opacity-70"> / day*</span></p><div className="mt-5 space-y-2 text-sm opacity-80"><p>Duration: {plan.days}</p><p>Investment range: {plan.range}</p></div><Link href="/register" className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${plan.featured ? 'bg-[#0b4537] text-white' : 'bg-white text-[#0b4537]'}`}>Get started <ArrowRight size={15} /></Link></article>)}</div><p className="mt-5 text-xs text-white/60">*Illustrative rates only. Review current plan terms and investment risks before investing.</p></div></section>
    <section id="calculator" className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[.9fr_1.1fr] lg:px-8 lg:py-28"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Plan your next step</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.055em] text-[#10251d]">Clarity before commitment.</h2><p className="mt-4 max-w-md text-sm leading-7 text-[#687870]">Use the calculator above as an illustration, then review live plan details and terms before making a decision.</p><Link href="/plans" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0b4537]">Explore plan details <ArrowRight size={15} /></Link></div><div className="rounded-3xl border border-[#e1e9e3] bg-[#f4f8f3] p-7"><div className="flex gap-4"><span className="rounded-xl bg-white p-3 text-[#30794e]"><ShieldCheck size={21} /></span><div><h3 className="font-semibold text-[#173c30]">Transparent by default</h3><p className="mt-2 text-sm leading-6 text-[#708079]">Your dashboard shows your own account balances and transaction history. Personal activity stays tied to your authenticated account.</p></div></div></div></section>
    <section id="about" className="border-y border-[#e1e9e3] bg-[#f1f7f0] px-5 py-20 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">About Madallion</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.055em] text-[#10251d]">Trust through clarity.</h2></div><p className="max-w-2xl text-base leading-8 text-[#60716b]">We believe investment decisions should be made with clear information, careful planning, and transparent account activity. Explore your options at your own pace and understand the risks before investing.</p></div></section>
    <section id="faq" className="mx-auto max-w-3xl px-5 py-20 lg:py-28"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Questions, answered</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.055em] text-[#10251d]">Good to know.</h2></div><div className="mt-8 divide-y divide-[#e1e9e3]">{faqs.map(([question, answer], index) => <div key={question} className="py-5"><button className="flex w-full items-center justify-between gap-4 text-left font-semibold text-[#173c30]" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}>{question}<ChevronDown size={18} className={`shrink-0 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} /></button>{openFaq === index && <p className="mt-3 max-w-2xl text-sm leading-7 text-[#708079]">{answer}</p>}</div>)}</div></section>
    <section id="start" className="mx-5 mb-10 rounded-3xl bg-[#b9f47f] px-6 py-14 text-center sm:px-10 lg:mx-auto lg:max-w-7xl"><h2 className="text-4xl font-semibold tracking-[-.055em] text-[#0b3328]">Make your next move with clarity.</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#35563c]">Explore your options, review the terms, and use your dashboard to follow your own activity.</p><Link href="/register" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0b4537] px-5 py-3.5 text-sm font-semibold text-white">Create your account <ArrowRight size={16} /></Link></section>
    <footer className="border-t border-[#e1e9e3] px-5 py-10 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row"><div><Link href="#top" className="font-bold text-[#0b4537]">Madallion fund</Link><p className="mt-2 text-xs text-[#819087]">Thoughtful investing, with transparent terms.</p></div><nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#60716b]" aria-label="Footer navigation"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/risk">Risk disclosure</Link><Link href="/faq">Help</Link></nav></div></footer>
    <style jsx global>{`@keyframes activity-slide { from { transform: translateX(0); } to { transform: translateX(-50%); } } .activity-track { animation: activity-slide 42s linear infinite; } .activity-static { animation: none; } .activity-window:hover .activity-track, .activity-window:focus-within .activity-track { animation-play-state: paused; } @media (prefers-reduced-motion: reduce) { .activity-track { animation: none; } html { scroll-behavior: auto !important; } } html { scroll-behavior: smooth; scroll-padding-top: 84px; }`}</style>
  </main>
}

function Stat({ value, label }: { value: string; label: string }) { return <div><p className="text-2xl font-semibold tracking-[-.045em] text-[#0b4537] sm:text-3xl">{value}</p><p className="mt-1 text-xs text-[#708079] sm:text-sm">{label}</p></div> }
