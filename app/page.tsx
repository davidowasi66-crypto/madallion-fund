'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, Check, ChevronDown, CircleDollarSign, Menu, ShieldCheck, Sparkles, X } from 'lucide-react'
import { xanoRequest } from '@/lib/xano-auth'

type FeedItem = { id: string; displayName: string; country: string; type: 'Deposit' | 'Withdrawal'; amount: number; currency: 'NGN' | 'GHS'; createdAt: number; sample: boolean }
type RawActivity = Record<string, any>

const sampleActivity: FeedItem[] = [
  { id: 'sample-1', displayName: 'Amina O.', country: 'Nigeria', type: 'Deposit', amount: 250000, currency: 'NGN', createdAt: Date.now() - 3 * 60_000, sample: true },
  { id: 'sample-2', displayName: 'Chinedu K.', country: 'Nigeria', type: 'Withdrawal', amount: 75000, currency: 'NGN', createdAt: Date.now() - 8 * 60_000, sample: true },
  { id: 'sample-3', displayName: 'Zainab M.', country: 'Nigeria', type: 'Deposit', amount: 500000, currency: 'NGN', createdAt: Date.now() - 14 * 60_000, sample: true },
  { id: 'sample-4', displayName: 'Kwame A.', country: 'Ghana', type: 'Withdrawal', amount: 1800, currency: 'GHS', createdAt: Date.now() - 20 * 60_000, sample: true },
  { id: 'sample-5', displayName: 'Ama K.', country: 'Ghana', type: 'Deposit', amount: 4200, currency: 'GHS', createdAt: Date.now() - 27 * 60_000, sample: true },
  { id: 'sample-6', displayName: 'Tunde B.', country: 'Nigeria', type: 'Withdrawal', amount: 120000, currency: 'NGN', createdAt: Date.now() - 35 * 60_000, sample: true },
]

function rowsFrom(payload: any): RawActivity[] {
  if (Array.isArray(payload)) return payload
  for (const candidate of [payload?.items, payload?.activities, payload?.feed, payload?.data?.items, payload?.data?.activities, payload?.data]) {
    if (Array.isArray(candidate)) return candidate
  }
  return []
}

function parseActivity(row: RawActivity, index: number): FeedItem | null {
  const kind = String(row.type ?? row.kind ?? row.event_type ?? row.transaction_type ?? '').toLowerCase()
  if (!kind.includes('deposit') && !kind.includes('withdraw')) return null
  // Deliberately only consume aliases explicitly made public by the Xano feed.
  const alias = row.display_name ?? row.displayName ?? row.alias ?? row.public_name
  const created = Number(row.created_at ?? row.createdAt ?? row.timestamp ?? row.date ?? Date.now())
  const rawAmount = Number(row.amount ?? row.value ?? row.total_amount)
  const currency = String(row.currency ?? row.currency_code ?? 'NGN').toUpperCase() === 'GHS' ? 'GHS' : 'NGN'
  return {
    id: String(row.id ?? row.event_id ?? `live-${index}-${created}`),
    displayName: typeof alias === 'string' && alias.trim() ? alias.trim() : 'Anonymous member',
    country: String(row.country ?? row.country_name ?? row.region ?? (currency === 'GHS' ? 'Ghana' : 'Nigeria')),
    type: kind.includes('deposit') ? 'Deposit' : 'Withdrawal',
    amount: Number.isFinite(rawAmount) ? Math.abs(rawAmount) : 0,
    currency,
    createdAt: Number.isFinite(created) ? (created < 1e12 ? created * 1000 : created) : Date.now(),
    sample: false,
  }
}

function formatMoney(value: number, currency: 'NGN' | 'GHS') {
  return new Intl.NumberFormat(currency === 'GHS' ? 'en-GH' : 'en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

function LiveActivity() {
  const [liveActivity, setLiveActivity] = useState<FeedItem[]>([])
  const [feedAvailable, setFeedAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const response = await xanoRequest<any>('/api:ledger-api/activity/feed', { method: 'GET' })
        if (!mounted) return
        setLiveActivity(rowsFrom(response).map(parseActivity).filter((item): item is FeedItem => item !== null))
        setFeedAvailable(true)
      } catch {
        if (!mounted) return
        setFeedAvailable(false)
        setLiveActivity([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    const timer = window.setInterval(load, 60_000)
    return () => { mounted = false; window.clearInterval(timer) }
  }, [])

  // Keep the demo entries visible while adding real sanitized feed entries as they arrive.
  const activity = useMemo(() => [...liveActivity, ...sampleActivity], [liveActivity])
  const totals = useMemo(() => activity.reduce((sum, item) => {
    const bucket = item.currency === 'GHS' ? sum.ghs : sum.ngn
    bucket[item.type] += item.amount
    return sum
  }, { ngn: { Deposit: 0, Withdrawal: 0 }, ghs: { Deposit: 0, Withdrawal: 0 } }), [activity])
  const repeated = activity.length > 1 ? [...activity, ...activity] : activity

  return <section aria-label="Deposit and withdrawal activity" className="border-y border-[#e1e9e3] bg-white py-8">
    <div className="mx-auto max-w-7xl px-5 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Money movement</p><h2 className="mt-1 text-xl font-semibold text-[#0b4537]">Recent deposits & withdrawals</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{loading ? 'Loading live activity…' : feedAvailable ? 'Live feed + clearly marked samples' : 'Sample activity · awaiting live feed'}</span></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ActivityTotal label="Displayed deposits · Nigeria" value={formatMoney(totals.ngn.Deposit, 'NGN')} /><ActivityTotal label="Displayed withdrawals · Nigeria" value={formatMoney(totals.ngn.Withdrawal, 'NGN')} /><ActivityTotal label="Displayed deposits · Ghana" value={formatMoney(totals.ghs.Deposit, 'GHS')} /><ActivityTotal label="Displayed withdrawals · Ghana" value={formatMoney(totals.ghs.Withdrawal, 'GHS')} /></div>
      <div className="activity-window mt-5 overflow-hidden rounded-2xl border border-[#e6ede7] bg-[#f7faf6] py-3"><div className={`activity-track flex w-max gap-3 px-3 ${activity.length <= 1 ? 'activity-static' : ''}`}>{repeated.map((item, index) => <article key={`${item.id}-${index}`} aria-hidden={index >= activity.length} className="flex min-w-[265px] items-center gap-3 rounded-xl border border-[#e6ede7] bg-white px-4 py-3 shadow-sm"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.type === 'Deposit' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>{item.type === 'Deposit' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#173c30]">{item.displayName} · {item.country}</span><span className="text-xs text-[#708079]">{item.type} · {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span><span className="text-right"><span className="block whitespace-nowrap text-sm font-bold text-[#0b4537]">{formatMoney(item.amount, item.currency)}</span><span className={`text-[10px] font-semibold ${item.sample ? 'text-amber-700' : 'text-emerald-700'}`}>{item.sample ? 'SAMPLE' : 'LIVE'}</span></span></article>)}</div></div>
      <p className="mt-2 text-xs text-[#77857e]">Sample transactions are illustrative, not real customer activity. Live entries use only anonymized aliases returned by the public feed.</p>
    </div>
  </section>
}

function ActivityTotal({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#e6ede7] bg-[#f7faf6] px-4 py-3"><p className="text-xs font-medium text-[#718078]">{label}</p><p className="mt-1 text-lg font-bold tracking-tight text-[#0b4537]">{value}</p></div> }

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
    <header className="sticky top-0 z-50 border-b border-[#dfe8e2]/80 bg-[#fbfcfa]/95 shadow-[0_4px_20px_rgba(16,45,33,.04)] backdrop-blur-xl"><div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8"><Link href="#top" onClick={closeMenu} className="flex items-center gap-2.5" aria-label="Madallion fund home"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b4537] text-[#b9f47f]"><Sparkles size={18} /></span><span className="text-[15px] font-bold tracking-[-.03em]">Madallion <span className="text-[#0b4537]">fund</span></span></Link><nav className="hidden items-center gap-7 text-sm font-semibold text-[#60716b] lg:flex" aria-label="Main navigation"><Link href="#plans">Plans</Link><Link href="#how-it-works">How it works</Link><Link href="#calculator">Calculator</Link><Link href="#about">About</Link><Link href="#faq">FAQ</Link></nav><div className="hidden items-center gap-3 lg:flex"><Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#0b4537]">Log in</Link><Link href="/register" className="rounded-xl bg-[#0b4537] px-4 py-2.5 text-sm font-semibold text-white">Create account</Link></div><button className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dfe8e2] text-[#0b4537] lg:hidden" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>{menuOpen && <><button className="fixed inset-0 top-[72px] z-40 bg-[#10251d]/25 backdrop-blur-[2px] lg:hidden" aria-label="Close navigation overlay" onClick={closeMenu} /><nav className="absolute left-0 right-0 top-full z-50 border-t border-[#e3ebe4] bg-[#fbfcfa] px-5 pb-6 pt-3 shadow-xl lg:hidden" aria-label="Mobile navigation"><div className="mx-auto max-w-7xl divide-y divide-[#e8eee8]">{[['#plans', 'Plans'], ['#how-it-works', 'How it works'], ['#calculator', 'Calculator'], ['#about', 'About us'], ['#faq', 'FAQ']].map(([href, label]) => <Link key={href} href={href} onClick={closeMenu} className="flex items-center justify-between py-3.5 text-sm font-semibold text-[#314c40]">{label}<ArrowRight size={15} /></Link>)}<div className="grid grid-cols-2 gap-3 pt-5"><Link href="/login" onClick={closeMenu} className="rounded-xl border border-[#cbdacf] px-4 py-3 text-center text-sm font-semibold text-[#0b4537]">Log in</Link><Link href="/register" onClick={closeMenu} className="rounded-xl bg-[#0b4537] px-4 py-3 text-center text-sm font-semibold text-white">Create account</Link></div></div></nav></>}</header>
    <section id="top" className="relative border-b border-[#e1e9e3]"><div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(185,244,127,.38),transparent_30%),linear-gradient(135deg,#f7faf5_0%,#eef6ef_100%)]" /><div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:py-24 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-28"><div><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#cfe4d1] bg-white/75 px-3 py-1.5 text-xs font-semibold text-[#267258]">Thoughtful investing, made clear</div><h1 className="max-w-2xl text-5xl font-semibold leading-[1.04] tracking-[-.065em] text-[#10251d] sm:text-6xl lg:text-[4.5rem]">Make your money work with <span className="text-[#2e7c56]">purpose.</span></h1><p className="mt-6 max-w-xl text-base leading-7 text-[#60716b] sm:text-lg">Explore carefully structured investment plans, transparent terms, and a clear view of your money’s journey.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-[#0b4537] px-5 py-3.5 text-sm font-semibold text-white">Get started <ArrowRight size={16} /></Link><Link href="#plans" className="rounded-xl border border-[#cbdacf] bg-white/70 px-5 py-3.5 text-sm font-semibold text-[#0b4537]">Explore plans</Link></div><div className="mt-8 flex flex-wrap gap-5 text-xs font-medium text-[#60716b]"><span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} /> Secure account access</span><span className="inline-flex items-center gap-1.5"><Check size={15} /> Clear investment terms</span></div></div><div className="relative mx-auto w-full max-w-[510px]"><div className="absolute -inset-4 rounded-[2rem] bg-[#b9f47f]/25 blur-2xl" /><div className="relative rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_30px_90px_rgba(21,77,52,.13)] sm:p-7"><p className="text-xs font-bold uppercase tracking-[.17em] text-[#65a85c]">Growth preview</p><h2 className="mt-2 text-2xl font-semibold text-[#10251d]">Plan calculator</h2><p className="mt-2 text-sm text-[#708079]">Illustrative only; actual returns depend on plan terms and investment performance.</p><label htmlFor="investment-amount" className="mt-7 block text-sm text-[#5f7169]">Investment amount <strong className="float-right text-[#0b4537]">{formatMoney(Number(amount || 0), 'NGN')}</strong></label><input id="investment-amount" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))} className="mt-3 w-full accent-[#0b4537]" type="range" min="50000" max="25000000" step="50000" /><div className="mt-1 flex justify-between text-xs text-[#819087]"><span>₦50,000</span><span>₦25,000,000</span></div><div className="mt-6 rounded-2xl bg-[#0b4537] p-5 text-white"><div className="flex items-center justify-between"><div><p className="text-xs text-white/65">Illustrative projected return</p><p className="mt-2 text-3xl font-semibold">{formatMoney(projected, 'NGN')}</p></div><CircleDollarSign className="text-[#b9f47f]" size={27} /></div><p className="mt-3 text-xs text-white/65">Based on sample Gold plan assumptions (1.8% × 60 days). Not guaranteed.</p></div><Link href="/plans" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0b4537]">Compare available plans <ArrowRight size={15} /></Link></div></div></div></section>
    <LiveActivity />
    <section className="border-b border-[#e1e9e3] bg-white"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 sm:grid-cols-4 lg:px-8">{[['₦4.8B+', 'Assets managed'], ['12,000+', 'Active investors'], ['98.7%', 'Payout reliability'], ['24/7', 'Account visibility']].map(([value,label]) => <Stat key={label} value={value} label={label} />)}</div></section>
    <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><h2 className="text-4xl font-semibold tracking-tight text-[#10251d]">A clear path from start to finish.</h2><div className="mt-10 grid gap-4 md:grid-cols-3">{[['01', 'Create your account', 'Set up your profile and review your account details.'], ['02', 'Choose a plan', 'Compare duration, minimums, and terms before you commit.'], ['03', 'Track your activity', 'Follow deposits, withdrawals, and account activity from your dashboard.']].map(([number,title,copy]) => <article key={number} className="rounded-2xl border border-[#e1e9e3] bg-white p-6"><span className="text-sm font-bold text-[#30794e]">{number}</span><h3 className="mt-5 text-lg font-semibold text-[#173c30]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#708079]">{copy}</p></article>)}</div></section>
    <section id="plans" className="bg-[#0b4537] px-5 py-20 text-white lg:px-8"><div className="mx-auto max-w-7xl"><h2 className="text-4xl font-semibold">Plans built around your goals.</h2><div className="mt-10 grid gap-4 lg:grid-cols-3">{plans.map((plan) => <article key={plan.name} className={`rounded-2xl p-6 ${plan.featured ? 'bg-[#b9f47f] text-[#0b3328]' : 'border border-white/15 bg-white/5'}`}><p className="text-xs uppercase">{plan.eyebrow}</p><h3 className="mt-4 text-2xl font-semibold">{plan.name}</h3><p className="mt-6 text-4xl font-semibold">{plan.roi}<span className="text-base"> / day*</span></p><p className="mt-4 text-sm">{plan.days} · {plan.range}</p><Link href="/register" className="mt-7 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#0b4537]">Get started <ArrowRight size={15} className="ml-2" /></Link></article>)}</div><p className="mt-5 text-xs text-white/60">*Illustrative rates only. Review current plan terms and investment risks before investing.</p></div></section>
    <section id="calculator" className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-2 lg:px-8"><div><h2 className="text-4xl font-semibold text-[#10251d]">Clarity before commitment.</h2><p className="mt-4 text-sm leading-7 text-[#687870]">Review live plan details and terms before making a decision.</p><Link href="/plans" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0b4537]">Explore plan details <ArrowRight size={15} /></Link></div><div className="rounded-3xl border border-[#e1e9e3] bg-[#f4f8f3] p-7"><ShieldCheck className="text-[#30794e]" /><h3 className="mt-4 font-semibold text-[#173c30]">Transparent by default</h3><p className="mt-2 text-sm leading-6 text-[#708079]">Personal account activity stays tied to the authenticated member.</p></div></section>
    <section id="about" className="border-y border-[#e1e9e3] bg-[#f1f7f0] px-5 py-20 lg:px-8"><div className="mx-auto max-w-7xl"><h2 className="text-4xl font-semibold text-[#10251d]">Trust through clarity.</h2><p className="mt-4 max-w-2xl leading-8 text-[#60716b]">Investment decisions should be made with clear information, careful planning, and transparent account activity. Investments carry risk; review terms carefully.</p></div></section>
    <section id="faq" className="mx-auto max-w-3xl px-5 py-20"><h2 className="text-center text-4xl font-semibold text-[#10251d]">Good to know.</h2><div className="mt-8 divide-y divide-[#e1e9e3]">{faqs.map(([question, answer], index) => <div key={question} className="py-5"><button className="flex w-full items-center justify-between gap-4 text-left font-semibold text-[#173c30]" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}>{question}<ChevronDown size={18} className={`transition-transform ${openFaq === index ? 'rotate-180' : ''}`} /></button>{openFaq === index && <p className="mt-3 text-sm leading-7 text-[#708079]">{answer}</p>}</div>)}</div></section>
    <section className="mx-5 mb-10 rounded-3xl bg-[#b9f47f] px-6 py-14 text-center lg:mx-auto lg:max-w-7xl"><h2 className="text-4xl font-semibold text-[#0b3328]">Make your next move with clarity.</h2><Link href="/register" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0b4537] px-5 py-3.5 text-sm font-semibold text-white">Create your account <ArrowRight size={16} /></Link></section>
    <footer className="border-t border-[#e1e9e3] px-5 py-10 lg:px-8"><div className="mx-auto flex max-w-7xl justify-between gap-6"><Link href="#top" className="font-bold text-[#0b4537]">Madallion fund</Link><nav className="flex gap-5 text-xs text-[#60716b]"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/risk">Risk disclosure</Link><Link href="/faq">Help</Link></nav></div></footer>
    <style jsx global>{`@keyframes activity-slide { from { transform: translateX(0); } to { transform: translateX(-50%); } } .activity-track { animation: activity-slide 42s linear infinite; } .activity-static { animation: none; } .activity-window:hover .activity-track, .activity-window:focus-within .activity-track { animation-play-state: paused; } @media (prefers-reduced-motion: reduce) { .activity-track { animation: none; } html { scroll-behavior: auto !important; } } html { scroll-behavior: smooth; scroll-padding-top: 84px; }`}</style>
  </main>
}
function Stat({ value, label }: { value: string; label: string }) { return <div><p className="text-2xl font-semibold text-[#0b4537] sm:text-3xl">{value}</p><p className="mt-1 text-xs text-[#708079] sm:text-sm">{label}</p></div> }
